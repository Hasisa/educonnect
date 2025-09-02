// generate/server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import JSON5 from 'json5';

const router = express.Router();
router.use(express.json());

// ⚡ Настройка CORS
router.use(cors({
  origin: 'https://educonnectforum.web.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Инициализация OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Основной маршрут генерации ---
router.post('/', async (req, res) => {
  try {
    const { topic, type } = req.body;
    if (!topic || !type) return res.status(400).json({ error: 'Topic and type are required' });

    let result;
    switch (type.toLowerCase()) {
      case 'mindmap':
        result = await generateMindMap(topic);
        break;
      case 'diagram':
        result = await generateDiagram(topic);
        break;
      case 'chart':
        result = await generateChart(topic);
        break;
      default:
        return res.status(400).json({ error: 'Unknown type' });
    }

    res.json({ result });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Mindmap ---
async function generateMindMap(topic) {
  const prompt = `
Generate a complete and detailed mindmap for someone to become a genius in "${topic}".
Branch: Main branch title
  Subtopic: Subtopic title
    Detail: One meaningful detail
Output ONLY in this format, NO explanations.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  return response.choices?.[0]?.message?.content?.trim() || '⚠️ No response from AI';
}

// --- Diagram ---
async function generateDiagram(topic) {
  const prompt = `
Generate a visual diagram for Excalidraw representing the topic "${topic}".
Output valid JSON ONLY with objects: rectangle, ellipse, arrow, text.
Do NOT include explanations or markdown.
Limit to 5 elements maximum.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  return safeParseJSON(response.choices[0].message.content) || generateMockDiagram(topic);
}

// --- Chart ---
// --- Chart ---
async function generateChart(topic) {
  const prompt = `
Generate a Chart.js configuration (JSON) for the topic "${topic}".
- Choose 5 meaningful subtopics of "${topic}" as categories.
- Assign a numeric value (10-100) to each category representing importance, difficulty, or relevance for learning.
- Include dataset label as "${topic}".
- Include colors for bars and borders.
- Include chart title "${topic} - Key Metrics".
- Output ONLY valid JSON. No explanations, no markdown.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const parsed = safeParseJSON(response.choices[0].message.content);
    if (parsed) return parsed;

    // fallback
    return generateMockChart(topic);

  } catch (err) {
    console.error('Chart generation error:', err);
    return generateMockChart(topic);
  }
}

// --- Mock Chart (на случай ошибки) ---
function generateMockChart(topic) {
  const categories = ['Subtopic 1','Subtopic 2','Subtopic 3','Subtopic 4','Subtopic 5'];
  const values = categories.map(() => Math.floor(Math.random() * 100) + 10);

  return {
    type: 'bar',
    data: { labels: categories, datasets: [{ label: topic, data: values, backgroundColor: ['#2563eb','#3b82f6','#60a5fa','#93c5fd','#dbeafe'], borderColor: ['#1e40af','#2563eb','#3b82f6','#60a5fa','#93c5fd'], borderWidth: 1 }] },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: `${topic} - Key Metrics`, color: '#1e293b', font: { size: 16, weight: 'bold' } }, legend: { display: true, position: 'top' } },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'Importance / Difficulty', color: '#64748b' } }, x: { title: { display: true, text: 'Subtopics', color: '#64748b' } } }
    }
  };
}


export default router;
