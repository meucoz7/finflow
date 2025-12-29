
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Bot, InlineKeyboard, webhookCallback } from 'grammy';
import cors from 'cors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
}

// --- User Schema ---
const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  firstName: String,
  partnerId: { type: Number, default: null },
  pendingPartnerId: { type: Number, default: null },
  state: {
    transactions: { type: Array, default: [] },
    categories: { type: Array, default: [] },
    accounts: { type: Array, default: [] },
    debts: { type: Array, default: [] },
    savings: { type: Array, default: [] },
    subscriptions: { type: Array, default: [] }, // New field
    profile: { type: Object, default: {} }
  },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// --- Telegram Bot ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Bot(BOT_TOKEN || 'dummy_token');

bot.command('start', async (ctx) => {
  const { id, first_name } = ctx.from;
  try {
    let user = await User.findOne({ telegramId: id });
    if (!user) {
      await User.create({
        telegramId: id,
        firstName: first_name,
        state: { profile: { name: first_name, currency: '₽' } }
      });
    }
    
    const inlineKeyboard = new InlineKeyboard()
      .webApp('Открыть кошелек 💳', process.env.APP_URL || '');

    await ctx.reply(
      `Привет, <b>${first_name}</b>! 💰\n\nТвой личный финансовый помощник FinFlow готов к работе.\nЯ буду присылать уведомления о подписках и планах!`, 
      { 
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard 
      }
    );
  } catch (err) {
    console.error('Bot Command Error:', err);
  }
});

// Reminder Logic (Conceptual / Simulation)
// In production, this would be a Cron job or BullMQ task running daily.
async function checkReminders() {
  if (!BOT_TOKEN) return;
  const users = await User.find({ "state.subscriptions": { $exists: true, $not: { $size: 0 } } });
  
  const now = new Date();
  
  for (const user of users) {
    const subs = user.state.subscriptions || [];
    const planned = user.state.transactions.filter(t => t.isPlanned) || [];
    const debts = user.state.debts || [];

    // Check Subscriptions
    for (const sub of subs) {
      if (!sub.isActive) continue;
      const payDate = new Date(sub.nextPaymentDate);
      const diffDays = Math.ceil((payDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === sub.reminderDays) {
        try {
          await bot.api.sendMessage(user.telegramId, 
            `🔔 <b>Напоминание о подписке!</b>\n\nЧерез ${diffDays} дн. списание: <b>${sub.name}</b>\nСумма: ${sub.amount} ${user.state.profile.currency}`, 
            { parse_mode: 'HTML' }
          );
        } catch (e) {}
      }
    }

    // Check Planned Transactions / Debts (General notification 1 day before)
    const allPlanned = [
      ...planned.map(p => ({ title: p.note || 'Платеж', date: p.date.split('T')[0] })),
      ...debts.filter(d => d.dueDate).map(d => ({ title: `Долг: ${d.personName}`, date: d.dueDate }))
    ];

    for (const item of allPlanned) {
      const itemDate = new Date(item.date);
      const diff = Math.ceil((itemDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        try {
          await bot.api.sendMessage(user.telegramId, 
            `📅 <b>План на завтра:</b>\n\nНе забудьте: <b>${item.title}</b>`, 
            { parse_mode: 'HTML' }
          );
        } catch (e) {}
      }
    }
  }
}

// Run reminder check once a day (if server is persistent)
// setInterval(checkReminders, 24 * 60 * 60 * 1000);

bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const myId = ctx.from.id;

  if (data.startsWith('accept_pair:')) {
    const requesterId = parseInt(data.split(':')[1]);
    await User.findOneAndUpdate({ telegramId: myId }, { partnerId: requesterId, pendingPartnerId: null });
    await User.findOneAndUpdate({ telegramId: requesterId }, { partnerId: myId, pendingPartnerId: null });
    await ctx.answerCallbackQuery({ text: "Бюджет успешно объединен! ✅" });
    await ctx.editMessageText("<b>Вы приняли запрос!</b>\nТеперь ваши общие траты будут синхронизированы. 🤝", { parse_mode: 'HTML' });
    try { await bot.api.sendMessage(requesterId, `💳 <b>${ctx.from.first_name}</b> принял ваш запрос на совместный бюджет!`, { parse_mode: 'HTML' }); } catch (e) {}
  } else if (data.startsWith('decline_pair:')) {
    const requesterId = parseInt(data.split(':')[1]);
    await User.findOneAndUpdate({ telegramId: myId }, { pendingPartnerId: null });
    await User.findOneAndUpdate({ telegramId: requesterId }, { pendingPartnerId: null });
    await ctx.answerCallbackQuery({ text: "Запрос отклонен." });
    await ctx.deleteMessage();
    try { await bot.api.sendMessage(requesterId, `❌ <b>${ctx.from.first_name}</b> отклонил запрос на совместный бюджет.`, { parse_mode: 'HTML' }); } catch (e) {}
  }
});

if (BOT_TOKEN) {
  app.use(`/api/bot/${BOT_TOKEN}`, webhookCallback(bot, 'express'));
}

app.get('/api/user-state/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      const newUser = await User.create({
        telegramId: userId,
        state: { profile: { name: 'Пользователь', currency: '₽' } }
      });
      return res.json({ state: newUser.state, partnerId: null, pendingPartnerId: null });
    }
    res.json({ state: user.state, partnerId: user.partnerId, pendingPartnerId: user.pendingPartnerId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/user-state/:id', async (req, res) => {
  try {
    await User.findOneAndUpdate({ telegramId: parseInt(req.params.id) }, { state: req.body, updatedAt: new Date() }, { upsert: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/request-pairing', async (req, res) => {
  const { myId, partnerId } = req.body;
  try {
    const me = await User.findOne({ telegramId: myId });
    const partner = await User.findOne({ telegramId: partnerId });
    if (!partner) return res.status(404).json({ error: 'Пользователь не найден' });
    await User.findOneAndUpdate({ telegramId: myId }, { pendingPartnerId: partnerId });
    await User.findOneAndUpdate({ telegramId: partnerId }, { pendingPartnerId: myId });
    const keyboard = new InlineKeyboard().text('Принять ✅', `accept_pair:${myId}`).text('Отклонить ❌', `decline_pair:${myId}`);
    await bot.api.sendMessage(partnerId, `🤝 <b>${me.firstName || 'Пользователь'}</b> хочет создать с вами общий бюджет!`, { parse_mode: 'HTML', reply_markup: keyboard });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Ошибка при отправке запроса' }); }
});

app.post('/api/cancel-pairing', async (req, res) => {
  const { myId } = req.body;
  try {
    const me = await User.findOne({ telegramId: myId });
    if (me.partnerId) await User.findOneAndUpdate({ telegramId: me.partnerId }, { partnerId: null, pendingPartnerId: null });
    if (me.pendingPartnerId) await User.findOneAndUpdate({ telegramId: me.pendingPartnerId }, { pendingPartnerId: null });
    await User.findOneAndUpdate({ telegramId: myId }, { partnerId: null, pendingPartnerId: null });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*$/, (req, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  app.use(express.static(__dirname));
  app.get(/^(?!\/api).*$/, (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  if (process.env.APP_URL && BOT_TOKEN) {
    try { await bot.api.setWebhook(`${process.env.APP_URL}/api/bot/${BOT_TOKEN}`); } catch (err) {}
  }
});
