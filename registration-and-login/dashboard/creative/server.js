// generate/server.js
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

// Генерация осмысленной mindmap через OpenAI
async function generateMindMap(topic) {
  const prompt = `
Generate a complete and detailed mindmap for someone to become a genius in "${topic}".
- Include all key areas, subtopics, and meaningful details.
- Use the following format:
Branch: Main branch title
  Subtopic: Subtopic title
    Detail: One meaningful detail or explanation
- Output only the text in the exact format above, without extra explanation or commentary.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  return response.choices?.[0]?.message?.content?.trim() || '⚠️ No response from AI';
}

// Генерация diagram для Excalidraw
async function generateDiagram(topic) {
  const prompt = `
Generate a visual diagram (for Excalidraw) representing the topic "${topic}".
- Output valid JSON with rectangles, ellipses, arrows, and text elements.
- Include positions, width, height, strokeColor, backgroundColor, text, fontSize.
- Example output:
[
  { "id": "1", "type": "rectangle", "x": 100, "y": 100, "width": 200, "height": 100, "backgroundColor": "#dbeafe", "strokeColor": "#2563eb", "strokeWidth": 2 },
  { "id": "2", "type": "text", "x": 150, "y": 135, "width": 100, "height": 30, "text": "Main Concept", "fontSize": 16, "textAlign": "center", "verticalAlign": "middle" }
]
- Output JSON only.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  try {
    return JSON.parse(response.choices[0].message.content.trim());
  } catch (err) {
    console.error('Diagram parse error:', err);
    return generateMockDiagram(topic);
  }
}

// Генерация chart для Chart.js
async function generateChart(topic) {
  const prompt = `
Generate a Chart.js configuration (JSON) for the topic "${topic}".
- Include type, data (labels, datasets), options (responsive, plugins, scales).
- Make it meaningful for the topic.
- Output JSON only.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  try {
    return JSON.parse(response.choices[0].message.content.trim());
  } catch (err) {
    console.error('Chart parse error:', err);
    return generateMockChart(topic);
  }
}

// Mock diagram
function generateMockDiagram(topic) {
  return [
    { id: "1", type: "rectangle", x: 100, y: 100, width: 200, height: 100, backgroundColor: "#dbeafe", strokeColor: "#2563eb", strokeWidth: 2 },
    { id: "2", type: "text", x: 150, y: 135, width: 100, height: 30, text: topic, fontSize: 16, textAlign: "center", verticalAlign: "middle" }
  ];
}

// Mock chart
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
