import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// OPTIONS для preflight
router.options("/", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "https://educonnectforum.web.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});

router.post("/", async (req, res) => {
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: "user", content: message }],
      temperature: 0.7
    });

    const reply = response.choices[0].message.content.trim();

    // CORS заголовки для фронтенда
    res.setHeader("Access-Control-Allow-Origin", "https://educonnectforum.web.app");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    res.json({ reply });
  } catch (err) {
    console.error("AI chat error:", err);
    res.status(500).json({ error: "AI chat failed" });
  }
});

export default router;
