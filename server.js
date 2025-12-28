
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { Bot, Keyboard, webhookCallback } = require('grammy');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

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
const bot = new Bot(process.env.BOT_TOKEN);

bot.command('start', async (ctx) => {
  const { id, first_name } = ctx.from;
  try {
    let user = await User.findOne({ telegramId: id });
    if (!user) {
      await User.create({
        telegramId: id,
        firstName: first_name,
        state: {
          profile: { name: first_name, currency: '₽' }
        }
      });
    }
    
    const keyboard = new Keyboard()
      .webApp('Открыть Кошелек 💳', process.env.APP_URL)
      .resized();

    await ctx.reply(`Привет, ${first_name}! 💰\n\nТвой финансовый помощник готов к работе.`, {
      reply_markup: keyboard
    });
  } catch (err) {
    console.error('Bot Command Error:', err);
  }
});

// Настройка Webhook эндпоинта
// Используем BOT_TOKEN в пути для безопасности (никто не угадает URL)
app.use(`/api/bot/${process.env.BOT_TOKEN}`, webhookCallback(bot, 'express'));

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
    if (data.error) throw new Error(data.error.message || 'Mistral API Error');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user-state/:id', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: parseInt(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    let finalState = { ...user.state };
    if (user.partnerId) {
      const partner = await User.findOne({ telegramId: user.partnerId });
      if (partner) {
        const jointTxs = partner.state.transactions.filter(t => t.isJoint);
        finalState.transactions = [...finalState.transactions, ...jointTxs];
      }
    }
    res.json({ state: finalState });
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

app.post('/api/pair-users', async (req, res) => {
  const { myId, partnerId } = req.body;
  try {
    const partner = await User.findOne({ telegramId: parseInt(partnerId) });
    if (!partner) return res.status(404).json({ error: 'Партнер не найден' });
    await User.findOneAndUpdate({ telegramId: myId }, { partnerId: parseInt(partnerId) });
    await User.findOneAndUpdate({ telegramId: parseInt(partnerId) }, { partnerId: myId });
    res.json({ success: true, partnerName: partner.firstName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname)));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Установка вебхука при запуске сервера
  if (process.env.APP_URL) {
    const webhookUrl = `${process.env.APP_URL}/api/bot/${process.env.BOT_TOKEN}`;
    try {
      await bot.api.setWebhook(webhookUrl);
      console.log(`📡 Webhook set to: ${webhookUrl}`);
    } catch (err) {
      console.error('❌ Failed to set webhook:', err);
    }
  } else {
    console.warn('⚠️ APP_URL not set. Webhook not configured.');
  }
});
