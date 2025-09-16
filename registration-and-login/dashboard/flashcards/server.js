import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

// OPTIONS preflight для CORS
router.options('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://educonnectforum.web.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// POST endpoint для AI
router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }]
      })
    });

    const data = await response.json();

    // Если сервер вернул ошибку
    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({
          error: 'Слишком много запросов. Подождите несколько секунд и попробуйте снова.'
        });
      }
      return res
        .status(response.status)
        .json({ error: data.error?.message || 'OpenAI API error' });
    }

    // Успешный ответ
    const aiText = data.choices?.[0]?.message?.content || '⚠️ Нет ответа';

    // CORS заголовки для фронтенда
    res.setHeader('Access-Control-Allow-Origin', 'https://educonnectforum.web.app');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    res.json({ response: aiText });

  } catch (err) {
    console.error('❌ AI server error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
