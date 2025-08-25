// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  themeVariables: {
    primaryColor: '#2563eb',
    primaryTextColor: '#1e293b',
    primaryBorderColor: '#3b82f6',
    lineColor: "#64748b",
  }
});

const API_URL = 'https://school-forumforschool.onrender.com/api/generate';

// Преобразует текст GPT → корректный Mermaid mindmap
function textToMermaidMindmap(text, topic = "Topic") {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return '';

  // Заменяем скобки на дефисы, чтобы Mermaid не ломался
  const safeTopic = topic.replace(/[()]/g, '-');

  let mermaidCode = `mindmap\n  root((${safeTopic}))`;

  for (let line of lines) {
    const safeLine = line.replace(/[()]/g, '-');
    if (/^Branch/i.test(line)) {
      mermaidCode += `\n    ${safeLine.replace(/^Branch[:]?/i, '').trim()}`;
    } else if (/^Subtopic/i.test(line)) {
      mermaidCode += `\n      ${safeLine.replace(/^Subtopic[:]?/i, '').trim()}`;
    } else if (/^Detail/i.test(line)) {
      mermaidCode += `\n        ${safeLine.replace(/^Detail[:]?/i, '').trim()}`;
    }
  }

  return mermaidCode;
}

class CreativeTools {
  constructor() {
    this.currentVisualization = null;
    this.currentType = null;
    this.excalidrawAPI = null;
    this.currentChart = null;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const topicInput = document.getElementById('topicInput');

    generateBtn.addEventListener('click', () => this.handleGenerate());
    downloadBtn.addEventListener('click', () => this.handleDownload());

    topicInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleGenerate();
    });
  }

  async handleGenerate() {
    const topicInput = document.getElementById('topicInput');
    const typeSelect = document.getElementById('typeSelect');
    const topic = topicInput.value.trim();

    if (!topic) return this.showError('Please enter a topic or data');

    const type = typeSelect.value;
    this.currentType = type;

    this.showLoading();

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, type })
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      await this.renderVisualization(type, data.result, topic);

    } catch (error) {
      console.error('Generation error:', error);
      this.showError(`Failed to generate visualization: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  async renderVisualization(type, data, topic) {
    this.hideAllVisualizationContainers();
    const vizArea = document.getElementById('visualizationArea');
    const vizTitle = document.getElementById('vizTitle');
    vizTitle.textContent = `${this.capitalizeFirst(type)}: ${topic}`;

    try {
      switch (type) {
        case 'mindmap':
          await this.renderMermaid(data, topic);
          break;
        case 'diagram':
          await this.renderExcalidraw(data);
          break;
        case 'chart':
          await this.renderChart(data);
          break;
        default:
          throw new Error('Unknown visualization type');
      }
      vizArea.style.display = 'block';
      this.currentVisualization = data;

    } catch (error) {
      console.error('Render error:', error);
      this.showError(`Failed to render ${type}: ${error.message}`);
    }
  }

  async renderMermaid(data, topic) {
    const container = document.getElementById('mermaidContainer');
    const div = document.getElementById('mermaidDiv');
    div.innerHTML = '';

    try {
      let mermaidCode = typeof data === 'string' ? data : data.mermaid || data.code || '';
      if (!mermaidCode.includes('mindmap')) {
        mermaidCode = textToMermaidMindmap(mermaidCode, topic);
      }

      if (!mermaidCode) throw new Error('No Mermaid code provided');

      const id = 'mermaid-' + Date.now();
      const { svg } = await mermaid.render(id, mermaidCode);
      div.innerHTML = svg;
      container.style.display = 'block';

    } catch (error) {
      console.error('Mermaid rendering error:', error);
      div.innerHTML = `<div style="padding:2rem;color:#64748b;text-align:center;">Invalid Mermaid diagram format</div>`;
      container.style.display = 'block';
    }
  }

  async renderExcalidraw(data) {
    const container = document.getElementById('excalidrawContainer');
    const div = document.getElementById('excalidrawDiv');
    div.innerHTML = '';

    try {
      const elements = Array.isArray(data) ? data : data.elements || [];

      // Ждём, пока React и Excalidraw загрузятся
      const waitForExcalidraw = () => new Promise(resolve => {
        const interval = setInterval(() => {
          if (window.React && window.ReactDOM && window.Excalidraw) {
            clearInterval(interval);
            resolve();
          }
        }, 50);
      });

      await waitForExcalidraw();

      const excalidrawWrapper = React.createElement(
        window.Excalidraw.Excalidraw,
        {
          initialData: { elements },
          viewModeEnabled: true,
          ref: api => { this.excalidrawAPI = api; }
        }
      );

      window.ReactDOM.render(excalidrawWrapper, div);
      container.style.display = 'block';

    } catch (error) {
      console.error('Excalidraw rendering error:', error);
      div.innerHTML = `<div style="padding:2rem;text-align:center;color:#64748b;">
        <p>Diagram generated successfully!</p>
        <p>Data: ${JSON.stringify(data, null, 2)}</p>
      </div>`;
      container.style.display = 'block';
    }
  }

  async renderChart(data) {
    const container = document.getElementById('chartContainer');
    const canvas = document.getElementById('chartCanvas');

    try {
      if (this.currentChart) this.currentChart.destroy();
      const chartConfig = typeof data === 'object' ? data : JSON.parse(data);
      if (!chartConfig.type || !chartConfig.data) throw new Error('Invalid chart configuration');

      const ctx = canvas.getContext('2d');
      this.currentChart = new Chart(ctx, {
        ...chartConfig,
        options: {
          ...chartConfig.options,
          responsive: true,
          maintainAspectRatio: false,
        }
      });
      container.style.display = 'block';

    } catch (error) {
      console.error('Chart rendering error:', error);
      throw new Error('Invalid chart data format');
    }
  }

  async handleDownload() {
    if (!this.currentVisualization || !this.currentType) return this.showError('No visualization to download');
    try {
      let element;
      switch (this.currentType) {
        case 'mindmap': element = document.getElementById('mermaidDiv'); break;
        case 'diagram': element = document.getElementById('excalidrawDiv'); break;
        case 'chart': element = document.getElementById('chartContainer'); break;
        default: throw new Error('Unknown visualization type');
      }
      if (!element) throw new Error('Visualization element not found');

      const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2, logging: false });
      const link = document.createElement('a');
      link.download = `${this.currentType}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      this.showSuccess('Visualization downloaded successfully!');

    } catch (error) {
      console.error('Download error:', error);
      this.showError('Failed to download visualization');
    }
  }

  hideAllVisualizationContainers() {
    document.getElementById('mermaidContainer').style.display = 'none';
    document.getElementById('excalidrawContainer').style.display = 'none';
    document.getElementById('chartContainer').style.display = 'none';
  }

  showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('visualizationArea').style.display = 'none';
    document.getElementById('generateBtn').disabled = true;
  }

  hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('generateBtn').disabled = false;
  }

  showError(message) { this.showMessage(message, 'error'); }
  showSuccess(message) { this.showMessage(message, 'success'); }

  showMessage(message, type) {
    document.querySelectorAll('.error, .success').forEach(msg => msg.remove());
    const messageDiv = document.createElement('div');
    messageDiv.className = type;
    messageDiv.textContent = message;
    document.querySelector('.controls').appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 5000);
  }

  capitalizeFirst(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => { new CreativeTools(); });

// ✅ Подключаем React 18 и Excalidraw UMD
if (!window.React) {
  const script1 = document.createElement('script');
  script1.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
  document.head.appendChild(script1);

  const script2 = document.createElement('script');
  script2.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
  document.head.appendChild(script2);

  const script3 = document.createElement('script');
  script3.src = 'https://unpkg.com/@excalidraw/excalidraw/dist/excalidraw.production.min.js';
  document.head.appendChild(script3);
}

