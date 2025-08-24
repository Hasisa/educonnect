import express from "express";
import cors from "cors";

import aiRouter from "./registration-and-login/dashboard/ai/server.js"
import flashcardsRouter from "./registration-and-login/dashboard/flashcards/server.js";
import quizRouter from "./registration-and-login/dashboard/quiz/server.js";
import dictionaryRouter from "./registration-and-login/dashboard/dictionary/server.js";

const app = express();
app.use(cors());
app.use(express.json());

// Подключаем каждый модуль
app.use("/api/ai", aiRouter);
app.use("/api/flashcards", flashcardsRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/dictionary", dictionaryRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
