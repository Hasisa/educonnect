import authService from './auth.js';
import chatService from './chat-service.js';

class AIAssistantApp {
  constructor() {
    this.currentUser = null;
    this.isTypingEffect = false;

    this.initializeElements();
    this.attachEventListeners();
    this.initializeAuth();
    this.initNotificationStyle();
  }

  initializeElements() {
    this.chatScreen = document.getElementById('chatScreen');
    this.chatWindow = document.getElementById('chatWindow');
    this.messageInput = document.getElementById('messageInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.backBtn = document.getElementById('backBtn');
    this.toolsBtn = document.getElementById('toolsBtn');
    this.toolsModal = document.getElementById('toolsModal');
    this.closeToolsBtn = document.getElementById('closeTools');

    this.chatScreen?.classList.remove('hidden');
  }

  attachEventListeners() {
    this.sendBtn?.addEventListener('click', () => this.handleSendMessage());
    this.messageInput?.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.messageInput?.addEventListener('input', () => this.autoResizeTextarea());
    this.backBtn?.addEventListener('click', () => this.handleBack());
    this.toolsBtn?.addEventListener('click', () => this.showToolsModal());
    this.closeToolsBtn?.addEventListener('click', () => this.hideToolsModal());
    this.toolsModal?.addEventListener('click', (e) => { if (e.target === this.toolsModal) this.hideToolsModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hideToolsModal(); });
  }

  initializeAuth() {
    try {
      authService.onAuthStateChanged(async (user) => {
        if (!user) {
          // уникальный гостевой uid
          const timestamp = Date.now();
          this.currentUser = { uid: `guest-${timestamp}`, email: `guest-${timestamp}@example.com` };
          console.warn('Используется гостевой режим');
        } else {
          this.currentUser = user;
        }

        await this.updateUserProfile();
        this.loadChatHistoryAsync();
      });
    } catch (err) {
      console.error('Auth initialization error:', err);
      this.showError('Ошибка при инициализации пользователя.');
    }
  }

  async updateUserProfile() {
    if (!this.currentUser) return;
    const profileData = {
      email: this.currentUser.email,
      uid: this.currentUser.uid,
      lastLogin: new Date().toISOString()
    };
    await chatService.createUserProfile(this.currentUser.uid, profileData);
  }

  async loadChatHistoryAsync() {
    if (!this.currentUser) return;
    chatService.loadChatHistory(this.currentUser.uid, (messages) => {
      this.displayChatHistory(messages);
    });
  }

  displayChatHistory(messages) {
    if (!this.chatWindow) return;
    this.chatWindow.querySelectorAll('.message')?.forEach(msg => msg.remove());
    messages.forEach(msg => this.displayMessage(msg.message, msg.type, msg.createdAt));
    this.scrollToBottom();
  }

  async handleSendMessage() {
    if (!this.currentUser) {
      this.showError('Сначала войдите или используйте гостевой режим');
      return;
    }

    const message = this.messageInput?.value.trim();
    if (!message) return;

    this.sendBtn.disabled = true;
    this.messageInput.value = '';
    this.autoResizeTextarea();
    this.displayMessage(message, 'user');
    await chatService.saveMessage(this.currentUser.uid, message, 'user');

    const thinkingElement = this.showThinkingAnimation();
    const aiResult = await chatService.sendToAI(message);
    this.removeThinkingAnimation(thinkingElement);

    if (aiResult.success) {
      await this.displayMessageWithTypingEffect(aiResult.response, 'ai');
      await chatService.saveMessage(this.currentUser.uid, aiResult.response, 'ai');
    } else {
      this.displayMessage(aiResult.error, 'ai');
    }

    this.sendBtn.disabled = false;
    this.messageInput?.focus();
  }

  displayMessage(message, type, timestamp = null) {
    if (!this.chatWindow) return;
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    const time = timestamp ? new Date(timestamp) : new Date();
    const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageElement.innerHTML = `<div class="message-content">${this.escapeHtml(message)}<span class="message-time">${timeString}</span></div>`;
    this.chatWindow.appendChild(messageElement);
    this.scrollToBottom();
  }

  async displayMessageWithTypingEffect(message, type) {
    if (!this.chatWindow) return;
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    const textSpan = document.createElement('span');
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    contentDiv.appendChild(textSpan);
    contentDiv.appendChild(timeSpan);
    messageElement.appendChild(contentDiv);
    this.chatWindow.appendChild(messageElement);

    // Тайпинг эффект с очередью
    return new Promise(resolve => {
      let i = 0;
      const speed = 30;
      const typeChar = () => {
        if (i < message.length) {
          textSpan.textContent = message.substring(0, i + 1);
          i++;
          this.scrollToBottom();
          setTimeout(typeChar, speed);
        } else {
          resolve();
        }
      };
      typeChar();
    });
  }

  showThinkingAnimation() {
    if (!this.chatWindow) return null;
    const el = document.createElement('div');
    el.className = 'thinking-message';
    el.innerHTML = `<div class="ai-avatar"><i class="fas fa-robot"></i></div><div class="thinking-content"><span>Thinking</span><div class="thinking-dots"><span></span><span></span><span></span></div></div>`;
    this.chatWindow.appendChild(el);
    this.scrollToBottom();
    return el;
  }

  removeThinkingAnimation(element) { if (element?.parentNode) element.parentNode.removeChild(element); }

  handleKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSendMessage(); } }
  autoResizeTextarea() { if (!this.messageInput) return; this.messageInput.style.height = 'auto'; this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px'; }

  scrollToBottom() {
    if (!this.chatWindow) return;
    this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
  }

  handleBack() { this.showInfo('Back navigation would go to the main page'); }
  showToolsModal() { this.toolsModal?.classList.remove('hidden'); }
  hideToolsModal() { this.toolsModal?.classList.add('hidden'); }
  escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

  initNotificationStyle() {
    if (!document.getElementById('notification-style')) {
      const style = document.createElement('style');
      style.id = 'notification-style';
      style.textContent = `
        @keyframes slideInRight{from{opacity:0;transform:translateX(100%);}to{opacity:1;transform:translateX(0);}}
        .notification-content{display:flex;align-items:center;gap:12px;}
        .notification-close{background:none;border:none;color:inherit;cursor:pointer;padding:4px;margin-left:auto;}
      `;
      document.head.appendChild(style);
    }
  }

  showError(message) { this.showNotification(message, 'error'); }
  showInfo(message) { this.showNotification(message, 'info'); }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `<div class="notification-content"><i class="fas fa-${type==='error'?'exclamation-circle':'info-circle'}"></i><span>${message}</span><button class="notification-close"><i class="fas fa-times"></i></button></div>`;
    notification.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${type==='error'?'#fef2f2':'#eff6ff'}; border:1px solid ${type==='error'?'#fecaca':'#dbeafe'}; border-radius:8px; padding:16px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); z-index:10000; max-width:400px; animation: slideInRight 0.3s ease-out;`;
    document.body.appendChild(notification);

    const timeoutId = setTimeout(() => this.removeNotification(notification), 5000);
    notification.querySelector('.notification-close')?.addEventListener('click', () => {
      clearTimeout(timeoutId);
      this.removeNotification(notification);
    });
  }

  removeNotification(notification) {
    if (!notification?.parentNode) return;
    notification.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => { notification.parentNode?.removeChild(notification); }, 300);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AIAssistantApp();
});