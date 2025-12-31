
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
  lastNotificationDate: { type: String, default: '' }, // Формат YYYY-MM-DD (МСК)
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
    
    const inlineKeyboard = new InlineKeyboard()
      .webApp('Открыть кошелек 💳', process.env.APP_URL || '');

    await ctx.reply(
      `Привет, <b>${first_name}</b>! 💰\n\nТвой личный финансовый помощник FinFlow готов к работе.\nЯ буду присылать уведомления о подписках и планах ежедневно в 12:00!`, 
      { 
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard 
      }
    );
  } catch (err) {
    console.error('Bot Command Error:', err);
  }
});

bot.command('test_reminders', async (ctx) => {
  await ctx.reply("⏳ Запускаю ручную проверку напоминаний (игнорируя время 12:00)...");
  await checkReminders(ctx.from.id);
  await ctx.reply("✅ Проверка завершена.");
});

/**
 * Вспомогательная функция для получения времени в МСК (UTC+3)
 */
function getMSKTime() {
  const now = new Date();
  // Смещение МСК = UTC+3 часа
  const mskDate = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  return {
    fullDate: mskDate,
    isoDate: mskDate.toISOString().split('T')[0],
    hours: mskDate.getUTCHours()
  };
}

/**
 * Функция проверки и отправки напоминаний
 * @param {number|null} targetId - если указан, проверит только этого пользователя (для тестов)
 */
async function checkReminders(targetId = null) {
  if (!BOT_TOKEN || BOT_TOKEN === 'dummy_token') return;

  const msk = getMSKTime();
  const todayStr = msk.isoDate;
  
  // Если мы запускаем автоматическую проверку (не ручной тест), 
  // проверяем, наступило ли уже 12:00 по МСК
  if (!targetId && msk.hours < 12) {
    return; // Еще слишком рано
  }

  // Ищем пользователей, которым сегодня уведомление еще не уходило
  const query = targetId ? { telegramId: targetId } : { lastNotificationDate: { $ne: todayStr } };
  
  try {
    const users = await User.find(query);
    const comparisonDate = new Date(msk.fullDate);
    comparisonDate.setUTCHours(0, 0, 0, 0);

    for (const user of users) {
      const subs = user.state.subscriptions || [];
      const transactions = user.state.transactions || [];
      const debts = user.state.debts || [];
      const currency = user.state.profile?.currency || '₽';
      let notificationsSent = 0;

      // 1. Подписки
      for (const sub of subs) {
        if (!sub.isActive || !sub.nextPaymentDate) continue;
        const payDate = new Date(sub.nextPaymentDate);
        payDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.round((payDate.getTime() - comparisonDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === sub.reminderDays) {
          try {
            await bot.api.sendMessage(user.telegramId, 
              `🔔 <b>Напоминание о подписке!</b>\n\n${diffDays === 0 ? 'Сегодня' : 'Через ' + diffDays + ' дн.'} списание: <b>${sub.name}</b>\nСумма: <code>${sub.amount} ${currency}</code>`, 
              { parse_mode: 'HTML' }
            );
            notificationsSent++;
          } catch (e) {}
        }
      }

      // 2. Планируемые транзакции (на завтра)
      for (const item of transactions.filter(t => t.isPlanned)) {
        const itemDate = new Date(item.date);
        itemDate.setHours(0, 0, 0, 0);
        const diff = Math.round((itemDate.getTime() - comparisonDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diff === 1) {
          try {
            await bot.api.sendMessage(user.telegramId, 
              `📅 <b>План на завтра:</b>\n\nНе забудьте: <b>${item.note || 'Платеж'}</b>\nСумма: <code>${item.amount} ${currency}</code>`, 
              { parse_mode: 'HTML' }
            );
            notificationsSent++;
          } catch (e) {}
        }
      }

      // 3. Долги (на завтра)
      for (const debt of debts) {
        if (!debt.dueDate) continue;
        const dueDate = new Date(debt.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diff = Math.round((dueDate.getTime() - comparisonDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diff === 1) {
          try {
            await bot.api.sendMessage(user.telegramId, 
              `🤝 <b>Напоминание по долгу:</b>\n\nЗавтра дата платежа: <b>${debt.personName}</b>\nСумма: <code>${debt.amount} ${currency}</code>`, 
              { parse_mode: 'HTML' }
            );
            notificationsSent++;
          } catch (e) {}
        }
      }

      // Отмечаем пользователя как "уведомленного сегодня" по МСК
      if (!targetId) {
        await User.updateOne({ _id: user._id }, { lastNotificationDate: todayStr });
      }
    }
  } catch (err) {
    console.error('CheckReminders Error:', err);
  }
}

// Проверяем время каждые 30 минут для точности
setInterval(() => {
  checkReminders();
}, 30 * 60 * 1000);

// Первая проверка через 15 секунд после запуска сервера
setTimeout(checkReminders, 15000);

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
