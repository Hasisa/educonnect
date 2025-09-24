import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const router = express.Router();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

// Настройка CORS для фронтенда
router.use(cors({
  origin: 'https://educonnectforum.web.app',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// POST endpoint для AI
router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const prompt = `
Explain the term "${message}" in terms of flashcards without any code or markup.
Provide the answer as:
- Term: ...
- Definition: ...
- Key points: ...
`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    let data;
    try {
      data = await response.json();
    } catch {
      return res.status(500).json({ error: 'Invalid response from OpenAI' });
    }

    if (!response.ok) {
      const errorMessage = data.error?.message || 'OpenAI API error';
      if (response.status === 429) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }
      return res.status(response.status).json({ error: errorMessage });
    }

    const aiText = data.choices?.[0]?.message?.content || '⚠️ No response';
    res.json({ response: aiText });

  } catch (err) {
    console.error('❌ AI server error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
