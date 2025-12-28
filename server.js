
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
  pendingPartnerId: { type: Number, default: null }, // Тот, кому мы отправили запрос или от кого ждем
  state: {
    transactions: { type: Array, default: [] },
    categories: { type: Array, default: [] },
    accounts: { type: Array, default: [] },
    debts: { type: Array, default: [] },
    savings: { type: Array, default: [] },
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
      `Привет, <b>${first_name}</b>! 💰\n\nТвой личный финансовый помощник FinFlow готов к работе.`, 
      { 
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard 
      }
    );
  } catch (err) {
    console.error('Bot Command Error:', err);
  }
});

// Обработка кнопок Принять/Отклонить
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const myId = ctx.from.id;

  if (data.startsWith('accept_pair:')) {
    const requesterId = parseInt(data.split(':')[1]);
    
    // Связываем пользователей
    await User.findOneAndUpdate({ telegramId: myId }, { partnerId: requesterId, pendingPartnerId: null });
    await User.findOneAndUpdate({ telegramId: requesterId }, { partnerId: myId, pendingPartnerId: null });

    await ctx.answerCallbackQuery({ text: "Бюджет успешно объединен! ✅" });
    await ctx.editMessageText("<b>Вы приняли запрос!</b>\nТеперь ваши общие траты будут синхронизированы. 🤝", { parse_mode: 'HTML' });
    
    // Уведомляем инициатора
    try {
      await bot.api.sendMessage(requesterId, `💳 <b>${ctx.from.first_name}</b> принял ваш запрос на совместный бюджет!`, { parse_mode: 'HTML' });
    } catch (e) {}

  } else if (data.startsWith('decline_pair:')) {
    const requesterId = parseInt(data.split(':')[1]);
    
    await User.findOneAndUpdate({ telegramId: myId }, { pendingPartnerId: null });
    await User.findOneAndUpdate({ telegramId: requesterId }, { pendingPartnerId: null });

    await ctx.answerCallbackQuery({ text: "Запрос отклонен." });
    await ctx.deleteMessage();
    
    try {
      await bot.api.sendMessage(requesterId, `❌ <b>${ctx.from.first_name}</b> отклонил запрос на совместный бюджет.`, { parse_mode: 'HTML' });
    } catch (e) {}
  }
});

if (BOT_TOKEN) {
  app.use(`/api/bot/${BOT_TOKEN}`, webhookCallback(bot, 'express'));
}

// --- API Endpoints ---
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
    
    res.json({ 
      state: user.state, 
      partnerId: user.partnerId, 
      pendingPartnerId: user.pendingPartnerId 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user-state/:id', async (req, res) => {
  try {
    await User.findOneAndUpdate(
      { telegramId: parseInt(req.params.id) },
      { state: req.body, updatedAt: new Date() },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Запрос на связку (отправка сообщения партнеру)
app.post('/api/request-pairing', async (req, res) => {
  const { myId, partnerId } = req.body;
  try {
    const me = await User.findOne({ telegramId: myId });
    const partner = await User.findOne({ telegramId: partnerId });

    if (!partner) {
      return res.status(404).json({ error: 'Пользователь не найден в системе. Попросите партнера сначала запустить бота.' });
    }

    // Сохраняем статус ожидания
    await User.findOneAndUpdate({ telegramId: myId }, { pendingPartnerId: partnerId });
    await User.findOneAndUpdate({ telegramId: partnerId }, { pendingPartnerId: myId });

    const keyboard = new InlineKeyboard()
      .text('Принять ✅', `accept_pair:${myId}`)
      .text('Отклонить ❌', `decline_pair:${myId}`);

    await bot.api.sendMessage(partnerId, 
      `🤝 <b>${me.firstName || 'Пользователь'}</b> хочет создать с вами общий бюджет в FinFlow!\n\nВы сможете видеть общие транзакции друг друга.`, 
      { parse_mode: 'HTML', reply_markup: keyboard }
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при отправке запроса' });
  }
});

app.post('/api/cancel-pairing', async (req, res) => {
  const { myId } = req.body;
  try {
    const me = await User.findOne({ telegramId: myId });
    if (me.partnerId) {
       await User.findOneAndUpdate({ telegramId: me.partnerId }, { partnerId: null, pendingPartnerId: null });
    }
    if (me.pendingPartnerId) {
       await User.findOneAndUpdate({ telegramId: me.pendingPartnerId }, { pendingPartnerId: null });
    }
    await User.findOneAndUpdate({ telegramId: myId }, { partnerId: null, pendingPartnerId: null });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Serving Build Assets ---
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
    try {
      await bot.api.setWebhook(`${process.env.APP_URL}/api/bot/${BOT_TOKEN}`);
    } catch (err) {
      console.error('❌ Webhook error:', err);
    }
  }
});
