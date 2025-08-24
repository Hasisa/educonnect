// Firebase Configuration (Replace with your actual config)
const firebaseConfig = {
    apiKey: "AIzaSyCkU8o1vz4Tmo0yVRFrlq2_1_eDfI_GPaA",
    authDomain: "educonnect-958e2.firebaseapp.com",
    projectId: "educonnect-958e2",
    storageBucket: "educonnect-958e2.firebasestorage.com",
    messagingSenderId: "1044066506835",
    appId: "1:1044066506835:web:ad2866ebfe60aa90978ea6",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const searchInput = document.getElementById('searchInput');
const loadingSpinner = document.getElementById('loadingSpinner');
const searchIcon = document.querySelector('.search-icon');
const resultsSection = document.getElementById('resultsSection');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const noResults = document.getElementById('noResults');

// Ensure elements exist
if (!searchInput || !loadingSpinner || !resultsSection) {
    console.error('Critical DOM elements missing. Check HTML.');
}

// Search State
let searchTimeout;
const DEBOUNCE_DELAY = 300;
const AI_ENDPOINT = "https://school-forumforschool.onrender.com/api/dictionary";

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    showWelcomeMessage();
});

function setupEventListeners() {
    if (!searchInput) return;
    
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            performSearch(searchInput.value.trim());
        }
    });
}

function handleSearchInput(e) {
    const query = e.target.value.trim();
    clearTimeout(searchTimeout);
    hideMessages();
    
    if (!query) {
        showWelcomeMessage();
        return;
    }
    
    if (query.length < 2) return;
    
    searchTimeout = setTimeout(() => {
        performSearch(query);
    }, DEBOUNCE_DELAY);
}

async function performSearch(query) {
    if (!query || query.length < 2) return;
    
    showLoading(true);
    hideMessages();
    clearResults();
    
    try {
        const firebaseResults = await searchFirestore(query);
        if (firebaseResults.length > 0) {
            displayResults(firebaseResults, 'database');
        } else {
            const aiResults = await searchAI(query);
            if (aiResults.length > 0) {
                displayResults(aiResults, 'ai');
            } else {
                showNoResults();
            }
        }
    } catch (error) {
        console.error('Search error:', error);
        showError('Failed to search. Please check your connection and try again.');
    } finally {
        showLoading(false);
    }
}

async function searchFirestore(query) {
    try {
        const queryLower = query.toLowerCase();
        const snapshot = await db.collection('terms')
            .where('searchKeywords', 'array-contains', queryLower)
            .limit(10)
            .get();

        let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (results.length === 0) {
            const partialSnapshot = await db.collection('terms').get();
            results = partialSnapshot.docs.filter(doc => {
                const data = doc.data();
                return (data.term?.toLowerCase().includes(queryLower) ||
                        data.definition?.toLowerCase().includes(queryLower) ||
                        data.searchKeywords?.some(k => k.toLowerCase().includes(queryLower)));
            }).map(doc => ({ id: doc.id, ...doc.data() }));
        }

        return results.slice(0, 6);
    } catch (error) {
        console.error('Firebase search error:', error);
        return [];
    }
}

async function searchAI(query) {
    try {
        const response = await fetch(AI_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, type: 'dictionary_search' })
        });

        if (!response.ok) throw new Error(`AI search failed: ${response.status}`);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('AI search error:', error);
        return [];
    }
}

function displayResults(results, source) {
    clearResults();
    results.forEach((result, index) => {
        const card = createTermCard(result, source, index);
        resultsSection.appendChild(card);
    });
}

function createTermCard(term, source, index) {
    const card = document.createElement('div');
    card.className = 'term-card';
    card.style.animationDelay = `${index * 0.1}s`;

    let html = `
        <h2 class="term-name">${escapeHtml(term.term)}</h2>
        <p class="term-definition">${escapeHtml(term.definition)}</p>
    `;

    if (term.formula) html += `<div class="term-formula"><div class="formula-label">Formula</div><code>${escapeHtml(term.formula)}</code></div>`;
    if (term.examples?.length) html += `<div class="term-examples"><div class="examples-label">Examples</div><ul>${term.examples.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;

    html += `<span class="source-badge">${source === 'database' ? 'Database' : 'AI Assistant'}</span>`;

    card.innerHTML = html;
    return card;
}

function showLoading(show) {
    if (!loadingSpinner) return;
    if (show) {
        loadingSpinner.style.display = 'block';
        if (searchIcon) searchIcon.style.display = 'none';
    } else {
        loadingSpinner.style.display = 'none';
        if (searchIcon) searchIcon.style.display = 'block';
    }
}

function showWelcomeMessage() {
    clearResults();
    hideMessages();
    if (!resultsSection) return;

    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-message';
    welcomeDiv.innerHTML = `
        <h3>Welcome to the Dictionary & Glossary</h3>
        <p>Start typing to search for terms, definitions, and formulas. We'll search our database first, and if needed, get help from AI.</p>
    `;
    resultsSection.appendChild(welcomeDiv);
}

function showError(message) {
    hideMessages();
    if (errorText && errorMessage) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
    }
}

function showNoResults() {
    hideMessages();
    if (noResults) noResults.style.display = 'block';
}

function hideMessages() {
    if (errorMessage) errorMessage.classList.add('hidden');
    if (noResults) noResults.style.display = 'none';
}

function clearResults() {
    if (resultsSection) resultsSection.innerHTML = '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Check Firebase connection
checkFirebaseConnection().then(connected => {
    if (!connected) console.warn('Firebase not connected. Only AI search will be available.');
});
async function checkFirebaseConnection() {
    try {
        await db.collection('terms').limit(1).get();
        return true;
    } catch (error) {
        console.warn('Firebase connection failed:', error);
        return false;
    }
}
