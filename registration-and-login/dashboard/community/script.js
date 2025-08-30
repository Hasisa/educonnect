let currentUser = null;
let currentCommunityId = null;
let currentCommunity = null;
let unsubscribePosts = null;

const elements = {
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  errorText: document.getElementById('errorText'),
  retryBtn: document.getElementById('retryBtn'),
  communityContent: document.getElementById('communityContent'),
  communityAvatar: document.getElementById('communityAvatar'),
  communityTitle: document.getElementById('communityTitle'),
  communityType: document.getElementById('communityType'),
  communityMembers: document.getElementById('communityMembers'),
  communityCreated: document.getElementById('communityCreated'),
  communityDescription: document.getElementById('communityDescription'),
  joinLeaveBtn: document.getElementById('joinLeaveBtn'),
  joinLeaveIcon: document.getElementById('joinLeaveIcon'),
  joinLeaveText: document.getElementById('joinLeaveText'),
  postCount: document.getElementById('postCount'),
  addPostContainer: document.getElementById('addPostContainer'),
  loginPrompt: document.getElementById('loginPrompt'),
  showAddPostBtn: document.getElementById('showAddPostBtn'),
  addPostForm: document.getElementById('addPostForm'),
  postContent: document.getElementById('postContent'),
  charCount: document.getElementById('charCount'),
  cancelPostBtn: document.getElementById('cancelPostBtn'),
  submitPostBtn: document.getElementById('submitPostBtn'),
  postsLoading: document.getElementById('postsLoading'),
  noPosts: document.getElementById('noPosts'),
  postsContainer: document.getElementById('postsContainer'),
  userMenu: document.getElementById('userMenu'),
  userAvatar: document.getElementById('userAvatar'),
  dropdownMenu: document.getElementById('dropdownMenu'),
  logoutBtn: document.getElementById('logoutBtn'),
  loginBtn: document.getElementById('loginBtn'),
  mobileMenuBtn: document.getElementById('mobileMenuBtn'),
  postDocumentInput: document.getElementById('postDocument'),
  uploadProgressBar: document.getElementById('uploadProgressBar')
};

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupEventListeners();

  const urlParams = new URLSearchParams(window.location.search);
  const communityId = urlParams.get('id');

  if (communityId) {
    loadCommunityById(communityId, false);
  } else {
    showError('Community ID not specified in URL');
  }
});

function initializeApp() {
  auth.onAuthStateChanged(user => {
    currentUser = user;
    updateUIBasedOnAuth();
  });
}

function setupEventListeners() {
  elements.retryBtn?.addEventListener('click', () => location.reload());
  elements.joinLeaveBtn?.addEventListener('click', handleJoinLeave);
  elements.showAddPostBtn?.addEventListener('click', showAddPostForm);
  elements.cancelPostBtn?.addEventListener('click', hideAddPostForm);
  elements.addPostForm?.addEventListener('submit', handleSubmitPost);
  elements.postContent?.addEventListener('input', updateCharCount);
  elements.userAvatar?.addEventListener('click', toggleUserMenu);
  elements.logoutBtn?.addEventListener('click', handleLogout);
  elements.loginBtn?.addEventListener('click', handleLogin);

  document.addEventListener('click', (e) => {
    if (!elements.userMenu?.contains(e.target)) {
      elements.dropdownMenu?.classList.remove('show');
    }
  });

  window.addEventListener('popstate', event => {
    const state = event.state;
    if (state && state.communityId && state.communityId !== currentCommunityId) {
      loadCommunityById(state.communityId, false);
    }
  });
}

async function loadCommunityById(id, pushState = true) {
  showLoading();

  try {
    if (unsubscribePosts) {
      unsubscribePosts();
      unsubscribePosts = null;
    }

    const doc = await db.collection('communities').doc(id).get();

    if (!doc.exists) throw new Error('Community not found');

    currentCommunityId = doc.id;
    currentCommunity = { id: doc.id, ...doc.data() };

    displayCommunityData();
    await loadPosts();
    hideLoading();

    if (pushState) {
      history.pushState({ communityId: id }, '', `?id=${id}`);
    } else {
      history.replaceState({ communityId: id }, '', `?id=${id}`);
    }

  } catch (error) {
    console.error('Error loading community:', error);
    showError(error.message);
  }
}

function displayCommunityData() {
  const c = currentCommunity;
  if (!c) return;

  document.title = `${c.name} - EduConnect`;

  if (elements.communityAvatar) {
    elements.communityAvatar.src = c.image || 'https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop';
    elements.communityAvatar.alt = `${c.name} avatar`;
  }

  if (elements.communityTitle) elements.communityTitle.textContent = c.name || '';
  if (elements.communityType) elements.communityType.textContent = c.type || 'General';

  const memberCount = Array.isArray(c.members) ? c.members.length : 0;
  if (elements.communityMembers) elements.communityMembers.textContent = `${memberCount} members`;

  if (elements.communityDescription) elements.communityDescription.textContent = c.description || 'No description available.';

  if (elements.communityCreated) {
    if (c.createdAt) {
      const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
      elements.communityCreated.textContent = `Created ${formatDate(date)}`;
    } else {
      elements.communityCreated.textContent = '';
    }
  }

  updateJoinLeaveButton();
}

function updateJoinLeaveButton() {
  if (!elements.joinLeaveBtn) return;

  if (!currentUser) {
    elements.joinLeaveBtn.style.display = 'none';
    return;
  }

  elements.joinLeaveBtn.style.display = 'flex';

  const isMember = Array.isArray(currentCommunity?.members) && currentCommunity.members.includes(currentUser.uid);

  if (isMember) {
    if (elements.joinLeaveIcon) elements.joinLeaveIcon.className = 'fas fa-sign-out-alt';
    if (elements.joinLeaveText) elements.joinLeaveText.textContent = 'Leave Community';
    elements.joinLeaveBtn.className = 'btn btn-danger';
  } else {
    if (elements.joinLeaveIcon) elements.joinLeaveIcon.className = 'fas fa-plus';
    if (elements.joinLeaveText) elements.joinLeaveText.textContent = 'Join Community';
    elements.joinLeaveBtn.className = 'btn btn-primary';
  }
}

async function handleJoinLeave() {
  if (!currentUser) return;
  if (!currentCommunityId) return;

  elements.joinLeaveBtn.disabled = true;

  try {
    const communityRef = db.collection('communities').doc(currentCommunityId);
    const isMember = Array.isArray(currentCommunity?.members) && currentCommunity.members.includes(currentUser.uid);

    if (isMember) {
      await communityRef.update({
        members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid),
        memberCount: firebase.firestore.FieldValue.increment(-1)
      });

      await db.collection('users').doc(currentUser.uid).update({
        communities: firebase.firestore.FieldValue.arrayRemove(currentCommunityId)
      });
    } else {
      await communityRef.update({
        members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
        memberCount: firebase.firestore.FieldValue.increment(1)
      });

      await db.collection('users').doc(currentUser.uid).set({
        communities: firebase.firestore.FieldValue.arrayUnion(currentCommunityId)
      }, { merge: true });
    }

    await loadCommunityById(currentCommunityId, false);

  } catch (error) {
    console.error('Error updating membership:', error);
    alert('Failed to update membership. Please try again.');
  } finally {
    elements.joinLeaveBtn.disabled = false;
  }
}

async function loadPosts() {
  if (!currentCommunityId) return;
  if (unsubscribePosts) {
    unsubscribePosts();
    unsubscribePosts = null;
  }

  if (elements.postsLoading) elements.postsLoading.style.display = 'flex';
  if (elements.noPosts) elements.noPosts.style.display = 'none';
  if (elements.postsContainer) elements.postsContainer.innerHTML = '';

  unsubscribePosts = db.collection('communities')
    .doc(currentCommunityId)
    .collection('posts')
    .orderBy('createdAt', 'desc')
    .onSnapshot(async snapshot => {
      if (elements.postsLoading) elements.postsLoading.style.display = 'none';

      if (snapshot.empty) {
        if (elements.noPosts) {
          elements.noPosts.style.display = 'block';
          elements.noPosts.textContent = 'No posts yet.';
        }
        if (elements.postCount) elements.postCount.textContent = '0';
        return;
      }

      if (elements.noPosts) elements.noPosts.style.display = 'none';
      if (elements.postCount) elements.postCount.textContent = snapshot.size.toString();
      if (elements.postsContainer) elements.postsContainer.innerHTML = '';

      const postElements = await Promise.all(snapshot.docs.map(async doc => {
        const post = { id: doc.id, ...doc.data() };
        return await createPostElement(post);
      }));

      postElements.forEach(el => elements.postsContainer.appendChild(el));
    }, error => {
      console.error('Error loading posts:', error);
      if (elements.postsLoading) elements.postsLoading.style.display = 'none';
      if (elements.noPosts) {
        elements.noPosts.style.display = 'block';
        elements.noPosts.textContent = 'Error loading posts. Please try again later.';
      }
    });
}

async function createPostElement(post) {
  const postDiv = document.createElement('div');
  postDiv.className = 'post-card';
  postDiv.dataset.postId = post.id;

  const createdAt = post.createdAt?.toDate ? post.createdAt.toDate() : new Date(post.createdAt);
  let authorFullName = post.authorName || 'Unknown User';
  let authorAvatarUrl = post.authorAvatarUrl || null;

  try {
    if (post.authorId) {
      const userDoc = await db.collection('users').doc(post.authorId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.firstName && userData.lastName) {
          authorFullName = `${userData.firstName} ${userData.lastName}`;
        }
        if (userData.avatarUrl) authorAvatarUrl = userData.avatarUrl;
      }
    }
  } catch (error) {
    console.error('Error fetching user data for post author:', error);
  }

  const authorInitials = authorFullName.split(' ').map(n => n[0]).join('').toUpperCase();
  const likedBy = post.likedBy || [];
  const isLiked = currentUser ? likedBy.includes(currentUser.uid) : false;

  let attachmentHtml = '';
  if (post.attachment && post.attachment.url) {
    const isImage = post.attachment.url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    if (isImage) {
      attachmentHtml = `<div class="post-attachment"><img src="${escapeHtml(post.attachment.url)}" alt="${escapeHtml(post.attachment.name)}" class="post-image" /></div>`;
    } else {
      attachmentHtml = `
        <div class="post-attachment">
          <a href="${escapeHtml(post.attachment.url)}" target="_blank" rel="noopener noreferrer">
            <i class="fas fa-file"></i> ${escapeHtml(post.attachment.name)}
          </a>
          <button type="button" class="download-btn" data-url="${escapeHtml(post.attachment.url)}" data-filename="${escapeHtml(post.attachment.name)}">
            <i class="fas fa-download"></i> Download
          </button>
        </div>`;
    }
  }
const authorAvatarHtml = authorAvatarUrl
  ? `<img src="${escapeHtml(authorAvatarUrl)}" alt="${escapeHtml(authorFullName)}" class="author-avatar-img" />`
  : `<div class="author-avatar">${escapeHtml(authorInitials)}</div>`;

const authorNameHtml = `<span class="author-name" style="cursor:pointer; color:blue;">${escapeHtml(authorFullName)}</span>`;

postDiv.innerHTML = `
  <div class="post-header">
    <div class="post-author">
      ${authorAvatarHtml}
      <div class="author-info">
        <h4>${authorNameHtml}</h4>
        <span class="post-timestamp">${formatRelativeTime(createdAt)}</span>
      </div>
    </div>
  </div>
  <div class="post-content">${escapeHtml(post.content)}</div>
  ${attachmentHtml}
  <div class="post-actions">
    <button type="button" class="post-action like-btn" data-post-id="${post.id}" aria-pressed="${isLiked}">
      <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
      <span class="likes-count">${post.likes || 0}</span>
    </button>
    <button type="button" class="post-action reply-btn" data-post-id="${post.id}">
      <i class="far fa-comment"></i> Reply
    </button>
  </div>
`;

// Добавляем клик на имя автора
const authorNameSpan = postDiv.querySelector('.author-name');
if (authorNameSpan) {
  authorNameSpan.addEventListener('click', () => {
    if (post.authorId) {
      window.location.href = `../dashboard.html?id=${post.authorId}`;
    }
  });
}

  // Событие Download
  const downloadBtn = postDiv.querySelector('.download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async e => {
      e.preventDefault();
      const url = downloadBtn.getAttribute('data-url');
      const filename = downloadBtn.getAttribute('data-filename') || 'file';
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  // Событие Like
// Событие Like
const likeBtn = postDiv.querySelector('.like-btn');
likeBtn.addEventListener('click', async e => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) return alert('Please log in to like posts.');

    // отключаем кнопку пока обрабатываем
    likeBtn.disabled = true;

    try {
        const postRef = db.collection('communities')
                          .doc(currentCommunityId)
                          .collection('posts')
                          .doc(post.id);

        await db.runTransaction(async (transaction) => {
            const postDoc = await transaction.get(postRef);
            const likedBy = postDoc.data().likedBy || [];
            const isLikedNow = likedBy.includes(currentUser.uid);

            if (isLikedNow) {
                transaction.update(postRef, {
                    likedBy: firebase.firestore.FieldValue.arrayRemove(currentUser.uid),
                    likes: firebase.firestore.FieldValue.increment(-1)
                });
            } else {
                transaction.update(postRef, {
                    likedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
                    likes: firebase.firestore.FieldValue.increment(1)
                });
            }

            // сразу обновляем UI
            const likesCountSpan = likeBtn.querySelector('.likes-count');
            if (likesCountSpan) {
                let currentLikes = parseInt(likesCountSpan.textContent) || 0;
                likesCountSpan.textContent = isLikedNow ? currentLikes - 1 : currentLikes + 1;
            }

            const icon = likeBtn.querySelector('i');
            if (icon) icon.className = isLikedNow ? 'far fa-heart' : 'fas fa-heart';
            likeBtn.setAttribute('aria-pressed', !isLikedNow);
        });

    } catch (error) {
        console.error('Error updating like:', error);
        alert('Failed to update like. Please try again.');
    } finally {
        likeBtn.disabled = false;
    }
});


  // Событие Reply
  const replyBtn = postDiv.querySelector('.reply-btn');
  replyBtn.addEventListener('click', () => {
    window.location.href = `comments.html?communityId=${currentCommunityId}&postId=${post.id}`;
  });

  return postDiv;
}


function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m];
  });
}

function formatRelativeTime(date) {
  const now = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60) return `${Math.floor(diff)} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

function showLoading() {
  if (elements.loadingState) elements.loadingState.style.display = 'block';
  if (elements.errorState) elements.errorState.style.display = 'none';
  if (elements.communityContent) elements.communityContent.style.display = 'none';
}

function hideLoading() {
  if (elements.loadingState) elements.loadingState.style.display = 'none';
  if (elements.communityContent) elements.communityContent.style.display = 'block';
}

function showError(message) {
  if (elements.loadingState) elements.loadingState.style.display = 'none';
  if (elements.errorState) {
    elements.errorState.style.display = 'block';
    if (elements.errorText) elements.errorText.textContent = message;
  }
  if (elements.communityContent) elements.communityContent.style.display = 'none';
}

function updateUIBasedOnAuth() {
  if (currentUser) {
    if (elements.loginPrompt) elements.loginPrompt.style.display = 'none';
    if (elements.showAddPostBtn) elements.showAddPostBtn.style.display = 'flex';
    if (elements.userAvatar) elements.userAvatar.src = currentUser.photoURL || 'default-avatar.png';
  } else {
    if (elements.loginPrompt) elements.loginPrompt.style.display = 'block';
    if (elements.showAddPostBtn) elements.showAddPostBtn.style.display = 'none';
    if (elements.userAvatar) elements.userAvatar.src = 'default-avatar.png';
  }
}

function updateCharCount() {
  if (!elements.postContent || !elements.charCount) return;
  const len = elements.postContent.value.length;
  elements.charCount.textContent = `${len}/500`;
}

function showAddPostForm() {
  if (elements.addPostContainer) elements.addPostContainer.style.display = 'block';
  if (elements.showAddPostBtn) elements.showAddPostBtn.style.display = 'none';
  elements.postContent?.focus();
}

function hideAddPostForm() {
  if (elements.addPostContainer) elements.addPostContainer.style.display = 'none';
  if (elements.showAddPostBtn) elements.showAddPostBtn.style.display = currentUser ? 'flex' : 'none';
  if (elements.addPostForm) elements.addPostForm.reset();
  updateCharCount();
}

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'unsigned-presnt'); // <-- замени на свой preset

  const response = await fetch('https://api.cloudinary.com/v1_1/dpbobj2j2/upload', { // <-- замени на свой cloud name
    method: 'POST',
    body: formData
  });

  if (!response.ok) throw new Error('Failed to upload file to Cloudinary');

  const data = await response.json();
  return data.secure_url; // возвращаем URL загруженного файла
}

async function handleSubmitPost(event) {
  event.preventDefault();
  if (!currentUser || !currentCommunityId) return;

  const content = elements.postContent?.value.trim();
  const file = elements.postDocumentInput?.files[0];

  if (!content && !file) return alert('Post content or attachment is required');

  elements.submitPostBtn.disabled = true;
  if (elements.uploadProgressBar) {
    elements.uploadProgressBar.style.width = '0%';
    elements.uploadProgressBar.parentElement.style.display = 'block';
  }

  try {
    let attachment = null;

    if (file) {
 // добавь нужные
  const allowedFormats = ['jpg', 'jpeg', 'png', 'pdf', 'docx'];
  const ext = file.name.split('.').pop().toLowerCase();

  if (!allowedFormats.includes(ext)) {
    alert('This file format is not allowed.');
    elements.submitPostBtn.disabled = false;
    return;
  }

  // Загрузка через Cloudinary
  const url = await uploadToCloudinary(file);
  attachment = { name: file.name, url };

  if (elements.uploadProgressBar) elements.uploadProgressBar.style.width = '100%';
}

    await db.collection('communities')
      .doc(currentCommunityId)
      .collection('posts')
      .add({
        authorId: currentUser.uid,
        authorName: currentUser.displayName || '',
        authorAvatarUrl: currentUser.photoURL || '',
        content,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0,
        likedBy: [],
        attachment: attachment || null
      });

    hideAddPostForm();

  } catch (error) {
    console.error('Error adding post:', error);
    alert('Failed to add post: ' + error.message);
  } finally {
    elements.submitPostBtn.disabled = false;
    if (elements.uploadProgressBar) elements.uploadProgressBar.parentElement.style.display = 'none';
  }
}


function toggleUserMenu() {
  if (!elements.dropdownMenu) return;
  elements.dropdownMenu.classList.toggle('show');
}

function handleLogout() {
  auth.signOut().catch(console.error);
}

function handleLogin() {
  window.location.href = '/login.html';
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
