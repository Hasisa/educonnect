import express from 'express';

const router = express.Router();

// Middleware для JSON
router.use(express.json());

// Mock AI генерация
router.post('/', async (req, res) => {
  try {
    const { topic, type } = req.body;

    if (!topic || !type) {
      return res.status(400).json({ error: 'Topic and type are required' });
    }

    const result = generateMockVisualization(topic, type);

    // Имитируем задержку API
    setTimeout(() => {
      res.json({ result });
    }, 1000);

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Функция генерации в зависимости от типа
function generateMockVisualization(topic, type) {
  switch (type) {
    case 'mindmap': return generateMockMindMap(topic);
    case 'diagram': return generateMockDiagram(topic);
    case 'chart': return generateMockChart(topic);
    default: throw new Error('Unknown type');
  }
}

// Mock Mermaid mind map
function generateMockMindMap(topic) {
  return `mindmap
  root((${topic}))
    Branch1
      Subtopic1
        Detail1
        Detail2
      Subtopic2
        Detail3
        Detail4
    Branch2
      Subtopic3
        Detail5
        Detail6
      Subtopic4
        Detail7
        Detail8
    Branch3
      Subtopic5
        Detail9
        Detail10
      Subtopic6
        Detail11
        Detail12`;
}

// Mock Excalidraw diagram
function generateMockDiagram(topic) {
  return [
    {
      id: "1",
      type: "rectangle",
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      backgroundColor: "#dbeafe",
      strokeColor: "#2563eb",
      strokeWidth: 2
    },
    {
      id: "2",
      type: "text",
      x: 150,
      y: 135,
      width: 100,
      height: 30,
      text: topic,
      fontSize: 16,
      textAlign: "center",
      verticalAlign: "middle"
    },
    {
      id: "3",
      type: "rectangle",
      x: 400,
      y: 100,
      width: 200,
      height: 100,
      backgroundColor: "#f0f9ff",
      strokeColor: "#0ea5e9",
      strokeWidth: 2
    },
    {
      id: "4",
      type: "text",
      x: 450,
      y: 135,
      width: 100,
      height: 30,
      text: "Related Concept",
      fontSize: 16,
      textAlign: "center",
      verticalAlign: "middle"
    },
    {
      id: "5",
      type: "arrow",
      x: 300,
      y: 150,
      width: 100,
      height: 0,
      startBinding: { elementId: "1", focus: 0.5, gap: 0 },
      endBinding: { elementId: "3", focus: 0.5, gap: 0 },
      strokeColor: "#64748b",
      strokeWidth: 2
    }
  ];
}

// Mock Chart.js data
function generateMockChart(topic) {
  const categories = ['Category A','Category B','Category C','Category D','Category E'];
  const values = categories.map(() => Math.floor(Math.random() * 100) + 10);

  return {
    type: 'bar',
    data: {
      labels: categories,
      datasets: [{
        label: topic,
        data: values,
        backgroundColor: ['#2563eb','#3b82f6','#60a5fa','#93c5fd','#dbeafe'],
        borderColor: ['#1e40af','#2563eb','#3b82f6','#60a5fa','#93c5fd'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: `${topic} - Data Visualization`, color: '#1e293b', font: { size: 16, weight: 'bold' } },
        legend: { display: true, position: 'top' }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Values', color: '#64748b' } },
        x: { title: { display: true, text: 'Categories', color: '#64748b' } }
      }
    }
  };
}

export default router;
