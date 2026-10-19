/**
 * GoRide Admin Controller - Modern Unified Architecture
 * Full Real-Data CRUD for Trips & Drivers, Live Leaflet Spatial Map,
 * Real Driver Approval Workflow, Dynamic KPI Calculation (Zero Mock/Fake Data).
 */

class AdminController {
    constructor() {
        this.map = null;
        this.driverMarkersLayer = null;
        this.onlineDriversPollInterval = null;
        this.currentTab = 'dashboard';
        this.isProcessingApproval = new Set();
        this.deleteTarget = null; // { type: 'trip'|'driver', id: string }
        
        // Unified persistent storage keys
        this.STORAGE_KEYS = {
            TRIPS: 'goride_admin_trips',
            DRIVERS: 'goride_admin_drivers',
            ONLINE_DRIVERS: 'goride_online_drivers',
            PENDING: 'goride_pending_drivers',
            USERS: 'goride_offline_users'
        };
    }

    async init() {
        console.log('[AdminController] Initializing real-data Admin portal...');
        
        if (typeof purgeAllMockTrips === 'function') {
            purgeAllMockTrips();
        }

        // Clean any stale / ghost drivers in Firebase Realtime Database immediately
        if (window.realtimeSync && typeof window.realtimeSync.cleanStaleDrivers === 'function') {
            window.realtimeSync.cleanStaleDrivers();
        }

        // 1. Sync token with apiClient
        if (typeof sessionManager !== 'undefined' && sessionManager && sessionManager.getToken()) {
            if (typeof apiClient !== 'undefined' && apiClient) {
                apiClient.setAuthToken(sessionManager.getToken());
            }
        }

        // 2. Setup Navigation, Sidebar, User Menu
        this.setupTabNavigation();
        this.setupSidebarToggle();
        this.setupUserMenu();
        this.setupLogout();
        this.setupTripFilters();
        this.setupRecentTripFilters();

        // 3. Initialize Map with spatial driver tracking
        this.initMap();

        // 4. Setup cross-tab real-time listener for driver status & GPS updates
        this.setupRealtimeSync();

        // 5. Load Initial Dashboard Data & Tables
        await this.loadDashboard();
        this.loadRecentTripsTable();
        this.loadTripsTable();
        this.loadDriversList();
        this.loadDriverApprovals();

        // 6. Handle URL Hash for tabs
        const hash = window.location.hash.replace('#', '');
        if (hash && ['dashboard', 'recent-trips', 'trips', 'drivers'].includes(hash)) {
            this.switchTab(hash);
        }

        console.log('[AdminController] Admin portal initialized with 100% real data.');
    }

    /* ==========================================================================
       STORAGE ACCESSORS (100% REAL DATA - NO FAKE SEEDS)
       ========================================================================== */

    getStoredTrips() {
        try {
            const trips = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.TRIPS)) || [];
            const checkMock = (typeof isMockTrip === 'function') ? isMockTrip : (t => ['trip_vn_101', 'trip_vn_102', 'trip_vn_103', 'trip_vn_104'].includes(t?.id));
            return trips.filter(t => !checkMock(t));
        } catch {
            return [];
        }
    }

    saveStoredTrips(trips) {
        localStorage.setItem(this.STORAGE_KEYS.TRIPS, JSON.stringify(trips));
    }

    getStoredDrivers() {
        try {
            let drivers = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.DRIVERS));
            if (!Array.isArray(drivers)) drivers = [];

            // Sync from registered offline users with role === 'driver' and approved/active
            const users = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USERS) || '[]');
            const realDrivers = users.filter(u => u.role === 'driver' && u.status === 'active');
            let hasNew = false;

            realDrivers.forEach(u => {
                if (!drivers.some(d => d.id === u.id || (u.email && d.email === u.email))) {
                    const vType = u.vehicle?.type || u.vehicleType || 'motorbike';
                    let vLabel = 'Ô tô 4 chỗ (Navigo Car)';
                    if (vType === 'bike' || vType === 'motorbike') vLabel = 'Xe máy (Navigo Bike)';
                    else if (vType === 'car7') vLabel = 'Ô tô 7 chỗ (Navigo XL)';
                    else if (vType === 'premium') vLabel = 'Xe sang (Navigo Plus)';
                    drivers.push({
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        phone: u.phone,
                        vehicleType: vType,
                        vehicleTypeName: vLabel,
                        plate: u.vehicle?.plate || u.licensePlate || '--',
                        experience: u.vehicle?.experience || 2,
                        status: 'active',
                        createdAt: u.createdAt || new Date().toISOString()
                    });
                    hasNew = true;
                }
            });

            if (hasNew) {
                localStorage.setItem(this.STORAGE_KEYS.DRIVERS, JSON.stringify(drivers));
            }
            return drivers;
        } catch {
            return [];
        }
    }

    saveStoredDrivers(drivers) {
        localStorage.setItem(this.STORAGE_KEYS.DRIVERS, JSON.stringify(drivers));
    }

    getPendingDrivers() {
        try {
            const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PENDING));
            return Array.isArray(list) ? list : [];
        } catch {
            return [];
        }
    }

    savePendingDrivers(list) {
        localStorage.setItem(this.STORAGE_KEYS.PENDING, JSON.stringify(list));
    }

    /* ==========================================================================
       LEAFLET SPATIAL MAP INITIALIZATION (OSM TILES) & REAL-TIME DRIVER TRACKING
       ========================================================================== */

    initMap() {
        try {
            const mapEl = document.getElementById('admin-map');
            if (!mapEl || typeof L === 'undefined') return;

            if (this.map) {
                this.map.remove();
                this.map = null;
            }

            this.map = L.map('admin-map', {
                center: [10.7769, 106.7009],
                zoom: 13,
                zoomControl: true
            });

            L.tileLayer('https://{s}.google.com/vt/lyrs=m&hl=vi&gl=VN&x={x}&y={y}&z={z}', {
                attribution: '&copy; Bản đồ Google Việt Nam',
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
                maxZoom: 20
            }).addTo(this.map);

            // Layer group for live driver markers
            this.driverMarkersLayer = L.layerGroup().addTo(this.map);

            // Initial render of online drivers
            this.renderOnlineDriversOnMap();

            // Re-render map boundaries after layout paint
            [100, 300, 600, 1200].forEach(delay => {
                setTimeout(() => {
                    if (this.map) {
                        this.map.invalidateSize();
                        this.renderOnlineDriversOnMap();
                    }
                }, delay);
            });
        } catch (err) {
            console.warn('[Admin] Map initialization warning:', err.message);
        }
    }

    setupRealtimeSync() {
        // Cross-tab real-time listener for driver online/offline & GPS updates & user profile updates
        window.addEventListener('storage', (e) => {
            if (e.key === 'goride_user' || e.key === 'ride_rtree_user') {
                if (typeof sessionManager !== 'undefined') {
                    sessionManager._initFromStorage();
                }
                this.setupUserMenu();
            } else if (e.key === this.STORAGE_KEYS.ONLINE_DRIVERS || e.key === this.STORAGE_KEYS.DRIVERS) {
                this.renderOnlineDriversOnMap();
                if (this.currentTab === 'dashboard') {
                    this.updateDriverMetrics();
                }
            } else if (e.key === this.STORAGE_KEYS.TRIPS) {
                if (this.currentTab === 'dashboard') {
                    this.loadDashboard();
                } else if (this.currentTab === 'recent-trips') {
                    this.loadRecentTripsTable();
                } else if (this.currentTab === 'trips') {
                    this.loadTripsTable();
                }
            }
        });

        // Window focus & session events to refresh avatar
        window.addEventListener('focus', () => {
            if (typeof sessionManager !== 'undefined') {
                sessionManager._initFromStorage();
            }
            this.setupUserMenu();
        });

        window.addEventListener('session:update', () => {
            this.setupUserMenu();
        });

        window.addEventListener('session:change', () => {
            this.setupUserMenu();
        });

        // Same-window/custom event sync
        window.addEventListener('goride:driver_location_changed', () => {
            this.renderOnlineDriversOnMap();
            if (this.currentTab === 'dashboard') {
                this.updateDriverMetrics();
            }
        });

        // Firebase Cloud Realtime Sync for Admin Portal
        if (window.realtimeSync && typeof window.realtimeSync.listenOnlineDrivers === 'function') {
            window.realtimeSync.listenOnlineDrivers((onlineList) => {
                try {
                    const mapObj = {};
                    (onlineList || []).forEach(d => {
                        if (d && (d.id || d.phone || d.plate)) {
                            mapObj[d.id || d.phone || d.plate] = d;
                        }
                    });
                    localStorage.setItem(this.STORAGE_KEYS.ONLINE_DRIVERS, JSON.stringify(mapObj));
                } catch (e) {}
                this.renderOnlineDriversOnMap();
                if (this.currentTab === 'dashboard') {
                    this.updateDriverMetrics();
                }
            });

            // Also sync trips from Firebase if connected
            if (window.realtimeSync.isAvailable && window.realtimeSync.isAvailable()) {
                try {
                    window.realtimeSync.db.ref('goride_trips').on('value', (snapshot) => {
                        const val = snapshot.val();
                        if (val && typeof val === 'object') {
                            const cloudTrips = Object.values(val);
                            const localTrips = this.getStoredTrips();
                            const tripMap = new Map();
                            localTrips.forEach(t => { if (t && t.id) tripMap.set(t.id, t); });
                            cloudTrips.forEach(t => { if (t && t.id) tripMap.set(t.id, { ...tripMap.get(t.id), ...t }); });
                            const merged = Array.from(tripMap.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                            this.saveStoredTrips(merged);
                            if (this.currentTab === 'dashboard') {
                                this.loadDashboard();
                            } else if (this.currentTab === 'recent-trips') {
                                this.loadRecentTripsTable();
                            } else if (this.currentTab === 'trips') {
                                this.loadTripsTable();
                            }
                        }
                    });

                    // Real-time listener for pending driver registrations
                    window.realtimeSync.db.ref('goride_pending_drivers').on('value', () => {
                        this.loadDriverApprovals();
                    });
                } catch (e) {}
            }
        }

        // Periodic light polling (every 3s) ensuring map stays live even across background tabs
        if (this.onlineDriversPollInterval) {
            clearInterval(this.onlineDriversPollInterval);
        }
        this.onlineDriversPollInterval = setInterval(() => {
            if (this.currentTab === 'dashboard' && this.map) {
                this.renderOnlineDriversOnMap();
            }
        }, 3000);
    }

    getOnlineDrivers() {
        const onlineDriversMap = new Map();
        const now = Date.now();

        const isValidOnline = (d) => {
            if (!d || d.isOnline !== true) return false;
            // TTL 120s: Lọc bỏ tài xế ma (stale drivers) không hoạt động quá 2 phút
            const lastTime = d.location?.updatedAt || (d.updatedAt ? new Date(d.updatedAt).getTime() : 0);
            if (lastTime && (now - lastTime > 120000)) return false;

            // Luôn ưu tiên tọa độ GPS thực tế từ beacon d.location
            const lat = Number(d.location?.lat !== undefined ? d.location.lat : d.lat);
            const lng = Number(d.location?.lng !== undefined ? d.location.lng : d.lng);
            if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return false;

            d.lat = lat;
            d.lng = lng;
            return true;
        };

        // 1. Read goride_online_drivers dictionary/array
        try {
            const rawOnline = localStorage.getItem(this.STORAGE_KEYS.ONLINE_DRIVERS);
            if (rawOnline) {
                const parsed = JSON.parse(rawOnline);
                const list = Array.isArray(parsed) ? parsed : Object.values(parsed);
                list.forEach(d => {
                    if (isValidOnline(d)) {
                        onlineDriversMap.set(d.id || d.phone || d.plate, d);
                    }
                });
            }
        } catch (err) {
            console.warn('[Admin] Error reading goride_online_drivers:', err);
        }

        // 2. Cross-check with goride_admin_drivers to include any active drivers flagged online with real coords
        try {
            const adminDrivers = this.getStoredDrivers();
            adminDrivers.forEach(d => {
                if (isValidOnline(d)) {
                    const key = d.id || d.phone || d.plate;
                    if (!onlineDriversMap.has(key)) {
                        onlineDriversMap.set(key, d);
                    } else {
                        const existing = onlineDriversMap.get(key);
                        onlineDriversMap.set(key, { ...d, ...existing, lat: d.lat, lng: d.lng });
                    }
                }
            });
        } catch (err) {
            console.warn('[Admin] Error cross-checking admin drivers:', err);
        }

        return Array.from(onlineDriversMap.values());
    }

    renderOnlineDriversOnMap() {
        if (!this.map || !this.driverMarkersLayer) return;

        const onlineDrivers = this.getOnlineDrivers();
        const badgeEl = document.getElementById('admin-map-online-badge');

        if (badgeEl) {
            if (onlineDrivers.length === 0) {
                badgeEl.className = 'badge badge-secondary';
                badgeEl.style.backgroundColor = '#64748b';
                badgeEl.style.color = '#ffffff';
                badgeEl.innerHTML = '⚪ 0 tài xế trực tuyến';
            } else {
                badgeEl.className = 'badge badge-success admin-map-badge';
                badgeEl.style.backgroundColor = '#10b981';
                badgeEl.style.color = '#ffffff';
                badgeEl.innerHTML = `🟢 ${onlineDrivers.length} tài xế trực tuyến`;
            }
        }

        // Clear previous driver markers on the map
        this.driverMarkersLayer.clearLayers();

        // If no drivers are currently online, nothing more to draw
        if (onlineDrivers.length === 0) return;

        // Render each online driver with custom vehicle marker, radar pulse, and info popup
        onlineDrivers.forEach(driver => {
            const vType = String(driver.vehicleType || driver.vehicle || '').toLowerCase();
            let markerClass = 'admin-driver-marker-car';
            let vehicleEmoji = '🚗';
            let vehicleLabel = driver.vehicleTypeName || 'Ô tô 4 chỗ (Navigo Car)';

            if (vType === 'bike' || vType === 'motorbike' || vType.includes('bike') || vType.includes('moto') || vType.includes('xe máy') || vType.includes('xe may')) {
                markerClass = 'admin-driver-marker-bike';
                vehicleEmoji = '🛵';
                vehicleLabel = driver.vehicleTypeName || 'Xe máy (Navigo Bike)';
            } else if (vType === 'car7' || vType === 'xl' || vType.includes('7 chỗ') || vType.includes('7 cho') || vType.includes('xl')) {
                markerClass = 'admin-driver-marker-car7';
                vehicleEmoji = '🚐';
                vehicleLabel = driver.vehicleTypeName || 'Ô tô 7 chỗ (Navigo XL)';
            } else if (vType === 'premium' || vType === 'car4_plus' || vType === 'plus' || vType.includes('plus') || vType.includes('sang')) {
                markerClass = 'admin-driver-marker-premium';
                vehicleEmoji = '🚘';
                vehicleLabel = driver.vehicleTypeName || 'Xe sang 4 chỗ (Navigo Plus)';
            }

            const markerHtml = `
                <div class="admin-driver-marker-wrap ${markerClass}">
                    <div class="admin-driver-radar-ping"></div>
                    <div class="admin-driver-icon-circle">
                        ${vehicleEmoji}
                    </div>
                    <div class="admin-driver-label-chip">
                        <span class="pulse-dot"></span>
                        <span>${this.escapeHtml(driver.name || 'Tài xế')} &bull; ${this.escapeHtml(driver.plate || '--')}</span>
                    </div>
                </div>
            `;

            const customIcon = L.divIcon({
                html: markerHtml,
                className: 'custom-admin-driver-marker-container',
                iconSize: [42, 68],
                iconAnchor: [21, 24],
                popupAnchor: [0, -26]
            });

            const marker = L.marker([driver.lat, driver.lng], {
                icon: customIcon,
                title: `${driver.name} (${driver.plate}) - Đang trực tuyến`
            });

            const updatedTimeStr = driver.updatedAt ? new Date(driver.updatedAt).toLocaleTimeString('vi-VN') : 'Vừa xong';

            const popupContent = `
                <div class="admin-driver-popup">
                    <div class="admin-popup-header">
                        <div class="admin-popup-avatar">${vehicleEmoji}</div>
                        <div style="flex:1; overflow:hidden;">
                            <div class="admin-popup-name">${this.escapeHtml(driver.name || 'Tài xế GoRide')}</div>
                            <div class="admin-popup-badge-online">🟢 Đang trực tuyến (Sẵn sàng)</div>
                        </div>
                    </div>
                    <div class="admin-popup-body">
                        <div class="admin-popup-row">
                            <span class="admin-popup-lbl">Số điện thoại:</span>
                            <span class="admin-popup-val"><a href="tel:${this.escapeHtml(driver.phone || '')}" style="color:var(--color-primary); font-weight:700; text-decoration:none;">${this.escapeHtml(driver.phone || '--')}</a></span>
                        </div>
                        <div class="admin-popup-row">
                            <span class="admin-popup-lbl">Loại xe:</span>
                            <span class="admin-popup-val">${this.escapeHtml(vehicleLabel)}</span>
                        </div>
                        <div class="admin-popup-row">
                            <span class="admin-popup-lbl">Biển số:</span>
                            <span class="admin-popup-val" style="background:#f1f5f9; padding:2px 8px; border-radius:6px; font-weight:700; font-family:monospace; color:#0f172a;">${this.escapeHtml(driver.plate || '--')}</span>
                        </div>
                        ${driver.model ? `
                        <div class="admin-popup-row">
                            <span class="admin-popup-lbl">Dòng xe:</span>
                            <span class="admin-popup-val" style="color:#475569;">${this.escapeHtml(driver.model)}</span>
                        </div>
                        ` : ''}
                        <div class="admin-popup-row">
                            <span class="admin-popup-lbl">Tọa độ GPS:</span>
                            <span class="admin-popup-val" style="color:#0284c7; font-weight:700; font-family:monospace;">${driver.lat.toFixed(6)}, ${driver.lng.toFixed(6)}</span>
                        </div>
                        <div class="admin-popup-row" style="align-items:flex-start;">
                            <span class="admin-popup-lbl">Địa chỉ:</span>
                            <span class="admin-popup-val" style="font-size:11px; max-width:170px; text-align:right; color:#475569; word-break:break-word;">${this.escapeHtml(driver.address || 'TP. Hồ Chí Minh')}</span>
                        </div>
                        <div class="admin-popup-row" style="margin-top:8px; padding-top:6px; border-top:1px dashed #e2e8f0; font-size:11px; color:#94a3b8;">
                            <span>Cập nhật GPS:</span>
                            <span style="font-weight:600; color:#64748b;">${updatedTimeStr}</span>
                        </div>
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent, { maxWidth: 320, minWidth: 260 });
            marker.addTo(this.driverMarkersLayer);
        });
    }

    focusOnOnlineDrivers() {
        if (!this.map) return;
        const onlineDrivers = this.getOnlineDrivers();
        if (!onlineDrivers || onlineDrivers.length === 0) {
            this.showToast('Hiện chưa có tài xế nào trực tuyến trong khu vực.', 'info');
            return;
        }

        if (onlineDrivers.length === 1) {
            const d = onlineDrivers[0];
            this.map.setView([d.lat, d.lng], 16, { animate: true });
            this.showToast(`Đã định vị tài xế: ${d.name} (${d.plate || 'GPS'})`, 'success');
        } else {
            const bounds = L.latLngBounds(onlineDrivers.map(d => [d.lat, d.lng]));
            this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            this.showToast(`Đã định vị ${onlineDrivers.length} tài xế đang trực tuyến`, 'success');
        }
    }

    updateDriverMetrics() {
        const drivers = this.getStoredDrivers();
        const onlineDrivers = this.getOnlineDrivers();
        const activeDrivers = drivers.filter(d => d.status === 'active').length;

        const statActive = document.getElementById('stat-active-drivers');
        if (statActive) {
            statActive.textContent = Number(activeDrivers).toLocaleString('vi-VN');
        }

        const trendDrivers = document.getElementById('stat-drivers-trend');
        if (trendDrivers) {
            trendDrivers.innerHTML = `● ${onlineDrivers.length} trực tuyến`;
            trendDrivers.className = onlineDrivers.length > 0 ? 'stat-card-trend trend-up' : 'stat-card-trend';
        }
    }

    /* ==========================================================================
       TAB & NAVIGATION
       ========================================================================== */

    setupTabNavigation() {
        document.querySelectorAll('[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        window.location.hash = tabName;

        // Nav active state
        document.querySelectorAll('[data-tab]').forEach(link => {
            const isActive = link.getAttribute('data-tab') === tabName;
            link.classList.toggle('active', isActive);
            link.classList.toggle('nav-item-active', isActive);
        });

        // Show/hide tabs
        ['dashboard', 'recent-trips', 'trips', 'drivers'].forEach(t => {
            const el = document.getElementById('tab-' + t);
            if (el) el.style.display = (t === tabName) ? '' : 'none';
        });

        // Load data on switch
        if (tabName === 'dashboard') {
            this.loadDashboard();
            if (this.map) {
                setTimeout(() => {
                    this.map.invalidateSize();
                    this.renderOnlineDriversOnMap();
                }, 150);
            }
        } else if (tabName === 'recent-trips') {
            this.loadRecentTripsTable();
        } else if (tabName === 'trips') {
            this.loadTripsTable();
        } else if (tabName === 'drivers') {
            this.loadDriversList();
            this.loadDriverApprovals();
        }

        // Close mobile drawer
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (sidebar) sidebar.classList.remove('is-open');
        if (backdrop) backdrop.classList.remove('is-active');
    }

    setupSidebarToggle() {
        const toggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');

        if (toggle && sidebar) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = sidebar.classList.toggle('is-open');
                if (backdrop) backdrop.classList.toggle('is-active', isOpen);
            });
        }
        if (backdrop && sidebar) {
            backdrop.addEventListener('click', () => {
                sidebar.classList.remove('is-open');
                backdrop.classList.remove('is-active');
            });
        }
    }

    setupUserMenu() {
        const menuBtn = document.getElementById('user-menu-btn');
        const dropdown = document.getElementById('user-menu-dropdown');
        if (menuBtn && dropdown) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = dropdown.style.display === 'none' || !dropdown.style.display;
                dropdown.style.display = isHidden ? 'block' : 'none';
            });
            document.addEventListener('click', () => {
                dropdown.style.display = 'none';
            });
        }
        if (typeof sessionManager !== 'undefined') {
            const user = sessionManager.getUser();
            const nameEl = document.getElementById('admin-user-name');
            if (user && nameEl) {
                nameEl.textContent = user.name || 'Quản trị viên';
            }
            const avatarEl = document.getElementById('admin-user-avatar');
            if (user && avatarEl) {
                const avatarSrc = user.avatar || user.avatar_path;
                if (avatarSrc) {
                    avatarEl.innerHTML = `<img src="${avatarSrc}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block;">`;
                    avatarEl.style.overflow = 'hidden';
                    avatarEl.style.padding = '0';
                } else {
                    avatarEl.textContent = (user.name || 'A').charAt(0).toUpperCase();
                }
            }
        }
    }

    setupLogout() {
        document.querySelectorAll('[data-action="logout"]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof sessionManager !== 'undefined') {
                    sessionManager.logout();
                }
                window.location.href = 'login.html';
            });
        });
    }

    /* ==========================================================================
       DASHBOARD METRICS & RECENT TRIPS (DYNAMIC REAL METRICS)
       ========================================================================== */

    async loadDashboard() {
        try {
            const trips = this.getStoredTrips();
            const drivers = this.getStoredDrivers();
            const onlineDrivers = this.getOnlineDrivers();

            // 100% Real KPI calculation based strictly on actual data
            const totalRides = trips.length;
            const activeDrivers = drivers.filter(d => d.status === 'active').length;
            const calculatedRevenue = trips
                .filter(t => t.status === 'completed')
                .reduce((sum, t) => sum + (Number(t.fare) || 0), 0);

            // Real unique customers
            const customerSet = new Set();
            trips.forEach(t => {
                if (t.customerPhone) customerSet.add(t.customerPhone);
                else if (t.customerName) customerSet.add(t.customerName);
            });
            const newCustomers = customerSet.size;

            // Render KPI cards
            const setStat = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            };

            setStat('stat-total-rides', Number(totalRides).toLocaleString('vi-VN'));
            setStat('stat-active-drivers', Number(activeDrivers).toLocaleString('vi-VN'));
            setStat('stat-revenue', Number(calculatedRevenue).toLocaleString('vi-VN') + ' ₫');
            setStat('stat-customers', Number(newCustomers).toLocaleString('vi-VN'));

            const trendDrivers = document.getElementById('stat-drivers-trend');
            if (trendDrivers) {
                trendDrivers.innerHTML = `● ${onlineDrivers.length} trực tuyến`;
                trendDrivers.className = onlineDrivers.length > 0 ? 'stat-card-trend trend-up' : 'stat-card-trend';
            }

            // Update badge counts in sidebar
            const recentTripsBadge = document.getElementById('sidebar-recent-trips-count');
            if (recentTripsBadge) recentTripsBadge.textContent = trips.length;

            const tripsBadge = document.getElementById('sidebar-trips-count');
            if (tripsBadge) tripsBadge.textContent = trips.length;

            const driversBadge = document.getElementById('sidebar-drivers-count');
            if (driversBadge) driversBadge.textContent = drivers.length;

            // Render Recent Trips Table
            this.loadRecentTripsTable();

            // Render spatial online drivers on Leaflet map
            this.renderOnlineDriversOnMap();
        } catch (err) {
            console.error('[Admin] Error loading dashboard:', err);
        }
    }

    /* ==========================================================================
       RECENT TRIPS MANAGEMENT (REAL-TIME ACTIVITY FEED)
       ========================================================================== */

    setupRecentTripFilters() {
        const searchInput = document.getElementById('recent-trip-search-input');
        const statusFilter = document.getElementById('recent-trip-status-filter');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterRecentTrips());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterRecentTrips());
        }
    }

    loadRecentTripsTable() {
        const trips = this.getStoredTrips();
        // Sort newest first
        const sorted = [...trips].sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
        });
        this.recentTripsData = sorted;

        const badge = document.getElementById('sidebar-recent-trips-count');
        if (badge) badge.textContent = sorted.length;

        this.filterRecentTrips();
    }

    filterRecentTrips() {
        const searchInput = document.getElementById('recent-trip-search-input');
        const statusFilter = document.getElementById('recent-trip-status-filter');
        const countText = document.getElementById('recent-trip-count-text');

        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const status = statusFilter ? statusFilter.value : 'all';

        let filtered = this.recentTripsData || this.getStoredTrips();

        if (status !== 'all') {
            filtered = filtered.filter(t => t.status === status);
        }

        if (query) {
            filtered = filtered.filter(t =>
                (t.id && String(t.id).toLowerCase().includes(query)) ||
                (t.customerName && t.customerName.toLowerCase().includes(query)) ||
                (t.driverName && t.driverName.toLowerCase().includes(query)) ||
                (t.pickup && t.pickup.toLowerCase().includes(query)) ||
                (t.destination && t.destination.toLowerCase().includes(query))
            );
        }

        if (countText) {
            countText.textContent = `Hiển thị ${filtered.length} chuyến gần đây`;
        }

        this.renderRecentTrips(filtered);
    }

    resetRecentTripFilters() {
        const searchInput = document.getElementById('recent-trip-search-input');
        const statusFilter = document.getElementById('recent-trip-status-filter');
        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = 'all';
        this.filterRecentTrips();
    }

    renderRecentTrips(trips) {
        const tbody = document.getElementById('recent-trips-body');
        if (!tbody) return;

        if (!trips || trips.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding:28px; color:var(--color-gray-500);">Chưa có chuyến đi nào được tạo trên hệ thống.</td></tr>';
            return;
        }

        tbody.innerHTML = trips.map(t => {
            const badge = this.getStatusBadge(t.status);
            const fareFormatted = Number(t.fare || 0).toLocaleString('vi-VN') + ' ₫';
            const timeFormatted = t.createdAt ? new Date(t.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Vừa xong';
            const pickupShort = t.pickup ? this.escapeHtml(t.pickup) : '--';
            const dropoffShort = t.destination ? this.escapeHtml(t.destination) : '--';

            return `
                <tr>
                    <td style="font-weight:700; color:var(--color-primary); font-family:monospace;">#${t.id}</td>
                    <td style="font-size:0.8rem; color:var(--color-gray-500); white-space:nowrap;">${timeFormatted}</td>
                    <td style="font-weight:600;">${this.escapeHtml(t.customerName || '--')}</td>
                    <td>${t.driverName ? this.escapeHtml(t.driverName) : '<span style="color:var(--color-gray-400);">Chưa gán</span>'}</td>
                    <td style="font-size:0.82rem; max-width:240px; line-height:1.4;">
                        <div style="color:var(--color-gray-700);"><strong style="color:#059669;">Đón:</strong> ${pickupShort}</div>
                        <div style="color:var(--color-gray-700);"><strong style="color:#e11d48;">Đến:</strong> ${dropoffShort}</div>
                    </td>
                    <td><span class="badge ${badge.cls}">${badge.label}</span></td>
                    <td style="font-weight:700; color:#0f766e;">${fareFormatted}</td>
                    <td style="text-align:right;">
                        <div class="table-actions">
                            <button class="btn-action-edit" onclick="adminController.openEditTripModal('${t.id}')">✏️ Sửa</button>
                            <button class="btn-action-delete" onclick="adminController.openDeleteModal('trip', '${t.id}')">🗑️ Xóa</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /* ==========================================================================
       TRIPS MANAGEMENT (FULL REAL CRUD)
       ========================================================================== */

    setupTripFilters() {
        const searchInput = document.getElementById('trip-search-input');
        const statusFilter = document.getElementById('trip-status-filter');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterTrips());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterTrips());
        }
    }

    resetTripFilters() {
        const searchInput = document.getElementById('trip-search-input');
        const statusFilter = document.getElementById('trip-status-filter');
        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = 'all';
        this.filterTrips();
    }

    filterTrips() {
        const searchInput = document.getElementById('trip-search-input');
        const statusFilter = document.getElementById('trip-status-filter');

        const query = (searchInput?.value || '').toLowerCase().trim();
        const status = statusFilter?.value || 'all';

        const allTrips = this.getStoredTrips();
        const filtered = allTrips.filter(t => {
            const matchStatus = (status === 'all') || (t.status === status);
            const matchQuery = !query || 
                (t.id && t.id.toLowerCase().includes(query)) ||
                (t.customerName && t.customerName.toLowerCase().includes(query)) ||
                (t.driverName && t.driverName.toLowerCase().includes(query)) ||
                (t.pickup && t.pickup.toLowerCase().includes(query)) ||
                (t.destination && t.destination.toLowerCase().includes(query));
            return matchStatus && matchQuery;
        });

        this.renderAllTripsTable(filtered);
    }

    loadTripsTable() {
        const trips = this.getStoredTrips();
        this.renderAllTripsTable(trips);
    }

    renderAllTripsTable(trips) {
        const tbody = document.getElementById('all-trips-body');
        const countText = document.getElementById('trip-count-text');
        if (countText) countText.textContent = `Hiển thị ${trips.length} chuyến`;

        if (!tbody) return;

        if (!trips || trips.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding:28px; color:var(--color-gray-500);">Chưa có chuyến đi nào trong hệ thống.</td></tr>';
            return;
        }

        tbody.innerHTML = trips.map(t => {
            const badge = this.getStatusBadge(t.status);
            const fareFormatted = Number(t.fare || 0).toLocaleString('vi-VN') + ' ₫';
            return `
                <tr>
                    <td style="font-weight:700; color:var(--color-primary); font-family:monospace;">#${t.id}</td>
                    <td>
                        <div style="font-weight:600;">${t.customerName || '--'}</div>
                        <div style="font-size:0.75rem; color:var(--color-gray-500);">${t.customerPhone || ''}</div>
                    </td>
                    <td>${t.driverName || '<span style="color:var(--color-gray-400);">Chưa gán</span>'}</td>
                    <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis;" title="${t.pickup || ''}">${t.pickup || '--'}</td>
                    <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis;" title="${t.destination || ''}">${t.destination || '--'}</td>
                    <td><span class="badge ${badge.cls}">${badge.label}</span></td>
                    <td style="font-weight:700; color:#0f766e;">${fareFormatted}</td>
                    <td style="text-align:right;">
                        <div class="table-actions">
                            <button class="btn-action-edit" onclick="adminController.openEditTripModal('${t.id}')">✏️ Sửa</button>
                            <button class="btn-action-delete" onclick="adminController.openDeleteModal('trip', '${t.id}')">🗑️ Xóa</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    openAddTripModal() {
        document.getElementById('modal-trip-title').textContent = 'Thêm chuyến đi mới';
        document.getElementById('form-trip').reset();
        document.getElementById('trip-form-id').value = '';
        document.getElementById('trip-form-fare').value = 45000;
        document.getElementById('trip-form-status').value = 'requested';
        this.openModal('modal-trip');
    }

    openEditTripModal(tripId) {
        const trips = this.getStoredTrips();
        const trip = trips.find(t => t.id === tripId);
        if (!trip) return;

        document.getElementById('modal-trip-title').textContent = `Chỉnh sửa chuyến đi #${trip.id}`;
        document.getElementById('trip-form-id').value = trip.id;
        document.getElementById('trip-form-customer').value = trip.customerName || '';
        document.getElementById('trip-form-phone').value = trip.customerPhone || '';
        document.getElementById('trip-form-driver').value = trip.driverName || '';
        document.getElementById('trip-form-pickup').value = trip.pickup || '';
        document.getElementById('trip-form-dest').value = trip.destination || '';
        document.getElementById('trip-form-fare').value = trip.fare || 40000;
        document.getElementById('trip-form-status').value = trip.status || 'requested';

        this.openModal('modal-trip');
    }

    saveTrip(e) {
        e.preventDefault();
        const idInput = document.getElementById('trip-form-id').value;
        const customerName = document.getElementById('trip-form-customer').value.trim();
        const customerPhone = document.getElementById('trip-form-phone').value.trim();
        const driverName = document.getElementById('trip-form-driver').value.trim();
        const pickup = document.getElementById('trip-form-pickup').value.trim();
        const destination = document.getElementById('trip-form-dest').value.trim();
        const fare = Number(document.getElementById('trip-form-fare').value) || 30000;
        const status = document.getElementById('trip-form-status').value;

        let trips = this.getStoredTrips();

        if (idInput) {
            // Edit existing trip
            const idx = trips.findIndex(t => t.id === idInput);
            if (idx !== -1) {
                trips[idx] = {
                    ...trips[idx],
                    customerName,
                    customerPhone,
                    driverName,
                    pickup,
                    destination,
                    fare,
                    status,
                    updatedAt: new Date().toISOString()
                };
                this.showToast(`Đã cập nhật chuyến đi #${idInput} thành công!`, 'success');
            }
        } else {
            // Add new trip
            const newId = 'TRP-' + Math.floor(10000 + Math.random() * 90000);
            const newTrip = {
                id: newId,
                customerName,
                customerPhone,
                driverName: driverName || 'Chưa gán',
                pickup,
                destination,
                fare,
                status,
                createdAt: new Date().toISOString()
            };
            trips.unshift(newTrip);
            this.showToast(`Đã thêm mới chuyến đi #${newId}!`, 'success');
        }

        this.saveStoredTrips(trips);
        this.closeModal('modal-trip');
        this.loadTripsTable();
        this.loadDashboard();
    }

    /* ==========================================================================
       DRIVERS MANAGEMENT (FULL CRUD & REAL DRIVER APPROVALS)
       ========================================================================== */

    loadDriversList() {
        const drivers = this.getStoredDrivers();
        const tbody = document.getElementById('registered-drivers-body');
        const countText = document.getElementById('registered-drivers-count');
        if (countText) countText.textContent = `Tổng cộng: ${drivers.length} tài xế`;

        if (!tbody) return;

        if (!drivers || drivers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:28px; color:var(--color-gray-500);">Chưa có tài xế nào trong hệ thống.</td></tr>';
            return;
        }

        tbody.innerHTML = drivers.map(d => {
            const statusBadge = {
                'active': '<span class="badge badge-success">Hoạt động</span>',
                'offline': '<span class="badge badge-info">Ngoại tuyến</span>',
                'pending': '<span class="badge badge-warning">Chờ duyệt</span>',
                'locked': '<span class="badge badge-danger">Bị khóa</span>'
            }[d.status] || `<span class="badge badge-info">${d.status}</span>`;

            return `
                <tr>
                    <td style="font-weight:700; color:var(--color-primary); font-family:monospace;">${d.id}</td>
                    <td style="font-weight:600;">${d.name}</td>
                    <td>
                        <div>📞 ${d.phone || '--'}</div>
                        <div style="font-size:0.75rem; color:var(--color-gray-500);">✉️ ${d.email || '--'}</div>
                    </td>
                    <td>${d.vehicleTypeName || d.vehicleType || 'Ô tô'}</td>
                    <td style="font-weight:700; color:var(--color-primary);">${d.plate || '--'}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align:right;">
                        <div class="table-actions">
                            <button class="btn-action-edit" onclick="adminController.openEditDriverModal('${d.id}')">✏️ Sửa</button>
                            <button class="btn-action-delete" onclick="adminController.openDeleteModal('driver', '${d.id}')">🗑️ Xóa</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    openAddDriverModal() {
        document.getElementById('modal-driver-title').textContent = 'Thêm tài xế mới';
        document.getElementById('form-driver').reset();
        document.getElementById('driver-form-id').value = '';
        document.getElementById('driver-form-exp').value = 3;
        document.getElementById('driver-form-status').value = 'active';
        this.openModal('modal-driver');
    }

    openEditDriverModal(driverId) {
        const drivers = this.getStoredDrivers();
        const driver = drivers.find(d => d.id === driverId);
        if (!driver) return;

        document.getElementById('modal-driver-title').textContent = `Chỉnh sửa tài xế: ${driver.name}`;
        document.getElementById('driver-form-id').value = driver.id;
        document.getElementById('driver-form-name').value = driver.name || '';
        document.getElementById('driver-form-email').value = driver.email || '';
        document.getElementById('driver-form-phone').value = driver.phone || '';
        const vType = driver.vehicleType || 'motorbike';
        document.getElementById('driver-form-vtype').value = (vType === 'motorbike') ? 'bike' : vType;
        document.getElementById('driver-form-plate').value = driver.plate || '';
        document.getElementById('driver-form-exp').value = driver.experience || 3;
        document.getElementById('driver-form-status').value = driver.status || 'active';

        this.openModal('modal-driver');
    }

    saveDriver(e) {
        e.preventDefault();
        const idInput = document.getElementById('driver-form-id').value;
        const name = document.getElementById('driver-form-name').value.trim();
        const email = document.getElementById('driver-form-email').value.trim();
        const phone = document.getElementById('driver-form-phone').value.trim();
        const vehicleType = document.getElementById('driver-form-vtype').value;
        const plate = document.getElementById('driver-form-plate').value.trim();
        const experience = Number(document.getElementById('driver-form-exp').value) || 1;
        const status = document.getElementById('driver-form-status').value;

        const isBike = (vehicleType === 'bike' || vehicleType === 'motorbike');
        const vehicleTypeName = isBike ? 'Xe máy (GoRide Bike)' : (vehicleType === 'car7' ? 'Ô tô 7 chỗ (GoRide XL)' : 'Ô tô 4 chỗ (GoRide Car)');

        let drivers = this.getStoredDrivers();

        if (idInput) {
            // Edit driver
            const idx = drivers.findIndex(d => d.id === idInput);
            if (idx !== -1) {
                drivers[idx] = {
                    ...drivers[idx],
                    name,
                    email,
                    phone,
                    vehicleType,
                    vehicleTypeName,
                    plate,
                    experience,
                    status
                };
                this.showToast(`Đã cập nhật thông tin tài xế ${name}!`, 'success');
            }
        } else {
            // Add new driver
            const newId = 'drv_' + Math.floor(1000 + Math.random() * 9000);
            const newDriver = {
                id: newId,
                name,
                email,
                phone,
                vehicleType,
                vehicleTypeName,
                plate,
                experience,
                status,
                createdAt: new Date().toISOString()
            };
            drivers.unshift(newDriver);
            this.showToast(`Đã thêm mới tài xế ${name} vào hệ thống!`, 'success');
        }

        this.saveStoredDrivers(drivers);
        this.closeModal('modal-driver');
        this.loadDriversList();
        this.loadDashboard();
    }

    async loadDriverApprovals() {
        const container = document.getElementById('driver-approvals');
        const badge = document.getElementById('pending-drivers-count');
        if (!container) return;

        let pendingList = [];

        // 1. Check live backend
        if (typeof apiClient !== 'undefined') {
            try {
                const res = await apiClient.getPendingDrivers();
                if (res && res.data && Array.isArray(res.data.drivers)) {
                    pendingList = res.data.drivers;
                }
            } catch (err) {
                console.warn('[Admin] Live API pending drivers check:', err.message);
            }
        }

        // 2. Combine with real registered applicants in Firebase & localStorage
        if (window.realtimeSync && window.realtimeSync.isAvailable()) {
            try {
                const snap = await window.realtimeSync.db.ref('goride_pending_drivers').once('value');
                const cloudPending = snap.val() || {};
                Object.values(cloudPending).forEach(cp => {
                    if (cp && !pendingList.some(p => p.id === cp.id || (cp.email && p.email === cp.email))) {
                        pendingList.push(cp);
                    }
                });
            } catch (e) {}
        }

        const localPending = this.getPendingDrivers();
        localPending.forEach(lp => {
            if (!pendingList.some(p => p.id === lp.id || p.email === lp.email)) {
                pendingList.push(lp);
            }
        });

        if (badge) badge.textContent = pendingList.length;

        // If no real applicants, show clean empty state (ZERO fake mock applicants!)
        if (pendingList.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:28px 16px; text-align:center; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
                    <div style="font-size:2rem; margin-bottom:6px;">✨</div>
                    <p style="font-weight:600; color:var(--color-gray-700); margin:0;">Không có hồ sơ tài xế nào đang chờ duyệt.</p>
                    <p style="font-size:0.8rem; color:var(--color-gray-500); margin:4px 0 0 0;">Khi có người đăng ký tài xế trên web, hồ sơ thực tế sẽ lập tức xuất hiện tại đây để Quản trị viên duyệt.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = pendingList.map(driver => {
            const vLabel = (driver.vehicleType === 'bike' || driver.vehicleType === 'motorbike') ? '🏍️ Xe máy' : '🚗 Ô tô';
            return `
                <div class="card" style="margin-bottom:12px; padding:16px; border:1px solid var(--color-gray-200); border-radius:12px; background:#fff;" id="approval-${driver.id}">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                        <div>
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                                <h4 style="margin:0; font-size:1.05rem;">${driver.name}</h4>
                                <span class="badge badge-warning" style="font-size:0.75rem;">Chờ duyệt</span>
                                <span style="font-size:0.75rem; color:var(--color-gray-500); font-family:monospace;">ID: ${driver.id}</span>
                            </div>
                            <p style="color:var(--color-gray-600); font-size:0.875rem; margin:2px 0;">
                                ✉️ ${driver.email} &bull; 📞 ${driver.phone}
                            </p>
                            <p style="color:var(--color-gray-700); font-size:0.85rem; margin:2px 0; font-weight:500;">
                                ${vLabel} &bull; Biển số: <strong style="color:var(--color-primary);">${driver.plate || driver.licensePlate || '---'}</strong> &bull; Kinh nghiệm: ${driver.experienceYears || driver.experience || 1} năm
                            </p>
                        </div>
                        <div class="approval-actions" style="display:flex; gap:8px;">
                            <button class="btn btn-success btn-sm btn-approve" onclick="adminController.approveDriver('${driver.id}', true)">
                                ✓ Duyệt hồ sơ
                            </button>
                            <button class="btn btn-danger btn-sm btn-reject" onclick="adminController.approveDriver('${driver.id}', false)">
                                ✕ Từ chối
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async approveDriver(driverId, approved) {
        if (this.isProcessingApproval.has(driverId)) return;
        this.isProcessingApproval.add(driverId);

        const card = document.getElementById('approval-' + driverId);
        if (card) {
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';
        }

        try {
            // 1. Call backend API endpoint
            if (typeof apiClient !== 'undefined') {
                try {
                    if (approved) await apiClient.approveDriver(driverId);
                    else await apiClient.rejectDriver(driverId);
                } catch (e) {
                    console.warn('[Admin] Backend approval call:', e.message);
                }
            }

            // 2. Read pending list & find applicant
            let pending = this.getPendingDrivers();
            const applicant = pending.find(d => d.id === driverId);

            // 3. Update real registered users in goride_offline_users
            try {
                const users = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USERS) || '[]');
                const uIdx = users.findIndex(u => u.id === driverId || (applicant && u.email === applicant.email));
                if (uIdx !== -1) {
                    users[uIdx].status = approved ? 'active' : 'rejected';
                    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
                }
            } catch (err) {}

            // 4. If approved, add to active registered drivers pool
            if (approved && applicant) {
                const drivers = this.getStoredDrivers();
                if (!drivers.some(d => d.id === driverId)) {
                    const vType = applicant.vehicleType || 'motorbike';
                    const isBike = (vType === 'bike' || vType === 'motorbike');
                    const vLabel = isBike ? 'Xe máy (GoRide Bike)' : (vType === 'car7' ? 'Ô tô 7 chỗ (GoRide XL)' : 'Ô tô 4 chỗ (GoRide Car)');
                    drivers.unshift({
                        id: driverId,
                        name: applicant.name,
                        email: applicant.email,
                        phone: applicant.phone,
                        vehicleType: vType,
                        vehicleTypeName: vLabel,
                        plate: applicant.plate || applicant.licensePlate || '--',
                        experience: applicant.experienceYears || applicant.experience || 1,
                        status: 'active',
                        createdAt: applicant.createdAt || new Date().toISOString()
                    });
                    this.saveStoredDrivers(drivers);
                    this.loadDriversList();
                }
            }

            // 5. Remove from pending list & sync to Firebase
            pending = pending.filter(d => d.id !== driverId);
            this.savePendingDrivers(pending);

            if (window.realtimeSync && window.realtimeSync.isAvailable()) {
                try {
                    await window.realtimeSync.db.ref(`goride_pending_drivers/${driverId}`).remove();
                    await window.realtimeSync.db.ref(`goride_drivers/${driverId}`).update({
                        status: approved ? 'active' : 'rejected',
                        updatedAt: new Date().toISOString()
                    });
                    await window.realtimeSync.db.ref(`goride_users/${driverId}`).update({
                        status: approved ? 'active' : 'rejected',
                        updatedAt: new Date().toISOString()
                    });
                    if (applicant && applicant.email) {
                        try {
                            const uSnap = await window.realtimeSync.db.ref('goride_users').once('value');
                            const allUsers = uSnap.val() || {};
                            for (const k of Object.keys(allUsers)) {
                                if (allUsers[k] && allUsers[k].email && allUsers[k].email.toLowerCase() === applicant.email.toLowerCase()) {
                                    await window.realtimeSync.db.ref(`goride_users/${k}`).update({
                                        status: approved ? 'active' : 'rejected',
                                        updatedAt: new Date().toISOString()
                                    });
                                }
                            }
                        } catch (e) {}
                    }
                } catch (e) {}
            }

            this.showToast(approved 
                ? `Đã phê duyệt tài xế thành công! Tài khoản đã được kích hoạt.` 
                : 'Đã từ chối hồ sơ đăng ký tài xế.', 
                approved ? 'success' : 'info'
            );

            if (card) card.remove();
            
            // Reload badge and lists
            this.loadDriverApprovals();
            this.loadDashboard();
        } catch (err) {
            this.showToast('Lỗi xử lý duyệt: ' + err.message, 'error');
            if (card) {
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';
            }
        } finally {
            this.isProcessingApproval.delete(driverId);
        }
    }

    /* ==========================================================================
       DELETE CONFIRMATION DIALOG (FOR TRIPS & DRIVERS)
       ========================================================================== */

    openDeleteModal(type, id) {
        this.deleteTarget = { type, id };
        const msgEl = document.getElementById('delete-modal-msg');
        if (msgEl) {
            msgEl.textContent = type === 'trip' 
                ? `Bạn có chắc chắn muốn xóa chuyến đi #${id} khỏi hệ thống dữ liệu?`
                : `Bạn có chắc chắn muốn xóa tài xế #${id} khỏi danh sách?`;
        }

        const confirmBtn = document.getElementById('btn-confirm-delete');
        if (confirmBtn) {
            confirmBtn.onclick = () => this.confirmDelete();
        }

        this.openModal('modal-delete');
    }

    confirmDelete() {
        if (!this.deleteTarget) return;
        const { type, id } = this.deleteTarget;

        if (type === 'trip') {
            let trips = this.getStoredTrips();
            trips = trips.filter(t => t.id !== id);
            this.saveStoredTrips(trips);
            this.loadTripsTable();
            this.loadDashboard();
            this.showToast(`Đã xóa chuyến đi #${id} thành công!`, 'info');
        } else if (type === 'driver') {
            let drivers = this.getStoredDrivers();
            drivers = drivers.filter(d => d.id !== id);
            this.saveStoredDrivers(drivers);
            this.loadDriversList();
            this.loadDashboard();
            this.showToast(`Đã xóa tài xế #${id} thành công!`, 'info');
        }

        this.closeModal('modal-delete');
        this.deleteTarget = null;
    }

    /* ==========================================================================
       MODAL CONTROLS & UTILITIES
       ========================================================================== */

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('is-active');
            modal.style.display = 'flex';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('is-active');
            modal.style.display = 'none';
        }
    }

    getStatusBadge(status) {
        const map = {
            'completed': { label: 'Hoàn thành', cls: 'badge-success' },
            'in_progress': { label: 'Đang di chuyển', cls: 'badge-primary' },
            'accepted': { label: 'Đã nhận', cls: 'badge-primary' },
            'requested': { label: 'Đang tìm xe', cls: 'badge-warning' },
            'cancelled': { label: 'Đã hủy', cls: 'badge-danger' }
        };
        return map[status] || { label: status || 'Chờ', cls: 'badge-info' };
    }

    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    showToast(message, type = 'info') {
        if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
            App.showToast(message, type);
            return;
        }
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            padding: 12px 18px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#0288d1'};
            color: #ffffff;
            border-radius: 8px;
            margin-bottom: 8px;
            font-size: 0.875rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: fadeIn 0.2s;
        `;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }
}

// Global initialization
let adminController;
document.addEventListener('DOMContentLoaded', () => {
    adminController = new AdminController();
    adminController.init();
});
