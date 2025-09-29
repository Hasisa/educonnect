import authService from './auth.js';
import chatService from './chat-service.js';

class AIAssistantApp {
  constructor() {
    if (window.aiAssistantAppInstance) return window.aiAssistantAppInstance;
    window.aiAssistantAppInstance = this;

    this.currentUser = null;
    this.isTypingEffect = false;

    this.initialLoad = true;
    this.seenMessages = new Set();
    this.oldMessageBtn = null;

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
    if (this.listenersAttached) return; 
    this.listenersAttached = true;

    this.sendBtn?.addEventListener('click', () => this.handleSendMessage());
    this.messageInput?.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.messageInput?.addEventListener('input', () => this.autoResizeTextarea());
    this.backBtn?.addEventListener('click', () => this.handleBack());
    this.toolsBtn?.addEventListener('click', () => this.showToolsModal());
    this.closeToolsBtn?.addEventListener('click', () => this.hideToolsModal());
    this.toolsModal?.addEventListener('click', (e) => { if (e.target === this.toolsModal) this.hideToolsModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hideToolsModal(); });

    this.chatWindow?.addEventListener('scroll', () => this.updateOldMessageBtnVisibility());
  }

  initializeAuth() {
    if (this.authInitialized) return;
    this.authInitialized = true;

    try {
      authService.onAuthStateChanged(async (user) => {
        if (!user) {
          const timestamp = Date.now();
          this.currentUser = { uid: `guest-${timestamp}`, email: `guest-${timestamp}@example.com` };
          console.warn('Гостевой режим активирован');
        } else {
          this.currentUser = user;
        }

        await this.updateUserProfile();

        if (!this.historyLoaded) {
          this.historyLoaded = true;
          this.loadChatHistoryAsync();
        }
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

    this.seenMessages.clear();
    this.initialLoad = true;

    chatService.loadChatHistory(this.currentUser.uid, (payload) => {
      if (!payload) return;

      const incoming = Array.isArray(payload) ? payload : [payload];
      incoming.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));

      incoming.forEach(msg => {
        const key = msg.id || `${msg.timestamp}_${msg.message}`;
        if (!msg || this.seenMessages.has(key)) return;
        this.seenMessages.add(key);
        this.displayMessage(msg.message, msg.type, msg.createdAt || msg.timestamp, false);
      });

      if (this.initialLoad) {
        setTimeout(() => {
          this.scrollToBottom(true);
          this.initialLoad = false;
          this.updateOldMessageBtnVisibility();
        }, 80);
      } else if (this.isUserAtBottom()) {
        this.scrollToBottom(true);
      } else {
        this.showOldMessageBtnIfNeeded();
      }
    });
  }

  async handleSendMessage() {
    if (!this.currentUser) return this.showError('Сначала войдите или используйте гостевой режим');

    const message = this.messageInput?.value.trim();
    if (!message) return;

    this.sendBtn.disabled = true;
    this.messageInput.value = '';
    this.autoResizeTextarea();

    // Only save the user message, let chat history listener display it
    const saveRes = await chatService.saveMessage(this.currentUser.uid, message, 'user');
    if (!saveRes.success) this.showError('Не удалось сохранить сообщение.');

    const thinkingElement = this.showThinkingAnimation();
    const aiResult = await chatService.sendToAI(message);
    this.removeThinkingAnimation(thinkingElement);

    if (aiResult.success) {
      // Before saving, check if the last AI message in chat history matches this response
      // Prevent saving duplicate AI responses
      let alreadyExists = false;
      for (let key of this.seenMessages) {
        if (key.includes('ai') && key.includes(aiResult.response)) {
          alreadyExists = true;
          break;
        }
      }
      if (!alreadyExists) {
        await chatService.saveMessage(this.currentUser.uid, aiResult.response, 'ai');
      }
    } else {
      this.displayMessage(aiResult.error, 'ai', new Date().toISOString(), true);
    }

    this.sendBtn.disabled = false;
    this.messageInput?.focus();
  }

  displayMessage(message, type, timestamp = null, forceScroll = false) {
    if (!this.chatWindow) return;
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    const time = timestamp ? new Date(timestamp) : new Date();
    const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageElement.innerHTML = `<div class="message-content">${this.escapeHtml(message)}<span class="message-time">${timeString}</span></div>`;
    this.chatWindow.appendChild(messageElement);

    if (forceScroll || this.isUserAtBottom()) this.scrollToBottom(true);
    else this.showOldMessageBtnIfNeeded();
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

    return new Promise(resolve => {
      let i = 0;
      const speed = 30;
      const typeChar = () => {
        if (i < message.length) {
          textSpan.textContent = message.substring(0, i + 1);
          this.scrollToBottom(true); // всегда скроллим вниз
          i++;
          setTimeout(typeChar, speed);
        } else resolve();
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
    this.scrollToBottom(true);
    return el;
  }

  removeThinkingAnimation(element) { element?.parentNode?.removeChild(element); }

  handleKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSendMessage(); } }
  autoResizeTextarea() { if (!this.messageInput) return; this.messageInput.style.height = 'auto'; this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px'; }

  scrollToBottom(force = false) {
    if (!this.chatWindow) return;
    try { this.chatWindow.scrollTo({ top: this.chatWindow.scrollHeight, behavior: 'smooth' }); }
    catch { this.chatWindow.scrollTop = this.chatWindow.scrollHeight; }
  }

  isUserAtBottom() {
    if (!this.chatWindow) return true;
    return (this.chatWindow.scrollHeight - this.chatWindow.scrollTop) <= (this.chatWindow.clientHeight + 60);
  }

  showOldMessageBtnIfNeeded() {
    if (!this.chatWindow) return;
    const longEnough = this.chatWindow.scrollHeight > this.chatWindow.clientHeight + 200;
    const notAtTop = this.chatWindow.scrollTop > 50;
    if (longEnough && notAtTop && !this.oldMessageBtn) {
      this.oldMessageBtn = document.createElement('button');
      this.oldMessageBtn.textContent = "Старые сообщения";
      this.oldMessageBtn.className = 'old-message-btn';
      Object.assign(this.oldMessageBtn.style, {
        position: 'fixed', bottom: '80px', right: '20px', padding: '10px 16px',
        background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px',
        zIndex: 10001, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      });
      this.oldMessageBtn.addEventListener('click', () => {
        this.scrollToTopSmooth();
        this.oldMessageBtn?.remove();
        this.oldMessageBtn = null;
      });
      document.body.appendChild(this.oldMessageBtn);
    }
  }

  updateOldMessageBtnVisibility() {
    if (!this.chatWindow) return;
    const longEnough = this.chatWindow.scrollHeight > this.chatWindow.clientHeight + 200;
    const notAtTop = this.chatWindow.scrollTop > 50;
    if (!longEnough || !notAtTop) this.oldMessageBtn?.remove();
    else if (!this.oldMessageBtn) this.showOldMessageBtnIfNeeded();
  }

  scrollToTopSmooth() { if (!this.chatWindow) return; this.chatWindow.scrollTo({ top: 0, behavior: 'smooth' }); }

  handleBack() { window.location.href = "../tools/tools.html"; }
  showToolsModal() { this.toolsModal?.classList.remove('hidden'); }
  hideToolsModal() { this.toolsModal?.classList.add('hidden'); }
  escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

  initNotificationStyle() {
    if (!document.getElementById('notification-style')) {
      const style = document.createElement('style');
      style.id = 'notification-style';
      style.textContent =
        `@keyframes slideInRight{from{opacity:0;transform:translateX(100%);}to{opacity:1;transform:translateX(0);}}
        .notification-content{display:flex;align-items:center;gap:12px;}
        .notification-close{background:none;border:none;color:inherit;cursor:pointer;padding:4px;margin-left:auto;}`;
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
