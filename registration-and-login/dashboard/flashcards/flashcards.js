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
        this.loadDefaultCards();
    }

    initializeApp() {
        this.bindEventListeners();
        this.showNotification('Welcome to Flashcards Trainer! 🧠', 'success');
    }

    bindEventListeners() {
        // Navigation
        const startTrainingBtn = document.getElementById('startTrainingBtn');
        const backBtn = document.getElementById('backBtn');
        const createCardBtn = document.getElementById('createCardBtn');

        startTrainingBtn?.addEventListener('click', () => this.startTraining());
        backBtn?.addEventListener('click', () => this.goToLanding());
        createCardBtn?.addEventListener('click', () => this.openCreateCardModal());

        // Training controls
        const flipCardBtn = document.getElementById('flipCardBtn');
        const nextCardBtn = document.getElementById('nextCardBtn');
        const flashcard = document.getElementById('flashcard');

        flipCardBtn?.addEventListener('click', () => this.flipCard());
        nextCardBtn?.addEventListener('click', () => this.nextCard());
        flashcard?.addEventListener('click', () => this.flipCard());

        // Modal controls
        const closeModalBtn = document.getElementById('closeModalBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const saveCardBtn = document.getElementById('saveCardBtn');
        const generateAIBtn = document.getElementById('generateAIBtn');
        const modal = document.getElementById('createCardModal');

        closeModalBtn?.addEventListener('click', () => this.closeCreateCardModal());
        cancelBtn?.addEventListener('click', () => this.closeCreateCardModal());
        saveCardBtn?.addEventListener('click', () => this.saveNewCard());
        generateAIBtn?.addEventListener('click', () => this.generateAICard());

        // Close modal when clicking outside
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeCreateCardModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.getCurrentPage() === 'trainingPage') {
                switch(e.key) {
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

    loadDefaultCards() {
        this.flashcards = [
            {
                id: '1',
                term: 'JavaScript',
                definition: 'A high-level, interpreted programming language that conforms to the ECMAScript specification.',
                category: 'Programming',
                created: new Date().toISOString()
            },
            {
                id: '2',
                term: 'HTML',
                definition: 'HyperText Markup Language - the standard markup language for creating web pages.',
                category: 'Web Development',
                created: new Date().toISOString()
            },
            {
                id: '3',
                term: 'CSS',
                definition: 'Cascading Style Sheets - a style sheet language used for describing the presentation of a document.',
                category: 'Web Development',
                created: new Date().toISOString()
            },
            {
                id: '4',
                term: 'API',
                definition: 'Application Programming Interface - a set of protocols, routines, and tools for building software applications.',
                category: 'Programming',
                created: new Date().toISOString()
            },
            {
                id: '5',
                term: 'DOM',
                definition: 'Document Object Model - a programming interface for HTML and XML documents.',
                category: 'Web Development',
                created: new Date().toISOString()
            },
            {
                id: '6',
                term: 'Responsive Design',
                definition: 'An approach to web design that makes web pages render well on various devices and screen sizes.',
                category: 'Design',
                created: new Date().toISOString()
            },
            {
                id: '7',
                term: 'Git',
                definition: 'A distributed version control system for tracking changes in source code during software development.',
                category: 'Tools',
                created: new Date().toISOString()
            },
            {
                id: '8',
                term: 'Firebase',
                definition: 'A platform developed by Google for creating mobile and web applications, providing backend services.',
                category: 'Backend',
                created: new Date().toISOString()
            },
            {
                id: '9',
                term: 'Algorithm',
                definition: 'A step-by-step procedure for calculations, data processing, and automated reasoning tasks.',
                category: 'Computer Science',
                created: new Date().toISOString()
            },
            {
                id: '10',
                term: 'Debugging',
                definition: 'The process of finding and resolving bugs or defects that prevent correct operation of computer software.',
                category: 'Programming',
                created: new Date().toISOString()
            }
        ];

        this.userProgress.totalCards = this.flashcards.length;
        this.loadCardsFromFirebase();
    }

    async loadCardsFromFirebase() {
        if (!window.db) return;
        
        try {
            this.showLoading(true);
            const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const cardsRef = collection(window.db, 'flashcards');
            const q = query(cardsRef, orderBy('created', 'desc'));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const firebaseCards = [];
                snapshot.forEach((doc) => {
                    firebaseCards.push({ id: doc.id, ...doc.data() });
                });
                
                this.flashcards = [...firebaseCards, ...this.flashcards];
                this.userProgress.totalCards = this.flashcards.length;
            }
        } catch (error) {
            console.error('Error loading cards from Firebase:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async saveCardToFirebase(card) {
    if (!window.db) return null;

    try {
        const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Берём userId из своей сессии
        const userId = window.currentUser?.id;
        if (!userId) throw new Error("Пользователь не авторизован");

        const cardWithUser = {
            ...card,
            userId,             // используем свой userId
            created: serverTimestamp()
        };

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
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId)?.classList.add('active');
    }

    startTraining() {
        if (this.flashcards.length === 0) {
            this.showNotification('No flashcards available. Please create some first!', 'warning');
            return;
        }
        
        this.currentCardIndex = 0;
        this.isCardFlipped = false;
        this.showPage('trainingPage');
        this.displayCurrentCard();
        this.updateProgress();
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
        
        if (flashcard && flipBtn) {
            this.isCardFlipped = !this.isCardFlipped;
            flashcard.classList.toggle('flipped');
            flipBtn.textContent = this.isCardFlipped ? 'Show Term' : 'Show Definition';
        }
    }

    nextCard() {
        if (this.flashcards.length === 0) return;
        
        this.currentCardIndex = (this.currentCardIndex + 1) % this.flashcards.length;
        this.displayCurrentCard();
        
        // Update progress
        this.userProgress.cardsStudied++;
        this.userProgress.lastStudyDate = new Date().toISOString();
        
        if (this.currentCardIndex === 0) {
            this.showNotification('Completed all cards! Starting over...', 'success');
        }
    }

    resetCard() {
        const flashcard = document.getElementById('flashcard');
        const flipBtn = document.getElementById('flipCardBtn');
        
        if (flashcard && flipBtn) {
            flashcard.classList.remove('flipped');
            flipBtn.textContent = 'Show Definition';
            this.isCardFlipped = false;
        }
    }

    updateProgress() {
        const counterElement = document.getElementById('cardCounter');
        if (counterElement && this.flashcards.length > 0) {
            counterElement.textContent = `Card ${this.currentCardIndex + 1} of ${this.flashcards.length}`;
        }
    }

    openCreateCardModal() {
        const modal = document.getElementById('createCardModal');
        if (modal) {
            modal.classList.add('active');
            document.getElementById('newTerm')?.focus();
        }
    }

    closeCreateCardModal() {
        const modal = document.getElementById('createCardModal');
        if (modal) {
            modal.classList.remove('active');
            this.clearModalInputs();
        }
    }

    clearModalInputs() {
        const inputs = ['newTerm', 'newDefinition', 'aiPrompt'];
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) input.value = '';
        });
    }

    async saveNewCard() {
        const termInput = document.getElementById('newTerm');
        const definitionInput = document.getElementById('newDefinition');
        
        if (!termInput || !definitionInput) return;
        
        const term = termInput.value.trim();
        const definition = definitionInput.value.trim();
        
        if (!term || !definition) {
            this.showNotification('Please fill in both term and definition', 'warning');
            return;
        }
        
        try {
            this.showLoading(true);
            
            const newCard = {
                term,
                definition,
                category: 'User Created',
                created: new Date().toISOString()
            };
            
            // Save to Firebase if available
            let cardId = null;
            if (window.db) {
                cardId = await this.saveCardToFirebase(newCard);
                newCard.id = cardId;
            } else {
                newCard.id = Date.now().toString();
            }
            
            // Add to local array
            this.flashcards.unshift(newCard);
            this.userProgress.totalCards = this.flashcards.length;
            
            this.showNotification('Card saved successfully! 🎉', 'success');
            this.closeCreateCardModal();
            
        } catch (error) {
            console.error('Error saving card:', error);
            this.showNotification('Failed to save card. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async generateAICard() {
    const promptInput = document.getElementById('aiPrompt');
    if (!promptInput) return;

    const prompt = promptInput.value.trim();
    if (!prompt) {
        this.showNotification('Please enter a topic for AI generation', 'warning');
        return;
    }

    try {
        this.showLoading(true);

        // Отправка запроса на твой сервер Render
        const response = await fetch('https://school-forumforschool.onrender.com/api/flashcards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Server error ${response.status}: ${text}`);
        }

        const data = await response.json();
        const aiText = data.response;

        // Разделяем AI-ответ на term и definition (например через символ | или .)
        // Если AI возвращает только текст, то term = prompt, definition = текст
        const termInput = document.getElementById('newTerm');
        const definitionInput = document.getElementById('newDefinition');

        if (termInput && definitionInput) {
            termInput.value = prompt; // тема запроса
            definitionInput.value = aiText; // AI-ответ
        }

        this.showNotification('AI card generated! Review and save if you like it.', 'success');

    } catch (error) {
        console.error('Error generating AI card:', error);
        this.showNotification('Failed to generate AI card. Please try again.', 'error');
    } finally {
        this.showLoading(false);
    }
}


    async mockAIGeneration(prompt) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock AI responses based on common topics
        const mockResponses = {
            'javascript': {
                term: 'Closure',
                definition: 'A closure is the combination of a function bundled together with references to its surrounding state (the lexical environment).'
            },
            'programming': {
                term: 'Recursion',
                definition: 'A programming technique where a function calls itself to solve smaller subproblems of the same type.'
            },
            'web development': {
                term: 'AJAX',
                definition: 'Asynchronous JavaScript and XML - a technique for creating fast and dynamic web pages by exchanging small amounts of data with the server.'
            },
            'science': {
                term: 'Photosynthesis',
                definition: 'The process by which green plants and some other organisms use sunlight to synthesize nutrients from carbon dioxide and water.'
            },
            'history': {
                term: 'Renaissance',
                definition: 'A period of cultural, artistic, political and economic rebirth following the Middle Ages, spanning roughly the 14th to 17th centuries.'
            }
        };
        
        const key = Object.keys(mockResponses).find(k => 
            prompt.toLowerCase().includes(k)
        );
        
        return key ? mockResponses[key] : {
            term: 'Custom Topic',
            definition: `A concept related to: ${prompt}. This is a mock AI-generated definition.`
        };
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            if (show) {
                spinner.classList.add('active');
            } else {
                spinner.classList.remove('active');
            }
        }
    }
}

// Utility functions
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
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.flashcardsApp = new FlashcardsTrainer();
});

// Export for potential future use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlashcardsTrainer;
}