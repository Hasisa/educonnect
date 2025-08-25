import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  const { term } = req.body;
  if (!term) return res.status(400).json({ error: "Term is required" });

  try {
    const prompt = `
Explain the term "${term}" strictly as JSON:
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
      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch {
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

export default router;
