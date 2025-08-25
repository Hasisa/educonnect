import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js'; // подключение Firestore

class ProgressTracker {
  constructor(userId) {
    this.userId = userId;
    this.subjectsCollection = collection(db, `users/${userId}/subjects`);
    this.subjects = [];
    this.weeklyActivity = [0,0,0,0,0,0,0]; // по умолчанию
    this.unsubscribe = null;

    this.init();
  }

  async init() {
    await this.loadSubjects();
    this.renderOverallProgress();
    this.renderSubjects();
    this.renderActivityChart();
    this.startAnimations();
  }

  async loadSubjects() {
    // Подписка на изменения в Firestore
    this.unsubscribe = onSnapshot(this.subjectsCollection, (snapshot) => {
      this.subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.weeklyActivity = this.generateWeeklyActivity();
      this.refresh();
    });
  }

  async addSubject(name, icon, materialsCompleted, materialsTotal, testsCompleted, testsTotal, comments, likes) {
    const subject = {
      name,
      icon: icon || '📚',
      materials: { completed: materialsCompleted, total: materialsTotal },
      tests: { completed: testsCompleted, total: testsTotal },
      community: { comments, likes },
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(this.subjectsCollection, subject);
    } catch (error) {
      console.error("Error adding subject:", error);
    }
  }

  async deleteSubject(id) {
    try {
      const subjectDoc = doc(this.subjectsCollection, id);
      await updateDoc(subjectDoc, { deleted: true }); // можно просто пометить как удалено
    } catch (error) {
      console.error("Error deleting subject:", error);
    }
  }

  generateWeeklyActivity() {
    if (this.subjects.length === 0) return [0,0,0,0,0,0,0];
    return this.subjects.map(() => Math.floor(Math.random() * 50) + 10).slice(0,7);
  }

  refresh() {
    this.renderOverallProgress();
    this.renderSubjects();
    this.renderActivityChart();
    this.startAnimations();
  }

  renderOverallProgress() {
    if (this.subjects.length === 0) {
      document.getElementById('total-materials').textContent = '0/0';
      document.getElementById('total-tests').textContent = '0/0';
      document.getElementById('total-comments').textContent = '0';
      document.getElementById('total-likes').textContent = '0';
      document.querySelector('.progress-fill.overall').dataset.progress = '0';
      return;
    }

    let totalMaterials = 0, completedMaterials = 0;
    let totalTests = 0, completedTests = 0;
    let totalComments = 0, totalLikes = 0;

    this.subjects.forEach(subject => {
      totalMaterials += subject.materials.total;
      completedMaterials += subject.materials.completed;
      totalTests += subject.tests.total;
      completedTests += subject.tests.completed;
      totalComments += subject.community.comments;
      totalLikes += subject.community.likes;
    });

    const materialProgress = totalMaterials > 0 ? (completedMaterials / totalMaterials) * 100 : 0;
    const testProgress = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
    const overallProgress = Math.round((materialProgress + testProgress) / 2);

    document.getElementById('total-materials').textContent = `${completedMaterials}/${totalMaterials}`;
    document.getElementById('total-tests').textContent = `${completedTests}/${totalTests}`;
    document.getElementById('total-comments').textContent = totalComments;
    document.getElementById('total-likes').textContent = totalLikes;

    document.querySelector('.progress-fill.overall').dataset.progress = overallProgress;
  }

  renderSubjects() {
    const container = document.getElementById('subjects-container');
    container.innerHTML = '';

    if (this.subjects.length === 0) {
      container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-gray);">
        <h3>No subjects added yet</h3>
        <p>Add your first subject above to start tracking progress!</p>
      </div>`;
      return;
    }

    this.subjects.forEach((subject, index) => {
      const materialProgress = subject.materials.total > 0 
        ? Math.round((subject.materials.completed / subject.materials.total) * 100) 
        : 0;
      const testProgress = subject.tests.total > 0 
        ? Math.round((subject.tests.completed / subject.tests.total) * 100) 
        : 0;
      const overallSubjectProgress = Math.round((materialProgress + testProgress) / 2);

      const card = document.createElement('div');
      card.className = 'subject-card';
      card.style.animationDelay = `${index * 0.1}s`;
      card.innerHTML = `
        <button class="delete-btn" onclick="tracker.deleteSubject('${subject.id}')">×</button>
        <div class="subject-header">
          <div><span style="font-size: 1.5rem; margin-right: 8px;">${subject.icon}</span>
          <span class="subject-title">${subject.name}</span></div>
          <span class="subject-percentage">${overallSubjectProgress}%</span>
        </div>
        <div class="progress-item">
          <div class="progress-label"><span>📚 Materials</span><span class="progress-count">${subject.materials.completed}/${subject.materials.total}</span></div>
          <div class="progress-bar small"><div class="progress-fill materials" data-progress="${materialProgress}"></div></div>
        </div>
        <div class="progress-item">
          <div class="progress-label"><span>📝 Tests</span><span class="progress-count">${subject.tests.completed}/${subject.tests.total}</span></div>
          <div class="progress-bar small"><div class="progress-fill tests" data-progress="${testProgress}"></div></div>
        </div>
        <div class="progress-item">
          <div class="progress-label"><span>💬 Community</span></div>
          <div class="community-stats">
            <div class="community-item"><span>💬</span><span>${subject.community.comments}</span></div>
            <div class="community-item"><span>👍</span><span>${subject.community.likes}</span></div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  renderActivityChart() {
    const chartContainer = document.getElementById('activity-chart');
    chartContainer.innerHTML = '';

    const maxActivity = Math.max(...this.weeklyActivity, 1);
    this.weeklyActivity.forEach((activity, index) => {
      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      const heightPercent = (activity / maxActivity) * 100;
      bar.setAttribute('data-value', activity);
      bar.setAttribute('data-value-percent', heightPercent + '%');
      bar.style.opacity = '0';
      chartContainer.appendChild(bar);
    });
  }

  startAnimations() {
    const progressBars = document.querySelectorAll('.progress-fill[data-progress]');
    progressBars.forEach(bar => {
      const progress = bar.getAttribute('data-progress');
      bar.style.width = '0%';
      setTimeout(() => bar.style.width = progress + '%', 100);
      const progressText = bar.querySelector('.progress-text');
      if (progressText) progressText.textContent = progress + '%';
    });

    const chartBars = document.querySelectorAll('.chart-bar');
    chartBars.forEach((bar, index) => {
      bar.style.height = '0%';
      setTimeout(() => bar.style.height = bar.getAttribute('data-value-percent'), index * 100);
    });
  }
}

// Global functions
async function addSubject() {
  const name = document.getElementById('subject-name').value.trim();
  const icon = document.getElementById('subject-icon').value.trim();
  const materialsCompleted = parseInt(document.getElementById('materials-completed').value) || 0;
  const materialsTotal = parseInt(document.getElementById('materials-total').value) || 1;
  const testsCompleted = parseInt(document.getElementById('tests-completed').value) || 0;
  const testsTotal = parseInt(document.getElementById('tests-total').value) || 1;
  const comments = parseInt(document.getElementById('comments-count').value) || 0;
  const likes = parseInt(document.getElementById('likes-count').value) || 0;

  if (!name) return alert('Please enter a subject name');
  if (materialsCompleted > materialsTotal || testsCompleted > testsTotal) return alert('Completed items cannot exceed total items');

  await tracker.addSubject(name, icon, materialsCompleted, materialsTotal, testsCompleted, testsTotal, comments, likes);

  // Clear form
  ['subject-name','subject-icon','materials-completed','materials-total','tests-completed','tests-total','comments-count','likes-count'].forEach(id => document.getElementById(id).value = '');
}

// Initialize app
let tracker;
document.addEventListener('DOMContentLoaded', () => {
  const userId = "user_123"; // заменить на текущего пользователя
  tracker = new ProgressTracker(userId);
});

document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && e.target.closest('.add-subject-card')) addSubject();
});
