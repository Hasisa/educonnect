// Quiz Management System
class QuizManager {
    constructor() {
        this.currentQuiz = { title: '', questions: [] };
        this.editingQuizId = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.querySelector('.add-question-btn').addEventListener('click', () => this.addQuestion());
        document.querySelector('.save-quiz-btn').addEventListener('click', () => this.saveManualQuiz());
        document.querySelector('.generate-quiz-btn').addEventListener('click', () => this.generateAIQuiz());
        document.querySelector('.save-generated-btn').addEventListener('click', () => this.saveGeneratedQuiz());
        document.querySelector('.edit-generated-btn').addEventListener('click', () => this.editGeneratedQuiz());
        document.getElementById('quiz-title').addEventListener('input', (e) => { this.currentQuiz.title = e.target.value; });
    }

    addQuestion(questionData = null) {
        const index = this.currentQuiz.questions.length;
        const question = questionData || { text: '', answers: ['', '', '', ''], correctAnswer: 0 };
        this.currentQuiz.questions.push(question);
        this.renderQuestion(index, question);
    }

    renderQuestion(index, question) {
        const container = document.querySelector('.questions-list');
        const el = document.createElement('div');
        el.className = 'question-card';
        el.dataset.index = index;

        el.innerHTML = `
            <div class="question-header">
                <span class="question-number">Question ${index + 1}</span>
                <button class="delete-question-btn" onclick="quizManager.deleteQuestion(${index})">Delete</button>
            </div>
            <input type="text" class="question-input" placeholder="Enter your question" value="${question.text}" onchange="quizManager.updateQuestion(${index}, 'text', this.value)">
            <div class="answers-grid">
                ${question.answers.map((answer, i) => `
                    <div class="answer-item ${i === question.correctAnswer ? 'correct' : ''}">
                        <input type="radio" class="answer-radio" name="correct-${index}" value="${i}" ${i === question.correctAnswer ? 'checked' : ''} onchange="quizManager.updateQuestion(${index}, 'correctAnswer', ${i})">
                        <input type="text" class="answer-input" placeholder="Answer ${i + 1}" value="${answer}" onchange="quizManager.updateAnswerText(${index}, ${i}, this.value)">
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(el);
        this.updateQuestionNumbers();
    }

    updateQuestion(index, field, value) {
        if (field === 'correctAnswer') {
            this.currentQuiz.questions[index].correctAnswer = parseInt(value);
            this.updateCorrectAnswerHighlight(index, value);
        } else {
            this.currentQuiz.questions[index][field] = value;
        }
    }

    updateAnswerText(questionIndex, answerIndex, value) {
        this.currentQuiz.questions[questionIndex].answers[answerIndex] = value;
    }

    updateCorrectAnswerHighlight(index, correctIndex) {
        const card = document.querySelector(`[data-index="${index}"]`);
        card.querySelectorAll('.answer-item').forEach((item, i) => item.classList.toggle('correct', i === parseInt(correctIndex)));
    }

    deleteQuestion(index) {
        this.currentQuiz.questions.splice(index, 1);
        this.renderAllQuestions();
    }

    renderAllQuestions() {
        const container = document.querySelector('.questions-list');
        container.innerHTML = '';
        this.currentQuiz.questions.forEach((q, i) => this.renderQuestion(i, q));
        this.updateQuestionNumbers();
    }

    updateQuestionNumbers() {
        const cards = document.querySelectorAll('.question-card');
        cards.forEach((card, i) => {
            card.dataset.index = i;
            card.querySelector('.question-number').textContent = `Question ${i + 1}`;
            card.querySelector('.delete-question-btn').setAttribute('onclick', `quizManager.deleteQuestion(${i})`);
            card.querySelector('.question-input').setAttribute('onchange', `quizManager.updateQuestion(${i}, 'text', this.value)`);
            card.querySelectorAll('.answer-radio').forEach((radio, j) => {
                radio.name = `correct-${i}`;
                radio.setAttribute('onchange', `quizManager.updateQuestion(${i}, 'correctAnswer', ${j})`);
            });
            card.querySelectorAll('.answer-input').forEach((input, j) => input.setAttribute('onchange', `quizManager.updateAnswerText(${i}, ${j}, this.value)`));
        });
    }

    validateQuiz() {
        if (!this.currentQuiz.title.trim()) { uiManager.showToast('Please enter a quiz title', 'warning'); return false; }
        if (this.currentQuiz.questions.length === 0) { uiManager.showToast('Please add at least one question', 'warning'); return false; }
        for (let i = 0; i < this.currentQuiz.questions.length; i++) {
            const q = this.currentQuiz.questions[i];
            if (!q.text.trim()) { uiManager.showToast(`Please enter text for question ${i + 1}`, 'warning'); return false; }
            const filledAnswers = q.answers.filter(a => a.trim() !== '');
            if (filledAnswers.length < 2) { uiManager.showToast(`Question ${i + 1} needs at least 2 answer options`, 'warning'); return false; }
            if (!q.answers[q.correctAnswer].trim()) { uiManager.showToast(`Correct answer for question ${i + 1} cannot be empty`, 'warning'); return false; }
        }
        return true;
    }

    resetQuizForm() {
        this.currentQuiz = { title: '', questions: [] };
        this.editingQuizId = null;
        document.getElementById('quiz-title').value = '';
        document.querySelector('.questions-list').innerHTML = '';
        document.getElementById('ai-quiz-title').value = '';
        document.getElementById('study-material').value = '';
        document.getElementById('question-count').value = '10';
        document.querySelector('.generated-quiz-preview').style.display = 'none';
    }

    async saveManualQuiz() {
        if (!this.validateQuiz()) return;
        uiManager.showLoading('Saving quiz...');
        try {
            const quizToSave = { ...this.currentQuiz, generatedByAI: false, createdAt: new Date().toISOString() };
            await window.firebaseManager.saveQuiz(quizToSave);
            uiManager.showToast('Quiz saved successfully!', 'success');
            this.resetQuizForm();
            await this.loadSavedQuizzes();
        } catch (e) { console.error(e); uiManager.showToast('Error saving quiz. Please try again.', 'error'); }
        finally { uiManager.hideLoading(); }
    }

    async saveGeneratedQuiz() {
        if (!this.validateQuiz()) return;
        uiManager.showLoading('Saving generated quiz...');
        try {
            const quizToSave = { ...this.currentQuiz, generatedByAI: true, createdAt: new Date().toISOString() };
            await window.firebaseManager.saveQuiz(quizToSave);
            uiManager.showToast('Generated quiz saved successfully!', 'success');
            this.resetQuizForm();
            await this.loadSavedQuizzes();
        } catch (e) { console.error(e); uiManager.showToast('Error saving quiz. Please try again.', 'error'); }
        finally { uiManager.hideLoading(); }
    }

    async generateAIQuiz() {
        const title = document.getElementById('ai-quiz-title').value.trim();
        const material = document.getElementById('study-material').value.trim();
        const count = parseInt(document.getElementById('question-count').value);
        if (!title) { uiManager.showToast('Please enter a quiz title', 'warning'); return; }
        if (!material) { uiManager.showToast('Provide study material for AI generation', 'warning'); return; }
        uiManager.showLoading('Generating AI quiz...');
        try {
            const questions = await this.callAIService(material, count);
            this.currentQuiz = { title, questions, generatedByAI: true };
            this.displayGeneratedQuiz();
            uiManager.showToast('Quiz generated successfully!', 'success');
        } catch (e) { console.error(e); uiManager.showToast('Error generating quiz', 'error'); }
        finally { uiManager.hideLoading(); }
    }

    async callAIService(material, count) {
        try {
            const response = await fetch('https://school-forumforschool.onrender.com/api/quiz', { 
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Сгенерируй ${count} вопросов по этому материалу. Ответь строго в формате JSON: [{"text":"Вопрос 1","answers":["ответ1","ответ2","ответ3","ответ4"],"correctAnswer":0}] Материал: ${material}` })
            });
            if (!response.ok) { const text = await response.text(); console.error(text); throw new Error('AI fetch failed'); }
            const data = await response.json();
            if (!data.response) { console.error(data); throw new Error('Invalid AI response'); }
            const questions = JSON.parse(data.response.trim());
            if (!Array.isArray(questions)) throw new Error('Invalid AI response array');
            return questions;
        } catch (e) { console.error(e); throw e; }
    }

    displayGeneratedQuiz() {
        const container = document.querySelector('.generated-quiz-preview');
        const content = document.querySelector('.preview-content');
        content.innerHTML = this.currentQuiz.questions.map((q,i) => `
            <div class="preview-question">
                <h4>Question ${i+1}: ${q.text}</h4>
                <div class="preview-answers">
                    ${q.answers.map((a,j)=>`<div class="preview-answer ${j===q.correctAnswer?'correct':''}">${String.fromCharCode(65+j)}. ${a}</div>`).join('')}
                </div>
            </div>
        `).join('');
        container.style.display = 'block';
    }

    editGeneratedQuiz() {
        uiManager.switchMode('manual');
        document.getElementById('quiz-title').value = this.currentQuiz.title;
        document.querySelector('.questions-list').innerHTML = '';
        this.currentQuiz.questions.forEach((q,i)=>this.renderQuestion(i,q));
        uiManager.showToast('Quiz loaded for editing', 'info');
    }

    async loadSavedQuizzes() {
        try {
            const quizzes = await window.firebaseManager.getQuizzes();
            this.renderSavedQuizzes(quizzes);
        } catch (e) { console.error(e); uiManager.showToast('Error loading quizzes', 'error'); }
    }

    renderSavedQuizzes(quizzes) {
        const container = document.querySelector('.saved-quizzes-list');
        if (!Array.isArray(quizzes) || quizzes.length === 0) {
            container.innerHTML = `<div class="empty-state"><span class="icon">📝</span><p>No quizzes created yet</p></div>`;
            return;
        }
        container.innerHTML = quizzes.map(q => `
            <div class="quiz-card">
                <div class="quiz-card-header"><h3>${q.title}</h3></div>
                <div class="quiz-meta">
                    <span>📝 ${Array.isArray(q.questions)?q.questions.length:0} questions</span>
                    <span>📅 ${this.formatDate(q.createdAt)}</span>
                    ${q.generatedByAI?'<span>🤖 AI Generated</span>':'<span>✏️ Manual</span>'}
                </div>
                <div class="quiz-actions">
                    <button class="btn btn-secondary btn-small" onclick="quizManager.editQuiz('${q.id}')">Edit</button>
                    <button class="btn btn-primary btn-small" onclick="quizManager.viewQuiz('${q.id}')">View</button>
                    <button class="btn btn-small" style="background: var(--error); color: white;" onclick="quizManager.deleteQuiz('${q.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    formatDate(timestamp) {
        let date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString();
    }

    async editQuiz(quizId) {
        try {
            const quizzes = await window.firebaseManager.getQuizzes();
            const quiz = quizzes.find(q => q.id === quizId);
            if (!quiz) { uiManager.showToast('Quiz not found', 'error'); return; }
            this.currentQuiz = { title: quiz.title, questions: [...quiz.questions] };
            this.editingQuizId = quizId;
            uiManager.switchMode('manual');
            document.getElementById('quiz-title').value = quiz.title;
            document.querySelector('.questions-list').innerHTML = '';
            this.currentQuiz.questions.forEach((q,i)=>this.renderQuestion(i,q));
            uiManager.showToast('Quiz loaded for editing', 'info');
        } catch (e) { console.error(e); uiManager.showToast('Error loading quiz', 'error'); }
    }

    async viewQuiz(quizId) {
        try {
            const quizzes = await window.firebaseManager.getQuizzes();
            const quiz = quizzes.find(q => q.id === quizId);
            if (!quiz) { uiManager.showToast('Quiz not found', 'error'); return; }
            this.displayQuizDetails(quiz);
        } catch (e) { console.error(e); uiManager.showToast('Error loading quiz', 'error'); }
    }

    displayQuizDetails(quiz) {
        const modal = document.createElement('div');
        modal.className = 'quiz-modal';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${quiz.title}</h2>
                    <button class="modal-close" onclick="this.closest('.quiz-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="quiz-info">
                        <p><strong>Questions:</strong> ${quiz.questions.length}</p>
                        <p><strong>Created:</strong> ${this.formatDate(quiz.createdAt)}</p>
                        <p><strong>Type:</strong> ${quiz.generatedByAI?'AI Generated':'Manual Creation'}</p>
                    </div>
                    <div class="questions-preview">
                        ${quiz.questions.map((q,i)=>`
                            <div class="question-preview">
                                <h4>Question ${i+1}: ${q.text}</h4>
                                <div class="answers-preview">
                                    ${q.answers.map((a,j)=>`<div class="answer-preview ${j===q.correctAnswer?'correct':''}">${String.fromCharCode(65+j)}. ${a}</div>`).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.quiz-modal').remove()">Close</button>
                    <button class="btn btn-primary" onclick="quizManager.editQuiz('${quiz.id}'); this.closest('.quiz-modal').remove();">Edit Quiz</button>
                </div>
            </div>
        `;
        if (!document.querySelector('#modal-styles')) {
            const style = document.createElement('style'); style.id='modal-styles';
            style.textContent=`
                .quiz-modal{position:fixed;top:0;left:0;width:100%;height:100%;z-index:2000;display:flex;align-items:center;justify-content:center;}
                .modal-backdrop{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);}
                .modal-content{position:relative;background:white;border-radius:12px;max-width:800px;max-height:90vh;width:90%;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);}
                .modal-header{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid #e5e7eb;}
                .modal-header h2{margin:0;color:#111827;}
                .modal-close{background:none;border:none;font-size:24px;cursor:pointer;color:#6b7280;padding:4px;}
                .modal-body{padding:24px;max-height:60vh;overflow-y:auto;}
                .quiz-info{margin-bottom:20px;padding:16px;background:#f9fafb;border-radius:8px;}
                .quiz-info p{margin-bottom:8px;}
                .question-preview{margin-bottom:20px;padding:16px;border:1px solid #e5e7eb;border-radius:8px;}
                .question-preview h4{margin-bottom:12px;color:#111827;}
                .answers-preview{display:grid;gap:8px;}
                .answer-preview{padding:8px 12px;background:#f3f4f6;border-radius:6px;font-size:.9rem;}
                .answer-preview.correct{background:rgba(16,185,129,.1);color:#10b981;font-weight:500;}
                .modal-actions{padding:20px 24px;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;}
            `;
            document.head.appendChild(style);
        }
        document.body.appendChild(modal);
    }

    async deleteQuiz(quizId) {
        if (!confirm('Are you sure you want to delete this quiz?')) return;
        uiManager.showLoading('Deleting quiz...');
        try {
            const result = await window.firebaseManager.deleteQuiz(quizId);
            if (result.success) { uiManager.showToast('Quiz deleted successfully', 'success'); this.loadSavedQuizzes(); }
            else throw new Error(result.error || 'Failed to delete quiz');
        } catch (e) { console.error(e); uiManager.showToast('Error deleting quiz', 'error'); }
        finally { uiManager.hideLoading(); }
    }
}

// Создаем глобальный экземпляр
window.quizManager = new QuizManager();
