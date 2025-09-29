// flashcards-service.js
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  orderBy, 
  serverTimestamp, 
  doc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

class FlashcardsService {
    constructor() {
        this.cardsCollection = 'flashcards';
        this.SERVER_URL = 'https://school-forumforschool.onrender.com';
    }

    getCurrentUserId() {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error("Пользователь не авторизован");
        return user.uid;
    }

    // Сохраняем новую карточку в Firebase
    async saveCard(cardData) {
        try {
            const userId = this.getCurrentUserId();
            const card = {
                ...cardData,
                userId,
                created: serverTimestamp()
            };
            const docRef = await addDoc(collection(db, this.cardsCollection), card);
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error saving flashcard:', error);
            return { success: false, error: error.message };
        }
    }

    // Загружаем карточки только для текущего пользователя
    async loadCards() {
        try {
            const userId = this.getCurrentUserId();
            const q = query(
                collection(db, this.cardsCollection), 
                where('userId', '==', userId),
                orderBy('created', 'desc')
            );
            const snapshot = await getDocs(q);
            const cards = [];
            snapshot.forEach(doc => cards.push({ id: doc.id, ...doc.data() }));
            return { success: true, cards };
        } catch (error) {
            console.error('Error loading flashcards:', error);
            return { success: false, cards: [], error: error.message };
        }
    }

    // Создаём или обновляем профиль пользователя
    async createUserProfile(profileData) {
        try {
            const userId = this.getCurrentUserId();
            await setDoc(doc(db, 'users', userId), {
                ...profileData,
                lastActive: serverTimestamp(),
                createdAt: serverTimestamp()
            }, { merge: true });
            return { success: true };
        } catch (error) {
            console.error('Error creating user profile:', error);
            return { success: false, error: error.message };
        }
    }

    // Генерация AI карточки
    async generateAICard(prompt) {
        try {
            const response = await fetch(`${this.SERVER_URL}/api/flashcards`, { // <- исправлено
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Server error ${response.status}: ${text}`);
            }

            const data = await response.json();
            return { success: true, aiText: data.response };
        } catch (error) {
            console.error('Error generating AI flashcard:', error);
            return { success: false, error: `Failed to generate AI card: ${error.message}` };
        }
    }
}

export default new FlashcardsService();
