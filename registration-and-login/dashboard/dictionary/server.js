// ai/server.js
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Эндпоинт AI объяснения
router.post("/ai-explain", async (req, res) => {
  const { term } = req.body;
  if (!term) return res.status(400).json({ error: "Term is required" });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: `Explain "${term}" strictly as JSON:
{
  "term": "${term}",
  "definition": "...",
  "formula": "...",
  "relatedTerms": ["..."]
}`
      }]
    });

    const content = response.choices[0].message.content;

    try {
      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch {
      res.json({ term, definition: content, formula: null, relatedTerms: [] });
    }
  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ error: "AI explanation failed" });
  }
});

export default router;
