/**
 * RIDE-RTREE Main Application Initializer & Global Utilities
 * Coordinates UI state, auth guards, notifications, modals, and formatters.
 */

/* ==========================================================================
   FORMATTING UTILITIES
   ========================================================================== */

/**
 * Format currency amount into Vietnamese Dong (VND)
 * @param {number} amount - Value in VND
 * @param {string} [currency='VND'] - Currency code
 * @returns {string} Formatted string, e.g. "50.000 ₫"
 */
function formatCurrency(amount, currency = 'VND') {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return '0 ₫';
    }

    try {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount);
    } catch {
        return `${Number(amount).toLocaleString('vi-VN')} ₫`;
    }
}

/**
 * Format distance in meters into human readable meter or kilometer string
 * @param {number} meters - Distance in meters
 * @returns {string} e.g. "750 m" or "3.4 km"
 */
function formatDistance(meters) {
    if (meters === undefined || meters === null || isNaN(meters)) {
        return '0 m';
    }

    const dist = Number(meters);
    if (dist < 1000) {
        return `${Math.round(dist)} m`;
    }
    return `${(dist / 1000).toFixed(1)} km`;
}

/**
 * Format duration in seconds into human-readable duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} e.g. "45 giây", "12 phút", "1 giờ 15 phút"
 */
function formatDuration(seconds) {
    if (seconds === undefined || seconds === null || isNaN(seconds)) {
        return '0 phút';
    }

    const s = Math.round(Number(seconds));
    if (s < 60) {
        return `${s} giây`;
    }

    const minutes = Math.round(s / 60);
    if (minutes < 60) {
        return `${minutes} phút`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (remainingMins === 0) {
        return `${hours} giờ`;
    }
    return `${hours} giờ ${remainingMins} phút`;
}

/**
 * Format date-time into Vietnamese standard format
 * @param {string|number|Date} dateInput 
 * @returns {string} e.g. "14:30 16/10/2026"
 */
function formatDateTime(dateInput) {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

/* ==========================================================================
   100% REAL DATA ENFORCEMENT & MOCK TRIP PURGE UTILITIES
   ========================================================================== */

/**
 * Detect whether a trip record is a fake / mock / simulated trip
 * @param {Object} t - Trip object
 * @returns {boolean}
 */
function isMockTrip(t) {
    if (!t || typeof t !== 'object') return true;

    // Check explicit mock flags
    if (t.isMock === true || t.mock === true || t.isDemo === true || t.demo === true) return true;

    // Check ID patterns
    const id = String(t.id || '').trim();
    if (!id) return true;

    const mockIdPrefixes = [
        'trip_vn_', 'mock_', 'demo_', 'trip_demo_', 'trip_mock_',
        'trip_pend_', 'trip_act_', 'trp_mock_', 'trip_seed_'
    ];
    if (mockIdPrefixes.some(p => id.startsWith(p))) return true;

    const mockIdExact = [
        'trip_1', 'trip_2', 'trip_3', 'trip_4',
        'trip_01', 'trip_02', 'trip_03', 'trip_04',
        'trip_001', 'trip_002', 'trip_003', 'trip_004',
        'trip_101', 'trip_102', 'trip_103', 'trip_104',
        'trp_01', 'trp_02', 'trp_03', 'trp_04',
        'trp_1', 'trp_2', 'trp_3', 'trp_4',
        '1', '2', '3', '4',
        'TRP-88219', 'TRP-88220', 'TRP-88221', 'TRP-88222', 'TRP-88223', 'TRP-88224'
    ];
    if (mockIdExact.includes(id)) return true;

    // Check route text & fare signatures from the 4 fake trips in user reference
    const pStr = String((t.pickup && (t.pickup.name || t.pickup.address)) || t.pickupName || t.pickup || '').toLowerCase();
    const dStr = String((t.destination && (t.destination.name || t.destination.address)) || t.dropoffName || t.destination || '').toLowerCase();
    const fare = Number(t.fare || t.fareAmount || 0);

    // Trip 1: Chợ Bến Thành -> Landmark 81 (78,000 VND)
    if ((dStr.includes('landmark 81') || dStr.includes('vinhomes central park')) && (pStr.includes('bến thành') || fare === 78000)) {
        return true;
    }
    // Trip 2: Đại học Bách Khoa -> Sân bay Tân Sơn Nhất (85,000 VND)
    if ((dStr.includes('tân sơn nhất') || dStr.includes('sân bay')) && (pStr.includes('bách khoa') || fare === 85000)) {
        return true;
    }
    // Trip 3: Nhà Thờ Đức Bà -> Thảo Cầm Viên (25,000 VND)
    if (dStr.includes('thảo cầm viên') || (dStr.includes('thảo cầm viên') && fare === 25000)) {
        return true;
    }
    // Trip 4: Phố đi bộ Nguyễn Huệ -> Hồ Con Rùa (32,000 VND)
    if (dStr.includes('hồ con rùa') || (pStr.includes('nguyễn huệ') && fare === 32000)) {
        return true;
    }
    // Caravelle -> Bitexco mock
    if (dStr.includes('bitexco') && pStr.includes('caravelle')) {
        return true;
    }
    // Aeon Mall -> Bến xe Miền Tây mock
    if (pStr.includes('aeon mall') && dStr.includes('bến xe miền tây')) {
        return true;
    }

    // Check fake/simulated driver names
    const dName = String(t.driverName || '').toLowerCase();
    if (dName.includes('nguyễn văn thành') || dName.includes('trần văn bình') || dName.includes('hoàng minh anh')) {
        return true;
    }

    return false;
}

/**
 * Universal purger: removes all legacy / default mock trips from localStorage & sessionStorage
 */
function purgeAllMockTrips() {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return;

        // 1. Remove obsolete mock keys completely
        const keysToRemove = [
            'goride_customer_trips',
            'customerTrips',
            'ride_rtree_trips',
            'goride_mock_trips',
            'goride_trips',
            'goride_trips_customer_demo',
            'goride_trips_c101'
        ];
        keysToRemove.forEach(k => {
            try { localStorage.removeItem(k); } catch (e) {}
            try { sessionStorage.removeItem(k); } catch (e) {}
        });

        // 2. Clean active trip if it has mock/fake driver data
        try {
            const rawAct = localStorage.getItem('goride_active_trip');
            if (rawAct) {
                const act = JSON.parse(rawAct);
                if (isMockTrip(act)) {
                    localStorage.removeItem('goride_active_trip');
                    console.log('[GoRide] Purged fake active trip from goride_active_trip');
                }
            }
        } catch (e) {}

        // 3. Clean fake drivers from goride_online_drivers
        try {
            const rawOnline = localStorage.getItem('goride_online_drivers');
            if (rawOnline) {
                const parsed = JSON.parse(rawOnline);
                let changed = false;
                const cleanDict = {};
                const list = Array.isArray(parsed) ? parsed : Object.values(parsed);
                list.forEach(d => {
                    const name = String(d?.name || '').toLowerCase();
                    if (!name.includes('trần văn bình') && !name.includes('nguyễn văn thành') && d?.id !== 'drv_d202') {
                        cleanDict[d.id || d.phone || d.plate] = d;
                    } else {
                        changed = true;
                    }
                });
                if (changed) {
                    localStorage.setItem('goride_online_drivers', JSON.stringify(cleanDict));
                }
            }
        } catch (e) {}

        // 4. Iterate through all keys in localStorage and clean mock trips
        const allKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k) allKeys.push(k);
        }

        allKeys.forEach(key => {
            if (key.startsWith('goride_trips_') || key === 'goride_admin_trips' || key === 'goride_driver_trips' || key.toLowerCase().includes('trip')) {
                try {
                    const raw = localStorage.getItem(key);
                    if (!raw || !raw.startsWith('[')) return;
                    const items = JSON.parse(raw);
                    if (Array.isArray(items)) {
                        const cleaned = items.filter(t => !isMockTrip(t));
                        if (cleaned.length !== items.length) {
                            localStorage.setItem(key, JSON.stringify(cleaned));
                            console.log(`[GoRide] Purged ${items.length - cleaned.length} mock trips from ${key}`);
                        }
                    }
                } catch (e) {}
            }
        });
    } catch (err) {
        console.warn('[GoRide] Error during mock trip purge:', err);
    }
}

/* ==========================================================================
   TOAST NOTIFICATION SYSTEM
   ========================================================================== */

/**
 * Display a toast alert notification
 * @param {string} message - Text or description to display
 * @param {'info'|'success'|'warning'|'error'} [type='info'] - Alert severity level
 * @param {number} [duration=3500] - Duration in ms before auto-dismiss
 */
function showToast(message, type = 'info', duration = 3500) {
    if (message && typeof message === 'object') {
        message = message.message || message.error?.message || message.error || JSON.stringify(message);
    }
    if (typeof message !== 'string') {
        message = String(message || '');
    }
    if (message === '[object Object]') {
        message = 'Đã xảy ra lỗi kết nối hoặc xử lý. Vui lòng thử lại.';
    }

    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('role', 'region');
        container.setAttribute('aria-label', 'Thông báo hệ thống');
        document.body.appendChild(container);
    }

    const icons = {
        success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
        info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
    };

    // Deduplication check: Do not stack duplicate messages
    const existing = Array.from(container?.children || []);
    if (existing.some(t => t.textContent.trim().includes(message.trim()))) {
        return () => {};
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">${message}</div>
        <button type="button" class="toast-close" aria-label="Đóng">&times;</button>
    `;

    container.appendChild(toast);

    // Fade-in animation trigger
    requestAnimationFrame(() => {
        toast.classList.add('toast-show');
    });

    let dismissTimer = null;

    const dismissToast = () => {
        if (dismissTimer) clearTimeout(dismissTimer);
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    };

    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', dismissToast);
    }

    if (duration > 0) {
        dismissTimer = setTimeout(dismissToast, duration);
    }

    return dismissToast;
}

/* ==========================================================================
   MODAL HELPERS
   ========================================================================== */

/**
 * Open a modal dialogue by ID or Element
 * @param {string|HTMLElement} modalTarget 
 */
function openModal(modalTarget) {
    const modal = typeof modalTarget === 'string' ? document.getElementById(modalTarget) : modalTarget;
    if (!modal) {
        console.warn(`[App] Modal not found:`, modalTarget);
        return;
    }

    modal.classList.add('modal-active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    // Accessibility focus on first interactive element or modal itself
    const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) {
        focusable.focus();
    }
}

/**
 * Close a modal dialogue
 * @param {string|HTMLElement} modalTarget 
 */
function closeModal(modalTarget) {
    const modal = typeof modalTarget === 'string' ? document.getElementById(modalTarget) : modalTarget;
    if (!modal) return;

    modal.classList.remove('modal-active');
    modal.setAttribute('aria-hidden', 'true');

    // Check if any other modal is still active
    if (!document.querySelector('.modal-active')) {
        document.body.classList.remove('modal-open');
    }
}

/* ==========================================================================
   LOADING OVERLAY HELPER
   ========================================================================== */

/**
 * Display full-page or scoped loading overlay
 * @param {string} [message='Đang tải...'] 
 */
function showLoading(message = 'Đang tải...') {
    let overlay = document.getElementById('app-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'app-loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner-wrapper">
                <div class="loading-spinner"></div>
                <div class="loading-text" id="loading-overlay-text"></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    const textEl = document.getElementById('loading-overlay-text');
    if (textEl) textEl.textContent = message;

    overlay.classList.add('loading-active');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('app-loading-overlay');
    if (overlay) {
        overlay.classList.remove('loading-active');
    }
}

/* ==========================================================================
   APPLICATION COORDINATOR CLASS
   ========================================================================== */

class App {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize application state, check router auth guards,
     * setup global listeners and sync navigation UI with session state.
     */
    init() {
        if (this.initialized) return;
        this.initialized = true;

        console.log('[App] Initializing GoRide Core Application...');

        // 0. Sweep and purge any legacy or default mock trips across all local storage
        if (typeof purgeAllMockTrips === 'function') {
            purgeAllMockTrips();
        }

        // 1. Run navigation & role guards
        if (typeof router !== 'undefined' && router.checkAuthGuard) {
            const isAllowed = router.checkAuthGuard();
            if (!isAllowed) {
                // If redirected, stop further setup on this unauthorized page view
                return;
            }
        }

        // 2. Setup global UI event listeners (modals, auth actions)
        this._setupEventListeners();

        // 3. Update DOM UI matching session state
        this.updateAuthUI();

        // 4. Setup global uncaught error listeners
        this._setupErrorHandlers();

        // 5. Initialize Reactive Floating Active Trip Window (Banner on Homepage & External Pages)
        this.initActiveTripBanner();

        // 6. Initialize Mobile Bottom Navigation Bar (Dynamic per Role)
        this.initMobileBottomNav();

        console.log('[App] GoRide Ready.');
    }

    /**
     * Synchronize DOM elements with current session state
     */
    updateAuthUI() {
        if (typeof sessionManager === 'undefined') return;

        const isAuth = sessionManager.isAuthenticated();
        const user = sessionManager.getCurrentUser();
        const role = sessionManager.getRole();

        // Guest only elements (e.g. login/register buttons in header)
        document.querySelectorAll('[data-auth="guest"]').forEach(el => {
            if (isAuth) {
                el.style.setProperty('display', 'none', 'important');
            } else {
                el.style.removeProperty('display');
            }
        });

        // Authenticated user only elements (e.g. user menu, dashboard links)
        document.querySelectorAll('[data-auth="user"]').forEach(el => {
            if (isAuth) {
                el.style.setProperty('display', 'flex', 'important');
            } else {
                el.style.setProperty('display', 'none', 'important');
            }
        });

        // Role-filtered elements (e.g. data-auth-role="admin")
        document.querySelectorAll('[data-auth-role]').forEach(el => {
            const allowedRoles = el.getAttribute('data-auth-role').split(',').map(r => r.trim());
            if (isAuth && allowedRoles.includes(role)) {
                el.style.removeProperty('display');
            } else {
                el.style.setProperty('display', 'none', 'important');
            }
        });

        // Dynamic Role-based Navigation Visibility:
        // - Admin: Strictly HIDE Driver & Customer booking links; SHOW Admin & Profile
        // - Driver: Show Driver portal & Profile; HIDE Admin & Customer booking
        // - Customer: Show Booking, History, Profile; HIDE Driver & Admin
        // - Guest (Not logged in): Show Booking and Driver registration; HIDE Admin, History, Profile
        const driverNavLinks = document.querySelectorAll('#nav-link-driver, [data-nav="driver"], #m-pill-driver');
        const adminNavLinks = document.querySelectorAll('#nav-link-admin, [data-nav="admin"], #m-pill-admin');
        const customerNavLinks = document.querySelectorAll('#nav-link-customer, [data-nav="customer"]');
        const historyNavLinks = document.querySelectorAll('#nav-link-history, [data-nav="history"]');
        const profileNavLinks = document.querySelectorAll('#nav-link-profile, [data-nav="profile"]');

        if (role === 'admin') {
            // ADMIN ROLE: Strictly HIDE Driver & Customer booking links; SHOW Admin & Profile
            driverNavLinks.forEach(el => el.style.display = 'none');
            adminNavLinks.forEach(el => el.style.display = '');
            customerNavLinks.forEach(el => el.style.display = 'none');
            historyNavLinks.forEach(el => el.style.display = 'none');
            profileNavLinks.forEach(el => el.style.display = '');
        } else if (role === 'driver') {
            // DRIVER ROLE: Show Driver portal & Profile; HIDE Admin & Customer booking
            driverNavLinks.forEach(el => el.style.display = '');
            adminNavLinks.forEach(el => el.style.display = 'none');
            customerNavLinks.forEach(el => el.style.display = 'none');
            historyNavLinks.forEach(el => el.style.display = 'none');
            profileNavLinks.forEach(el => el.style.display = '');
        } else if (role === 'customer') {
            // CUSTOMER ROLE: Show Booking, History, Profile; HIDE Driver & Admin
            driverNavLinks.forEach(el => el.style.display = 'none');
            adminNavLinks.forEach(el => el.style.display = 'none');
            customerNavLinks.forEach(el => el.style.display = '');
            historyNavLinks.forEach(el => el.style.display = '');
            profileNavLinks.forEach(el => el.style.display = '');
        } else {
            // GUEST (Not logged in): Show Booking and Driver registration; HIDE Admin, History, Profile
            driverNavLinks.forEach(el => el.style.display = '');
            adminNavLinks.forEach(el => el.style.display = 'none');
            customerNavLinks.forEach(el => el.style.display = '');
            historyNavLinks.forEach(el => el.style.display = 'none');
            profileNavLinks.forEach(el => el.style.display = 'none');
        }

        // Update Mobile & Home search pill & Hero shortcuts to match role
        const searchPill = document.getElementById('home-search-pill');
        if (searchPill) {
            const isPages = window.location.pathname.includes('/pages/');
            if (role === 'admin') {
                searchPill.href = isPages ? 'admin.html' : 'pages/admin.html';
                const sIcon = searchPill.querySelector('.goride-search-icon');
                const sText = searchPill.querySelector('.goride-search-text');
                const sAction = searchPill.querySelector('.goride-search-action');
                if (sIcon) sIcon.textContent = '📊';
                if (sText) sText.textContent = 'Trung tâm Quản trị Navigo';
                if (sAction) sAction.textContent = 'Quản lý →';
            } else if (role === 'driver') {
                searchPill.href = isPages ? 'driver.html' : 'pages/driver.html';
                const sIcon = searchPill.querySelector('.goride-search-icon');
                const sText = searchPill.querySelector('.goride-search-text');
                const sAction = searchPill.querySelector('.goride-search-action');
                if (sIcon) sIcon.textContent = '🚗';
                if (sText) sText.textContent = 'Cổng Nhận chuyến Tài xế';
                if (sAction) sAction.textContent = 'Nhận chuyến →';
            } else {
                searchPill.href = isPages ? 'customer.html' : 'pages/customer.html';
                const sIcon = searchPill.querySelector('.goride-search-icon');
                const sText = searchPill.querySelector('.goride-search-text');
                const sAction = searchPill.querySelector('.goride-search-action');
                if (sIcon) sIcon.textContent = '🔍';
                if (sText) sText.textContent = 'Bạn muốn đi đâu hôm nay?';
                if (sAction) sAction.textContent = 'Đặt xe →';
            }
        }

        // Update home dropdown menu role-based links
        const adminDropLink = document.getElementById('home-dropdown-admin-link');
        const driverDropLink = document.getElementById('home-dropdown-driver-link');
        const historyDropLink = document.getElementById('home-dropdown-history-link');
        if (adminDropLink) adminDropLink.style.display = (role === 'admin') ? 'flex' : 'none';
        if (driverDropLink) driverDropLink.style.display = (role === 'driver') ? 'flex' : 'none';
        if (historyDropLink) historyDropLink.style.display = (role === 'customer') ? 'flex' : 'none';

        // Fill dynamic user profile placeholders
        if (user) {
            // Safety sanitization: If a driver account has admin text, resolve real driver name
            if (user.role === 'driver' && user.name && (user.name.includes('Quản trị viên') || user.name.toLowerCase() === 'admin')) {
                try {
                    const allDrivers = JSON.parse(localStorage.getItem('goride_admin_drivers') || '[]');
                    const dMatch = allDrivers.find(d => (d.email && d.email === user.email) || (d.id && d.id === user.id) || (d.phone && d.phone === user.phone));
                    if (dMatch && dMatch.name && !dMatch.name.includes('Quản trị viên')) {
                        user.name = dMatch.name;
                    } else {
                        const offUsers = JSON.parse(localStorage.getItem('goride_offline_users') || '[]');
                        const uMatch = offUsers.find(u => (u.email && u.email === user.email) || (u.id && u.id === user.id));
                        if (uMatch && uMatch.name && !uMatch.name.includes('Quản trị viên')) {
                            user.name = uMatch.name;
                        } else {
                            user.name = 'Đối tác tài xế';
                        }
                    }
                } catch (e) {
                    user.name = 'Đối tác tài xế';
                }
            }

            document.querySelectorAll('[data-user-name]').forEach(el => {
                el.textContent = user.name || 'Người dùng';
            });
            document.querySelectorAll('[data-user-email]').forEach(el => {
                el.textContent = user.email || '';
            });
            document.querySelectorAll('[data-user-role]').forEach(el => {
                const roleLabels = { customer: 'Khách hàng', driver: 'Tài xế', admin: 'Quản trị viên' };
                el.textContent = roleLabels[user.role] || user.role;
            });
            const avatarSelectors = [
                '[data-user-avatar]',
                '.goride-user-avatar-btn',
                '#desktop-user-badge',
                '#user-profile-badge',
                '#admin-user-avatar',
                '#customer-user-avatar',
                '#driver-user-avatar',
                '.user-menu-trigger .avatar',
                '#admin-user-menu .avatar'
            ];
            const avatarEls = document.querySelectorAll(avatarSelectors.join(', '));
            avatarEls.forEach(el => {
                const avatarSrc = user.avatar || user.avatar_path;
                if (avatarSrc) {
                    if (el.tagName && el.tagName.toLowerCase() === 'img') {
                        el.setAttribute('src', avatarSrc);
                        el.style.display = 'block';
                    } else {
                        el.innerHTML = `<img src="${avatarSrc}" alt="${user.name || 'Avatar'}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block; pointer-events:none;">`;
                    }
                    el.style.overflow = 'hidden';
                    el.style.padding = '0';
                    el.style.boxSizing = 'border-box';
                } else {
                    const initial = (user.name || 'U').charAt(0).toUpperCase();
                    if (el.tagName && el.tagName.toLowerCase() === 'img') {
                        el.style.display = 'none';
                    } else {
                        el.innerHTML = initial;
                    }
                }
            });
            document.querySelectorAll('[data-user-balance]').forEach(el => {
                el.textContent = formatCurrency(user.walletBalance || 0);
            });
        }

        // Keep Mobile Bottom Navigation strictly synchronized with current role
        this.initMobileBottomNav();
    }

    /**
     * Bind universal event handlers across pages
     * @private
     */
    _setupEventListeners() {
        // Global click handler for data-actions
        document.addEventListener('click', (event) => {
            // Logout action buttons
            const logoutTrigger = event.target.closest('[data-action="logout"]');
            if (logoutTrigger) {
                event.preventDefault();
                this.handleLogout();
                return;
            }

            // User Profile triggers: [data-action="profile"], .goride-user-avatar-btn, #desktop-user-badge, #home-user-menu-btn
            const profileTrigger = event.target.closest('[data-action="profile"], .goride-user-avatar-btn, #desktop-user-badge, #home-user-menu-btn, .goride-home-user-menu-btn');
            if (profileTrigger && !profileTrigger.closest('[data-auth="guest"]')) {
                event.preventDefault();
                this.showProfileModal();
                return;
            }

            // Modal open triggers: data-modal-open="my-modal-id"
            const modalOpenTrigger = event.target.closest('[data-modal-open]');
            if (modalOpenTrigger) {
                event.preventDefault();
                const targetModalId = modalOpenTrigger.getAttribute('data-modal-open');
                openModal(targetModalId);
                return;
            }

            // Modal close triggers: data-modal-close or [data-dismiss="modal"]
            const modalCloseTrigger = event.target.closest('[data-modal-close], [data-dismiss="modal"]');
            if (modalCloseTrigger) {
                event.preventDefault();
                const modal = modalCloseTrigger.closest('.modal, .modal-backdrop');
                if (modal) {
                    closeModal(modal);
                }
                return;
            }

            // Backdrop click to close active modal
            if (event.target.classList && event.target.classList.contains('modal-backdrop')) {
                closeModal(event.target);
            }
        });

        // ESC key listener to close active modal
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' || event.key === 'Esc') {
                const activeModal = document.querySelector('.modal-active');
                if (activeModal) {
                    closeModal(activeModal);
                }
            }
        });

        // Reactive session change events
        window.addEventListener('session:login', () => {
            this.updateAuthUI();
        });

        window.addEventListener('session:logout', () => {
            this.updateAuthUI();
        });

        window.addEventListener('session:change', () => {
            this.updateAuthUI();
        });

        window.addEventListener('session:update', () => {
            this.updateAuthUI();
        });

        // Cross-tab and back-navigation reactive sync for avatars & user session
        window.addEventListener('storage', (e) => {
            if (e.key === 'goride_user' || e.key === 'ride_rtree_user') {
                if (typeof sessionManager !== 'undefined') {
                    sessionManager._initFromStorage();
                }
                this.updateAuthUI();
            }
        });

        window.addEventListener('focus', () => {
            if (typeof sessionManager !== 'undefined') {
                sessionManager._initFromStorage();
            }
            this.updateAuthUI();
        });

        window.addEventListener('pageshow', () => {
            if (typeof sessionManager !== 'undefined') {
                sessionManager._initFromStorage();
            }
            this.updateAuthUI();
        });

        window.addEventListener('hashchange', () => {
            this.initMobileBottomNav();
        });
    }

    /**
     * Show interactive, responsive user profile modal (P3 Compliance)
     */
    showProfileModal() {
        const isPagesDir = window.location.pathname.includes('/pages/');
        if (typeof sessionManager === 'undefined' || !sessionManager.isAuthenticated()) {
            window.location.href = isPagesDir ? 'login.html' : 'pages/login.html';
            return;
        }
        window.location.href = isPagesDir ? 'profile.html' : 'pages/profile.html';
        return;
    }

    /**
     * Process and compress high-resolution avatar image (up to 20MB)
     * Resizes down to crisp avatar dimensions (max 800px) and outputs optimized base64
     * that safely fits into localStorage without throwing QuotaExceededError.
     * @private
     */
    _processAndCompressAvatar(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        let width = img.width;
                        let height = img.height;
                        const maxDim = 800; // Optimal sharp avatar dimension

                        if (width > maxDim || height > maxDim) {
                            if (width > height) {
                                height = Math.round((height * maxDim) / width);
                                width = maxDim;
                            } else {
                                width = Math.round((width * maxDim) / height);
                                height = maxDim;
                            }
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, width, height);

                        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                        const compressedBase64 = canvas.toDataURL(mimeType, 0.88);
                        resolve(compressedBase64);
                    } catch (canvasErr) {
                        // Fallback to original base64 if canvas processing fails
                        resolve(e.target.result);
                    }
                };
                img.onerror = () => reject(new Error('Không thể xử lý định dạng tệp ảnh này.'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh từ thiết bị.'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Centralized logout flow
     */
    handleLogout() {
        if (typeof sessionManager !== 'undefined' && typeof sessionManager.confirmLogout === 'function') {
            sessionManager.confirmLogout();
            return;
        }
        if (typeof apiClient !== 'undefined') {
            apiClient.logout().catch(() => {});
        }
        if (typeof sessionManager !== 'undefined') {
            sessionManager.logout();
        }
        try {
            sessionStorage.clear();
            const keysToRemove = [
                'ride_rtree_user', 'ride_rtree_token',
                'goride_user', 'goride_token',
                'navigo_user', 'navigo_token',
                'user', 'token', 'currentUser',
                'goride_active_trip', 'goride_driver_online_state',
                'goride_pending_trip_offers'
            ];
            keysToRemove.forEach(k => {
                try {
                    localStorage.removeItem(k);
                    sessionStorage.removeItem(k);
                } catch(e) {}
            });
        } catch(e) {}

        if (typeof showToast === 'function') {
            showToast('Đã đăng xuất thành công', 'info', 2000);
        }
        setTimeout(() => {
            if (typeof router !== 'undefined' && typeof router.navigate === 'function') {
                router.navigate('login', { logout: 'true' });
            } else {
                const isPagesDir = window.location.pathname.includes('/pages/');
                window.location.href = isPagesDir ? '../loading.html?from=logout' : 'loading.html?from=logout';
            }
        }, 200);
    }

    /**
     * Floating Active Trip Window (Banner) on Homepage & Outside Views
     * Shows current ride status if a trip is currently requested or in progress.
     * Clicking returns immediately to the live map tracking view.
     */
    initActiveTripBanner() {
        // PER USER REQUIREMENT: No intrusive popup notification spam across pages.
        // All trip notifications & promos belong strictly inside notifications.html.
        const existing = document.getElementById('goride-floating-active-trip');
        if (existing) existing.remove();
        return;
    }

    /**
     * Initialize dynamic Role-Based Floating Bottom Navigation Bar (Frosted Glass Capsule Match)
     * Synchronizes unified bottom navigation with session auth UI.
     */
    initMobileBottomNav() {
        if (typeof document === 'undefined') return;

        const path = (window.location.pathname || '').toLowerCase();
        const isLogin = path.includes('login.html');
        const isRegister = path.includes('register.html');
        if (isLogin || isRegister) {
            document.querySelectorAll('.gsm-floating-bottom-nav, #mobile-bottom-nav, .bottom-nav').forEach(el => {
                el.style.setProperty('display', 'none', 'important');
            });
            return;
        }

        if (typeof syncNavigoAuthUI === 'function') {
            syncNavigoAuthUI();
        }
    }

    /**
     * Global uncaught error handler
     * @private
     */
    _setupErrorHandlers() {
        window.addEventListener('error', (event) => {
            console.error('[App Uncaught Error]:', event.error || event.message);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('[App Unhandled Promise Rejection]:', event.reason);
        });
    }
}

// Singleton app instance
const app = new App();

// Auto initialize on DOM ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => app.init());
    } else {
        // DOM already loaded
        app.init();
    }
}

// Expose utilities & app globally for plain script tags
if (typeof window !== 'undefined') {
    window.App = App;
    window.app = app;
    window.formatCurrency = formatCurrency;
    window.formatDistance = formatDistance;
    window.formatDuration = formatDuration;
    window.formatDateTime = formatDateTime;
    window.showToast = showToast;
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.isMockTrip = isMockTrip;
    window.purgeAllMockTrips = purgeAllMockTrips;
}

// Module export support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        App,
        app,
        formatCurrency,
        formatDistance,
        formatDuration,
        formatDateTime,
        showToast,
        openModal,
        closeModal,
        showLoading,
        hideLoading,
        isMockTrip,
        purgeAllMockTrips
    };
}
