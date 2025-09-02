// ai/server.js
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Разрешаем CORS для фронтенда
const allowedOrigins = [
  "https://educonnectforum.web.app", // твой фронтенд
  "http://localhost:3000"            // локальная разработка
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json()); // Для парсинга JSON тела запроса

// Инициализация OpenAI один раз
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/ai
app.post("/api/ai", async (req, res) => {
  const { term } = req.body;
  if (!term) return res.status(400).json({ error: "Term is required" });

  try {
    const prompt = `
Explain the term "${term}" strictly as JSON in the following format:
{
  "term": "${term}",
  "definition": "...",
  "formula": "...",
  "relatedTerms": ["..."]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    const content = response.choices[0].message.content.trim();

    try {
      // Попытка парсинга как JSON
      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch (err) {
      // Если JSON невалидный, возвращаем fallback
      console.warn("Failed to parse AI response as JSON:", err, content);
      res.json({
        term,
        definition: content,
        formula: null,
        relatedTerms: []
      });
    }
  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ error: "AI explanation failed" });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`AI server running on port ${PORT}`);
});
