// ai/server.js
import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Инициализация OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Эндпоинт генерации теста
router.post('/', async (req, res) => {
  const { material, questionCount } = req.body;

  if (!material || !questionCount) {
    return res.status(400).json({ error: 'Material and questionCount are required' });
  }

  try {
    const prompt = `
      Create ${questionCount} multiple-choice questions based on the following study material.
      Each question must have 4 answers and mark the correct one.
      Format the response as a JSON array like this:
      [{ "text": "...", "answers": ["...", "...", "...", "..."], "correctAnswer": 0 }]
      
      Study material:
      ${material}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    const text = response.choices[0].message.content;

    let questions;
    try {
      questions = JSON.parse(text);
    } catch (err) {
      console.error('Failed to parse AI response:', text);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    res.json({ questions });

  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

export default router;
