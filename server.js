
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
    
    // Используем Inline Keyboard вместо обычной Reply Keyboard
    const inlineKeyboard = new InlineKeyboard()
      .webApp('Открыть кошелек 💳', process.env.APP_URL || '');

    await ctx.reply(
      `Привет, <b>${first_name}</b>! 💰\n\nТвой личный финансовый помощник FinFlow готов к работе. Отслеживай расходы, планируй бюджет и копи на цели прямо здесь.`, 
      { 
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard 
      }
    );
  } catch (err) {
    console.error('Bot Command Error:', err);
  }
});

if (BOT_TOKEN) {
  app.use(`/api/bot/${BOT_TOKEN}`, webhookCallback(bot, 'express'));
}

// --- API Endpoints ---
app.get('/api/user-state/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    let user = await User.findOne({ telegramId: userId });
    
    // Если пользователь не найден, создаем пустой профиль сразу
    if (!user) {
      user = await User.create({
        telegramId: userId,
        state: { profile: { name: 'Пользователь', currency: '₽' } }
      });
    }
    
    res.json({ state: user.state });
  } catch (err) {
    console.error("GET user-state error:", err);
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

// --- Serving Build Assets ---
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.use(express.static(__dirname));
  app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  if (process.env.APP_URL && BOT_TOKEN) {
    try {
      await bot.api.setWebhook(`${process.env.APP_URL}/api/bot/${BOT_TOKEN}`);
      console.log(`📡 Webhook set to: ${process.env.APP_URL}/api/bot/${BOT_TOKEN}`);
    } catch (err) {
      console.error('❌ Webhook error:', err);
    }
  }
});
