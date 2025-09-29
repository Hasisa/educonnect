// chat-service.js
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

class ChatService {
  constructor() {
    this.messagesCollection = 'messages';
    this.unsubscribe = null;

    this.SERVER_URL = 'https://school-forumforschool.onrender.com/api/ai'; // адрес сервера AI
  }

  async saveMessage(userId, message, type = 'user') {
    try {
      const messageData = {
        userId,
        message,
        type,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, this.messagesCollection), messageData);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error saving message:', error);
      return { success: false, error: error.message };
    }
  }

  loadChatHistory(userId, callback) {
  try {
    const q = query(
      collection(db, this.messagesCollection),
      where('userId', '==', userId),
      orderBy('timestamp', 'asc')
    );

    if (this.unsubscribe) this.unsubscribe(); 
    let initialLoadDone = false;

    this.unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messages = [];

      querySnapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          const msg = { id: change.doc.id, ...change.doc.data() };
          messages.push(msg);
        }
      });

      if (!initialLoadDone) {
        // передаём ВСЕ сообщения при первичной загрузке
        callback(messages);
        initialLoadDone = true;
      } else {
        // последующие новые сообщения — один раз на каждое сообщение
        messages.forEach(msg => callback(msg));
      }
    });

    return () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    };
  } catch (error) {
    console.error('Error loading chat history:', error);
    callback(null);
    return () => {};
  }
}




  unsubscribeFromChatHistory() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  async createUserProfile(userId, profileData) {
    try {
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

async sendToAI(message) {
  try {
    const response = await fetch(this.SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }) // сервер ожидает поле message
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Server error ${response.status}: ${text}`);
    }

    const data = await response.json();

    // Берем только поле reply
    const output = data.reply || "Нет ответа от AI";

    return { success: true, response: output };
  } catch (error) {
    console.error('Error sending message to AI:', error);
    return { success: false, error: `Не удалось обработать запрос к AI: ${error.message}` };
  }
}
}

// ✅ Экспортируем экземпляр класса
export default new ChatService();
