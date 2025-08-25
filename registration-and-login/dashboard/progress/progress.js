class ProgressTracker {
    constructor() {
        this.subjects = this.loadFromStorage() || [];
        this.weeklyActivity = this.generateWeeklyActivity();
        this.init();
    }

    init() {
        this.renderOverallProgress();
        this.renderSubjects();
        this.renderActivityChart();
        this.startAnimations();
    }

    loadFromStorage() {
        const stored = localStorage.getItem('studentProgress');
        return stored ? JSON.parse(stored) : null;
    }

    saveToStorage() {
        localStorage.setItem('studentProgress', JSON.stringify(this.subjects));
    }

    generateWeeklyActivity() {
        // Generate activity based on current subjects
        return this.subjects.length > 0 
            ? this.subjects.map(() => Math.floor(Math.random() * 50) + 10).slice(0, 7)
            : [0, 0, 0, 0, 0, 0, 0];
    }

    addSubject(name, icon, materialsCompleted, materialsTotal, testsCompleted, testsTotal, comments, likes) {
        const subject = {
            id: Date.now(),
            name,
            icon: icon || '📚',
            materials: { completed: materialsCompleted, total: materialsTotal },
            tests: { completed: testsCompleted, total: testsTotal },
            community: { comments, likes }
        };

        this.subjects.push(subject);
        this.saveToStorage();
        this.weeklyActivity = this.generateWeeklyActivity();
        this.refresh();
    }

    deleteSubject(id) {
        this.subjects = this.subjects.filter(subject => subject.id !== id);
        this.saveToStorage();
        this.weeklyActivity = this.generateWeeklyActivity();
        this.refresh();
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
            
            const progressFill = document.querySelector('.progress-fill.overall');
            progressFill.dataset.progress = '0';
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

        // Calculate overall progress
        const materialProgress = totalMaterials > 0 ? (completedMaterials / totalMaterials) * 100 : 0;
        const testProgress = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
        const overallProgress = Math.round((materialProgress + testProgress) / 2);

        // Update stats
        document.getElementById('total-materials').textContent = `${completedMaterials}/${totalMaterials}`;
        document.getElementById('total-tests').textContent = `${completedTests}/${totalTests}`;
        document.getElementById('total-comments').textContent = totalComments;
        document.getElementById('total-likes').textContent = totalLikes;

        // Update overall progress bar
        const progressFill = document.querySelector('.progress-fill.overall');
        progressFill.dataset.progress = overallProgress;
    }

    renderSubjects() {
        const container = document.getElementById('subjects-container');
        container.innerHTML = '';

        if (this.subjects.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-gray);">
                    <h3>No subjects added yet</h3>
                    <p>Add your first subject above to start tracking progress!</p>
                </div>
            `;
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
                <button class="delete-btn" onclick="tracker.deleteSubject(${subject.id})">×</button>
                <div class="subject-header">
                    <div>
                        <span style="font-size: 1.5rem; margin-right: 8px;">${subject.icon}</span>
                        <span class="subject-title">${subject.name}</span>
                    </div>
                    <span class="subject-percentage">${overallSubjectProgress}%</span>
                </div>
                
                <div class="progress-item">
                    <div class="progress-label">
                        <span>📚 Materials</span>
                        <span class="progress-count">${subject.materials.completed}/${subject.materials.total}</span>
                    </div>
                    <div class="progress-bar small">
                        <div class="progress-fill materials" data-progress="${materialProgress}"></div>
                    </div>
                </div>

                <div class="progress-item">
                    <div class="progress-label">
                        <span>📝 Tests</span>
                        <span class="progress-count">${subject.tests.completed}/${subject.tests.total}</span>
                    </div>
                    <div class="progress-bar small">
                        <div class="progress-fill tests" data-progress="${testProgress}"></div>
                    </div>
                </div>

                <div class="progress-item">
                    <div class="progress-label">
                        <span>💬 Community</span>
                    </div>
                    <div class="community-stats">
                        <div class="community-item">
                            <span>💬</span>
                            <span>${subject.community.comments}</span>
                        </div>
                        <div class="community-item">
                            <span>👍</span>
                            <span>${subject.community.likes}</span>
                        </div>
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
            bar.setAttribute('data-value', activity);
            
            const height = (activity / maxActivity) * 100;
            bar.style.height = height + '%';
            bar.style.animationDelay = `${index * 0.1}s`;

            chartContainer.appendChild(bar);
        });
    }

    startAnimations() {
        setTimeout(() => {
            const progressBars = document.querySelectorAll('.progress-fill[data-progress]');
            progressBars.forEach(bar => {
                const progress = bar.getAttribute('data-progress');
                bar.style.width = progress + '%';
                
                const progressText = bar.querySelector('.progress-text');
                if (progressText) {
                    progressText.textContent = progress + '%';
                }
            });
        }, 500);

        setTimeout(() => {
            const chartBars = document.querySelectorAll('.chart-bar');
            chartBars.forEach((bar, index) => {
                setTimeout(() => {
                    bar.style.opacity = '1';
                }, index * 100);
            });
        }, 1000);
    }
}

// Global functions
function addSubject() {
    const name = document.getElementById('subject-name').value.trim();
    const icon = document.getElementById('subject-icon').value.trim();
    const materialsCompleted = parseInt(document.getElementById('materials-completed').value) || 0;
    const materialsTotal = parseInt(document.getElementById('materials-total').value) || 1;
    const testsCompleted = parseInt(document.getElementById('tests-completed').value) || 0;
    const testsTotal = parseInt(document.getElementById('tests-total').value) || 1;
    const comments = parseInt(document.getElementById('comments-count').value) || 0;
    const likes = parseInt(document.getElementById('likes-count').value) || 0;

    if (!name) {
        alert('Please enter a subject name');
        return;
    }

    if (materialsCompleted > materialsTotal || testsCompleted > testsTotal) {
        alert('Completed items cannot exceed total items');
        return;
    }

    tracker.addSubject(name, icon, materialsCompleted, materialsTotal, testsCompleted, testsTotal, comments, likes);

    // Clear form
    document.getElementById('subject-name').value = '';
    document.getElementById('subject-icon').value = '';
    document.getElementById('materials-completed').value = '';
    document.getElementById('materials-total').value = '';
    document.getElementById('tests-completed').value = '';
    document.getElementById('tests-total').value = '';
    document.getElementById('comments-count').value = '';
    document.getElementById('likes-count').value = '';
}

// Initialize the app
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new ProgressTracker();
});

// Add keyboard support for form
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.closest('.add-subject-card')) {
        addSubject();
    }
});