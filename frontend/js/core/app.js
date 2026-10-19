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
    const existing = Array.from(container.children);
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
        let modal = document.getElementById('goride-profile-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'goride-profile-modal';
            modal.style.position = 'fixed';
            modal.style.inset = '0';
            modal.style.backgroundColor = 'rgba(15, 23, 42, 0.65)';
            modal.style.backdropFilter = 'blur(4px)';
            modal.style.zIndex = '9999';
            modal.style.display = 'none';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.padding = '16px';
            modal.style.boxSizing = 'border-box';

            modal.innerHTML = `
                <div style="background:#ffffff; border-radius:18px; width:100%; max-width:460px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2); display:flex; flex-direction:column; padding:24px; box-sizing:border-box; font-family:var(--font-sans, sans-serif);">
                    <!-- Header -->
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:14px; margin-bottom:18px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:1.4rem;">👤</span>
                            <h3 style="margin:0; font-size:1.15rem; font-weight:700; color:#0f172a;">Thông tin tài khoản</h3>
                        </div>
                        <button type="button" id="btn-close-profile-modal" style="background:transparent; border:none; font-size:1.3rem; color:#64748b; cursor:pointer; line-height:1;">&times;</button>
                    </div>

                    <!-- Avatar Section -->
                    <div style="display:flex; flex-direction:column; align-items:center; gap:8px; margin-bottom:20px;">
                        <div id="profile-avatar-circle" style="width:84px; height:84px; border-radius:50%; background:#2563eb; color:#ffffff; font-size:2rem; font-weight:700; display:flex; align-items:center; justify-content:center; overflow:hidden; border:3px solid #e2e8f0; box-shadow:0 4px 6px rgba(0,0,0,0.05); text-transform:uppercase;">
                            <span id="profile-avatar-initial">U</span>
                            <img id="profile-avatar-img" src="" alt="Avatar" style="width:100%; height:100%; object-fit:cover; display:none;">
                        </div>
                        <label style="cursor:pointer; background:#f1f5f9; color:#334155; font-size:0.8rem; font-weight:600; padding:6px 16px; border-radius:20px; border:1px solid #cbd5e1; transition:all 0.2s; display:inline-flex; align-items:center; gap:6px;">
                            <span>📷</span>
                            <span>Đổi ảnh đại diện</span>
                            <input type="file" id="profile-avatar-file" accept="image/*" style="display:none;">
                        </label>
                        <span style="font-size:0.75rem; color:#64748b;">Hỗ trợ ảnh JPG, PNG, WEBP lên đến 20MB</span>
                    </div>

                    <!-- Form Fields -->
                    <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
                        <div>
                            <label style="display:block; font-size:0.8rem; font-weight:600; color:#475569; margin-bottom:4px;">Họ và tên</label>
                            <input type="text" id="profile-input-name" style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block; font-size:0.8rem; font-weight:600; color:#475569; margin-bottom:4px;">Số điện thoại</label>
                            <input type="text" id="profile-input-phone" style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block; font-size:0.8rem; font-weight:600; color:#475569; margin-bottom:4px;">Email (Cố định)</label>
                            <input type="email" id="profile-input-email" disabled style="width:100%; padding:9px 12px; border:1px solid #e2e8f0; background:#f8fafc; color:#64748b; border-radius:8px; font-size:0.9rem; box-sizing:border-box;">
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0;">
                            <span style="font-size:0.85rem; color:#475569; font-weight:600;">Vai trò</span>
                            <span id="profile-badge-role" style="font-size:0.8rem; font-weight:700; padding:3px 10px; border-radius:12px; background:#e0f2fe; color:#0369a1;"></span>
                        </div>
                        <div id="profile-driver-details" style="display:none; flex-direction:column; gap:8px; background:#f0fdf4; padding:12px; border-radius:8px; border:1px solid #bbf7d0;">
                            <div style="font-size:0.85rem; font-weight:700; color:#15803d; margin-bottom:2px;">Thông tin phương tiện</div>
                            <div style="display:flex; justify-content:space-between; font-size:0.82rem; color:#334155;">
                                <span>Loại xe:</span>
                                <strong id="profile-driver-vtype">--</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.82rem; color:#334155;">
                                <span>Biển số xe:</span>
                                <strong id="profile-driver-plate">--</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.82rem; color:#334155;">
                                <span>Kinh nghiệm:</span>
                                <strong id="profile-driver-exp">-- năm</strong>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Buttons -->
                    <div style="display:flex; gap:10px; justify-content:flex-end; border-top:1px solid #e2e8f0; padding-top:16px;">
                        <button type="button" id="btn-profile-logout" style="padding:8px 16px; border:1px solid #fca5a5; background:#fef2f2; color:#b91c1c; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer;">
                            Đăng xuất
                        </button>
                        <button type="button" id="btn-profile-save" style="padding:8px 20px; border:none; background:#2563eb; color:#ffffff; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer;">
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Wire close button
            modal.querySelector('#btn-close-profile-modal').addEventListener('click', () => {
                modal.style.display = 'none';
            });
            // Wire backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
            });
            // Wire logout button
            modal.querySelector('#btn-profile-logout').addEventListener('click', () => {
                modal.style.display = 'none';
                this.handleLogout();
            });

            // Wire save button
            modal.querySelector('#btn-profile-save').addEventListener('click', async () => {
                const name = modal.querySelector('#profile-input-name').value.trim();
                const phone = modal.querySelector('#profile-input-phone').value.trim();
                const saveBtn = modal.querySelector('#btn-profile-save');
                saveBtn.disabled = true;
                saveBtn.textContent = 'Đang lưu...';

                try {
                    if (typeof apiClient !== 'undefined') {
                        await apiClient.updateProfile({ name, phone });
                    }
                    sessionManager.updateUser({ name, phone });
                    this.updateAuthUI();
                    showToast('Cập nhật hồ sơ thành công!', 'success');
                    modal.style.display = 'none';
                } catch (err) {
                    showToast(err.message || 'Lỗi cập nhật hồ sơ', 'error');
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Lưu thay đổi';
                }
            });

            // Wire avatar file change with expanded size capacity (20MB) & smart compression
            const avatarInput = modal.querySelector('#profile-avatar-file');
            avatarInput.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                // Expanded capacity up to 20MB (handles all modern mobile & camera photos)
                const MAX_AVATAR_SIZE = 20 * 1024 * 1024; // 20MB
                if (file.size > MAX_AVATAR_SIZE) {
                    showToast('Vui lòng chọn ảnh có kích thước dưới 20MB', 'error');
                    return;
                }

                showToast('Đang tối ưu và tải ảnh đại diện lên...', 'info', 2000);

                try {
                    // Smart client-side compression: keeps high resolution while ensuring safe storage
                    const base64Data = await this._processAndCompressAvatar(file);

                    if (typeof apiClient !== 'undefined') {
                        try {
                            await apiClient.uploadAvatar(base64Data);
                        } catch (apiErr) {}
                    }

                    sessionManager.updateUser({ avatar: base64Data, avatar_path: base64Data });

                    // Also sync into goride_offline_users so avatar persists across logins
                    try {
                        const curUser = sessionManager.getCurrentUser();
                        if (curUser && curUser.email) {
                            const offlineUsers = JSON.parse(localStorage.getItem('goride_offline_users') || '[]');
                            const uIdx = offlineUsers.findIndex(u => u.email === curUser.email || u.id === curUser.id);
                            if (uIdx !== -1) {
                                offlineUsers[uIdx].avatar = base64Data;
                                offlineUsers[uIdx].avatar_path = base64Data;
                                localStorage.setItem('goride_offline_users', JSON.stringify(offlineUsers));
                            }
                        }
                    } catch (e) {}

                    modal.querySelector('#profile-avatar-img').src = base64Data;
                    modal.querySelector('#profile-avatar-img').style.display = 'block';
                    modal.querySelector('#profile-avatar-initial').style.display = 'none';
                    this.updateAuthUI();
                    showToast('Cập nhật ảnh đại diện thành công!', 'success');
                } catch (err) {
                    showToast(err.message || 'Lỗi tải ảnh đại diện', 'error');
                }
            });
        }

        // Fill modal with fresh user data
        modal.querySelector('#profile-input-name').value = user.name || '';
        modal.querySelector('#profile-input-phone').value = user.phone || '';
        modal.querySelector('#profile-input-email').value = user.email || '';

        const roleLabels = { customer: 'Khách hàng', driver: 'Tài xế', admin: 'Quản trị viên' };
        modal.querySelector('#profile-badge-role').textContent = roleLabels[user.role] || user.role;

        // Avatar
        const avatarImg = modal.querySelector('#profile-avatar-img');
        const avatarInitial = modal.querySelector('#profile-avatar-initial');
        if (user.avatar || user.avatar_path) {
            avatarImg.src = user.avatar || user.avatar_path;
            avatarImg.style.display = 'block';
            avatarInitial.style.display = 'none';
        } else {
            avatarImg.style.display = 'none';
            avatarInitial.style.display = 'block';
            avatarInitial.textContent = (user.name || 'U').charAt(0).toUpperCase();
        }

        // Driver details
        const driverDetails = modal.querySelector('#profile-driver-details');
        if (user.role === 'driver' && user.vehicle) {
            driverDetails.style.display = 'flex';
            const vtypes = { motorbike: 'Xe máy', car4: 'Ô tô 4 chỗ', car7: 'Ô tô 7 chỗ' };
            modal.querySelector('#profile-driver-vtype').textContent = vtypes[user.vehicle.type] || user.vehicle.type;
            modal.querySelector('#profile-driver-plate').textContent = user.vehicle.plate || '--';
            modal.querySelector('#profile-driver-exp').textContent = `${user.vehicle.experience || 0} năm`;
        } else {
            driverDetails.style.display = 'none';
        }

        modal.style.display = 'flex';
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
        if (typeof apiClient !== 'undefined') {
            apiClient.logout().catch(() => {});
        }
        if (typeof sessionManager !== 'undefined') {
            sessionManager.logout();
        }
        showToast('Đã đăng xuất thành công', 'info', 2000);
        setTimeout(() => {
            if (typeof router !== 'undefined') {
                router.navigate('login');
            } else {
                window.location.href = 'login.html';
            }
        }, 300);
    }

    /**
     * Floating Active Trip Window (Banner) on Homepage & Outside Views
     * Shows current ride status if a trip is currently requested or in progress.
     * Clicking returns immediately to the live map tracking view.
     */
    initActiveTripBanner() {
        const isCustomerPage = window.location.pathname.endsWith('customer.html');
        const isDriverPage = window.location.pathname.endsWith('driver.html');
        const isPagesDir = window.location.pathname.includes('/pages/');
        const customerUrl = isPagesDir ? 'customer.html' : 'pages/customer.html';

        const updateBanner = () => {
            // Check active trip in localStorage or admin trips
            let activeTrip = null;
            try {
                const raw = localStorage.getItem('goride_active_trip');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const validStatuses = ['REQUESTED', 'OFFERED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'];
                    if (parsed && parsed.status && validStatuses.includes(parsed.status.toUpperCase())) {
                        activeTrip = parsed;
                    }
                }
            } catch (e) {}

            if (!activeTrip) {
                try {
                    const adminTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
                    const found = adminTrips.find(t => ['requested', 'offered', 'accepted', 'arrived', 'in_progress'].includes(t.status?.toLowerCase()));
                    if (found) {
                        activeTrip = {
                            id: found.id,
                            status: found.status.toUpperCase(),
                            customerName: found.customerName || 'Khách hàng',
                            driverName: found.driverName !== 'Chưa gán' ? found.driverName : null,
                            licensePlate: found.licensePlate || '51G-889.24',
                            vehicleModel: found.vehicleModel || 'GoRide',
                            pickup: { name: found.pickup || 'Điểm đón' },
                            destination: { name: found.destination || 'Điểm đến' },
                            fareAmount: Number(found.fare) || 45000
                        };
                    }
                } catch (e) {}
            }

            let container = document.getElementById('goride-floating-active-trip');

            // If we are on customer page and in tracking view, hide floating banner (as map itself is tracking)
            if (isCustomerPage && window.customerAppController && window.customerAppController.currentView === 'tracking') {
                if (container) container.remove();
                return;
            }

            // If user is currently in driver portal as driver, do not show customer banner
            if (isDriverPage) {
                if (container) container.remove();
                return;
            }

            if (!activeTrip) {
                if (container) container.remove();
                return;
            }

            const status = activeTrip.status.toUpperCase();
            let statusBadge = 'ĐANG TÌM TÀI XẾ';
            let statusIcon = '📡';
            let statusTitle = 'Hệ thống đang phát tín hiệu tìm tài xế gần bạn...';
            let actionText = 'Quay lại bản đồ';
            let pulseClass = 'pulse-radar';

            if (status === 'ACCEPTED' || status === 'ARRIVED') {
                statusBadge = 'TÀI XẾ ĐÃ NHẬN';
                statusIcon = '🚗';
                statusTitle = `Tài xế ${activeTrip.driverName || 'đối tác'} đang đến đón (${activeTrip.licensePlate || 'Xe đối tác'})`;
                actionText = 'Xem vị trí xe';
                pulseClass = 'pulse-driver';
            } else if (status === 'IN_PROGRESS') {
                statusBadge = 'ĐANG DI CHUYỂN';
                statusIcon = '🏎️';
                statusTitle = 'Chuyến xe đang trên đường đến điểm trả...';
                actionText = 'Xem hành trình';
                pulseClass = 'pulse-moving';
            }

            const pickupName = (activeTrip.pickup && (activeTrip.pickup.name || activeTrip.pickup.address)) || activeTrip.pickupName || 'Điểm đón';
            const destName = (activeTrip.destination && (activeTrip.destination.name || activeTrip.destination.address)) || activeTrip.dropoffName || 'Điểm đến';
            const fareFormatted = formatCurrency(activeTrip.fareAmount || 45000);

            if (!container) {
                container = document.createElement('div');
                container.id = 'goride-floating-active-trip';
                container.className = 'goride-floating-active-trip';
                document.body.appendChild(container);
            }

            container.innerHTML = `
                <div class="gfat-card ${pulseClass}">
                    <div class="gfat-icon-col">
                        <div class="gfat-radar-pulse">
                            <span class="gfat-pulse-ring"></span>
                            <span class="gfat-icon-symbol">${statusIcon}</span>
                        </div>
                    </div>
                    <div class="gfat-content-col">
                        <div class="gfat-header-line">
                            <span class="gfat-badge">${statusBadge}</span>
                            <span class="gfat-fare">${fareFormatted}</span>
                        </div>
                        <div class="gfat-title">${statusTitle}</div>
                        <div class="gfat-route-line" title="${pickupName} ➔ ${destName}">
                            <span class="gfat-point pickup">${pickupName}</span>
                            <span class="gfat-arrow">➔</span>
                            <span class="gfat-point dest">${destName}</span>
                        </div>
                    </div>
                    <div class="gfat-action-col">
                        <button type="button" class="gfat-action-btn">
                            <span>${actionText}</span>
                            <span class="gfat-btn-arrow">&rarr;</span>
                        </button>
                    </div>
                </div>
            `;

            container.onclick = (e) => {
                e.preventDefault();
                if (isCustomerPage) {
                    if (window.customerAppController) {
                        window.customerAppController.switchView('tracking');
                    }
                } else {
                    window.location.href = customerUrl;
                }
            };
        };

        // Run immediately
        updateBanner();

        // Listen for cross-tab storage changes (e.g. driver accepts trip in driver portal)
        window.addEventListener('storage', (e) => {
            if (e.key === 'goride_active_trip' || e.key === 'goride_admin_trips' || e.key === 'goride_pending_trip_offers') {
                updateBanner();
            }
        });

        // Periodic check every 1500ms
        setInterval(updateBanner, 1500);
    }

    /**
     * Initialize dynamic Role-Based Mobile Bottom Navigation Bar (Native App Style)
     * Dynamically renders and syncs tabs based on:
     * - Customer / Guest: Trang chủ, Đặt chuyến, Lịch sử, Tài khoản
     * - Driver: Trang chủ, Nhận chuyến, Lịch sử, Thu nhập, Tài khoản
     * - Admin: Trang chủ, Tổng quan, Chuyến xe, Tài xế, Tài khoản
     */
    initMobileBottomNav() {
        if (typeof document === 'undefined') return;

        const path = window.location.pathname.toLowerCase();
        const isLogin = path.includes('login.html');
        const isRegister = path.includes('register.html');
        if (isLogin || isRegister) {
            const existingNav = document.getElementById('mobile-bottom-nav') || document.querySelector('.bottom-nav');
            if (existingNav) {
                existingNav.style.setProperty('display', 'none', 'important');
                existingNav.remove();
            }
            return;
        }

        let nav = document.getElementById('mobile-bottom-nav');
        if (!nav) {
            nav = document.querySelector('.bottom-nav');
        }
        if (!nav) {
            nav = document.createElement('nav');
            nav.id = 'mobile-bottom-nav';
            nav.className = 'bottom-nav mobile-only-flex';
            document.body.appendChild(nav);
        } else {
            nav.id = 'mobile-bottom-nav';
            if (!nav.classList.contains('bottom-nav')) nav.classList.add('bottom-nav');
            nav.classList.remove('mobile-only');
            if (!nav.classList.contains('mobile-only-flex')) nav.classList.add('mobile-only-flex');
        }

        // Clean any accidental style.display = 'none' or 'block'
        nav.style.removeProperty('display');

        const isPagesDir = path.includes('/pages/');
        const isHome = path.endsWith('index.html') || (!isPagesDir && (path.endsWith('/') || path.split('/').pop() === ''));
        const isCustomer = path.includes('customer.html');
        const isDriver = path.includes('driver.html');
        const isAdmin = path.includes('admin.html');
        const hash = (window.location.hash || '').replace('#', '').toLowerCase();

        let isAuth = typeof sessionManager !== 'undefined' && sessionManager.isAuthenticated();
        let role = (isAuth && sessionManager.getRole()) ? sessionManager.getRole() : null;
        if (!role) {
            try {
                const raw = localStorage.getItem('navigo_user') || localStorage.getItem('goride_user') || localStorage.getItem('ride_rtree_user');
                if (raw && raw !== 'null' && raw !== 'undefined' && raw !== '{}') {
                    const u = JSON.parse(raw);
                    if (u && (u.id || u.email)) {
                        isAuth = true;
                        role = u.role || 'customer';
                    }
                }
            } catch (e) {}
        }
        if (!role) role = 'guest';

        const homeUrl = isPagesDir ? '../index.html' : 'index.html';
        const customerUrl = isPagesDir ? 'customer.html' : 'pages/customer.html';
        const driverUrl = isPagesDir ? 'driver.html' : 'pages/driver.html';
        const adminUrl = isPagesDir ? 'admin.html' : 'pages/admin.html';
        const loginUrl = isPagesDir ? 'login.html' : 'pages/login.html';
        const profileUrl = isPagesDir ? 'profile.html' : 'pages/profile.html';

        let itemsHtml = '';

        if (role === 'driver') {
            // DRIVER ROLE: Trang chủ, Nhận chuyến, Lịch sử, Thu nhập, Hồ sơ
            const isTabHome = isDriver && (hash === 'home' || hash === '' || !hash);
            const isTabTrips = isDriver && hash === 'trips';
            const isTabEarnings = isDriver && hash === 'earnings';

            itemsHtml = `
                <a href="${homeUrl}" class="bottom-nav-item ${isHome ? 'active' : ''}" id="bnav-driver-landing" title="Về trang chủ">
                    <span class="bottom-nav-icon">🏠</span>
                    <span class="bottom-nav-label">Trang chủ</span>
                </a>
                <a href="${isDriver ? '#home' : driverUrl + '#home'}" class="bottom-nav-item ${isTabHome ? 'active' : ''}" data-tab="home" id="bnav-driver-home">
                    <span class="bottom-nav-icon">🚗</span>
                    <span class="bottom-nav-label">Nhận chuyến</span>
                </a>
                <a href="${isDriver ? '#trips' : driverUrl + '#trips'}" class="bottom-nav-item ${isTabTrips ? 'active' : ''}" data-tab="trips" id="bnav-driver-trips">
                    <span class="bottom-nav-icon">📋</span>
                    <span class="bottom-nav-label">Lịch sử</span>
                </a>
                <a href="${isDriver ? '#earnings' : driverUrl + '#earnings'}" class="bottom-nav-item ${isTabEarnings ? 'active' : ''}" data-tab="earnings" id="bnav-driver-earnings">
                    <span class="bottom-nav-icon">💰</span>
                    <span class="bottom-nav-label">Thu nhập</span>
                </a>
                <a href="${profileUrl}" class="bottom-nav-item ${path.includes('profile.html') ? 'active' : ''}" id="bnav-driver-account">
                    <span class="bottom-nav-icon">👤</span>
                    <span class="bottom-nav-label">Hồ sơ</span>
                </a>
            `;
        } else if (role === 'admin') {
            // ADMIN ROLE: Trang chủ, Tổng quan, Chuyến xe, Khách hàng, Tài xế, Hồ sơ
            const isTabDash = isAdmin && (hash === 'dashboard' || hash === '' || !hash);
            const isTabTrips = isAdmin && hash === 'trips';
            const isTabCustomers = isAdmin && hash === 'customers';
            const isTabDrivers = isAdmin && hash === 'drivers';

            itemsHtml = `
                <a href="${homeUrl}" class="bottom-nav-item ${isHome ? 'active' : ''}" id="bnav-admin-landing" title="Về trang chủ">
                    <span class="bottom-nav-icon">🏠</span>
                    <span class="bottom-nav-label">Trang chủ</span>
                </a>
                <a href="${isAdmin ? '#dashboard' : adminUrl + '#dashboard'}" class="bottom-nav-item ${isTabDash ? 'active' : ''}" data-tab="dashboard" id="bnav-admin-dashboard">
                    <span class="bottom-nav-icon">📊</span>
                    <span class="bottom-nav-label">Tổng quan</span>
                </a>
                <a href="${isAdmin ? '#trips' : adminUrl + '#trips'}" class="bottom-nav-item ${isTabTrips ? 'active' : ''}" data-tab="trips" id="bnav-admin-trips">
                    <span class="bottom-nav-icon">🛣️</span>
                    <span class="bottom-nav-label">Chuyến xe</span>
                </a>
                <a href="${isAdmin ? '#customers' : adminUrl + '#customers'}" class="bottom-nav-item ${isTabCustomers ? 'active' : ''}" data-tab="customers" id="bnav-admin-customers">
                    <span class="bottom-nav-icon">👥</span>
                    <span class="bottom-nav-label">Khách hàng</span>
                </a>
                <a href="${isAdmin ? '#drivers' : adminUrl + '#drivers'}" class="bottom-nav-item ${isTabDrivers ? 'active' : ''}" data-tab="drivers" id="bnav-admin-drivers">
                    <span class="bottom-nav-icon">👨‍✈️</span>
                    <span class="bottom-nav-label">Tài xế</span>
                </a>
                <a href="${profileUrl}" class="bottom-nav-item ${path.includes('profile.html') ? 'active' : ''}" id="bnav-admin-account">
                    <span class="bottom-nav-icon">👤</span>
                    <span class="bottom-nav-label">Hồ sơ</span>
                </a>
            `;
        } else if (role === 'customer') {
            // CUSTOMER ROLE: Trang chủ, Đặt chuyến, Lịch sử, Hồ sơ
            const isCustBooking = isCustomer && hash !== 'history';
            const isCustHistory = isCustomer && hash === 'history';

            itemsHtml = `
                <a href="${homeUrl}" class="bottom-nav-item ${isHome ? 'active' : ''}" id="bnav-cust-home">
                    <span class="bottom-nav-icon">🏠</span>
                    <span class="bottom-nav-label">Trang chủ</span>
                </a>
                <a href="${customerUrl}" class="bottom-nav-item ${isCustBooking ? 'active' : ''}" id="bnav-cust-booking">
                    <span class="bottom-nav-icon">🚗</span>
                    <span class="bottom-nav-label">Đặt chuyến</span>
                </a>
                <a href="${customerUrl}#history" class="bottom-nav-item ${isCustHistory ? 'active' : ''}" id="bnav-cust-history">
                    <span class="bottom-nav-icon">📋</span>
                    <span class="bottom-nav-label">Lịch sử</span>
                </a>
                <a href="${profileUrl}" class="bottom-nav-item ${path.includes('profile.html') ? 'active' : ''}" id="bnav-cust-account">
                    <span class="bottom-nav-icon">👤</span>
                    <span class="bottom-nav-label">Hồ sơ</span>
                </a>
            `;
        } else {
            // GUEST ROLE (Chưa đăng nhập): Trang chủ, Đặt chuyến, Đối tác tài xế, Đăng nhập
            itemsHtml = `
                <a href="${homeUrl}" class="bottom-nav-item ${isHome ? 'active' : ''}" id="bnav-guest-home">
                    <span class="bottom-nav-icon">🏠</span>
                    <span class="bottom-nav-label">Trang chủ</span>
                </a>
                <a href="${customerUrl}" class="bottom-nav-item ${isCustomer ? 'active' : ''}" id="bnav-guest-booking">
                    <span class="bottom-nav-icon">🚗</span>
                    <span class="bottom-nav-label">Đặt chuyến</span>
                </a>
                <a href="${driverUrl}" class="bottom-nav-item" id="bnav-guest-driver">
                    <span class="bottom-nav-icon">🛵</span>
                    <span class="bottom-nav-label">Đối tác</span>
                </a>
                <a href="${loginUrl}" class="bottom-nav-item" id="bnav-guest-login">
                    <span class="bottom-nav-icon">👤</span>
                    <span class="bottom-nav-label">Đăng nhập</span>
                </a>
            `;
        }

        nav.innerHTML = itemsHtml;

        // Custom click behaviors when already on customer page:
        if (isCustomer) {
            const bBooking = nav.querySelector('#bnav-cust-booking');
            if (bBooking) {
                bBooking.addEventListener('click', (e) => {
                    e.preventDefault();
                    const cCtrl = window.customerAppController || window.customerController;
                    if (cCtrl) {
                        if (cCtrl.activeTrip) {
                            cCtrl.switchView('tracking');
                        } else if (cCtrl.pickup && cCtrl.destination) {
                            cCtrl.switchView('vehicle-select');
                        } else {
                            cCtrl.switchView('search');
                        }
                    }
                    try {
                        history.replaceState(null, '', 'customer.html');
                    } catch (err) {
                        window.location.hash = '';
                    }
                    bBooking.classList.add('active');
                    const bHist = nav.querySelector('#bnav-cust-history');
                    if (bHist) bHist.classList.remove('active');
                });
            }

            const bHistory = nav.querySelector('#bnav-cust-history');
            if (bHistory) {
                bHistory.addEventListener('click', (e) => {
                    e.preventDefault();
                    const cCtrl = window.customerAppController || window.customerController;
                    if (cCtrl) {
                        cCtrl.switchView('history');
                        cCtrl.loadTripHistory();
                    }
                    window.location.hash = 'history';
                    bHistory.classList.add('active');
                    if (bBooking) bBooking.classList.remove('active');
                });
            }
        }

        // Custom click behaviors when on driver page:
        if (isDriver) {
            nav.querySelectorAll('[data-tab]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tab = btn.getAttribute('data-tab');
                    if (window.driverController && typeof window.driverController.switchTab === 'function') {
                        window.driverController.switchTab(tab);
                    } else {
                        window.location.hash = tab;
                    }
                    nav.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        }

        // Custom click behaviors when on admin page:
        if (isAdmin) {
            nav.querySelectorAll('[data-tab]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tab = btn.getAttribute('data-tab');
                    if (window.adminController && typeof window.adminController.switchTab === 'function') {
                        window.adminController.switchTab(tab);
                    } else {
                        window.location.hash = tab;
                    }
                    nav.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
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
