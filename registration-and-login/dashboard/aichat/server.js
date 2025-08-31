import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ⚠ Настройки CORS для фронтенда
const FRONTEND_URL = "https://educonnectforum.web.app";

// OPTIONS для preflight
router.options("/", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", FRONTEND_URL);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});

// POST - основной роут
router.post("/", async (req, res) => {
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const response = await openai.chat.completions.create({
      // Оптимальная модель для бесплатного API
      model: "gpt-5-mini", // можно заменить на "gpt-5-mini"
      messages: [{ role: "user", content: message }],
      temperature: 0.7,
      max_tokens: 600, // ограничение длины ответа
    });

    const reply = response.choices?.[0]?.message?.content?.trim() || "Нет ответа от AI";

    // CORS заголовки
    res.setHeader("Access-Control-Allow-Origin", FRONTEND_URL);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    res.json({ reply });
  } catch (err) {
    console.error("AI chat error:", err);
    res.status(500).json({ error: `AI chat failed: ${err.message}` });
  }
});

export default router;
