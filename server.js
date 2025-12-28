
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Bot, Keyboard, webhookCallback } from 'grammy';
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
    const keyboard = new Keyboard().webApp('Открыть Кошелек 💳', process.env.APP_URL || '').resized();
    await ctx.reply(`Привет, ${first_name}! 💰\nТвой финансовый помощник готов.`, { reply_markup: keyboard });
  } catch (err) {
    console.error('Bot Command Error:', err);
  }
});

if (BOT_TOKEN) {
  app.use(`/api/bot/${BOT_TOKEN}`, webhookCallback(bot, 'express'));
}

// --- API Endpoints ---
app.post('/api/ai/chat', async (req, res) => {
  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user-state/:id', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: parseInt(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ state: user.state });
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

// --- Serving Build Assets ---
const distPath = path.join(__dirname, 'dist');

// Если мы в продакшене (папка dist существует)
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // Важно для SPA: любые маршруты, которые не API, отдают index.html
  app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Для разработки, если dist еще нет
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
