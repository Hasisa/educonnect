import express from "express";
import cors from "cors";

import aiRouter from "./registration-and-login/dashboard/ai/server.js";
import flashcardsRouter from "./registration-and-login/dashboard/flashcards/server.js";
import quizRouter from "./registration-and-login/dashboard/quiz/server.js";
import dictionaryRouter from "./registration-and-login/dashboard/dictionary/server.js";

const app = express();

app.use(cors({
  origin: "https://educonnect-958e2.web.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

app.use("/api/ai", aiRouter);
app.use("/api/flashcards", flashcardsRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/dictionary", dictionaryRouter);

app.get("/", (req, res) => {
  res.send("✅ Server is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
