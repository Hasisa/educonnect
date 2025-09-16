import express from "express";
// import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// // Создаем OpenAI клиент
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// // Функция с retry при 429
// async function createChatCompletion(message, retries = 3) {
//   try {
//     const completion = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [{ role: "user", content: message }],
//     });

//     const aiResponse = completion.choices[0]?.message?.content;
//     if (!aiResponse) throw new Error("AI returned empty response");

//     return aiResponse;
//   } catch (err) {
//     // Если лимит превышен
//     if (err.status === 429 && retries > 0) {
//       console.warn("⏳ 429 Too Many Requests, retrying in 2s...");
//       await new Promise((resolve) => setTimeout(resolve, 2000));
//       return createChatCompletion(message, retries - 1);
//     }
//     throw err;
//   }
// }

router.post("/", async (req, res) => {
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    // const aiResponse = await createChatCompletion(message);
    // res.json({ response: aiResponse });

    // Временно возвращаем простой ответ, чтобы сервер не падал
    process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (reason, promise) => console.error('Unhandled Rejection at:', promise, 'reason:', reason));
    res.json({ response: "✅ Server is working, OpenAI calls are disabled for now." });
  } catch (err) {
    console.error("🔥 OpenAI API error:", err);
    res.status(500).json({ error: "AI chat failed" });
  }
});

export default router;
