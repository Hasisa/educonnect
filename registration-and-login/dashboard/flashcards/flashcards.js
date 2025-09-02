// Flashcards Trainer - Main JavaScript File
class FlashcardsTrainer {
    constructor() {
        this.currentCardIndex = 0;
        this.flashcards = [];
        this.isCardFlipped = false;
        this.userProgress = {
            cardsStudied: 0,
            totalCards: 0,
            lastStudyDate: null
        };

        this.initializeApp();
    }

    initializeApp() {
        this.bindEventListeners();
        this.showNotification('Welcome to Flashcards Trainer! 🧠', 'success');

        // Если пользователь уже авторизован, загружаем его карточки
        if (window.currentUser) {
            this.onUserLogin(window.currentUser);
        }
    }

    bindEventListeners() {
        document.getElementById('startTrainingBtn')?.addEventListener('click', () => this.startTraining());
        document.getElementById('backBtn')?.addEventListener('click', () => this.goToLanding());
        document.getElementById('createCardBtn')?.addEventListener('click', () => this.openCreateCardModal());

        document.getElementById('flipCardBtn')?.addEventListener('click', () => this.flipCard());
        document.getElementById('nextCardBtn')?.addEventListener('click', () => this.nextCard());
        document.getElementById('flashcard')?.addEventListener('click', () => this.flipCard());

        document.getElementById('closeModalBtn')?.addEventListener('click', () => this.closeCreateCardModal());
        document.getElementById('cancelBtn')?.addEventListener('click', () => this.closeCreateCardModal());
        document.getElementById('saveCardBtn')?.addEventListener('click', () => this.saveNewCard());
        document.getElementById('generateAIBtn')?.addEventListener('click', () => this.generateAICard());

        const modal = document.getElementById('createCardModal');
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) this.closeCreateCardModal();
        });

        document.addEventListener('keydown', (e) => {
            if (this.getCurrentPage() === 'trainingPage') {
                switch (e.key) {
                    case ' ':
                    case 'Enter':
                        e.preventDefault();
                        this.flipCard();
                        break;
                    case 'ArrowRight':
                    case 'ArrowDown':
                        e.preventDefault();
                        this.nextCard();
                        break;
                    case 'Escape':
                        this.goToLanding();
                        break;
                }
            }
        });
    }

    getUserKey(key) {
        return window.currentUser?.uid ? `${key}_${window.currentUser.uid}` : key;
    }

    saveToLocal() {
        const cardsKey = this.getUserKey('flashcards');
        const progressKey = this.getUserKey('userProgress');

        localStorage.setItem(cardsKey, JSON.stringify(this.flashcards));
        localStorage.setItem(progressKey, JSON.stringify(this.userProgress));
    }

    loadFromLocal() {
        const cardsKey = this.getUserKey('flashcards');
        const progressKey = this.getUserKey('userProgress');

        const savedCards = localStorage.getItem(cardsKey);
        const savedProgress = localStorage.getItem(progressKey);

        if (savedCards) this.flashcards = JSON.parse(savedCards);
        if (savedProgress) this.userProgress = JSON.parse(savedProgress);

        this.userProgress.totalCards = this.flashcards.length;
    }

    async onUserLogin(user) {
        window.currentUser = user;
        this.loadFromLocal();
        await this.loadCardsFromFirebase();
    }

    async loadCardsFromFirebase() {
        if (!window.db || !window.currentUser) return;

        try {
            this.showLoading(true);
            const { collection, getDocs, query, where, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const cardsRef = collection(window.db, 'flashcards');
            const q = query(cardsRef, where('userId', '==', window.currentUser.uid), orderBy('created', 'desc'));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                this.flashcards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.userProgress.totalCards = this.flashcards.length;
                this.saveToLocal();
            }
        } catch (error) {
            console.error('Error loading cards from Firebase:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async saveCardToFirebase(card) {
        if (!window.db || !window.currentUser) return null;
        try {
            const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const cardWithUser = { ...card, userId: window.currentUser.uid, created: serverTimestamp() };
            const cardsRef = collection(window.db, 'flashcards');
            const docRef = await addDoc(cardsRef, cardWithUser);
            return docRef.id;
        } catch (error) {
            console.error('Error saving card to Firebase:', error);
            throw error;
        }
    }

    getCurrentPage() {
        const activePage = document.querySelector('.page.active');
        return activePage ? activePage.id : null;
    }

    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId)?.classList.add('active');
    }

    startTraining() {
        if (!this.flashcards.length) {
            this.showNotification('No flashcards available. Please create some first!', 'warning');
            return;
        }
        this.currentCardIndex = 0;
        this.isCardFlipped = false;
        this.showPage('trainingPage');
        this.displayCurrentCard();
    }

    goToLanding() {
        this.showPage('landingPage');
        this.resetCard();
    }

    displayCurrentCard() {
        const card = this.flashcards[this.currentCardIndex];
        if (!card) return;

        const termElement = document.getElementById('cardTerm');
        const definitionElement = document.getElementById('cardDefinition');

        if (termElement && definitionElement) {
            termElement.textContent = card.term;
            definitionElement.textContent = card.definition;
        }
        this.resetCard();
        this.updateProgress();
    }

    flipCard() {
        const flashcard = document.getElementById('flashcard');
        const flipBtn = document.getElementById('flipCardBtn');
        if (!flashcard || !flipBtn) return;

        this.isCardFlipped = !this.isCardFlipped;
        flashcard.classList.toggle('flipped');
        flipBtn.textContent = this.isCardFlipped ? 'Show Term' : 'Show Definition';
    }

    nextCard() {
        if (!this.flashcards.length) return;
        this.currentCardIndex = (this.currentCardIndex + 1) % this.flashcards.length;
        this.displayCurrentCard();
        this.userProgress.cardsStudied++;
        this.userProgress.lastStudyDate = new Date().toISOString();
        this.saveToLocal();

        if (this.currentCardIndex === 0) this.showNotification('Completed all cards! Starting over...', 'success');
    }

    resetCard() {
        const flashcard = document.getElementById('flashcard');
        const flipBtn = document.getElementById('flipCardBtn');
        if (!flashcard || !flipBtn) return;

        flashcard.classList.remove('flipped');
        flipBtn.textContent = 'Show Definition';
        this.isCardFlipped = false;
    }

    updateProgress() {
        const counterElement = document.getElementById('cardCounter');
        if (!counterElement) return;
        counterElement.textContent = `Card ${this.currentCardIndex + 1} of ${this.flashcards.length}`;
    }

    openCreateCardModal() {
        const modal = document.getElementById('createCardModal');
        modal?.classList.add('active');
        document.getElementById('newTerm')?.focus();
    }

    closeCreateCardModal() {
        const modal = document.getElementById('createCardModal');
        modal?.classList.remove('active');
        this.clearModalInputs();
    }

    clearModalInputs() {
        ['newTerm', 'newDefinition', 'aiPrompt'].forEach(id => document.getElementById(id) && (document.getElementById(id).value = ''));
    }

    async saveNewCard() {
        const term = document.getElementById('newTerm')?.value.trim();
        const definition = document.getElementById('newDefinition')?.value.trim();

        if (!term || !definition) {
            this.showNotification('Please fill in both term and definition', 'warning');
            return;
        }

        const termWordLimit = 10;
        const definitionWordLimit = 50;

        if (term.split(/\s+/).length > termWordLimit) {
            this.showNotification(`Term is too long! Max ${termWordLimit} words allowed.`, 'warning');
            return;
        }

        if (definition.split(/\s+/).length > definitionWordLimit) {
            this.showNotification(`Definition is too long! Max ${definitionWordLimit} words allowed.`, 'warning');
            return;
        }

        try {
            this.showLoading(true);
            const newCard = { term, definition, category: 'User Created', created: new Date().toISOString() };

            if (window.db && window.currentUser) {
                newCard.id = await this.saveCardToFirebase(newCard);
            } else {
                newCard.id = Date.now().toString();
            }

            this.flashcards.unshift(newCard);
            this.userProgress.totalCards = this.flashcards.length;
            this.saveToLocal();

            this.showNotification('Card saved successfully! 🎉', 'success');
            this.closeCreateCardModal();
        } catch (error) {
            console.error(error);
            this.showNotification('Failed to save card. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

   async generateAICard() {
    let prompt = document.getElementById('aiPrompt')?.value.trim();
    if (!prompt) return this.showNotification('Please enter a topic for AI generation', 'warning');

    const termWordLimit = 10;
    const definitionWordLimit = 50;
    const promptWordLimit = 50;

    // Ограничение промпта до 50 слов
    const promptWords = prompt.split(/\s+/);
    if (promptWords.length > promptWordLimit) {
        prompt = promptWords.slice(0, promptWordLimit).join(' ');
        this.showNotification(`Prompt truncated to ${promptWordLimit} words`, 'warning');
    }

    try {
        this.showLoading(true);
        const response = await fetch('https://school-forumforschool.onrender.com/api/flashcards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt })
        });

        if (!response.ok) throw new Error(`Server error ${response.status}`);

        const data = await response.json();
        const termInput = document.getElementById('newTerm');
        const definitionInput = document.getElementById('newDefinition');

        if (termInput && definitionInput) {
            let generatedTerm = prompt;
            let generatedDefinition = data.response;

            if (generatedTerm.split(/\s+/).length > termWordLimit) {
                generatedTerm = generatedTerm.split(/\s+/).slice(0, termWordLimit).join(' ');
                this.showNotification(`Term truncated to ${termWordLimit} words`, 'warning');
            }

            if (generatedDefinition.split(/\s+/).length > definitionWordLimit) {
                generatedDefinition = generatedDefinition.split(/\s+/).slice(0, definitionWordLimit).join(' ');
                this.showNotification(`Definition truncated to ${definitionWordLimit} words`, 'warning');
            }

            termInput.value = generatedTerm;
            definitionInput.value = generatedDefinition;
        }

        this.showNotification('AI card generated! Review and save if you like it.', 'success');
    } catch (error) {
        console.error(error);
        this.showNotification('Failed to generate AI card. Please try again.', 'error');
    } finally {
        this.showLoading(false);
    }
}


    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        if (!notification) return;

        notification.textContent = message;
        notification.className = `notification ${type} show`;
        setTimeout(() => notification.classList.remove('show'), 4000);
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (!spinner) return;
        spinner.classList.toggle('active', show);
    }
}

// Utilities
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.flashcardsApp = new FlashcardsTrainer();
});

// Export for Node or testing environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlashcardsTrainer;
}
