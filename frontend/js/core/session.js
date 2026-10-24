/**
 * Unified Standard Basemap: Google Maps Vietnam (hl=vi&gl=VN)
 * Strictly complies with Vietnamese territorial sovereignty across all map views.
 */
window.GOOGLE_MAPS_VN_CONFIG = {
    name: 'Bản đồ Google Việt Nam',
    url: 'https://{s}.google.com/vt/lyrs=m&hl=vi&gl=VN&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; Bản đồ Google Việt Nam'
};

window.createGoogleMapsVnTileLayer = function(options) {
    if (typeof L === 'undefined') return null;
    return L.tileLayer(window.GOOGLE_MAPS_VN_CONFIG.url, Object.assign({
        maxZoom: 20,
        subdomains: window.GOOGLE_MAPS_VN_CONFIG.subdomains,
        attribution: window.GOOGLE_MAPS_VN_CONFIG.attribution
    }, options || {}));
};

// Global Leaflet Guard: Intercept any attempt to load OSM/foreign tiles and enforce Google Maps VN
if (typeof window !== 'undefined') {
    function installLeafletGoogleMapVnGuard() {
        if (typeof L !== 'undefined' && L.tileLayer && !L.tileLayer._ggmapvnGuarded) {
            const originalTileLayer = L.tileLayer;
            L.tileLayer = function(url, options) {
                if (typeof url === 'string' && (url.includes('openstreetmap.org') || url.includes('cartocdn.com'))) {
                    url = window.GOOGLE_MAPS_VN_CONFIG.url;
                    options = Object.assign({}, options, {
                        subdomains: window.GOOGLE_MAPS_VN_CONFIG.subdomains,
                        maxZoom: 20,
                        attribution: window.GOOGLE_MAPS_VN_CONFIG.attribution
                    });
                }
                return originalTileLayer.call(this, url, options);
            };
            L.tileLayer._ggmapvnGuarded = true;
        }
    }
    installLeafletGoogleMapVnGuard();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installLeafletGoogleMapVnGuard);
    }
}


/**
 * Global Liquid Glass Modal Notification with Context-Aware Title & Buttons (Hủy / Xác nhận)
 */
window.showNavigoModal = function(options) {
    if (typeof document === 'undefined') return;

    // Check whether loading splash screen is physically in DOM or active
    const isLoadingElement = document.getElementById('loading-splash-screen') || 
                             document.getElementById('navigo-welcome-splash') || 
                             document.getElementById('loading-backdrop') || 
                             document.querySelector('.loading-splash-overlay') || 
                             document.querySelector('.navigo-welcome-splash');
    const isLoadingActive = sessionStorage.getItem('navigo_loading_screen_active') === 'true';
    if (!isLoadingElement && !isLoadingActive) {
        try { sessionStorage.removeItem('navigo_loading_screen_active'); } catch(e) {}
    } else if (isLoadingActive) {
        // Strictly suppress location prompts or automatic prompts during loading screen
        if (options && (options.title === 'Cho phép truy cập vị trí' || options.isAutoPrompt || (!options.danger && !options.onConfirm))) {
            console.log('[NavigoModal] Suppressed during active loading screen');
            return;
        }
    }

    const config = typeof options === 'string' ? { message: options } : (options || {});
    const title = config.title || 'Thông báo Navigo';
    const message = config.message || '';
    const icon = config.icon || '⚡';
    const confirmText = config.confirmText || 'Xác nhận';
    const cancelText = config.cancelText || 'Hủy';
    const onConfirm = config.onConfirm || null;
    const onCancel = config.onCancel || null;
    const showCancel = config.showCancel !== false;
    const danger = !!config.danger;

    const existing = document.getElementById('navigo-liquid-glass-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'navigo-liquid-glass-modal';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(15,45,60,0.45); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); z-index:9999999; display:flex; align-items:center; justify-content:center; padding:20px; box-sizing:border-box;';

    overlay.innerHTML = `
        <div style="background:rgba(255,255,255,0.92); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border:1.5px solid rgba(255,255,255,0.95); border-radius:24px; padding:28px 24px 22px; max-width:380px; width:100%; text-align:center; box-shadow:0 25px 60px rgba(15,45,60,0.25), inset 0 1px 1px rgba(255,255,255,0.8); font-family:system-ui,-apple-system,sans-serif; animation:liquidPop 0.22s cubic-bezier(0.16,1,0.3,1);">
            <div style="width:58px; height:58px; border-radius:50%; background:${danger ? 'rgba(254,242,242,0.9)' : 'rgba(230,247,246,0.9)'}; border:1px solid ${danger ? 'rgba(254,202,202,0.9)' : 'rgba(187,242,238,0.9)'}; color:${danger ? '#dc2626' : '#00b1a9'}; display:flex; align-items:center; justify-content:center; font-size:1.75rem; margin:0 auto 16px auto; box-shadow:0 4px 14px rgba(0,0,0,0.06);">
                ${icon}
            </div>
            <h3 style="margin:0 0 8px 0; font-size:1.25rem; font-weight:800; color:#0f2d3c; letter-spacing:-0.3px;">
                ${title}
            </h3>
            <p style="margin:0 0 22px 0; font-size:0.92rem; color:#475569; line-height:1.45; word-break:break-word;">
                ${message}
            </p>
            <div style="display:flex; gap:10px;">
                ${showCancel ? `
                <button type="button" id="btn-liquid-cancel" style="flex:1; height:44px; border-radius:12px; border:1px solid rgba(203,213,225,0.9); background:rgba(248,250,252,0.9); color:#475569; font-size:0.92rem; font-weight:700; cursor:pointer;">
                    ${cancelText}
                </button>
                ` : ''}
                <button type="button" id="btn-liquid-confirm" style="flex:1; height:44px; border-radius:12px; border:none; background:${danger ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #00b1a9, #008781)'}; color:#ffffff; font-size:0.92rem; font-weight:800; cursor:pointer; box-shadow:${danger ? '0 4px 14px rgba(220,38,38,0.35)' : '0 4px 14px rgba(0,177,169,0.35)'};">
                    ${confirmText}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector('#btn-liquid-cancel');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            overlay.remove();
            if (typeof onCancel === 'function') onCancel();
        };
    }

    const confirmBtn = overlay.querySelector('#btn-liquid-confirm');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            overlay.remove();
            if (typeof onConfirm === 'function') onConfirm();
        };
    }

    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (typeof onCancel === 'function') onCancel();
        }
    };
};

/**
 * Global User Location Permission & Geolocation Service
 * - Prompts modal "Cho phép truy cập vị trí" only once per device/browser or after logout.
 * - Saves permission flag in localStorage (navigo_location_permission_granted).
 * - Saves last known location in localStorage (navigo_user_location).
 * - Automatically dispatches 'navigo:location_updated' event.
 */
window.navigoEnsureLocationPermission = function(callback, forcePrompt = false) {
    const isGranted = localStorage.getItem('navigo_location_permission_granted') === 'true';
    const isPromptedInSession = sessionStorage.getItem('navigo_session_location_prompted') === 'true';
    const cached = localStorage.getItem('navigo_user_location');
    let cachedLoc = null;
    try {
        if (cached) cachedLoc = JSON.parse(cached);
    } catch (e) {}

    const obtainPosition = (onSuccess) => {
        if (!navigator.geolocation) {
            const fallback = { lat: 10.7769, lng: 106.7009, address: 'Thành phố Hồ Chí Minh, Việt Nam', name: 'TP. Hồ Chí Minh' };
            localStorage.setItem('navigo_location_permission_granted', 'true');
            localStorage.setItem('navigo_user_location', JSON.stringify(fallback));
            window.dispatchEvent(new CustomEvent('navigo:location_updated', { detail: fallback }));
            if (typeof onSuccess === 'function') onSuccess(fallback);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = Number(pos.coords.latitude);
                const lng = Number(pos.coords.longitude);
                let address = 'Vị trí hiện tại của bạn';
                let name = 'Vị trí của tôi';

                try {
                    if (window.geocoderService && typeof window.geocoderService.reverse === 'function') {
                        const rev = await window.geocoderService.reverse(lat, lng);
                        if (rev) {
                            address = rev.address || address;
                            name = rev.name || name;
                        }
                    } else {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, { headers: { 'Accept': 'application/json' } });
                        if (res.ok) {
                            const data = await res.json();
                            if (data && data.display_name) {
                                address = data.display_name;
                                name = data.name || (data.address && (data.address.road || data.address.suburb)) || 'Vị trí của tôi';
                            }
                        }
                    }
                } catch (e) {}

                const locData = { lat, lng, address, name };
                localStorage.setItem('navigo_location_permission_granted', 'true');
                localStorage.setItem('navigo_user_location', JSON.stringify(locData));
                window.dispatchEvent(new CustomEvent('navigo:location_updated', { detail: locData }));
                if (typeof onSuccess === 'function') onSuccess(locData);
            },
            (err) => {
                console.warn('[NavigoLocation] Geolocation query notice:', err.message);
                const fallback = cachedLoc || { lat: 10.7769, lng: 106.7009, address: 'Thành phố Hồ Chí Minh, Việt Nam', name: 'TP. Hồ Chí Minh' };
                localStorage.setItem('navigo_location_permission_granted', 'true');
                localStorage.setItem('navigo_user_location', JSON.stringify(fallback));
                window.dispatchEvent(new CustomEvent('navigo:location_updated', { detail: fallback }));
                if (typeof onSuccess === 'function') onSuccess(fallback);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
        );
    };

    // If loading screen is currently running, strictly do not show location popup
    if (sessionStorage.getItem('navigo_loading_screen_active') === 'true') {
        if (cachedLoc && typeof callback === 'function') callback(cachedLoc);
        return;
    }

    // REQUIREMENT: Prompt modal must only appear ONCE per app/web session.
    // If it has already been prompted in this session OR already granted, do NOT show modal again!
    if (isPromptedInSession || (isGranted && !forcePrompt)) {
        if (cachedLoc && typeof callback === 'function') {
            callback(cachedLoc);
        }
        obtainPosition((freshLoc) => {
            if (!cachedLoc && typeof callback === 'function') {
                callback(freshLoc);
            }
        });
        return;
    }

    // Mark as prompted in this session so it will NEVER prompt again during this active visit
    sessionStorage.setItem('navigo_session_location_prompted', 'true');

    if (typeof window.showNavigoModal === 'function') {
        window.showNavigoModal({
            title: 'Cho phép truy cập vị trí',
            message: 'Navigo cần truy cập vị trí của bạn để xác định địa chỉ đón và hiển thị bản đồ trung tâm tại vị trí của bạn.',
            icon: '📍',
            confirmText: 'Cho phép',
            cancelText: 'Từ chối',
            onConfirm: () => {
                obtainPosition(callback);
            },
            onCancel: () => {
                const fallback = cachedLoc || { lat: 10.7769, lng: 106.7009, address: 'Thành phố Hồ Chí Minh, Việt Nam', name: 'TP. Hồ Chí Minh' };
                if (typeof callback === 'function') callback(fallback);
            }
        });
    } else {
        obtainPosition(callback);
    }
};

/**
 * RIDE-RTREE Session Manager
 * Client-side UI session manager coordinating user storage and reactive state.
 */

const SESSION_STORAGE_KEYS = {
    USER: 'ride_rtree_user',
    TOKEN: 'ride_rtree_token'
};

class SessionManager {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this._isLoggedOut = false;
        this._initFromStorage();
    }

    /**
     * Initialize user session from sessionStorage/localStorage
     * @private
     */
    _initFromStorage() {
        try {
            const isValidUserJson = (str) => {
                if (!str || typeof str !== 'string') return false;
                const trimmed = str.trim();
                if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed === '{}') return false;
                try {
                    const parsed = JSON.parse(trimmed);
                    return parsed && typeof parsed === 'object' && (parsed.id || parsed.email || parsed.role || parsed.name);
                } catch (e) {
                    return false;
                }
            };

            // Check sessionStorage and localStorage in order of availability
            let rawUser = sessionStorage.getItem(SESSION_STORAGE_KEYS.USER);
            let token = sessionStorage.getItem(SESSION_STORAGE_KEYS.TOKEN);

            if (!isValidUserJson(rawUser)) {
                const userKeys = ['goride_user', 'navigo_user', 'ride_rtree_user'];
                for (const k of userKeys) {
                    const candidate = localStorage.getItem(k);
                    if (isValidUserJson(candidate)) {
                        rawUser = candidate;
                        break;
                    }
                }
            }

            if (!token) {
                const tokenKeys = ['navigo_token', 'goride_token', 'ride_rtree_token'];
                for (const tk of tokenKeys) {
                    const candidateTok = localStorage.getItem(tk);
                    if (candidateTok && candidateTok !== 'null' && candidateTok !== 'undefined' && candidateTok.trim() !== '') {
                        token = candidateTok;
                        break;
                    }
                }
            }

            // If a valid user session is found, RESTORE IT AND KEEP IT ALIVE!
            if (rawUser && isValidUserJson(rawUser)) {
                this.currentUser = JSON.parse(rawUser);
                this.token = token || ('token_' + Date.now());
                this._isLoggedOut = false;

                // Sync across storage so tab switches and page reloads never lose user
                try {
                    localStorage.removeItem('goride_logged_out');
                    sessionStorage.setItem(SESSION_STORAGE_KEYS.USER, rawUser);
                    if (this.token) sessionStorage.setItem(SESSION_STORAGE_KEYS.TOKEN, this.token);
                    localStorage.setItem('goride_user', rawUser);
                    localStorage.setItem('navigo_user', rawUser);
                    localStorage.setItem('ride_rtree_user', rawUser);
                } catch (e) {}

                if (typeof apiClient !== 'undefined' && apiClient && this.token) {
                    apiClient.setAuthToken(this.token);
                }
                return;
            }

            // No valid credentials found anywhere -> guest state
            this.currentUser = null;
            this.token = null;
            this._isLoggedOut = false;
        } catch (error) {
            console.error('[SessionManager] Error reading storage:', error);
            this.currentUser = null;
            this.token = null;
        }
    }

    getCurrentUser() {
        if (!this.currentUser) {
            this._initFromStorage();
        }
        return this.currentUser;
    }

    getUser() {
        return this.getCurrentUser();
    }

    isAuthenticated() {
        return !!this.getCurrentUser();
    }

    getRole() {
        const user = this.getCurrentUser();
        return user ? (user.role || 'customer') : null;
    }

    getToken() {
        return this.token || sessionStorage.getItem(SESSION_STORAGE_KEYS.TOKEN) || null;
    }

    login(userData, token = 'demo-jwt-token-' + Date.now()) {
        if (!userData || typeof userData !== 'object') {
            throw new Error('Invalid user data provided to login()');
        }

        try {
            localStorage.removeItem('goride_logged_out');
        } catch (e) {}

        this._isLoggedOut = false;
        this.currentUser = { ...userData };
        this.token = token;

        try {
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

        // Dispatch events for reactive UI updates
        this._dispatchAuthEvents('login', this.currentUser);

        return this.currentUser;
    }

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

    setUser(userData) {
        if (!userData || typeof userData !== 'object') return null;

        this.currentUser = {
            ...(this.currentUser || {}),
            ...userData
        };

        try {
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

    logout() {
        const previousUser = this.currentUser;
        this.currentUser = null;
        this.token = null;
        this._isLoggedOut = true;

        try {
            sessionStorage.clear();
            const keysToRemove = [
                'ride_rtree_user', 'ride_rtree_token',
                'goride_user', 'goride_token',
                'navigo_user', 'navigo_token',
                'user', 'token', 'currentUser', 'user_token',
                'goride_active_trip', 'goride_driver_online_state',
                'goride_pending_trip_offers', 'goride_current_order',
                'navigo_location_permission_granted', 'navigo_user_location',
                'navigo_session_loaded', 'navigo_session_location_prompted',
                'navigo_loading_screen_active', 'navigo_from_loading'
            ];
            keysToRemove.forEach(k => {
                try {
                    localStorage.removeItem(k);
                    sessionStorage.removeItem(k);
                } catch (e) {}
            });
            localStorage.setItem('goride_logged_out', '1');
        } catch (error) {
            console.error('[SessionManager] Error clearing storage:', error);
        }

        if (typeof apiClient !== 'undefined' && apiClient) {
            apiClient.clearAuthToken();
        }

        this._dispatchAuthEvents('logout', null, previousUser);
    }

    /**
     * Show centered floating modal confirmation for logout (Hủy / Xác nhận)
     * Redirects to loading.html?from=logout
     */
    confirmLogout() {
        const doLogout = () => {
            try {
                this.logout();
                const keysToRemove = [
                    'ride_rtree_user', 'ride_rtree_token',
                    'goride_user', 'goride_token',
                    'navigo_user', 'navigo_token',
                    'user', 'token', 'currentUser', 'session_user',
                    'goride_active_trip', 'goride_driver_online_state',
                    'goride_pending_trip_offers',
                    'navigo_session_loaded', 'navigo_session_location_prompted',
                    'navigo_loading_screen_active', 'navigo_from_loading'
                ];
                keysToRemove.forEach(k => {
                    try { localStorage.removeItem(k); } catch(e) {}
                    try { sessionStorage.removeItem(k); } catch(e) {}
                });
            } catch(e) {}

            const isPagesDir = /[\/\\]pages[\/\\]/i.test(window.location.pathname) || window.location.pathname.includes('/pages/');
            const targetUrl = isPagesDir ? '../loading.html?from=logout' : 'loading.html?from=logout';
            window.location.href = targetUrl;
        };

        if (typeof window.showNavigoModal === 'function') {
            window.showNavigoModal({
                title: 'Xác nhận đăng xuất',
                message: 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Navigo không?',
                icon: '🚪',
                confirmText: 'Đăng xuất',
                cancelText: 'Hủy',
                danger: true,
                onConfirm: doLogout
            });
            setTimeout(() => {
                if (!document.getElementById('navigo-liquid-glass-modal')) {
                    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?')) {
                        doLogout();
                    }
                }
            }, 200);
        } else {
            if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?')) {
                doLogout();
            }
        }
    }

    logoutWithConfirmation() {
        this.confirmLogout();
    }

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

// Universal Click Delegation for Logout & Dynamic Auth Header Sync
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        const logoutTrigger = e.target.closest('[data-action="logout"], #btn-logout-account, #btn-profile-logout, .admin-logout-btn, .btn-logout, .admin-sidebar-btn-logout, #btn-desktop-logout, #btn-customer-logout, .user-menu-item-danger');
        if (logoutTrigger) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof sessionManager !== 'undefined') {
                sessionManager.confirmLogout();
            } else {
                if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
                    const isPagesDir = window.location.pathname.includes('/pages/');
                    window.location.href = isPagesDir ? '../loading.html?from=logout' : 'loading.html?from=logout';
                }
            }
            return;
        }

        // Also catch any button or link whose text contains 'Đăng xuất'
        if (e.target && (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.tagName === 'DIV')) {
            const txt = (e.target.textContent || '').trim().toLowerCase();
            if (txt === 'đăng xuất' || txt === '🚪 đăng xuất' || txt.includes('đăng xuất')) {
                if (e.target.closest('.user-menu-item-danger, .gsm-btn-logout-row, .admin-sidebar-btn-logout, [data-action="logout"], .btn-danger')) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof sessionManager !== 'undefined') {
                        sessionManager.confirmLogout();
                    }
                }
            }
        }
    });

    function syncNavigoAuthUI() {
        const user = sessionManager.getUser();
        const isGuest = !user;
        const role = user ? (user.role || 'customer') : null;
        const isAdmin = role === 'admin';
        const isDriver = role === 'driver';
        const isCustomer = role === 'customer';

        // 1. Toggle role classes on body for instant CSS-level rule matching
        document.body.classList.remove('gsm-role-admin', 'gsm-role-driver', 'gsm-role-customer', 'gsm-role-guest');
        if (role) {
            document.body.classList.add(`gsm-role-${role}`);
        } else {
            document.body.classList.add('gsm-role-guest');
        }
        if (isAdmin) {
            document.body.classList.add('gsm-role-admin');
        }

        // 2. Auth state elements
        document.querySelectorAll('[data-auth="guest"]').forEach(el => {
            el.style.display = isGuest ? 'flex' : 'none';
        });
        document.querySelectorAll('[data-auth="user"]').forEach(el => {
            el.style.display = isGuest ? 'none' : 'flex';
        });

        // 3. Admin elements protection
        document.querySelectorAll('[data-role="admin"], [data-auth="admin"], .gsm-nav-admin-only').forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });

        // 4. Dynamic Desktop & Tablet Navigation Bar (.gsm-pc-nav-links)
        const isPagesDir = /[\/\\]pages[\/\\]/i.test(window.location.pathname) || window.location.pathname.includes('/pages/');
        const prefix = isPagesDir ? '' : 'pages/';
        const homeUrl = isPagesDir ? '../index.html' : 'index.html';
        const customerUrl = `${prefix}customer.html`;
        const driverUrl = `${prefix}driver.html`;
        const adminUrl = `${prefix}admin.html`;
        const profileUrl = `${prefix}profile.html`;
        const notificationsUrl = `${prefix}notifications.html`;
        const walletUrl = `${prefix}wallet.html`;
        const activityUrl = `${prefix}activity.html`;
        const loginUrl = `${prefix}login.html`;
        const curPath = window.location.pathname.toLowerCase();
        const curHash = (window.location.hash || '').toLowerCase();
        const curSearch = window.location.search || '';

        const isHome = curPath.endsWith('index.html') || (!isPagesDir && (!curPath.includes('.') || curPath.endsWith('/')));
        const isCustomerPage = curPath.includes('customer.html');
        const isDriverPage = curPath.includes('driver.html');
        const isAdminPage = curPath.includes('admin.html');
        const isProfilePage = curPath.includes('profile.html');
        const isNotificationsPage = curPath.includes('notifications.html');
        const isWalletPage = curPath.includes('wallet.html');
        const isActivityPage = curPath.includes('activity.html');
        const isLoginPage = curPath.includes('login.html');

        // If logged-in user is a driver, prevent customer booking page access and redirect directly to driver portal
        if (isCustomerPage && isDriver) {
            window.location.replace(driverUrl);
            return;
        }

        document.querySelectorAll('.gsm-pc-nav-links').forEach(container => {
            if (isDriver) {
                // Driver Desktop Navigation: Trang chủ, Nhận chuyến, Lịch sử, Thu nhập, Ví Navi, Thông báo, Hồ sơ (Both Thu nhập & Ví Navi!)
                const isTabHome = isDriverPage && (!curHash || curHash === '#home');
                const isTabTrips = isDriverPage && curHash === '#trips';


                container.innerHTML = `
                    <a href="${homeUrl}" class="gsm-pc-nav-link ${isHome ? 'active' : ''}">Trang chủ</a>
                    <a href="${isDriverPage ? '#home' : driverUrl + '#home'}" class="gsm-pc-nav-link ${isTabHome ? 'active' : ''}" data-nav="driver-home" data-tab="home">🚗 Nhận chuyến</a>
                    <a href="${isDriverPage ? '#trips' : driverUrl + '#trips'}" class="gsm-pc-nav-link ${isTabTrips ? 'active' : ''}" data-nav="driver-trips" data-tab="trips">📋 Lịch sử</a>

                    <a href="${walletUrl}" class="gsm-pc-nav-link ${isWalletPage ? 'active' : ''}" data-nav="driver-wallet">💳 Ví Navi</a>
                    <a href="${notificationsUrl}" class="gsm-pc-nav-link ${isNotificationsPage ? 'active' : ''}" data-nav="driver-notifications" style="position:relative;">
                        🔔 Thông báo
                        <span class="gsm-nav-badge-dot" style="position:absolute; top:7px; right:5px; width:7px; height:7px; border-radius:50%; background:#ef4444; border:1px solid #fff; display:none;"></span>
                    </a>
                    <a href="${profileUrl}" class="gsm-pc-nav-link ${isProfilePage ? 'active' : ''}" data-nav="driver-profile">👤 Hồ sơ</a>
                `;

                // Wire seamless tab switching when clicked directly on driver.html
                if (isDriverPage) {
                    container.querySelectorAll('[data-tab]').forEach(link => {
                        link.onclick = (e) => {
                            const tab = link.getAttribute('data-tab');
                            if (tab) {
                                e.preventDefault();
                                if (typeof driverController !== 'undefined' && typeof driverController.switchTab === 'function') {
                                    driverController.switchTab(tab);
                                } else {
                                    window.location.hash = tab;
                                }
                                container.querySelectorAll('[data-tab]').forEach(l => {
                                    l.classList.toggle('active', l.getAttribute('data-tab') === tab);
                                });
                            }
                        };
                    });
                }
            } else if (isAdmin) {
                container.innerHTML = `
                    <a href="${homeUrl}" class="gsm-pc-nav-link ${isHome ? 'active' : ''}">Trang chủ</a>
                    <a href="${adminUrl}" class="gsm-pc-nav-link ${isAdminPage ? 'active' : ''}" data-role="admin">🛡️ Quản trị</a>
                    <a href="${activityUrl}" class="gsm-pc-nav-link ${isActivityPage ? 'active' : ''}">📋 Hoạt động</a>
                    <a href="${notificationsUrl}" class="gsm-pc-nav-link ${isNotificationsPage ? 'active' : ''}" style="position:relative;">
                        🔔 Thông báo
                        <span class="gsm-nav-badge-dot" style="position:absolute; top:7px; right:5px; width:7px; height:7px; border-radius:50%; background:#ef4444; border:1px solid #fff; display:none;"></span>
                    </a>
                    <a href="${profileUrl}" class="gsm-pc-nav-link ${isProfilePage ? 'active' : ''}">👤 Hồ sơ</a>
                `;
            } else if (isCustomer) {
                // Customer: Trang chủ, Đặt xe Navigo, Ví Navi, Hoạt động, Thông báo, Hồ sơ
                container.innerHTML = `
                    <a href="${homeUrl}" class="gsm-pc-nav-link ${isHome ? 'active' : ''}">Trang chủ</a>
                    <a href="${customerUrl}" class="gsm-pc-nav-link ${isCustomerPage ? 'active' : ''}">Đặt xe Navigo</a>
                    <a href="${walletUrl}" class="gsm-pc-nav-link ${isWalletPage ? 'active' : ''}">💳 Ví Navi</a>
                    <a href="${activityUrl}" class="gsm-pc-nav-link ${isActivityPage ? 'active' : ''}">📋 Hoạt động</a>
                    <a href="${notificationsUrl}" class="gsm-pc-nav-link ${isNotificationsPage ? 'active' : ''}" style="position:relative;">
                        🔔 Thông báo
                        <span class="gsm-nav-badge-dot" style="position:absolute; top:7px; right:5px; width:7px; height:7px; border-radius:50%; background:#ef4444; border:1px solid #fff; display:none;"></span>
                    </a>
                    <a href="${profileUrl}" class="gsm-pc-nav-link ${isProfilePage ? 'active' : ''}">👤 Hồ sơ</a>
                `;
            } else {
                // Guest mode: Trang chủ, Đặt xe Navigo, Ví Navi, Cổng Tài xế
                container.innerHTML = `
                    <a href="${homeUrl}" class="gsm-pc-nav-link ${isHome ? 'active' : ''}">Trang chủ</a>
                    <a href="${customerUrl}" class="gsm-pc-nav-link ${isCustomerPage ? 'active' : ''}">Đặt xe Navigo</a>
                    <a href="${walletUrl}" class="gsm-pc-nav-link ${isWalletPage ? 'active' : ''}">💳 Ví Navi</a>
                    <a href="${driverUrl}" class="gsm-pc-nav-link ${isDriverPage ? 'active' : ''}">Cổng Tài xế</a>
                `;
            }

            // Wire in-page tab switching on desktop top nav links
            container.querySelectorAll('.gsm-pc-nav-link').forEach(link => {
                link.style.pointerEvents = 'auto';
                link.style.cursor = 'pointer';

                const tab = link.getAttribute('data-tab');
                const href = link.getAttribute('href') || '';

                if (isDriverPage && tab) {
                    link.onclick = (e) => {
                        e.preventDefault();
                        if (typeof driverController !== 'undefined' && typeof driverController.switchTab === 'function') {
                            driverController.switchTab(tab);
                        } else {
                            window.location.hash = tab;
                        }
                        container.querySelectorAll('[data-tab]').forEach(l => {
                            l.classList.toggle('active', l.getAttribute('data-tab') === tab);
                        });
                    };
                }
            });
        });

        // 5. Dynamic Floating Bottom Navigation Bar (.gsm-floating-bottom-nav)
        const isRegisterPage = curPath.includes('register.html');

        if (isLoginPage || isRegisterPage) {
            document.querySelectorAll('.gsm-floating-bottom-nav, #mobile-bottom-nav, .bottom-nav').forEach(el => {
                el.style.setProperty('display', 'none', 'important');
            });
        } else {
            // Find existing bottom nav or dynamically construct canonical floating bar
            let navContainers = document.querySelectorAll('.gsm-floating-bottom-nav');
            if (!navContainers.length) {
                let nav = document.getElementById('mobile-bottom-nav') || document.querySelector('.bottom-nav');
                if (!nav) {
                    nav = document.createElement('nav');
                    nav.id = 'gsm-floating-bottom-nav';
                    document.body.appendChild(nav);
                }
                nav.className = 'gsm-floating-bottom-nav';
                navContainers = [nav];
            }

            navContainers.forEach(nav => {
                nav.className = 'gsm-floating-bottom-nav';
                nav.style.removeProperty('display');

                const renderedRole = nav.getAttribute('data-rendered-role');
                const targetRole = isDriver ? 'driver' : (isAdmin ? 'admin' : (isCustomer ? 'customer' : 'guest'));

                // Bulletproof tab delegation for driver portal
                if (isDriverPage && !nav._tabClickBound) {
                    nav._tabClickBound = true;
                    nav.addEventListener('click', (e) => {
                        const btn = e.target.closest('[data-tab]');
                        if (!btn || !nav.contains(btn)) return;
                        const tab = btn.getAttribute('data-tab');
                        if (tab) {
                            e.preventDefault();
                            if (typeof driverController !== 'undefined' && typeof driverController.switchTab === 'function') {
                                driverController.switchTab(tab);
                            } else {
                                window.location.hash = tab;
                            }
                            nav.querySelectorAll('.gsm-nav-btn').forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');
                        }
                    });
                }

                if (renderedRole === targetRole) {
                    // Update active classes without full HTML DOM rebuild
                    if (isDriver) {
                        const isTabHome = isDriverPage && (!curHash || curHash === '#home');
                        const isTabTrips = isDriverPage && curHash === '#trips';
        
                        nav.querySelectorAll('.gsm-nav-btn').forEach(btn => {
                            if (btn.id === 'bnav-driver-landing') btn.classList.toggle('active', isHome);
                            else if (btn.id === 'bnav-driver-home') btn.classList.toggle('active', isTabHome);
                            else if (btn.id === 'bnav-driver-trips') btn.classList.toggle('active', isTabTrips);
                            else if (btn.id === 'bnav-driver-earnings') btn.classList.toggle('active', isTabEarnings);
                            else if (btn.id === 'bnav-driver-wallet') btn.classList.toggle('active', isWalletPage);
                            else if (btn.id === 'bnav-driver-notifications') btn.classList.toggle('active', isNotificationsPage);
                            else if (btn.id === 'bnav-driver-account') btn.classList.toggle('active', isProfilePage);
                        });
                    } else if (isAdmin) {
                        nav.querySelectorAll('.gsm-nav-btn').forEach(btn => {
                            if (btn.id === 'bnav-admin-landing') btn.classList.toggle('active', isHome);
                            else if (btn.id === 'bnav-admin-dashboard') btn.classList.toggle('active', isAdminPage);
                            else if (btn.id === 'bnav-admin-activity') btn.classList.toggle('active', isActivityPage);
                            else if (btn.id === 'bnav-admin-notifications') btn.classList.toggle('active', isNotificationsPage);
                            else if (btn.id === 'bnav-admin-account') btn.classList.toggle('active', isProfilePage);
                        });
                    } else if (isCustomer) {
                        nav.querySelectorAll('.gsm-nav-btn').forEach(btn => {
                            if (btn.id === 'bnav-cust-home') btn.classList.toggle('active', isHome);
                            else if (btn.id === 'bnav-cust-booking') btn.classList.toggle('active', isCustomerPage);
                            else if (btn.id === 'bnav-cust-wallet') btn.classList.toggle('active', isWalletPage);
                            else if (btn.id === 'bnav-cust-activity') btn.classList.toggle('active', isActivityPage);
                            else if (btn.id === 'bnav-cust-notifications') btn.classList.toggle('active', isNotificationsPage);
                            else if (btn.id === 'bnav-cust-account') btn.classList.toggle('active', isProfilePage);
                        });
                    } else {
                        nav.querySelectorAll('.gsm-nav-btn').forEach(btn => {
                            if (btn.id === 'bnav-guest-home') btn.classList.toggle('active', isHome);
                            else if (btn.id === 'bnav-guest-booking') btn.classList.toggle('active', isCustomerPage);
                            else if (btn.id === 'bnav-guest-wallet') btn.classList.toggle('active', isWalletPage);
                            else if (btn.id === 'bnav-guest-activity') btn.classList.toggle('active', isActivityPage);
                            else if (btn.id === 'bnav-guest-notifications') btn.classList.toggle('active', isNotificationsPage);
                            else if (btn.id === 'bnav-guest-account') btn.classList.toggle('active', isProfilePage || isLoginPage);
                        });
                    }
                    return;
                }

                nav.setAttribute('data-rendered-role', targetRole);

                if (isDriver) {
                    // DRIVER ROLE: Trang chủ, Nhận chuyến, Lịch sử, Thu nhập, Ví Navi, Thông báo, Hồ sơ (Both Thu nhập AND Ví Navi side-by-side)
                    const isTabHome = isDriverPage && (!curHash || curHash === '#home');
                    const isTabTrips = isDriverPage && curHash === '#trips';
    

                    nav.innerHTML = `
                        <div class="gsm-bottom-nav-pill">
                            <a href="${homeUrl}" class="gsm-nav-btn ${isHome ? 'active' : ''}" id="bnav-driver-landing" title="Trang chủ">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 3L2 12h3v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-5h2v5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-8h3L12 3z"/>
                                </svg>
                            </a>
                            <a href="${isDriverPage ? '#home' : driverUrl + '#home'}" class="gsm-nav-btn ${isTabHome ? 'active' : ''}" data-tab="home" id="bnav-driver-home" title="Nhận chuyến">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                                </svg>
                            </a>
                            <a href="${isDriverPage ? '#trips' : driverUrl + '#trips'}" class="gsm-nav-btn ${isTabTrips ? 'active' : ''}" data-tab="trips" id="bnav-driver-trips" title="Lịch sử chuyến đi">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                                </svg>
                            </a>
                            <a href="${walletUrl}" class="gsm-nav-btn ${isWalletPage ? 'active' : ''}" id="bnav-driver-wallet" title="Ví Navi">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                                </svg>
                            </a>
                            <a href="${notificationsUrl}" class="gsm-nav-btn ${isNotificationsPage ? 'active' : ''}" id="bnav-driver-notifications" title="Thông báo">
                                <div class="gsm-nav-bell-wrapper">
                                    <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                                    </svg>
                                    <span class="gsm-nav-badge-dot" style="display:none;"></span>
                                </div>
                            </a>
                            <a href="${profileUrl}" class="gsm-nav-btn ${isProfilePage ? 'active' : ''}" id="bnav-driver-account" title="Hồ sơ tài xế">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                            </a>
                        </div>
                    `;

                    if (isDriverPage) {
                        nav.querySelectorAll('[data-tab]').forEach(btn => {
                            btn.onclick = (e) => {
                                const tab = btn.getAttribute('data-tab');
                                if (tab) {
                                    e.preventDefault();
                                    if (typeof driverController !== 'undefined' && typeof driverController.switchTab === 'function') {
                                        driverController.switchTab(tab);
                                    } else {
                                        window.location.hash = tab;
                                    }
                                    nav.querySelectorAll('.gsm-nav-btn').forEach(b => b.classList.remove('active'));
                                    btn.classList.add('active');
                                }
                            };
                        });
                    }
                } else if (isAdmin) {
                    // ADMIN ROLE: 5 pure icons (Home, Admin, Activity, Notifications, Profile)
                    nav.innerHTML = `
                        <div class="gsm-bottom-nav-pill">
                            <a href="${homeUrl}" class="gsm-nav-btn ${isHome ? 'active' : ''}" id="bnav-admin-landing" title="Trang chủ">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 3L2 12h3v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-5h2v5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-8h3L12 3z"/>
                                </svg>
                            </a>
                            <a href="${adminUrl}" class="gsm-nav-btn ${isAdminPage ? 'active' : ''}" id="bnav-admin-dashboard" title="Quản trị hệ thống">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                                </svg>
                            </a>
                            <a href="${activityUrl}" class="gsm-nav-btn ${isActivityPage ? 'active' : ''}" id="bnav-admin-activity" title="Hoạt động chuyến đi">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                                </svg>
                            </a>
                            <a href="${notificationsUrl}" class="gsm-nav-btn ${isNotificationsPage ? 'active' : ''}" id="bnav-admin-notifications" title="Thông báo">
                                <div class="gsm-nav-bell-wrapper">
                                    <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                                    </svg>
                                    <span class="gsm-nav-badge-dot" style="display:none;"></span>
                                </div>
                            </a>
                            <a href="${profileUrl}" class="gsm-nav-btn ${isProfilePage ? 'active' : ''}" id="bnav-admin-account" title="Hồ sơ">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                            </a>
                        </div>
                    `;
                } else if (isCustomer) {
                    // CUSTOMER ROLE: 6 pure icons (Home, Booking, Wallet, Activity, Notifications, Profile) + Trophy Orb outside
                    nav.innerHTML = `
                        <div class="gsm-bottom-nav-pill">
                            <a href="${homeUrl}" class="gsm-nav-btn ${isHome ? 'active' : ''}" id="bnav-cust-home" title="Trang chủ">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 3L2 12h3v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-5h2v5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-8h3L12 3z"/>
                                </svg>
                            </a>
                            <a href="${customerUrl}" class="gsm-nav-btn ${isCustomerPage ? 'active' : ''}" id="bnav-cust-booking" title="Đặt xe Navigo">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                                </svg>
                            </a>
                            <a href="${walletUrl}" class="gsm-nav-btn ${isWalletPage ? 'active' : ''}" id="bnav-cust-wallet" title="Ví Navi">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                                </svg>
                            </a>
                            <a href="${activityUrl}" class="gsm-nav-btn ${isActivityPage ? 'active' : ''}" id="bnav-cust-activity" title="Hoạt động">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                                </svg>
                            </a>
                            <a href="${notificationsUrl}" class="gsm-nav-btn ${isNotificationsPage ? 'active' : ''}" id="bnav-cust-notifications" title="Thông báo">
                                <div class="gsm-nav-bell-wrapper">
                                    <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                                    </svg>
                                    <span class="gsm-nav-badge-dot" style="display:none;"></span>
                                </div>
                            </a>
                            <a href="${profileUrl}" class="gsm-nav-btn ${isProfilePage ? 'active' : ''}" id="bnav-cust-account" title="Tài khoản">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                            </a>
                        </div>
                        <a href="${profileUrl}#rewards" class="gsm-bottom-nav-trophy" title="Navigo Race / Ưu đãi">
                            <svg class="gsm-nav-trophy-svg" width="34" height="34" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="11" y="38" width="26" height="6" rx="2.5" fill="#38bdf8"/>
                                <rect x="15" y="34" width="18" height="4" rx="1" fill="#7dd3fc"/>
                                <path d="M21 28h6v6h-6z" fill="#f59e0b"/>
                                <path d="M20 33h8v1.5h-8z" fill="#d97706"/>
                                <path d="M14 13c-4.5 0-7 3.5-7 7.5s2.5 7.5 7 7.5h2v-3h-2c-2.8 0-4-2-4-4.5s1.2-4.5 4-4.5h2v-3h-2z" fill="#f59e0b"/>
                                <path d="M34 13c4.5 0 7 3.5 7 7.5s-2.5 7.5-7 7.5h-2v-3h2c2.8 0 4-2 4-4.5s-1.2-4.5-4-4.5h-2v-3h2z" fill="#f59e0b"/>
                                <path d="M13 8h22v11c0 6.075-4.925 11-11 11s-11-4.925-11-11V8z" fill="url(#navigoTrophyGold)"/>
                                <rect x="12" y="6" width="24" height="3.5" rx="1.75" fill="#fde047"/>
                                <path d="M24 13.5l1.55 3.15 3.45.5-2.5 2.45.6 3.45-3.1-1.65-3.1 1.65.6-3.45-2.5-2.45 3.45-.5L24 13.5z" fill="#ffffff"/>
                                <defs>
                                    <linearGradient id="navigoTrophyGold" x1="13" y1="8" x2="35" y2="30" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stop-color="#fde047"/>
                                        <stop offset="50%" stop-color="#f59e0b"/>
                                        <stop offset="100%" stop-color="#d97706"/>
                                    </linearGradient>
                                </defs>
                            </svg>
                        </a>
                    `;
                } else {
                    // GUEST ROLE: 6 pure icons (Home, Booking, Wallet, Activity, Notifications, Login) + Trophy Orb outside
                    nav.innerHTML = `
                        <div class="gsm-bottom-nav-pill">
                            <a href="${homeUrl}" class="gsm-nav-btn ${isHome ? 'active' : ''}" id="bnav-guest-home" title="Trang chủ">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 3L2 12h3v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-5h2v5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-8h3L12 3z"/>
                                </svg>
                            </a>
                            <a href="${customerUrl}" class="gsm-nav-btn ${isCustomerPage ? 'active' : ''}" id="bnav-guest-booking" title="Đặt xe Navigo">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                                </svg>
                            </a>
                            <a href="${walletUrl}" class="gsm-nav-btn ${isWalletPage ? 'active' : ''}" id="bnav-guest-wallet" title="Ví Navi">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                                </svg>
                            </a>
                            <a href="${activityUrl}" class="gsm-nav-btn ${isActivityPage ? 'active' : ''}" id="bnav-guest-activity" title="Hoạt động">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                                </svg>
                            </a>
                            <a href="${notificationsUrl}" class="gsm-nav-btn ${isNotificationsPage ? 'active' : ''}" id="bnav-guest-notifications" title="Thông báo">
                                <div class="gsm-nav-bell-wrapper">
                                    <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                                    </svg>
                                    <span class="gsm-nav-badge-dot" style="display:none;"></span>
                                </div>
                            </a>
                            <a href="${loginUrl}" class="gsm-nav-btn ${isProfilePage || isLoginPage ? 'active' : ''}" id="bnav-guest-account" title="Đăng nhập tài khoản">
                                <svg class="gsm-nav-svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                            </a>
                        </div>
                        <a href="${profileUrl}#rewards" class="gsm-bottom-nav-trophy" title="Navigo Race / Ưu đãi">
                            <svg class="gsm-nav-trophy-svg" width="34" height="34" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="11" y="38" width="26" height="6" rx="2.5" fill="#38bdf8"/>
                                <rect x="15" y="34" width="18" height="4" rx="1" fill="#7dd3fc"/>
                                <path d="M21 28h6v6h-6z" fill="#f59e0b"/>
                                <path d="M20 33h8v1.5h-8z" fill="#d97706"/>
                                <path d="M14 13c-4.5 0-7 3.5-7 7.5s2.5 7.5 7 7.5h2v-3h-2c-2.8 0-4-2-4-4.5s1.2-4.5 4-4.5h2v-3h-2z" fill="#f59e0b"/>
                                <path d="M34 13c4.5 0 7 3.5 7 7.5s-2.5 7.5-7 7.5h-2v-3h2c2.8 0 4-2 4-4.5s-1.2-4.5-4-4.5h-2v-3h2z" fill="#f59e0b"/>
                                <path d="M13 8h22v11c0 6.075-4.925 11-11 11s-11-4.925-11-11V8z" fill="url(#navigoTrophyGold)"/>
                                <rect x="12" y="6" width="24" height="3.5" rx="1.75" fill="#fde047"/>
                                <path d="M24 13.5l1.55 3.15 3.45.5-2.5 2.45.6 3.45-3.1-1.65-3.1 1.65.6-3.45-2.5-2.45 3.45-.5L24 13.5z" fill="#ffffff"/>
                                <defs>
                                    <linearGradient id="navigoTrophyGold" x1="13" y1="8" x2="35" y2="30" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stop-color="#fde047"/>
                                        <stop offset="50%" stop-color="#f59e0b"/>
                                        <stop offset="100%" stop-color="#d97706"/>
                                    </linearGradient>
                                </defs>
                            </svg>
                        </a>
                    `;
                }
            });
        }

        // Synchronize legacy bottom navigation elements if present
        document.querySelectorAll('#mobile-bottom-nav, .bottom-nav:not(.gsm-floating-bottom-nav)').forEach(bnav => {
            if (isDriver) {
                const isTabHome = isDriverPage && (!curHash || curHash === '#home');
                const isTabTrips = isDriverPage && curHash === '#trips';

                bnav.innerHTML = `
                    <a href="${homeUrl}" class="bottom-nav-item ${isHome ? 'active' : ''}" id="bnav-driver-landing" title="Về trang chủ">
                        <span class="bottom-nav-icon">🏠</span>
                        <span class="bottom-nav-label">Trang chủ</span>
                    </a>
                    <a href="${isDriverPage ? '#home' : driverUrl + '#home'}" class="bottom-nav-item ${isTabHome ? 'active' : ''}" data-tab="home" id="bnav-driver-home">
                        <span class="bottom-nav-icon">🚗</span>
                        <span class="bottom-nav-label">Nhận chuyến</span>
                    </a>
                    <a href="${isDriverPage ? '#trips' : driverUrl + '#trips'}" class="bottom-nav-item ${isTabTrips ? 'active' : ''}" data-tab="trips" id="bnav-driver-trips">
                        <span class="bottom-nav-icon">📋</span>
                        <span class="bottom-nav-label">Lịch sử</span>
                    </a>
                    <a href="${walletUrl}" class="bottom-nav-item ${isWalletPage ? 'active' : ''}" id="bnav-driver-wallet" title="Ví Navi">
                        <span class="bottom-nav-icon">💳</span>
                        <span class="bottom-nav-label">Ví</span>
                    </a>
                    <a href="${notificationsUrl}" class="bottom-nav-item ${isNotificationsPage ? 'active' : ''}" id="bnav-driver-notifications" title="Thông báo" style="position:relative;">
                        <span class="bottom-nav-icon">🔔</span>
                        <span class="bottom-nav-label">Thông báo</span>
                    </a>
                    <a href="${profileUrl}" class="bottom-nav-item ${isProfilePage ? 'active' : ''}" id="bnav-driver-account">
                        <span class="bottom-nav-icon">👤</span>
                        <span class="bottom-nav-label">Hồ sơ</span>
                    </a>
                `;
            } else if (isAdmin) {
                bnav.innerHTML = `
                    <a href="${homeUrl}" class="bottom-nav-item ${isHome ? 'active' : ''}" id="bnav-admin-landing" title="Về trang chủ">
                        <span class="bottom-nav-icon">🏠</span>
                        <span class="bottom-nav-label">Trang chủ</span>
                    </a>
                    <a href="${adminUrl}" class="bottom-nav-item ${isAdminPage ? 'active' : ''}" id="bnav-admin-dashboard">
                        <span class="bottom-nav-icon">🛡️</span>
                        <span class="bottom-nav-label">Quản trị</span>
                    </a>
                    <a href="${activityUrl}" class="bottom-nav-item ${isActivityPage ? 'active' : ''}">
                        <span class="bottom-nav-icon">📋</span>
                        <span class="bottom-nav-label">Hoạt động</span>
                    </a>
                    <a href="${notificationsUrl}" class="bottom-nav-item ${isNotificationsPage ? 'active' : ''}" id="bnav-admin-notifications">
                        <span class="bottom-nav-icon">🔔</span>
                        <span class="bottom-nav-label">Thông báo</span>
                    </a>
                    <a href="${profileUrl}" class="bottom-nav-item ${isProfilePage ? 'active' : ''}" id="bnav-admin-account">
                        <span class="bottom-nav-icon">👤</span>
                        <span class="bottom-nav-label">Hồ sơ</span>
                    </a>
                `;
            } else if (isCustomer) {
                bnav.innerHTML = `
                    <a href="${homeUrl}" class="bottom-nav-item ${isHome ? 'active' : ''}" id="bnav-cust-home">
                        <span class="bottom-nav-icon">🏠</span>
                        <span class="bottom-nav-label">Trang chủ</span>
                    </a>
                    <a href="${customerUrl}" class="bottom-nav-item ${isCustomerPage ? 'active' : ''}" id="bnav-cust-booking">
                        <span class="bottom-nav-icon">🚗</span>
                        <span class="bottom-nav-label">Đặt xe</span>
                    </a>
                    <a href="${walletUrl}" class="bottom-nav-item ${isWalletPage ? 'active' : ''}" id="bnav-cust-wallet">
                        <span class="bottom-nav-icon">💳</span>
                        <span class="bottom-nav-label">Ví</span>
                    </a>
                    <a href="${activityUrl}" class="bottom-nav-item ${isActivityPage ? 'active' : ''}" id="bnav-cust-history">
                        <span class="bottom-nav-icon">📋</span>
                        <span class="bottom-nav-label">Hoạt động</span>
                    </a>
                    <a href="${notificationsUrl}" class="bottom-nav-item ${isNotificationsPage ? 'active' : ''}" id="bnav-cust-notifications">
                        <span class="bottom-nav-icon">🔔</span>
                        <span class="bottom-nav-label">Thông báo</span>
                    </a>
                    <a href="${profileUrl}" class="bottom-nav-item ${isProfilePage ? 'active' : ''}" id="bnav-cust-account">
                        <span class="bottom-nav-icon">👤</span>
                        <span class="bottom-nav-label">Hồ sơ</span>
                    </a>
                `;
            } else {
                bnav.innerHTML = `
                    <a href="${homeUrl}" class="bottom-nav-item ${isHome ? 'active' : ''}" id="bnav-guest-home">
                        <span class="bottom-nav-icon">🏠</span>
                        <span class="bottom-nav-label">Trang chủ</span>
                    </a>
                    <a href="${customerUrl}" class="bottom-nav-item ${isCustomerPage ? 'active' : ''}" id="bnav-guest-booking">
                        <span class="bottom-nav-icon">🚗</span>
                        <span class="bottom-nav-label">Đặt xe</span>
                    </a>
                    <a href="${walletUrl}" class="bottom-nav-item ${isWalletPage ? 'active' : ''}" id="bnav-guest-wallet">
                        <span class="bottom-nav-icon">💳</span>
                        <span class="bottom-nav-label">Ví</span>
                    </a>
                    <a href="${activityUrl}" class="bottom-nav-item ${isActivityPage ? 'active' : ''}" id="bnav-guest-history">
                        <span class="bottom-nav-icon">📋</span>
                        <span class="bottom-nav-label">Hoạt động</span>
                    </a>
                    <a href="${driverUrl}" class="bottom-nav-item ${isDriverPage ? 'active' : ''}" id="bnav-guest-driver">
                        <span class="bottom-nav-icon">🛵</span>
                        <span class="bottom-nav-label">Đối tác</span>
                    </a>
                    <a href="${loginUrl}" class="bottom-nav-item ${isLoginPage ? 'active' : ''}" id="bnav-guest-login">
                        <span class="bottom-nav-icon">👤</span>
                        <span class="bottom-nav-label">Đăng nhập</span>
                    </a>
                `;
            }
        });

        // Sync navigation unread badge dots immediately
        try {
            if (typeof updateNavBadgeDots === 'function') {
                updateNavBadgeDots();
            } else if (typeof navigoNotifications !== 'undefined' && typeof navigoNotifications.getNotifications === 'function') {
                const notifs = navigoNotifications.getNotifications();
                const hasUnread = notifs.some(n => n.unread);
                document.querySelectorAll('.gsm-nav-badge-dot').forEach(d => {
                    d.style.display = hasUnread ? 'block' : 'none';
                });
            }
        } catch (e) {}

        // 6. Dynamic Home Page Hero CTA for Driver
        if (isHome && isDriver) {
            const homeSearchPill = document.querySelector('.gsm-top-search-pill') || document.getElementById('home-search-pill');
            if (homeSearchPill) {
                homeSearchPill.href = `${prefix}driver.html#home`;
                const searchIcon = homeSearchPill.querySelector('.gsm-search-icon, .goride-search-icon');
                const searchPlaceholder = homeSearchPill.querySelector('.gsm-search-placeholder, .goride-search-text');
                if (searchIcon) searchIcon.textContent = '🚗';
                if (searchPlaceholder) searchPlaceholder.textContent = 'Cổng Tài Xế — Mở Nhận Chuyến & Radar GPS';
            }
            const ctaBtn = document.querySelector('.gsm-desktop-wide-canvas .gsm-btn-primary-cta');
            if (ctaBtn) {
                ctaBtn.href = `${prefix}driver.html#home`;
                ctaBtn.textContent = 'Mở Cổng Nhận Chuyến →';
            }
        }

        // 7. Update User Profile Info placeholders
        if (user) {
            const displayName = user.name || user.email || 'Người dùng';
            const initial = (displayName.charAt(0) || 'U').toUpperCase();
            document.querySelectorAll('[data-user-name]').forEach(el => {
                el.textContent = displayName;
            });
            document.querySelectorAll('[data-user-avatar]').forEach(el => {
                el.textContent = initial;
            });
            const profName = document.getElementById('profile-display-name');
            if (profName) profName.textContent = displayName;
            const profPhone = document.getElementById('profile-display-phone');
            if (profPhone && user.phone) profPhone.textContent = user.phone;
            const profAvatar = document.getElementById('profile-avatar-initials');
            if (profAvatar) profAvatar.textContent = initial;
        }
    }

    // =========================================================================
    // 8. BUTTER-SMOOTH CROSS-PAGE TRANSITIONS & HIGH-SPEED PREFETCH ENGINE
    // Ultra-smooth zero-lag transitions between Home, Wallet, Profile, Activity & Notifications
    // =========================================================================
    function setupSmoothPageTransitions() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        if (window._navigoPageTransitionsInitialized) return;
        window._navigoPageTransitionsInitialized = true;

        // A. Immediate Proactive Asset & Page Prefetching
        const prefetchedUrls = new Set();
        function prefetchTarget(url) {
            if (!url || typeof url !== 'string') return;
            if (url.startsWith('#') || url.startsWith('javascript:')) return;
            try {
                const u = new URL(url, window.location.href);
                if (u.origin !== window.location.origin) return;
                const pathClean = u.pathname.toLowerCase();
                if (prefetchedUrls.has(pathClean) || pathClean === window.location.pathname.toLowerCase()) return;
                prefetchedUrls.add(pathClean);
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.as = 'document';
                link.href = u.href;
                document.head.appendChild(link);
            } catch (e) {}
        }

        // Proactively prefetch core destinations so clicks are instantaneous (<10ms)
        const isPagesDir = window.location.pathname.toLowerCase().includes('/pages/');
        const basePrefix = isPagesDir ? '' : 'pages/';
        const homePrefetch = isPagesDir ? '../index.html' : 'index.html';
        const coreRoutes = [
            homePrefetch,
            `${basePrefix}customer.html`,
            `${basePrefix}wallet.html`,
            `${basePrefix}activity.html`,
            `${basePrefix}notifications.html`,
            `${basePrefix}profile.html`,
            `${basePrefix}driver.html`
        ];

        // Idle-time prefetch
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => {
                coreRoutes.forEach(r => prefetchTarget(r));
            }, { timeout: 1500 });
        } else {
            setTimeout(() => {
                coreRoutes.forEach(r => prefetchTarget(r));
            }, 400);
        }

        // Pointer & touch prefetch on demand
        document.addEventListener('pointerover', (e) => {
            const a = e.target.closest('.gsm-floating-bottom-nav a[href], .gsm-pc-navbar a[href]');
            if (a && a.href) prefetchTarget(a.href);
        }, { passive: true });

        document.addEventListener('touchstart', (e) => {
            const a = e.target.closest('.gsm-floating-bottom-nav a[href], .gsm-pc-navbar a[href]');
            if (a && a.href) prefetchTarget(a.href);
        }, { passive: true });

        // B. Optimistic Tactile Feedback & Hardware-Accelerated Soft Exit
        document.addEventListener('click', (e) => {
            const a = e.target.closest('.gsm-floating-bottom-nav a[href], .gsm-pc-navbar a[href]');
            if (!a || !a.href) return;
            if (a.target === '_blank' || a.hasAttribute('download')) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            let targetUrl;
            try {
                targetUrl = new URL(a.href, window.location.href);
            } catch (err) {
                return;
            }

            if (targetUrl.origin !== window.location.origin) return;

            const curPath = window.location.pathname.toLowerCase();
            const targetPath = targetUrl.pathname.toLowerCase();
            const isSamePage = (curPath === targetPath);

            // In-page hash tab switches (such as driver #trips) are already handled by driverController
            if (isSamePage && targetUrl.hash) {
                return;
            }

            // If already on the exact same page without hash/search change, ignore
            if (isSamePage && targetUrl.search === window.location.search && !targetUrl.hash) {
                e.preventDefault();
                return;
            }

            // 1. Instant optimistic tactile feedback: update active pill immediately (0ms latency)
            const nav = a.closest('.gsm-floating-bottom-nav');
            if (nav) {
                nav.querySelectorAll('.gsm-nav-btn').forEach(b => b.classList.remove('active'));
                a.classList.add('active');
            }
            const topNav = a.closest('.gsm-pc-navbar');
            if (topNav) {
                topNav.querySelectorAll('.gsm-pc-nav-link').forEach(l => l.classList.remove('active'));
                a.classList.add('active');
            }

            // 2. Comprehensive selector covering Wallet, Profile, Driver, Activity, Notifications, Admin & Desktop
            const mainWrapper = document.querySelector(
                '.wallet-container, .gsm-profile-page-wrapper, .driver-app-main, .gsm-desktop-container, .gsm-activity-screen, .gsm-notif-screen, .gsm-screen-wrapper, #app, main'
            ) || document.body;

            if (mainWrapper) {
                e.preventDefault();
                mainWrapper.style.willChange = 'opacity, transform';
                mainWrapper.style.transition = 'opacity 0.09s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.09s cubic-bezier(0.2, 0.8, 0.2, 1)';
                mainWrapper.style.opacity = '0.25';
                mainWrapper.style.transform = 'translate3d(0, -6px, 0) scale(0.996)';
                setTimeout(() => {
                    window.location.href = a.href;
                }, 75);
            }
        });
    }

    if (typeof window !== 'undefined') {
        window.syncNavigoAuthUI = syncNavigoAuthUI;
        window.setupSmoothPageTransitions = setupSmoothPageTransitions;
    }

    // Run synchronous pass immediately during parsing to hydrate navbar before first paint
    try {
        syncNavigoAuthUI();
        setupSmoothPageTransitions();
    } catch (e) {}

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            syncNavigoAuthUI();
            setupSmoothPageTransitions();
        });
    }

    window.addEventListener('session:change', syncNavigoAuthUI);
    window.addEventListener('session:login', syncNavigoAuthUI);
    window.addEventListener('session:logout', syncNavigoAuthUI);
    window.addEventListener('storage', syncNavigoAuthUI);
    window.addEventListener('hashchange', syncNavigoAuthUI);
}

// Instant nav tap feedback
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e) => {
        const link = e.target.closest('.gsm-nav-btn, .bottom-nav-item, .nav-link, .gsm-pc-nav-link');
        if (link) {
            const parent = link.closest('.gsm-bottom-nav-pill, .bottom-nav, .header-nav, .gsm-pc-nav-links');
            if (parent) {
                parent.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
            }
            link.classList.add('active');
        }
    });
});
