// ai/server.js
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const router = express.Router();

// --- CORS для этого роутера ---
const allowedOrigins = [
  "https://educonnectforum.web.app", // фронтенд
  "http://localhost:3000"            // локальная разработка
];

router.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

router.use(express.json()); // Для парсинга JSON тела запроса

// --- OpenAI ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- POST /api/ai ---
router.post("/", async (req, res) => {
  const { term } = req.body;
  if (!term) return res.status(400).json({ error: "Term is required" });

  try {
    const prompt = `
Explain the term "${term}" strictly as JSON in the following format:
{
  "term": "${term}",
  "definition": "...",
  "relatedTerms": ["..."]
}
  and only with human words,no code or markup
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    const content = response.choices[0].message.content.trim();

    try {
      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch (err) {
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

// --- Экспорт роутера для импорта в основной сервер ---
export default router;
