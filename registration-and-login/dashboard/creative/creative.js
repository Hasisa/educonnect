// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  themeVariables: {
    primaryColor: '#2563eb',
    primaryTextColor: '#1e293b',
    primaryBorderColor: '#3b82f6',
    lineColor: "#e64748b",
  }
});

const API_URL = 'https://school-forumforschool.onrender.com/api/generate';

// Преобразует простой текст в Mermaid mindmap
function textToMermaidMindmap(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length === 0) return '';

  let mermaidCode = 'mindmap\n  root';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let level = 1;

    if (/Subtopic/i.test(line)) level = 2;
    else if (/Detail/i.test(line)) level = 3;
    else if (/Branch/i.test(line)) level = 1;

    const indent = '  '.repeat(level);
    mermaidCode += `\n${indent}${line}`;
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
          await this.renderMermaid(data);
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

  async renderMermaid(data) {
    const container = document.getElementById('mermaidContainer');
    const div = document.getElementById('mermaidDiv');
    div.innerHTML = '';
    
    try {
      let mermaidCode = typeof data === 'string' ? data : data.mermaid || data.code || '';

      if (!mermaidCode.includes('mindmap')) {
        mermaidCode = textToMermaidMindmap(mermaidCode);
      }

      if (!mermaidCode) throw new Error('No Mermaid code provided');

      const id = 'mermaid-' + Date.now();
      const { svg } = await mermaid.render(id, mermaidCode);
      div.innerHTML = svg;
      container.style.display = 'block';
      
    } catch (error) {
      console.error('Mermaid rendering error:', error);
      throw new Error('Invalid Mermaid diagram format');
    }
  }

  async renderExcalidraw(data) {
    const container = document.getElementById('excalidrawContainer');
    const div = document.getElementById('excalidrawDiv');
    div.innerHTML = '';
    
    try {
      const elements = Array.isArray(data) ? data : data.elements || [];
      const excalidrawWrapper = React.createElement(
        window.ExcalidrawLib.Excalidraw,
        {
          initialData: { elements },
          isCollaborating: false,
          viewModeEnabled: true,
          zenModeEnabled: false,
          gridModeEnabled: false,
          onPointerUpdate: () => {},
          ref: (api) => { this.excalidrawAPI = api; }
        }
      );

      ReactDOM.render(excalidrawWrapper, div);
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
          plugins: {
            ...chartConfig.options?.plugins,
            legend: { labels: { color: '#1e293b' } }
          },
          scales: {
            ...chartConfig.options?.scales,
            y: { ...chartConfig.options?.scales?.y, ticks: { color: '#64748b' }, grid: { color: '#e2e8f0' } },
            x: { ...chartConfig.options?.scales?.x, ticks: { color: '#64748b' }, grid: { color: '#e2e8f0' } }
          }
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

// Add React for Excalidraw
if (!window.React) {
  const script1 = document.createElement('script');
  script1.src = 'https://unpkg.com/react@17/umd/react.production.min.js';
  document.head.appendChild(script1);
  
  const script2 = document.createElement('script');
  script2.src = 'https://unpkg.com/react-dom@17/umd/react-dom.production.min.js';
  document.head.appendChild(script2);
}
