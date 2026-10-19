/**
 * RIDE-RTREE Session Manager
 * 
 * NOTE: This is a client-side UI session manager using sessionStorage.
 * Real JWT/OAuth authentication with backend signature verification and
 * session cookie validation will be integrated in a future phase.
 */

const SESSION_STORAGE_KEYS = {
    USER: 'ride_rtree_user',
    TOKEN: 'ride_rtree_token'
};

class SessionManager {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this._initFromStorage();
    }

    /**
     * Initialize user session from sessionStorage
     * @private
     */
    _initFromStorage() {
        try {
            if (typeof localStorage !== 'undefined' && localStorage.getItem('goride_logged_out') === '1') {
                this.currentUser = null;
                this.token = null;
                return;
            }
            let rawUser = sessionStorage.getItem(SESSION_STORAGE_KEYS.USER);
            let token = sessionStorage.getItem(SESSION_STORAGE_KEYS.TOKEN);

            const isValidUserJson = (str) => {
                if (!str || typeof str !== 'string') return false;
                const trimmed = str.trim();
                if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed === '{}') return false;
                try {
                    const parsed = JSON.parse(trimmed);
                    return parsed && typeof parsed === 'object' && (parsed.id || parsed.email || parsed.role);
                } catch (e) {
                    return false;
                }
            };

            // Fallback to localStorage if sessionStorage is missing or corrupted
            if (!isValidUserJson(rawUser)) {
                if (typeof localStorage !== 'undefined' && localStorage.getItem('goride_logged_out') === '1') {
                    rawUser = null;
                } else {
                    const userKeys = ['navigo_user', 'goride_user', 'ride_rtree_user'];
                    for (const k of userKeys) {
                        const candidate = localStorage.getItem(k);
                        if (isValidUserJson(candidate)) {
                            rawUser = candidate;
                            break;
                        }
                    }
                    const tokenKeys = ['navigo_token', 'goride_token', 'ride_rtree_token'];
                    for (const tk of tokenKeys) {
                        const candidateTok = localStorage.getItem(tk);
                        if (candidateTok && candidateTok !== 'null' && candidateTok !== 'undefined' && candidateTok.trim() !== '') {
                            token = candidateTok;
                            break;
                        }
                    }
                    if (rawUser && isValidUserJson(rawUser)) {
                        try {
                            sessionStorage.setItem(SESSION_STORAGE_KEYS.USER, rawUser);
                            if (token) sessionStorage.setItem(SESSION_STORAGE_KEYS.TOKEN, token);
                        } catch (e) {}
                    } else {
                        rawUser = null;
                    }
                }
            }

            if (rawUser && isValidUserJson(rawUser)) {
                this.currentUser = JSON.parse(rawUser);
                this.token = token || null;

                // Keep localStorage in sync so new tabs & homepage immediately see user session
                try {
                    localStorage.setItem('navigo_user', rawUser);
                    localStorage.setItem('goride_user', rawUser);
                    localStorage.setItem('ride_rtree_user', rawUser);
                    if (this.token) {
                        localStorage.setItem('navigo_token', this.token);
                        localStorage.setItem('ride_rtree_token', this.token);
                    }
                } catch (e) {}

                // Sync latest avatar/name from localStorage if profile was updated for the SAME user
                try {
                    const localUserRaw = localStorage.getItem('navigo_user') || localStorage.getItem('goride_user');
                    if (localUserRaw) {
                        const localUser = JSON.parse(localUserRaw);
                        const isSame = localUser && (
                            (localUser.id && this.currentUser.id && localUser.id === this.currentUser.id) ||
                            (localUser.email && this.currentUser.email && localUser.email.toLowerCase() === this.currentUser.email.toLowerCase())
                        );
                        if (isSame) {
                            if (localUser.avatar || localUser.avatar_path) {
                                this.currentUser.avatar = localUser.avatar || localUser.avatar_path;
                                this.currentUser.avatar_path = localUser.avatar_path || localUser.avatar;
                            }
                            if (localUser.name) this.currentUser.name = localUser.name;
                            if (localUser.phone) this.currentUser.phone = localUser.phone;
                            if (localUser.role) this.currentUser.role = localUser.role;
                        }
                    }
                } catch (e) {}

                // If user is a driver, ensure name is not corrupted with Admin text
                if (this.currentUser && this.currentUser.role === 'driver') {
                    const cName = this.currentUser.name || '';
                    if (!cName || cName.includes('Quản trị viên') || cName.toLowerCase() === 'admin') {
                        try {
                            const adminDrivers = JSON.parse(localStorage.getItem('goride_admin_drivers') || '[]');
                            const dMatch = adminDrivers.find(d => (d.email && d.email === this.currentUser.email) || (d.id && d.id === this.currentUser.id) || (d.phone && d.phone === this.currentUser.phone));
                            if (dMatch && dMatch.name && !dMatch.name.includes('Quản trị viên')) {
                                this.currentUser.name = dMatch.name;
                            } else {
                                const offUsers = JSON.parse(localStorage.getItem('goride_offline_users') || '[]');
                                const uMatch = offUsers.find(u => (u.email && u.email === this.currentUser.email) || (u.id && u.id === this.currentUser.id));
                                if (uMatch && uMatch.name && !uMatch.name.includes('Quản trị viên')) {
                                    this.currentUser.name = uMatch.name;
                                } else {
                                    this.currentUser.name = 'Tài xế đối tác';
                                }
                            }
                        } catch (e) {
                            this.currentUser.name = 'Tài xế đối tác';
                        }
                    }
                }

                // Sync token with API client if available
                if (typeof apiClient !== 'undefined' && apiClient && this.token) {
                    apiClient.setAuthToken(this.token);
                }
            } else {
                this.currentUser = null;
                this.token = null;
            }
        } catch (error) {
            console.error('[SessionManager] Error parsing session storage:', error);
            this.currentUser = null;
            this.token = null;
        }
    }

    /**
     * Get the currently logged in user profile
     * @returns {Object|null} User data object or null if not authenticated
     */
    getCurrentUser() {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('goride_logged_out') === '1') {
            this.currentUser = null;
            this.token = null;
            return null;
        }
        if (!this.currentUser) {
            this._initFromStorage();
        }
        return this.currentUser;
    }

    /**
     * Alias for getCurrentUser() used across codebase
     * @returns {Object|null}
     */
    getUser() {
        return this.getCurrentUser();
    }

    /**
     * Check if a user is currently logged in
     * @returns {boolean}
     */
    isAuthenticated() {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('goride_logged_out') === '1') {
            return false;
        }
        return !!this.getCurrentUser();
    }

    /**
     * Get the role of the logged in user
     * @returns {'customer'|'driver'|'admin'|null}
     */
    getRole() {
        const user = this.getCurrentUser();
        return user ? (user.role || 'customer') : null;
    }

    /**
     * Get the active session token
     * @returns {string|null}
     */
    getToken() {
        return this.token || sessionStorage.getItem(SESSION_STORAGE_KEYS.TOKEN) || null;
    }

    /**
     * Log in a user and store session in sessionStorage
     * @param {Object} userData - User profile object
     * @param {string} [token] - Optional mock/real auth token
     * @returns {Object} Stored user data
     */
    login(userData, token = 'demo-jwt-token-' + Date.now()) {
        if (!userData || typeof userData !== 'object') {
            throw new Error('Invalid user data provided to login()');
        }

        this.currentUser = { ...userData };
        this.token = token;

        try {
            localStorage.removeItem('goride_logged_out');
            sessionStorage.removeItem('goride_logged_out');
            sessionStorage.setItem(SESSION_STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
            sessionStorage.setItem(SESSION_STORAGE_KEYS.TOKEN, this.token);
            localStorage.setItem('goride_user', JSON.stringify(this.currentUser));
            localStorage.setItem('navigo_user', JSON.stringify(this.currentUser));
            localStorage.setItem('ride_rtree_user', JSON.stringify(this.currentUser));
            localStorage.setItem('ride_rtree_token', this.token);
            localStorage.setItem('navigo_token', this.token);
        } catch (error) {
            console.error('[SessionManager] Error saving to storage:', error);
        }

        // Sync with ApiClient
        if (typeof apiClient !== 'undefined' && apiClient) {
            apiClient.setAuthToken(this.token);
        }

        // If logging in as admin or driver, purge any stale passenger active trips
        if (this.currentUser.role === 'admin' || this.currentUser.role === 'driver') {
            try {
                localStorage.removeItem('goride_active_trip');
                localStorage.removeItem('goride_pending_trip_offers');
            } catch (e) {}
        }

        // Dispatch events for reactive UI updates
        this._dispatchAuthEvents('login', this.currentUser);

        return this.currentUser;
    }

    /**
     * Update current user profile fields and persist to storage
     * @param {Object} partialData - Key-values to update
     * @returns {Object|null}
     */
    updateUser(partialData) {
        if (!this.currentUser) return null;

        this.currentUser = {
            ...this.currentUser,
            ...partialData
        };

        try {
            sessionStorage.setItem(SESSION_STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
            localStorage.setItem('goride_user', JSON.stringify(this.currentUser));
            localStorage.setItem('navigo_user', JSON.stringify(this.currentUser));
            localStorage.setItem('ride_rtree_user', JSON.stringify(this.currentUser));
        } catch (error) {
            console.error('[SessionManager] Error updating user in storage:', error);
        }

        this._dispatchAuthEvents('update', this.currentUser);
        return this.currentUser;
    }

    /**
     * Directly set and persist full user object (invoked from profile page)
     * @param {Object} userData - Complete or partial user object
     * @returns {Object}
     */
    setUser(userData) {
        if (!userData || typeof userData !== 'object') return null;

        this.currentUser = {
            ...(this.currentUser || {}),
            ...userData
        };

        try {
            localStorage.removeItem('goride_logged_out');
            sessionStorage.removeItem('goride_logged_out');
            sessionStorage.setItem(SESSION_STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
            localStorage.setItem('goride_user', JSON.stringify(this.currentUser));
            localStorage.setItem('navigo_user', JSON.stringify(this.currentUser));
            localStorage.setItem('ride_rtree_user', JSON.stringify(this.currentUser));
        } catch (error) {
            console.error('[SessionManager] Error saving setUser to storage:', error);
        }

        this._dispatchAuthEvents('update', this.currentUser);
        return this.currentUser;
    }

    /**
     * Log out current user and clear stored data
     */
    logout() {
        const previousUser = this.currentUser;
        this.currentUser = null;
        this.token = null;

        try {
            localStorage.setItem('goride_logged_out', '1');
            sessionStorage.setItem('goride_logged_out', '1');
            const clearKeys = [
                SESSION_STORAGE_KEYS.USER,
                SESSION_STORAGE_KEYS.TOKEN,
                'goride_user',
                'navigo_user',
                'ride_rtree_user',
                'goride_token',
                'navigo_token',
                'ride_rtree_token',
                'user',
                'token',
                'currentUser',
                'auth_user',
                'goride_active_trip',
                'goride_pending_trip_offers'
            ];
            clearKeys.forEach(k => {
                try { localStorage.removeItem(k); } catch (e) {}
                try { sessionStorage.removeItem(k); } catch (e) {}
            });
            try { sessionStorage.clear(); } catch (e) {}
        } catch (error) {
            console.error('[SessionManager] Error clearing storage:', error);
        }

        // Clear API client token
        if (typeof apiClient !== 'undefined' && apiClient) {
            apiClient.clearAuthToken();
        }

        // Dispatch events for reactive UI updates
        this._dispatchAuthEvents('logout', null, previousUser);
    }

    /**
     * Dispatches custom events on window
     * @private
     */
    _dispatchAuthEvents(action, user, previousUser = null) {
        if (typeof window === 'undefined') return;

        const detail = {
            action,
            user,
            previousUser,
            isAuthenticated: !!user,
            role: user ? user.role : null,
            timestamp: Date.now()
        };

        window.dispatchEvent(new CustomEvent(`session:${action}`, { detail }));
        window.dispatchEvent(new CustomEvent('session:change', { detail }));
    }
}

// Singleton instance
const sessionManager = new SessionManager();

// Expose to window for multi-page scripts
if (typeof window !== 'undefined') {
    window.SESSION_STORAGE_KEYS = SESSION_STORAGE_KEYS;
    window.SessionManager = SessionManager;
    window.sessionManager = sessionManager;
}

// Module export support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SESSION_STORAGE_KEYS, SessionManager, sessionManager };
}
