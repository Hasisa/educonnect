import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

const FRONTEND_URL = "https://educonnectforum.web.app";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ⚠ Глобальный CORS middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", FRONTEND_URL);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// POST /api/ai
app.post("/api/ai", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini", // оптимально для бесплатного API
      messages: [{ role: "user", content: message }],
      temperature: 0.7,
      max_tokens: 600,
    });

    const reply = response.choices?.[0]?.message?.content?.trim() || "Нет ответа от AI";
    res.json({ reply });
  } catch (err) {
    console.error("AI chat error:", err);
    res.status(500).json({ error: `AI chat failed: ${err.message}` });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
