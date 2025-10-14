// Groups Management
class GroupsManager {
    constructor() {
        this.groups = [];
        this.currentGroup = null;
        this.init();
    }

    init() {
        this.setupEventListeners();

        // Ждём авторизации пользователя
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.loadGroups();
            } else {
                this.groups = [];
                this.renderGroups();
            }
        });
    }

    setupEventListeners() {
        document.getElementById('createGroupBtn')?.addEventListener('click', () => this.showCreateGroupModal());
        document.getElementById('createGroupForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createGroup();
        });

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal-overlay')));
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeModal(overlay);
            });
        });
    }

    async loadGroups() {
        try {
            if (window.app) app.showLoading(true);

            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            const userGroups = userDoc.data()?.groups || [];

            if (!userGroups.length) {
                this.groups = [];
                this.renderGroups();
                return;
            }

            const groupsPromises = userGroups.filter(id => id).map(id => db.collection('groups').doc(id).get());
            const groupsDocs = await Promise.all(groupsPromises);

            this.groups = groupsDocs
                .filter(doc => doc.exists)
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            this.renderGroups();
        } catch (error) {
            console.error('Error loading groups:', error);
            if (window.app) app.showNotification('Failed to load groups', 'error');
        } finally {
            if (window.app) app.showLoading(false);
        }
    }

    renderGroups() {
        const groupsGrid = document.getElementById('groupsGrid');
        const currentUser = auth.currentUser;
        if (!groupsGrid) return;

        if (this.groups.length === 0) {
            groupsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users" style="font-size: 3rem; color: var(--gray); margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--gray); margin-bottom: 0.5rem;">No groups yet</h3>
                    <p style="color: var(--gray);">Create your first group to start collaborating</p>
                </div>
            `;
            return;
        }

        groupsGrid.innerHTML = this.groups.map(group => {
            const isMember = currentUser && group.members?.includes(currentUser.uid);
            return `
                <div class="card group-card fade-in" data-group-id="${group.id}">
                    <div class="card-header">
                        <div class="card-avatar">${group.name.charAt(0).toUpperCase()}</div>
                        <div class="card-info">
                            <h3>${group.name}</h3>
                            <div class="card-meta">
                                <span><i class="fas fa-users"></i> ${group.members ? group.members.length : 0} members</span>
                            </div>
                        </div>
                    </div>
                    <p class="card-description">${group.description}</p>
                    <div class="card-actions">
                        <button class="card-btn view-group-btn" data-group-id="${group.id}">
                            <i class="fas fa-eye"></i> View Group
                        </button>
                        ${!isMember && currentUser ? `<button class="card-btn join-group-btn" data-group-id="${group.id}"><i class="fas fa-plus"></i> Join</button>` : ''}
                        <button class="card-btn share-group-btn" data-group-id="${group.id}">
                            <i class="fas fa-share"></i> Share
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.view-group-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectGroup(e.target.closest('button').dataset.groupId));
        });

        document.querySelectorAll('.join-group-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.joinGroup(e.target.closest('button').dataset.groupId));
        });

        // Share button
        document.querySelectorAll('.share-group-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const groupId = e.target.closest('button').dataset.groupId;
                const group = this.groups.find(g => g.id === groupId);
                const currentUser = auth.currentUser;

                if (!group || group.createdBy !== currentUser.uid) {
                    if (window.app) app.showNotification('Only the group creator can share this group', 'error');
                    return;
                }

                const groupLink = `https://educonnectforum.web.app/dashboard/collaboration/collaboration.html?token=${group.shareToken}`;
                try {
                    await navigator.clipboard.writeText(groupLink);
                    if (window.app) app.showNotification('Group link copied to clipboard!', 'success');
                } catch (err) {
                    console.error('Failed to copy link:', err);
                    if (window.app) app.showNotification('Failed to copy link', 'error');
                }
            });
        });
    }

    showCreateGroupModal() {
        const modal = document.getElementById('createGroupModal');
        modal?.classList.add('active');
        document.getElementById('groupName')?.focus();
    }

    closeModal(modal) {
        modal?.classList.remove('active');
        const form = modal?.querySelector('form');
        if (form) form.reset();
    }

    async createGroup() {
        const name = document.getElementById('groupName').value.trim();
        const description = document.getElementById('groupDescription').value.trim();

        if (!name || !description) {
            if (window.app) app.showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            if (window.app) app.showLoading(true);

            const currentUser = auth.currentUser;
            if (!currentUser) {
                if (window.app) app.showNotification('You must be logged in', 'error');
                return;
            }

            const shareToken = Math.random().toString(36).substring(2, 10);

            const groupData = {
                name,
                description,
                members: [currentUser.uid],
                createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                shareToken
            };

            const groupRef = await db.collection('groups').add(groupData);
            const groupId = groupRef.id;

            await db.collection('users').doc(currentUser.uid).update({
                groups: firebase.firestore.FieldValue.arrayUnion(groupId)
            });

            this.closeModal(document.getElementById('createGroupModal'));
            if (window.app) app.showNotification('Group created successfully!', 'success');
            this.loadGroups();
        } catch (error) {
            console.error('Error creating group:', error);
            if (window.app) app.showNotification('Failed to create group', 'error');
        } finally {
            if (window.app) app.showLoading(false);
        }
    }

    async joinGroup(groupId) {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            if (window.app) app.showNotification('You must be logged in to join a group', 'error');
            return;
        }

        try {
            if (window.app) app.showLoading(true);

            const groupRef = db.collection('groups').doc(groupId);

            await groupRef.update({
                members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
            });

            await db.collection('users').doc(currentUser.uid).update({
                groups: firebase.firestore.FieldValue.arrayUnion(groupId)
            });

            if (window.app) app.showNotification('Joined group successfully!', 'success');
            this.loadGroups();
        } catch (error) {
            console.error('Error joining group:', error);
            if (window.app) app.showNotification('Failed to join group', 'error');
        } finally {
            if (window.app) app.showLoading(false);
        }
    }

    selectGroup(groupId) {
        this.currentGroup = this.groups.find(g => g.id === groupId);
        if (!this.currentGroup) return;

        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
            breadcrumb.innerHTML = `
                <span class="breadcrumb-item" onclick="app.showSection('groups')">Groups</span>
                <span class="breadcrumb-item active">${this.currentGroup.name}</span>
            `;
        }

        if (window.app) window.app.showSection('projects');
        if (window.projectsManager) window.projectsManager.loadProjects(groupId);
    }

    getCurrentGroup() {
        return this.currentGroup;
    }
}

// Initialize groups manager
const groupsManager = new GroupsManager();
window.groupsManager = groupsManager;
