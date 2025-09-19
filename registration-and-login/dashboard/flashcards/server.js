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

// POST endpoint для AI (объяснение как флэшкарта)
router.post('/', async (req, res) => {
  const topic = req.body.topic?.trim();
  if (!topic) return res.status(400).json({ error: 'Topic is required' });

  try {
    const prompt = `
Explain the topic "${topic}" as a flashcard:
- Give a clear question.
- Provide a concise answer.
- Keep it short and easy to memorize.
    `.trim();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    const data = await response.json();

    // Логируем для отладки
    console.log('OpenAI raw response:', data);

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: data.error?.message || 'OpenAI API error' });
    }

    const aiText = data.choices?.[0]?.message?.content?.trim() || '⚠️ Нет ответа';

    // CORS заголовки для фронтенда
    res.setHeader('Access-Control-Allow-Origin', 'https://educonnectforum.web.app');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    res.json({ flashcard: aiText });

  } catch (err) {
    console.error('❌ AI server error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
