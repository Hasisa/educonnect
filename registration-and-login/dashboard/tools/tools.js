// School Tools Data
const schoolTools = [
  {
    id: 'ai-assistant',
    name: 'AI Study Assistant',
    icon: '🤖',
    description: 'Helps answer questions and explain topics.',
    route: '../aichat/ai.html'
  },
  {
    id: 'flashcards',
    name: 'Flashcards Trainer',
    icon: '🧠',
    description: 'Practice memory with auto-generated flashcards.',
    route: '../flashcards/flashcards.html'
  },
  {
    id: 'quiz-generator',
    name: 'Quiz Generator',
    icon: '✍️',
    description: 'Create quick mini-quizzes from materials.',
    route: '../quiz/quiz.html'
  },
  {
    id: 'diary',
    name: 'User Diary',
    icon: '📔',
    description: 'Personal diary to track thoughts, goals, and daily progress.',
    route: '../diary/diary.html'
  },
  {
    id: 'planner',
    name: 'Planner & Deadlines',
    icon: '📅',
    description: 'Organize deadlines and receive reminders.',
    route: '../planner/planner.html'
  },
  {
    id: 'collaboration',
    name: 'Collaboration Hub',
    icon: '🤝',
    description: 'Work on group projects and track tasks.',
    route: '../collaboration/collaboration.html'
  },
  {
    id: 'dictionary',
    name: 'Dictionary & Glossary',
    icon: '📚',
    description: 'Search definitions and key terms instantly.',
    route: '../dictionary/dictionary.html'
  },
  {
    id: 'resources',
    name: 'Resource Finder',
    icon: '🔎',
    description: 'Discover recommended study materials.',
    route: '/tools/resources'
  },
  {
    id: 'creative',
    name: 'Creative Tools',
    icon: '🎨',
    description: 'Build mind maps, diagrams, and visual notes.',
    route: '/tools/creative'
  }
];

// Create tool card HTML
function createToolCard(tool) {
  return `
    <div class="tool-card" data-tool-id="${tool.id}">
      <div class="tool-icon">${tool.icon}</div>
      <h3 class="tool-name">${tool.name}</h3>
      <p class="tool-description">${tool.description}</p>
      <a href="${tool.route}" class="tool-button">Open</a>
    </div>
  `;
}

// Initialize the application
function initApp() {
  const toolsGrid = document.getElementById('toolsGrid');
  
  toolsGrid.classList.add('loading');
  
  const toolsHTML = schoolTools.map(tool => createToolCard(tool)).join('');
  
  setTimeout(() => {
    toolsGrid.innerHTML = toolsHTML;
    toolsGrid.classList.remove('loading');
    animateCardsIn();
  }, 300);
  
  setupEventListeners();
}

// Animate cards with staggered effect
function animateCardsIn() {
  const cards = document.querySelectorAll('.tool-card');
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.classList.add('animate-in');
    }, index * 100);
  });
}

// Setup event listeners
function setupEventListeners() {
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('tool-button')) {
      const toolCard = e.target.closest('.tool-card');
      const route = e.target.getAttribute('href');
      
      // Переход на страницу инструмента
      window.location.href = route;
    }
  });
  
  document.addEventListener('mouseenter', (e) => {
    if (e.target.classList.contains('tool-card')) {
      e.target.style.transform = 'translateY(-8px) scale(1.02)';
    }
  }, true);
  
  document.addEventListener('mouseleave', (e) => {
    if (e.target.classList.contains('tool-card')) {
      e.target.style.transform = '';
    }
  }, true);
}

// Smooth scroll behavior
function setupSmoothScroll() {
  document.documentElement.style.scrollBehavior = 'smooth';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setupSmoothScroll();
  initApp();
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    document.body.classList.add('keyboard-navigation');
  }
});

document.addEventListener('mousedown', () => {
  document.body.classList.remove('keyboard-navigation');
});
