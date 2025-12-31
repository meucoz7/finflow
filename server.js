
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
  pairingCode: { type: String, unique: true, sparse: true },
  pairingCodeExpiresAt: { type: Date },
  lastNotificationDate: { type: String, default: '' },
  state: {
    transactions: { type: Array, default: [] },
    categories: { type: Array, default: [] },
    accounts: { type: Array, default: [] },
    debts: { type: Array, default: [] },
    savings: { type: Array, default: [] },
    subscriptions: { type: Array, default: [] },
    profile: { type: Object, default: {} }
  },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// --- Helper Functions ---
function generatePairingCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function getOrGenerateCode(user) {
  const now = new Date();
  if (user.pairingCode && user.pairingCodeExpiresAt && user.pairingCodeExpiresAt > now) {
    return user.pairingCode;
  }
  
  // Генерируем новый код, который действует 24 часа
  const newCode = generatePairingCode();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  user.pairingCode = newCode;
  user.pairingCodeExpiresAt = expiresAt;
  await user.save();
  return newCode;
}

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
    const inlineKeyboard = new InlineKeyboard().webApp('Открыть кошелек 💳', process.env.APP_URL || '');
    await ctx.reply(`Привет, <b>${first_name}</b>! 💰\n\nЯ помогу тебе вести бюджет вместе с партнером.\nВсе уведомления приходят в 12:00 по МСК.`, { parse_mode: 'HTML', reply_markup: inlineKeyboard });
  } catch (err) { console.error('Bot Command Error:', err); }
});

function getMSKTime() {
  const now = new Date();
  const mskDate = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  return {
    fullDate: mskDate,
    isoDate: mskDate.toISOString().split('T')[0],
    hours: mskDate.getUTCHours(),
    minutes: mskDate.getUTCMinutes()
  };
}

let lastGlobalCheckTime = "Никогда";

async function checkReminders(targetId = null) {
  if (!BOT_TOKEN || BOT_TOKEN === 'dummy_token') return;
  const msk = getMSKTime();
  const todayStr = msk.isoDate;
  if (!targetId && msk.hours < 12) return;
  lastGlobalCheckTime = msk.fullDate.toLocaleTimeString('ru-RU');
  const query = targetId ? { telegramId: targetId } : { lastNotificationDate: { $ne: todayStr } };
  
  try {
    const users = await User.find(query);
    const comparisonDate = new Date(msk.fullDate);
    comparisonDate.setUTCHours(0, 0, 0, 0);
    let totalSent = 0;
    for (const user of users) {
      const subs = user.state.subscriptions || [];
      const transactions = user.state.transactions || [];
      const debts = user.state.debts || [];
      const currency = user.state.profile?.currency || '₽';
      let userSentCount = 0;
      for (const sub of subs) {
        if (!sub.isActive || !sub.nextPaymentDate) continue;
        const payDate = new Date(sub.nextPaymentDate);
        payDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((payDate.getTime() - comparisonDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === sub.reminderDays) {
          try { await bot.api.sendMessage(user.telegramId, `🔔 <b>Напоминание о подписке!</b>\n\n${diffDays === 0 ? 'Сегодня' : 'Через ' + diffDays + ' дн.'} списание: <b>${sub.name}</b>\nСумма: <code>${sub.amount} ${currency}</code>`, { parse_mode: 'HTML' }); userSentCount++; } catch (e) {}
        }
      }
      if (!targetId) await User.updateOne({ _id: user._id }, { lastNotificationDate: todayStr });
      totalSent += userSentCount;
    }
    return totalSent;
  } catch (err) { console.error('CheckReminders Error:', err); return 0; }
}

setInterval(checkReminders, 15 * 60 * 1000);

app.get('/api/admin/stats', async (req, res) => {
  const msk = getMSKTime();
  res.json({ serverTimeMSK: msk.fullDate.toLocaleTimeString('ru-RU'), serverDateMSK: msk.isoDate, lastCheck: lastGlobalCheckTime, isCheckWindow: msk.hours >= 12 });
});

app.post('/api/admin/trigger-reminders', async (req, res) => {
  const { targetId } = req.body;
  const count = await checkReminders(targetId || null);
  res.json({ success: true, sentCount: count });
});

if (BOT_TOKEN) {
  app.use(`/api/bot/${BOT_TOKEN}`, webhookCallback(bot, 'express'));
}

app.get('/api/user-state/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    let user = await User.findOne({ telegramId: userId });
    if (!user) {
      user = await User.create({ telegramId: userId, state: { profile: { name: 'Пользователь', currency: '₽' } } });
    }
    const currentCode = await getOrGenerateCode(user);
    res.json({ state: user.state, partnerId: user.partnerId, pairingCode: currentCode });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/user-state/:id', async (req, res) => {
  try {
    await User.findOneAndUpdate({ telegramId: parseInt(req.params.id) }, { state: req.body, updatedAt: new Date() }, { upsert: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Сопряжение через временный код
app.post('/api/request-pairing', async (req, res) => {
  const { myId, partnerCode } = req.body;
  try {
    const partner = await User.findOne({ pairingCode: partnerCode.toUpperCase() });
    if (!partner) return res.status(404).json({ error: 'Код не найден или истек' });
    if (partner.telegramId === myId) return res.status(400).json({ error: 'Нельзя привязать самого себя' });

    // Здесь можно реализовать сложную логику подтверждения, 
    // но для простоты сразу устанавливаем связь в одну сторону 
    // или отправляем уведомление. В этой версии - устанавливаем связь.
    await User.updateOne({ telegramId: myId }, { partnerId: partner.telegramId, pendingPartnerId: null });
    await User.updateOne({ telegramId: partner.telegramId }, { partnerId: myId, pendingPartnerId: null });
    
    res.json({ success: true, partnerName: partner.firstName });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/cancel-pairing', async (req, res) => {
  const { myId } = req.body;
  try {
    const user = await User.findOne({ telegramId: myId });
    if (user.partnerId) {
      await User.updateOne({ telegramId: user.partnerId }, { partnerId: null });
    }
    await User.updateOne({ telegramId: myId }, { partnerId: null, pendingPartnerId: null });
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
