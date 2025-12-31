
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
    await ctx.reply(`Привет, <b>${first_name}</b>! 💰\n\nЯ буду присылать уведомления ежедневно в 12:00 по МСК.`, { parse_mode: 'HTML', reply_markup: inlineKeyboard });
  } catch (err) { console.error('Bot Command Error:', err); }
});

/**
 * Вспомогательная функция для получения времени в МСК (UTC+3)
 */
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
  
  // Если это не принудительный запуск (targetId), то проверяем время (после 12:00)
  if (!targetId && msk.hours < 12) return;

  lastGlobalCheckTime = msk.fullDate.toLocaleTimeString('ru-RU');
  console.log(`[${lastGlobalCheckTime}] Запуск проверки напоминаний...`);

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

      // 1. Подписки
      for (const sub of subs) {
        if (!sub.isActive || !sub.nextPaymentDate) continue;
        const payDate = new Date(sub.nextPaymentDate);
        payDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((payDate.getTime() - comparisonDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === sub.reminderDays) {
          try {
            await bot.api.sendMessage(user.telegramId, `🔔 <b>Напоминание о подписке!</b>\n\n${diffDays === 0 ? 'Сегодня' : 'Через ' + diffDays + ' дн.'} списание: <b>${sub.name}</b>\nСумма: <code>${sub.amount} ${currency}</code>`, { parse_mode: 'HTML' });
            userSentCount++;
          } catch (e) {}
        }
      }

      // 2. Планы (на завтра)
      for (const item of transactions.filter(t => t.isPlanned)) {
        const itemDate = new Date(item.date);
        itemDate.setHours(0, 0, 0, 0);
        const diff = Math.round((itemDate.getTime() - comparisonDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          try {
            await bot.api.sendMessage(user.telegramId, `📅 <b>План на завтра:</b>\n\nНе забудьте: <b>${item.note || 'Платеж'}</b>\nСумма: <code>${item.amount} ${currency}</code>`, { parse_mode: 'HTML' });
            userSentCount++;
          } catch (e) {}
        }
      }

      // 3. Долги
      for (const debt of debts) {
        if (!debt.dueDate) continue;
        const dueDate = new Date(debt.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diff = Math.round((dueDate.getTime() - comparisonDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          try {
            await bot.api.sendMessage(user.telegramId, `🤝 <b>Напоминание по долгу:</b>\n\nЗавтра дата платежа: <b>${debt.personName}</b>\nСумма: <code>${debt.amount} ${currency}</code>`, { parse_mode: 'HTML' });
            userSentCount++;
          } catch (e) {}
        }
      }

      if (!targetId) {
        await User.updateOne({ _id: user._id }, { lastNotificationDate: todayStr });
      }
      totalSent += userSentCount;
    }
    return totalSent;
  } catch (err) { 
    console.error('CheckReminders Error:', err); 
    return 0;
  }
}

// Проверка каждые 15 минут
setInterval(checkReminders, 15 * 60 * 1000);

// API для админ-панели
app.get('/api/admin/stats', async (req, res) => {
  const msk = getMSKTime();
  res.json({
    serverTimeMSK: msk.fullDate.toLocaleTimeString('ru-RU'),
    serverDateMSK: msk.isoDate,
    lastCheck: lastGlobalCheckTime,
    isCheckWindow: msk.hours >= 12
  });
});

// Эндпоинт для теста рассылки из админки
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
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      const newUser = await User.create({ telegramId: userId, state: { profile: { name: 'Пользователь', currency: '₽' } } });
      return res.json({ state: newUser.state, partnerId: null });
    }
    res.json({ state: user.state, partnerId: user.partnerId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/user-state/:id', async (req, res) => {
  try {
    await User.findOneAndUpdate({ telegramId: parseInt(req.params.id) }, { state: req.body, updatedAt: new Date() }, { upsert: true });
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
