import express from 'express';
import OpenAI from 'openai';

const router = express.Router();
router.use(express.json());

// Инициализация OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Основной маршрут генерации
router.post('/', async (req, res) => {
  try {
    const { topic, type } = req.body;

    if (!topic || !type) {
      return res.status(400).json({ error: 'Topic and type are required' });
    }

    let result;
    switch (type) {
      case 'mindmap':
        result = await generateMindMap(topic);
        break;
      case 'diagram':
        result = generateMockDiagram(topic);
        break;
      case 'chart':
        result = generateMockChart(topic);
        break;
      default:
        throw new Error('Unknown type');
    }

    res.json({ result });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Генерация осмысленной mindmap через OpenAI
async function generateMindMap(topic) {
  const prompt = `
Generate a complete and detailed mindmap for someone to become a genius in "${topic}".
- Include all key areas, subtopics, and meaningful details.
- Use the following format:
Branch: Main branch title
  Subtopic: Subtopic title
    Detail: One meaningful detail or explanation
- Generate as many branches, subtopics, and details as necessary to cover the topic comprehensively.
- Output only the text in the exact format above, without extra explanation or commentary.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const text = response.choices[0].message.content.trim();
  return text;
}

// Mock Excalidraw diagram
function generateMockDiagram(topic) {
  return [
    { id: "1", type: "rectangle", x: 100, y: 100, width: 200, height: 100, backgroundColor: "#dbeafe", strokeColor: "#2563eb", strokeWidth: 2 },
    { id: "2", type: "text", x: 150, y: 135, width: 100, height: 30, text: topic, fontSize: 16, textAlign: "center", verticalAlign: "middle" }
  ];
}

// Mock Chart.js data
function generateMockChart(topic) {
  const categories = ['Category A','Category B','Category C','Category D','Category E'];
  const values = categories.map(() => Math.floor(Math.random() * 100) + 10);

  return {
    type: 'bar',
    data: { labels: categories, datasets: [{ label: topic, data: values, backgroundColor: ['#2563eb','#3b82f6','#60a5fa','#93c5fd','#dbeafe'], borderColor: ['#1e40af','#2563eb','#3b82f6','#60a5fa','#93c5fd'], borderWidth: 1 }] },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: `${topic} - Data Visualization`, color: '#1e293b', font: { size: 16, weight: 'bold' } }, legend: { display: true, position: 'top' } },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'Values', color: '#64748b' } }, x: { title: { display: true, text: 'Categories', color: '#64748b' } } }
    }
  };
}

export default router;
