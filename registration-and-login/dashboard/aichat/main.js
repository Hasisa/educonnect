import authService from './auth.js';
import chatService from './chat-service.js';

class AIAssistantApp {
  constructor() {
    this.currentUser = null;
    this.isTypingEffect = false;

    this.initialLoad = true;            // флаг первичной загрузки
    this.seenMessages = new Set();      // чтобы не рендерить дубли
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
    this.sendBtn?.addEventListener('click', () => this.handleSendMessage());
    this.messageInput?.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.messageInput?.addEventListener('input', () => this.autoResizeTextarea());
    this.backBtn?.addEventListener('click', () => this.handleBack());
    this.toolsBtn?.addEventListener('click', () => this.showToolsModal());
    this.closeToolsBtn?.addEventListener('click', () => this.hideToolsModal());
    this.toolsModal?.addEventListener('click', (e) => { if (e.target === this.toolsModal) this.hideToolsModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hideToolsModal(); });

    // отслеживаем скролл — показываем/скрываем кнопку "Старые сообщения"
    this.chatWindow?.addEventListener('scroll', () => {
      this.updateOldMessageBtnVisibility();
    });
  }

  initializeAuth() {
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

  // Загрузка истории — callback может получать массив сообщений или одно сообщение
  async loadChatHistoryAsync() {
    if (!this.currentUser) return;

    // очистим старые состояния
    this.seenMessages.clear();
    this.initialLoad = true;

    chatService.loadChatHistory(this.currentUser.uid, (payload) => {
      try {
        if (!payload) return;

        // payload может быть массивом сообщений или одним объектом
        const incoming = Array.isArray(payload) ? payload : [payload];

        // сортируем по timestamp (на случай если snapshot вернул unsorted)
        incoming.sort((a, b) => {
          const ta = a.timestamp ? (a.timestamp.seconds || 0) : 0;
          const tb = b.timestamp ? (b.timestamp.seconds || 0) : 0;
          return ta - tb;
        });

        // рендерим каждое сообщение, но пропускаем уже увиденные (по id)
        incoming.forEach(msg => {
          if (!msg || !msg.id) return;
          if (this.seenMessages.has(msg.id)) return;
          this.seenMessages.add(msg.id);
          // при первичной загрузке не дергаем скролл для каждого сообщения
          this.displayMessage(msg.message, msg.type, msg.createdAt || msg.timestamp || null, false);
        });

        // После того как пришла первая порция сообщений — прокручиваем в конец (последние)
        if (this.initialLoad) {
          // небольшой таймаут чтобы DOM успел отрисоваться
          setTimeout(() => {
            this.scrollToBottom(true); // принудительно
            this.initialLoad = false;
            this.updateOldMessageBtnVisibility();
            console.log('Первичная загрузка чата завершена, прокрутка вниз.');
          }, 80);
        } else {
          // последующие добавления — автоскроллим только если пользователь уже был внизу
          const atBottom = this.isUserAtBottom();
          if (atBottom) {
            this.scrollToBottom(true);
          } else {
            // пользователь не внизу — показываем кнопку "Старые сообщения" (чтобы он мог телепортироваться к началу)
            this.showOldMessageBtnIfNeeded();
          }
        }
      } catch (e) {
        console.error('Ошибка при обработке входящих сообщений:', e);
      }
    });
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

    // 1) локально показываем сообщение сразу
    this.displayMessage(message, 'user', new Date().toISOString(), true);

    // 2) сохраняем
    const saveRes = await chatService.saveMessage(this.currentUser.uid, message, 'user');
    if (!saveRes.success) {
      console.error('Ошибка сохранения сообщения:', saveRes.error);
      this.showError('Не удалось сохранить сообщение.');
    }

    // 3) отправляем на AI, показываем typing effect и сохраняем ответ
    const thinkingElement = this.showThinkingAnimation();
    const aiResult = await chatService.sendToAI(message);
    this.removeThinkingAnimation(thinkingElement);

    if (aiResult.success) {
      // показываем эффект печати (он сам скроллит по мере печати)
      await this.displayMessageWithTypingEffect(aiResult.response, 'ai');
      await chatService.saveMessage(this.currentUser.uid, aiResult.response, 'ai');
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

    // автоскролл — либо форс, либо только если пользователь уже внизу
    if (forceScroll) {
      this.scrollToBottom(true);
    } else {
      if (this.isUserAtBottom()) this.scrollToBottom(true);
      else this.showOldMessageBtnIfNeeded();
    }
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
          i++;
          // если пользователь уже внизу — скроллим по мере печати
          if (this.isUserAtBottom()) this.scrollToBottom(true);
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
    if (this.isUserAtBottom()) this.scrollToBottom(true);
    return el;
  }

  removeThinkingAnimation(element) { if (element?.parentNode) element.parentNode.removeChild(element); }

  handleKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSendMessage(); } }
  autoResizeTextarea() { if (!this.messageInput) return; this.messageInput.style.height = 'auto'; this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px'; }

  // прокрутка — force=true = мгновенно вниз
  scrollToBottom(force = false) {
    if (!this.chatWindow) return;
    if (force) {
      // плавная прокрутка в конец
      try { this.chatWindow.scrollTo({ top: this.chatWindow.scrollHeight, behavior: 'smooth' }); }
      catch { this.chatWindow.scrollTop = this.chatWindow.scrollHeight; }
    } else {
      const atBottom = this.isUserAtBottom();
      if (atBottom) this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
    }
  }

  // helper: проверяет, был ли пользователь внизу
  isUserAtBottom() {
    if (!this.chatWindow) return true;
    return (this.chatWindow.scrollHeight - this.chatWindow.scrollTop) <= (this.chatWindow.clientHeight + 60);
  }

  // Показываем кнопку "Старые сообщения" если чат длинный и пользователь не вверху
  showOldMessageBtnIfNeeded() {
    if (!this.chatWindow) return;
    const longEnough = this.chatWindow.scrollHeight > this.chatWindow.clientHeight + 200;
    const notAtTop = this.chatWindow.scrollTop > 50;
    if (longEnough && notAtTop && !this.oldMessageBtn) {
      this.oldMessageBtn = document.createElement('button');
      this.oldMessageBtn.textContent = "Старые сообщения"; // телепорт в начало
      this.oldMessageBtn.className = 'old-message-btn';
      this.oldMessageBtn.style.position = 'fixed';
      this.oldMessageBtn.style.bottom = '80px';
      this.oldMessageBtn.style.right = '20px';
      this.oldMessageBtn.style.padding = '10px 16px';
      this.oldMessageBtn.style.background = '#2563eb';
      this.oldMessageBtn.style.color = '#fff';
      this.oldMessageBtn.style.border = 'none';
      this.oldMessageBtn.style.borderRadius = '6px';
      this.oldMessageBtn.style.zIndex = 10001;
      this.oldMessageBtn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
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
    if (!longEnough || !notAtTop) {
      if (this.oldMessageBtn) {
        this.oldMessageBtn.remove();
        this.oldMessageBtn = null;
      }
    } else {
      // покажем кнопку, если ещё не показана
      if (!this.oldMessageBtn) this.showOldMessageBtnIfNeeded();
    }
  }

  scrollToTopSmooth() {
    if (!this.chatWindow) return;
    try { this.chatWindow.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch { this.chatWindow.scrollTop = 0; }
  }

  handleBack() { window.location.href = "../tools/tools.html"; }
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
        .old-message-btn{ /* стили заданы динамически выше */ }
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
