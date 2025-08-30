// registration-and-login/dashboard/quiz/server.js
import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Инициализация OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// OPTIONS preflight для CORS
router.options('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://educonnectforum.web.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// POST endpoint для генерации теста
router.post('/', async (req, res) => {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', 'https://educonnectforum.web.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const { material, questionCount } = req.body;

  if (!material || !questionCount) {
    return res.status(400).json({ error: 'Material and questionCount are required' });
  }

  try {
    const prompt = `
Create ${questionCount} multiple-choice questions based on the following study material.
Each question must have 4 answers and mark the correct one.
Please ONLY return a JSON array, nothing else. Format strictly as:
[{"text":"Question 1","answers":["Answer1","Answer2","Answer3","Answer4"],"correctAnswer":0}]
Do NOT add any comments or explanations.

Study material:
${material}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    const text = response.choices[0].message.content;
    console.log("AI raw response:", text); // Логируем полный ответ AI

    let questions;

    try {
      // Пытаемся извлечь первый JSON массив из текста AI
      const jsonMatch = text.match(/\[.*\]/s);
      if (!jsonMatch) throw new Error("AI response does not contain a valid JSON array");

      questions = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(questions)) throw new Error("Parsed JSON is not an array");
    } catch (err) {
      console.error('Failed to parse AI response:', err.message);
      return res.status(500).json({ error: 'Failed to parse AI response from OpenAI', aiText: text });
    }

    res.json({ questions });

  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

export default router;
