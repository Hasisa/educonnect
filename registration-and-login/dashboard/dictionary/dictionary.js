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

// Search State
let searchTimeout;
const DEBOUNCE_DELAY = 300;
const AI_ENDPOINT = "https://school-forumforschool.onrender.com/api/dictionary";

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    showWelcomeMessage();
});

function setupEventListeners() {
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            performSearch(searchInput.value.trim());
        }
    });
}

function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    // Clear previous timeout
    clearTimeout(searchTimeout);
    
    // Hide error and no results messages
    hideMessages();
    
    if (query.length === 0) {
        showWelcomeMessage();
        return;
    }
    
    if (query.length < 2) {
        return;
    }
    
    // Debounce the search
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
        // First, search Firebase
        const firebaseResults = await searchFirestore(query);
        
        if (firebaseResults.length > 0) {
            displayResults(firebaseResults, 'database');
        } else {
            // If no Firebase results, try AI
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
        
        // Search in the 'terms' collection where searchKeywords array contains the query
        const snapshot = await db.collection('terms')
            .where('searchKeywords', 'array-contains', queryLower)
            .limit(10)
            .get();
        
        const results = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            results.push({
                id: doc.id,
                term: data.term,
                definition: data.definition,
                formula: data.formula,
                examples: data.examples,
                searchKeywords: data.searchKeywords
            });
        });
        
        // If no exact matches, try partial matching
        if (results.length === 0) {
            const partialSnapshot = await db.collection('terms').get();
            partialSnapshot.forEach(doc => {
                const data = doc.data();
                const matchesKeywords = data.searchKeywords?.some(keyword => 
                    keyword.toLowerCase().includes(queryLower) || 
                    queryLower.includes(keyword.toLowerCase())
                );
                const matchesTerm = data.term?.toLowerCase().includes(queryLower);
                const matchesDefinition = data.definition?.toLowerCase().includes(queryLower);
                
                if (matchesKeywords || matchesTerm || matchesDefinition) {
                    results.push({
                        id: doc.id,
                        term: data.term,
                        definition: data.definition,
                        formula: data.formula,
                        examples: data.examples,
                        searchKeywords: data.searchKeywords
                    });
                }
            });
        }
        
        return results.slice(0, 6); // Limit to 6 results
    } catch (error) {
        console.error('Firebase search error:', error);
        return [];
    }
}

async function searchAI(query) {
    try {
        const response = await fetch(AI_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                type: 'dictionary_search'
            })
        });
        
        if (!response.ok) {
            throw new Error(`AI search failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Expected AI response format:
        // {
        //   results: [
        //     {
        //       term: "string",
        //       definition: "string",
        //       formula: "string" (optional),
        //       examples: ["string", "string"] (optional)
        //     }
        //   ]
        // }
        
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
    
    // Add formula if present
    if (term.formula) {
        html += `
            <div class="term-formula">
                <div class="formula-label">Formula</div>
                <code>${escapeHtml(term.formula)}</code>
            </div>
        `;
    }
    
    // Add examples if present
    if (term.examples && term.examples.length > 0) {
        html += `
            <div class="term-examples">
                <div class="examples-label">Examples</div>
                <ul class="examples-list">
                    ${term.examples.map(example => 
                        `<li>${escapeHtml(example)}</li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }
    
    // Add source badge
    const sourceBadge = source === 'database' ? 'Database' : 'AI Assistant';
    html += `<span class="source-badge">${sourceBadge}</span>`;
    
    card.innerHTML = html;
    return card;
}

function showLoading(show) {
    if (show) {
        loadingSpinner.classList.add('show');
        searchIcon.style.display = 'none';
    } else {
        loadingSpinner.classList.remove('show');
        searchIcon.style.display = 'block';
    }
}

function showWelcomeMessage() {
    clearResults();
    hideMessages();
    
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
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
}

function showNoResults() {
    hideMessages();
    noResults.classList.remove('hidden');
}

function hideMessages() {
    errorMessage.classList.add('hidden');
    noResults.classList.add('hidden');
}

function clearResults() {
    resultsSection.innerHTML = '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility function to check Firebase connection
async function checkFirebaseConnection() {
    try {
        const testRef = db.collection('terms').limit(1);
        await testRef.get();
        return true;
    } catch (error) {
        console.warn('Firebase connection failed:', error);
        return false;
    }
}

// Initialize connection check
checkFirebaseConnection().then(connected => {
    if (!connected) {
        console.warn('Firebase not connected. Only AI search will be available.');
    }
});