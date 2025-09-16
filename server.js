import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Создаем OpenAI клиент
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/", async (req, res) => {
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // или gpt-4o-mini
      messages: [{ role: "user", content: message }],
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      console.error("❌ OpenAI returned empty response:", completion);
      return res.status(500).json({ error: "AI returned empty response" });
    }

    res.json({ response: aiResponse });
  } catch (err) {
    console.error("🔥 OpenAI API error:", err);
    res.status(500).json({ error: "AI chat failed" });
  }
});

export default router;
