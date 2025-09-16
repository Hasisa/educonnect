// Main server entry point for EduConnect backend
import express from "express";
import cors from "cors";

import aiRouter from "./registration-and-login/dashboard/aichat/server.js";
import flashcardsRouter from "./registration-and-login/dashboard/flashcards/server.js";
import quizRouter from "./registration-and-login/dashboard/quiz/server.js";
import dictionaryRouter from "./registration-and-login/dashboard/dictionary/server.js";
import generateRouter from "./registration-and-login/dashboard/creative/server.js";

const app = express();

app.use(cors({
  origin: "https://educonnectforum.web.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

app.use("/api/ai", aiRouter);
app.use("/api/flashcards", flashcardsRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/dictionary", dictionaryRouter);
app.use("/api/generate", generateRouter);

app.get("/", (req, res) => {
  res.send("✅ Server is running!");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
