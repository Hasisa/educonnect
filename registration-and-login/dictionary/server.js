// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/ai", async (req, res) => {
  try {
    const { query, type } = req.body;

    if (!query || !type) {
      return res.status(400).json({ error: "Missing query or type" });
    }

    if (type === "dictionary_search") {
      const prompt = `
        You are an educational assistant.
        Provide a short, clear definition and formula (if applicable) for the term: "${query}".

        ⚠️ VERY IMPORTANT: Return ONLY valid JSON (no markdown, no explanations, no text outside JSON).

        Format exactly like this:
        {
          "term": "string",
          "definition": "string",
          "formula": "string (optional)",
          "examples": ["string", "string"]
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 400,
      });

      let aiText = response.choices[0].message.content.trim();

      console.log("🔹 Raw AI response:", aiText);

      let aiResult;
      try {
        aiResult = JSON.parse(aiText);
      } catch (err) {
        console.error("⚠️ JSON parse error, fallback:", err.message);
        aiResult = { term: query, definition: aiText };
      }

      return res.json({ results: [aiResult] });
    }

    res.status(400).json({ error: "Unknown type" });
  } catch (error) {
    console.error("❌ AI error:", error);
    res.status(500).json({ error: "AI search failed" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ AI server running on port ${PORT}`);
});

