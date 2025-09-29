import flashcardsService from './flashcards-service.js';

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

    async initializeApp() {
        this.bindEventListeners();
        this.showNotification('Welcome to Flashcards Trainer! 🧠', 'success');

        // Автоопределение текущего пользователя через Firebase Auth
        const { getAuth, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        const auth = getAuth();

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                window.currentUser = user;
                await this.onUserLogin(user);
            } else {
                this.showNotification('Please log in to see your flashcards.', 'warning');
            }
        });
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

    async onUserLogin(user) {
        try {
            this.showLoading(true);
            const result = await flashcardsService.loadCards();
            if (result.success) {
                this.flashcards = result.cards;
                this.userProgress.totalCards = this.flashcards.length;
                this.showNotification('Flashcards loaded successfully!', 'success');
            } else {
                this.showNotification('Failed to load flashcards: ' + result.error, 'error');
            }
        } catch (error) {
            console.error(error);
            this.showNotification('Error loading flashcards.', 'error');
        } finally {
            this.showLoading(false);
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

    async nextCard() {
        if (!this.flashcards.length) return;
        this.currentCardIndex = (this.currentCardIndex + 1) % this.flashcards.length;
        this.displayCurrentCard();
        this.userProgress.cardsStudied++;
        this.userProgress.lastStudyDate = new Date().toISOString();
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

        try {
            this.showLoading(true);
            const result = await flashcardsService.saveCard({ term, definition, category: 'User Created' });
            if (result.success) {
                const newCard = { id: result.id, term, definition, category: 'User Created' };
                this.flashcards.unshift(newCard);
                this.userProgress.totalCards = this.flashcards.length;
                this.showNotification('Card saved successfully! 🎉', 'success');
                this.closeCreateCardModal();
            } else {
                this.showNotification('Failed to save card: ' + result.error, 'error');
            }
        } catch (error) {
            console.error(error);
            this.showNotification('Error saving card.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async generateAICard() {
        const prompt = document.getElementById('aiPrompt')?.value.trim();
        if (!prompt) return this.showNotification('Please enter a topic for AI generation', 'warning');

        try {
            this.showLoading(true);
            const result = await flashcardsService.generateAICard(prompt);
            if (result.success) {
                document.getElementById('newTerm').value = prompt;
                document.getElementById('newDefinition').value = result.aiText;
                this.showNotification('AI card generated! Review and save if you like it.', 'success');
            } else {
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            console.error(error);
            this.showNotification('Error generating AI card.', 'error');
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

    goToLanding() {
        this.showPage('landingPage');
        this.resetCard();
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.flashcardsApp = new FlashcardsTrainer();
});
