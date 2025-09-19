// generate/server.js
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import JSON5 from 'json5';

const router = express.Router();
router.use(express.json());

// ⚡ CORS для фронтенда
router.use(cors({
  origin: 'https://educonnectforum.web.app',
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));

// OPTIONS preflight
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://educonnectforum.web.app');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// Инициализация OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- POST endpoint для генерации ---
router.post('/', async (req, res) => {
  try {
    const { topic, type } = req.body;
    if (!topic || !type) return res.status(400).json({ error: 'Topic and type are required' });

    let result;
    switch(type.toLowerCase()) {
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

  } catch (err) {
    console.error('Generation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Safe JSON parse ---
function safeParseJSON(str) {
  try {
    return JSON5.parse(str.trim());
  } catch (err) {
    console.error('JSON parse error:', err, str);
    return null;
  }
}

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
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
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
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });

  return safeParseJSON(response.choices[0].message.content) || generateMockDiagram(topic);
}

// --- Chart ---
async function generateChart(topic) {
  const prompt = `
Generate a Chart.js configuration (JSON) for the topic "${topic}".
- Include 5-7 meaningful subtopics for this topic.
- For each subtopic, assign a numeric value representing its importance or relevance (10-100).
- Dataset label: "${topic}".
- Chart type: bar chart.
- Include chart title: "${topic} - Learning Importance".
- Output ONLY valid JSON, no explanations or markdown.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const parsed = safeParseJSON(response.choices[0].message.content);
    return parsed || generateMockChart(topic);

  } catch (err) {
    console.error('Chart generation error:', err);
    return generateMockChart(topic);
  }
}

// --- Mock Diagram ---
function generateMockDiagram(topic) {
  return [
    { type: 'rectangle', x: 50, y: 50, width: 100, height: 50, text: `${topic} Main` },
    { type: 'ellipse', x: 200, y: 50, width: 80, height: 50, text: 'Sub 1' },
    { type: 'ellipse', x: 200, y: 150, width: 80, height: 50, text: 'Sub 2' },
    { type: 'arrow', start: {x: 150, y: 75}, end: {x: 200, y: 75} },
    { type: 'arrow', start: {x: 150, y: 75}, end: {x: 200, y: 175} }
  ];
}

// --- Mock Chart ---
function generateMockChart(topic) {
  const categories = ['Subtopic 1','Subtopic 2','Subtopic 3','Subtopic 4','Subtopic 5'];
  const values = categories.map(() => Math.floor(Math.random() * 90) + 10);

  return {
    type: 'bar',
    data: { labels: categories, datasets: [{ label: topic, data: values, backgroundColor: ['#2563eb','#3b82f6','#60a5fa','#93c5fd','#dbeafe'] }] },
    options: { responsive: true, plugins: { title: { display: true, text: `${topic} - Key Metrics` } } }
  };
}

export default router;
