/**
 * GoRide Admin Controller - Modern Unified Architecture
 * Full Real-Data CRUD for Trips & Drivers, Live Leaflet Spatial Map,
 * Real Driver Approval Workflow, Dynamic KPI Calculation (Zero Mock/Fake Data).
 */

class AdminController {
    constructor() {
        this.map = null;
        this.driverMarkersLayer = null;
        this.driverMarkersMap = new Map();
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
            USERS: 'goride_offline_users',
            DELETED_TRIPS: 'goride_deleted_trip_ids',
            DELETED_USERS: 'goride_deleted_user_ids'
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
        this.cleanGhostPendingDrivers();

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
        this.setupCloudSyncDiagnostics();

        // 5. Load Initial Dashboard Data & Tables
        await this.loadDriverApprovals();
        await this.loadDriversList();
        await this.loadDashboard();
        this.loadRecentTripsTable();
        this.loadTripsTable();
        this.loadCustomers();
        this.setupCustomerFilters();

        // 6. Handle URL Hash for tabs
        const hash = window.location.hash.replace('#', '');
        if (hash && ['dashboard', 'recent-trips', 'trips', 'drivers', 'customers'].includes(hash)) {
            this.switchTab(hash);
        }

        console.log('[AdminController] Admin portal initialized with 100% real data.');
    }

    /* ==========================================================================
       STORAGE ACCESSORS (100% REAL DATA - NO FAKE SEEDS)
       ========================================================================== */

    getDeletedTripIds() {
        try {
            const ids = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.DELETED_TRIPS));
            return Array.isArray(ids) ? ids : [];
        } catch {
            return [];
        }
    }

    addDeletedTripId(id) {
        if (!id) return;
        const ids = this.getDeletedTripIds();
        if (!ids.includes(id)) {
            ids.push(id);
            localStorage.setItem(this.STORAGE_KEYS.DELETED_TRIPS, JSON.stringify(ids));
        }
    }

    getDeletedUserIds() {
        try {
            const ids = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.DELETED_USERS));
            return Array.isArray(ids) ? ids : [];
        } catch {
            return [];
        }
    }

    addDeletedUserId(id) {
        if (!id) return;
        const ids = this.getDeletedUserIds();
        if (!ids.includes(id)) {
            ids.push(id);
            localStorage.setItem(this.STORAGE_KEYS.DELETED_USERS, JSON.stringify(ids));
        }
    }

    removeDeletedUserId(id, email) {
        let ids = this.getDeletedUserIds();
        if (id) ids = ids.filter(x => x !== id);
        if (email) ids = ids.filter(x => String(x).toLowerCase().trim() !== email.toLowerCase().trim());
        localStorage.setItem(this.STORAGE_KEYS.DELETED_USERS, JSON.stringify(ids));
    }

    getStoredTrips() {
        try {
            const trips = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.TRIPS)) || [];
            const deletedIds = new Set(this.getDeletedTripIds());
            const checkMock = (typeof isMockTrip === 'function') ? isMockTrip : (t => ['trip_vn_101', 'trip_vn_102', 'trip_vn_103', 'trip_vn_104'].includes(t?.id));
            return trips.filter(t => t && t.id && !deletedIds.has(t.id) && !checkMock(t));
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

    /**
     * Dọn dẹp triệt để các hồ sơ rác / vô danh (ghost / undefined driver records)
     */
    cleanGhostPendingDrivers() {
        // 1. Dọn dẹp localStorage goride_pending_drivers
        try {
            const raw = localStorage.getItem(this.STORAGE_KEYS.PENDING);
            if (raw) {
                const pending = JSON.parse(raw);
                if (Array.isArray(pending)) {
                    const cleaned = pending.filter(p => {
                        if (!p || typeof p !== 'object') return false;
                        const pid = String(p.id || '').trim();
                        if (!pid || pid === 'undefined' || pid === 'null') return false;
                        const hasInfo = (p.name && String(p.name).trim()) || (p.phone && String(p.phone).trim()) || (p.email && String(p.email).trim() && p.email !== '--');
                        return !!hasInfo;
                    });
                    if (cleaned.length !== pending.length) {
                        localStorage.setItem(this.STORAGE_KEYS.PENDING, JSON.stringify(cleaned));
                    }
                }
            }
        } catch (e) {}

        // 2. Dọn dẹp localStorage goride_offline_users
        try {
            const rawUsers = localStorage.getItem(this.STORAGE_KEYS.USERS);
            if (rawUsers) {
                const users = JSON.parse(rawUsers);
                if (Array.isArray(users)) {
                    const cleanedUsers = users.filter(u => u && u.id && String(u.id).trim() !== '' && String(u.id).trim() !== 'undefined' && String(u.id).trim() !== 'null');
                    if (cleanedUsers.length !== users.length) {
                        localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(cleanedUsers));
                    }
                }
            }
        } catch (e) {}

        // 3. Dọn dẹp các node rác 'undefined' / 'null' trên Firebase Cloud
        if (window.realtimeSync) {
            try {
                if (window.realtimeSync.isAvailable()) {
                    window.realtimeSync.db.ref('goride_pending_drivers/undefined').remove();
                    window.realtimeSync.db.ref('goride_pending_drivers/null').remove();
                    window.realtimeSync.db.ref('goride_drivers/undefined').remove();
                    window.realtimeSync.db.ref('goride_drivers/null').remove();
                    window.realtimeSync.db.ref('goride_users/undefined').remove();
                    window.realtimeSync.db.ref('goride_users/null').remove();
                } else if (typeof window.realtimeSync._restDelete === 'function') {
                    window.realtimeSync._restDelete('goride_pending_drivers/undefined');
                    window.realtimeSync._restDelete('goride_pending_drivers/null');
                    window.realtimeSync._restDelete('goride_drivers/undefined');
                    window.realtimeSync._restDelete('goride_drivers/null');
                    window.realtimeSync._restDelete('goride_users/undefined');
                    window.realtimeSync._restDelete('goride_users/null');
                }
            } catch (e) {}
        }
    }

    getPendingDrivers() {
        try {
            let list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PENDING));
            if (!Array.isArray(list)) list = [];

            // Loại bỏ hoàn toàn các phần tử rác / không có ID hoặc thiếu toàn bộ thông tin
            list = list.filter(p => {
                if (!p || typeof p !== 'object') return false;
                const pid = String(p.id || '').trim();
                if (!pid || pid === 'undefined' || pid === 'null') return false;
                const hasInfo = (p.name && String(p.name).trim()) || (p.phone && String(p.phone).trim()) || (p.email && String(p.email).trim() && p.email !== '--');
                return !!hasInfo;
            });

            const deletedIds = new Set(this.getDeletedUserIds().map(x => String(x).toLowerCase().trim()));
            const isDeleted = (id, email) => {
                if (id && deletedIds.has(String(id).toLowerCase().trim())) return true;
                if (email && deletedIds.has(String(email).toLowerCase().trim())) return true;
                return false;
            };

            // Merge any pending driver applications from goride_offline_users
            const offlineUsers = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USERS) || '[]');
            offlineUsers.forEach(u => {
                if (u && u.role === 'driver' && (u.status === 'pending' || u.status === 'Chờ duyệt')) {
                    const uid = String(u.id || '').trim();
                    if (!uid || uid === 'undefined' || uid === 'null') return;
                    const hasInfo = (u.name && String(u.name).trim()) || (u.phone && String(u.phone).trim()) || (u.email && String(u.email).trim());
                    if (!hasInfo) return;
                    if (isDeleted(u.id, u.email)) return;
                    if (!list.some(p => p.id === u.id || (u.email && p.email === u.email))) {
                        list.unshift({
                            id: u.id,
                            name: u.name,
                            email: u.email,
                            phone: u.phone,
                            vehicleType: u.vehicleType || u.vehicle?.type || 'motorbike',
                            plate: u.licensePlate || u.plate || u.vehicle?.plate || '--',
                            experienceYears: u.experienceYears || u.experience || 1,
                            status: 'pending',
                            createdAt: u.createdAt || new Date().toISOString()
                        });
                    }
                }
            });

            const cleanList = list.filter(p => !isDeleted(p.id, p.email));
            localStorage.setItem(this.STORAGE_KEYS.PENDING, JSON.stringify(cleanList));
            return cleanList;
        } catch {
            return [];
        }
    }

    savePendingDrivers(list) {
        if (!Array.isArray(list)) list = [];
        // Lọc sạch trước khi lưu
        const cleanList = list.filter(p => {
            if (!p || typeof p !== 'object') return false;
            const pid = String(p.id || '').trim();
            if (!pid || pid === 'undefined' || pid === 'null') return false;
            const hasInfo = (p.name && String(p.name).trim()) || (p.phone && String(p.phone).trim()) || (p.email && String(p.email).trim() && p.email !== '--');
            return !!hasInfo;
        });
        localStorage.setItem(this.STORAGE_KEYS.PENDING, JSON.stringify(cleanList));
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
            this.driverMarkersMap = new Map();

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
            if (e.key === 'goride_user' || e.key === 'ride_rtree_user' || e.key === 'navigo_user') {
                if (typeof sessionManager !== 'undefined') {
                    sessionManager._initFromStorage();
                }
                this.setupUserMenu();
            } else if (e.key === this.STORAGE_KEYS.ONLINE_DRIVERS || e.key === this.STORAGE_KEYS.DRIVERS) {
                this.renderOnlineDriversOnMap();
                if (this.currentTab === 'dashboard') {
                    this.updateDriverMetrics();
                }
            } else if (e.key === this.STORAGE_KEYS.PENDING || e.key === this.STORAGE_KEYS.USERS) {
                this.loadDriverApprovals();
                this.loadDriversList();
                if (this.currentTab === 'dashboard') {
                    this.loadDashboard();
                }
            } else if (e.key === this.STORAGE_KEYS.TRIPS || e.key === this.STORAGE_KEYS.DELETED_TRIPS) {
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

            // Also sync trips, pending drivers, and users from Firebase with robust onReady callback
            window.realtimeSync.onReady(() => {
                try {
                    window.realtimeSync.db.ref('goride_trips').on('value', (snapshot) => {
                        const val = snapshot.val();
                        if (val && typeof val === 'object') {
                            const deletedIds = new Set(this.getDeletedTripIds());
                            // Purge any deleted trips from Firebase
                            Object.keys(val).forEach(tripKey => {
                                if (deletedIds.has(tripKey)) {
                                    window.realtimeSync.db.ref('goride_trips/' + tripKey).remove();
                                }
                            });
                            const cloudTrips = Object.values(val).filter(t => t && t.id && !deletedIds.has(t.id));
                            const localTrips = this.getStoredTrips();
                            const tripMap = new Map();
                            localTrips.forEach(t => { if (t && t.id && !deletedIds.has(t.id)) tripMap.set(t.id, t); });
                            cloudTrips.forEach(t => { if (t && t.id && !deletedIds.has(t.id)) tripMap.set(t.id, { ...tripMap.get(t.id), ...t }); });
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

                    // Real-time continuous listener for pending driver registrations
                    window.realtimeSync.db.ref('goride_pending_drivers').on('value', () => {
                        this.loadDriverApprovals();
                        this.loadDriversList();
                        if (this.currentTab === 'dashboard') {
                            this.loadDashboard();
                        }
                    });

                    // Real-time continuous listener for driver accounts
                    window.realtimeSync.db.ref('goride_drivers').on('value', () => {
                        this.loadDriverApprovals();
                        this.loadDriversList();
                        if (this.currentTab === 'dashboard') {
                            this.loadDashboard();
                        }
                    });

                    // Real-time continuous listener for user / customer account updates
                    window.realtimeSync.db.ref('goride_users').on('value', () => {
                        this.loadDriverApprovals();
                        if (this.currentTab === 'customers') {
                            this.loadCustomers();
                        }
                        if (this.currentTab === 'dashboard') {
                            this.loadDashboard();
                        }
                    });
                } catch (e) {
                    console.warn('[Admin] Firebase realtime listeners attach warning:', e);
                }
            });
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

    /* ==========================================================================
       CLOUD REALTIME CROSS-DEVICE SYNC & DIAGNOSTICS (ANTI-401 PERMISSION DENIED)
       ========================================================================== */

    setupCloudSyncDiagnostics() {
        const updatePill = (status, text) => {
            const pill = document.getElementById('admin-cloud-status-pill');
            const dot = document.getElementById('cloud-pill-dot');
            const textEl = document.getElementById('cloud-pill-text');
            const banner = document.getElementById('admin-cloud-alert-banner');
            if (!pill || !dot || !textEl) return;

            if (status === 'connected') {
                pill.style.background = '#ecfdf5';
                pill.style.borderColor = '#a7f3d0';
                pill.style.color = '#047857';
                dot.style.background = '#10b981';
                textEl.textContent = text || 'Đám mây: Sẵn sàng';
                if (banner) banner.style.display = 'none';
            } else if (status === 'permission_denied') {
                pill.style.background = '#fef2f2';
                pill.style.borderColor = '#fecaca';
                pill.style.color = '#b91c1c';
                dot.style.background = '#ef4444';
                textEl.textContent = '⚠️ Mở khóa Firebase (401)';
                if (banner) banner.style.display = 'flex';
            } else {
                pill.style.background = '#f8fafc';
                pill.style.borderColor = '#e2e8f0';
                pill.style.color = '#64748b';
                dot.style.background = '#94a3b8';
                textEl.textContent = text || 'Đang kết nối đám mây...';
            }
        };

        window.addEventListener('realtime:permission_denied', () => {
            updatePill('permission_denied');
        });

        window.addEventListener('realtime:connection', (e) => {
            if (e && e.detail && e.detail.online) {
                if (!window.realtimeSync || !window.realtimeSync.permissionDenied) {
                    updatePill('connected');
                }
            } else {
                updatePill('offline', 'Ngoại tuyến');
            }
        });

        // Initial light check
        if (window.realtimeSync && typeof window.realtimeSync.testCloudConnection === 'function') {
            window.realtimeSync.testCloudConnection().then(res => {
                if (res.success) {
                    updatePill('connected');
                } else if (res.status === 401 || res.code === 'PERMISSION_DENIED') {
                    updatePill('permission_denied');
                }
            }).catch(() => {});
        }
    }

    openCloudModal() {
        const input = document.getElementById('cloud-db-url');
        if (input && window.realtimeSync) {
            input.value = window.realtimeSync.databaseURL || window.realtimeSync.getConfig()?.databaseURL || '';
        }
        this.openModal('modal-cloud-sync');
        this.testCloudConnectionFromAdmin();
    }

    async testCloudConnectionFromAdmin() {
        const statusEl = document.getElementById('cloud-diagnostic-status');
        const btn = document.getElementById('btn-test-cloud');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang kiểm tra...'; }
        if (statusEl) { statusEl.textContent = 'Đang gửi gói tin kiểm tra đọc & ghi tới Firebase Realtime Database...'; statusEl.style.color = '#475569'; }

        if (window.realtimeSync && typeof window.realtimeSync.testCloudConnection === 'function') {
            const res = await window.realtimeSync.testCloudConnection();
            if (btn) { btn.disabled = false; btn.textContent = '⚡ Kiểm tra ngay'; }
            if (res.success) {
                if (statusEl) {
                    statusEl.innerHTML = '<span style="color:#16a34a; font-weight:800;">🟢 KẾT NỐI HOÀN HẢO (200 OK)</span><br><span style="font-size:0.8rem; font-weight:normal; color:#475569;">Đám mây đang hoạt động tốt. Dữ liệu tài xế & khách hàng sẽ lập tức đồng bộ giữa mọi thiết bị.</span>';
                }
                const banner = document.getElementById('admin-cloud-alert-banner');
                if (banner) banner.style.display = 'none';
                const pill = document.getElementById('admin-cloud-status-pill');
                if (pill) {
                    pill.style.background = '#ecfdf5';
                    pill.style.borderColor = '#a7f3d0';
                    pill.style.color = '#047857';
                    const dot = document.getElementById('cloud-pill-dot');
                    const textEl = document.getElementById('cloud-pill-text');
                    if (dot) dot.style.background = '#10b981';
                    if (textEl) textEl.textContent = 'Đám mây: Sẵn sàng';
                }
                this.showToast('Kết nối đám mây thành công 100%!', 'success');
            } else if (res.status === 401 || res.code === 'PERMISSION_DENIED') {
                if (statusEl) {
                    statusEl.innerHTML = '<span style="color:#dc2626; font-weight:800;">🔴 LỖI PHÂN QUYỀN (401 Permission Denied)</span><br><span style="font-size:0.8rem; font-weight:normal; color:#991b1b;">Firebase Rules đang chặn truy cập. Vui lòng làm theo hướng dẫn 3 bước màu cam bên dưới để mở Rules.</span>';
                }
                const banner = document.getElementById('admin-cloud-alert-banner');
                if (banner) banner.style.display = 'flex';
                const pill = document.getElementById('admin-cloud-status-pill');
                if (pill) {
                    pill.style.background = '#fef2f2';
                    pill.style.borderColor = '#fecaca';
                    pill.style.color = '#b91c1c';
                    const dot = document.getElementById('cloud-pill-dot');
                    const textEl = document.getElementById('cloud-pill-text');
                    if (dot) dot.style.background = '#ef4444';
                    if (textEl) textEl.textContent = '⚠️ Mở khóa Firebase (401)';
                }
                this.showToast('Firebase bị khóa quyền 401. Vui lòng cập nhật Rules!', 'error');
            } else {
                if (statusEl) {
                    statusEl.innerHTML = `<span style="color:#d97706; font-weight:800;">🟡 CHƯA KẾT NỐI:</span> ${res.message || 'Lỗi mạng'}`;
                }
            }
        }
    }

    saveCloudConfigFromAdmin(e) {
        e.preventDefault();
        const urlInput = document.getElementById('cloud-db-url');
        const newUrl = (urlInput?.value || '').trim();
        if (!newUrl) {
            this.showToast('Vui lòng nhập Firebase Database URL hợp lệ.', 'error');
            return;
        }

        if (window.realtimeSync && typeof window.realtimeSync.saveConfig === 'function') {
            window.realtimeSync.saveConfig({ databaseURL: newUrl });
            this.showToast('Đã lưu cấu hình Firebase mới! Đang kết nối lại...', 'success');
            this.testCloudConnectionFromAdmin();
        }
    }

    copyFirebaseRules() {
        const rulesText = '{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(rulesText);
            this.showToast('Đã sao chép đoạn mã Rules vào bộ nhớ tạm!', 'success');
        } else {
            prompt('Sao chép đoạn mã Rules bên dưới:', rulesText);
        }
    }

    async syncCustomersFromCloud() {
        this.showToast('Đang kết nối đám mây để tải danh sách người dùng...', 'info');
        await this.loadCustomers();
        this.showToast('Đã đồng bộ dữ liệu người dùng mới nhất từ đám mây!', 'success');
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

        this.driverMarkersMap = this.driverMarkersMap || new Map();
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

        // If no drivers are currently online, remove all markers safely
        if (onlineDrivers.length === 0) {
            for (const marker of this.driverMarkersMap.values()) {
                this.driverMarkersLayer.removeLayer(marker);
            }
            this.driverMarkersMap.clear();
            return;
        }

        const activeDriverKeys = new Set();

        // Render / update each online driver smoothly without destroying open popups or refreshing icons
        onlineDrivers.forEach(driver => {
            const driverKey = String(driver.id || driver.phone || driver.plate || 'drv');
            activeDriverKeys.add(driverKey);

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

            let marker = this.driverMarkersMap.get(driverKey);

            if (marker) {
                // Update marker position smoothly only if coordinates shifted
                const curPos = marker.getLatLng();
                if (Math.abs(curPos.lat - driver.lat) > 0.000005 || Math.abs(curPos.lng - driver.lng) > 0.000005) {
                    marker.setLatLng([driver.lat, driver.lng]);
                }

                // Update popup content cleanly in place (NEVER close the popup while user is viewing)
                marker.setPopupContent(popupContent);

                // Update icon style only if vehicle classification changed
                const iconSig = `${markerClass}_${driver.plate}_${driver.name}`;
                if (marker._iconSig !== iconSig) {
                    marker._iconSig = iconSig;
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
                    marker.setIcon(L.divIcon({
                        html: markerHtml,
                        className: 'custom-admin-driver-marker-container',
                        iconSize: [42, 68],
                        iconAnchor: [21, 24],
                        popupAnchor: [0, -26]
                    }));
                }
            } else {
                // New driver marker
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

                marker = L.marker([driver.lat, driver.lng], {
                    icon: customIcon,
                    title: `${driver.name} (${driver.plate}) - Đang trực tuyến`
                });

                marker._iconSig = `${markerClass}_${driver.plate}_${driver.name}`;
                marker.bindPopup(popupContent, { maxWidth: 320, minWidth: 260, autoPan: true, autoPanPadding: [20, 20] });
                marker.addTo(this.driverMarkersLayer);
                this.driverMarkersMap.set(driverKey, marker);
            }
        });

        // Clean up any markers of drivers that went offline
        for (const [key, marker] of this.driverMarkersMap.entries()) {
            if (!activeDriverKeys.has(key)) {
                this.driverMarkersLayer.removeLayer(marker);
                this.driverMarkersMap.delete(key);
            }
        }
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
        ['dashboard', 'recent-trips', 'trips', 'drivers', 'customers'].forEach(t => {
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
        } else if (tabName === 'customers') {
            this.loadCustomers();
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
        if (!this._userMenuBound) {
            this._userMenuBound = true;
            const menuBtn = document.getElementById('user-menu-btn');
            const dropdown = document.getElementById('user-menu-dropdown');
            if (menuBtn && dropdown) {
                menuBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const isHidden = dropdown.style.display === 'none' || !dropdown.style.display;
                    dropdown.style.display = isHidden ? 'block' : 'none';
                });
                document.addEventListener('click', (e) => {
                    if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
                        dropdown.style.display = 'none';
                    }
                });
            }
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
                try {
                    localStorage.setItem('goride_logged_out', '1');
                    sessionStorage.setItem('goride_logged_out', '1');
                    sessionStorage.clear();
                    const clearKeys = [
                        'goride_user', 'navigo_user', 'ride_rtree_user',
                        'goride_token', 'navigo_token', 'ride_rtree_token',
                        'user', 'token', 'currentUser', 'auth_user',
                        'goride_active_trip', 'goride_pending_trip_offers'
                    ];
                    clearKeys.forEach(k => {
                        try { localStorage.removeItem(k); } catch (e) {}
                    });
                } catch (e) {}
                window.location.href = '../index.html';
            });
        });
    }

    /* ==========================================================================
       DASHBOARD METRICS & RECENT TRIPS (DYNAMIC REAL METRICS)
       ========================================================================== */

    isCompletedTrip(t) {
        if (!t || !t.status) return false;
        const s = String(t.status).toLowerCase().trim();
        return s === 'completed' || s === 'finished' || s === 'finish' || s === 'done';
    }

    getTripFare(t) {
        if (!t) return 0;
        const raw = (t.fare !== undefined && t.fare !== null) ? t.fare 
                  : ((t.fareAmount !== undefined && t.fareAmount !== null) ? t.fareAmount 
                  : ((t.price !== undefined && t.price !== null) ? t.price 
                  : ((t.totalFare !== undefined && t.totalFare !== null) ? t.totalFare : 0)));
        if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
        if (typeof raw === 'string') {
            const clean = raw.replace(/[^\d]/g, '');
            const val = Number(clean);
            return isNaN(val) ? 0 : val;
        }
        return 0;
    }

    async syncTripsFromCloud() {
        if (!window.realtimeSync) return;
        try {
            let cloudTrips = null;
            if (window.realtimeSync.isAvailable()) {
                const snap = await window.realtimeSync.db.ref('goride_trips').once('value');
                cloudTrips = snap.val();
            } else if (typeof window.realtimeSync._restGet === 'function') {
                cloudTrips = await window.realtimeSync._restGet('goride_trips');
            }
            if (cloudTrips && typeof cloudTrips === 'object') {
                const deletedIds = new Set(this.getDeletedTripIds());
                const list = Object.values(cloudTrips).filter(t => t && t.id && !deletedIds.has(t.id));
                if (list.length > 0) {
                    const localTrips = this.getStoredTrips();
                    const tripMap = new Map();
                    localTrips.forEach(t => { if (t && t.id && !deletedIds.has(t.id)) tripMap.set(t.id, t); });
                    list.forEach(t => { if (t && t.id && !deletedIds.has(t.id)) tripMap.set(t.id, { ...tripMap.get(t.id), ...t }); });
                    const merged = Array.from(tripMap.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                    this.saveStoredTrips(merged);
                }
            }
        } catch (e) {
            console.warn('[Admin] syncTripsFromCloud notice:', e);
        }
    }

    async loadDashboard() {
        try {
            await this.syncTripsFromCloud();
            const trips = this.getStoredTrips();
            const drivers = this.getStoredDrivers();
            const onlineDrivers = this.getOnlineDrivers();

            // 100% Real KPI calculation based strictly on actual data
            const totalRides = trips.length;
            const activeDrivers = drivers.filter(d => d.status === 'active').length;
            // Aggregate total revenue across ALL completed trips in the entire system
            const calculatedRevenue = trips
                .filter(t => this.isCompletedTrip(t))
                .reduce((sum, t) => sum + this.getTripFare(t), 0);

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
            if (driversBadge) {
                const pending = this.getPendingDrivers();
                driversBadge.textContent = pending.length > 0 ? `${drivers.length} (${pending.length} chờ)` : drivers.length;
            }

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

    getTripLocationText(trip, type = 'pickup') {
        if (!trip) return '--';
        if (type === 'pickup') {
            if (trip.pickupName && typeof trip.pickupName === 'string') return trip.pickupName.trim();
            if (trip.pickup) {
                if (typeof trip.pickup === 'string') return trip.pickup.trim();
                if (typeof trip.pickup === 'object') {
                    return trip.pickup.name || trip.pickup.address || trip.pickup.title || (trip.pickup.lat && trip.pickup.lng ? `${Number(trip.pickup.lat).toFixed(4)}, ${Number(trip.pickup.lng).toFixed(4)}` : '--');
                }
            }
            if (trip.pickupAddress && typeof trip.pickupAddress === 'string') return trip.pickupAddress.trim();
            if (trip.pickupLat && trip.pickupLon) return `${Number(trip.pickupLat).toFixed(4)}, ${Number(trip.pickupLon).toFixed(4)}`;
            return '--';
        } else {
            if (trip.dropoffName && typeof trip.dropoffName === 'string') return trip.dropoffName.trim();
            if (trip.destinationName && typeof trip.destinationName === 'string') return trip.destinationName.trim();
            if (trip.destination) {
                if (typeof trip.destination === 'string') return trip.destination.trim();
                if (typeof trip.destination === 'object') {
                    return trip.destination.name || trip.destination.address || trip.destination.title || (trip.destination.lat && trip.destination.lng ? `${Number(trip.destination.lat).toFixed(4)}, ${Number(trip.destination.lng).toFixed(4)}` : '--');
                }
            }
            if (trip.dropoffAddress && typeof trip.dropoffAddress === 'string') return trip.dropoffAddress.trim();
            if (trip.dropoffLat && trip.dropoffLon) return `${Number(trip.dropoffLat).toFixed(4)}, ${Number(trip.dropoffLon).toFixed(4)}`;
            return '--';
        }
    }

    filterRecentTrips() {
        const searchInput = document.getElementById('recent-trip-search-input');
        const statusFilter = document.getElementById('recent-trip-status-filter');
        const countText = document.getElementById('recent-trip-count-text');

        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const status = statusFilter ? statusFilter.value : 'all';

        let filtered = this.recentTripsData || this.getStoredTrips();

        if (status !== 'all') {
            if (status.toLowerCase() === 'completed') {
                filtered = filtered.filter(t => this.isCompletedTrip(t));
            } else {
                filtered = filtered.filter(t => (t.status || '').toLowerCase() === status.toLowerCase());
            }
        }

        if (query) {
            filtered = filtered.filter(t => {
                const pText = this.getTripLocationText(t, 'pickup').toLowerCase();
                const dText = this.getTripLocationText(t, 'destination').toLowerCase();
                return (
                    (t.id && String(t.id).toLowerCase().includes(query)) ||
                    (t.customerName && t.customerName.toLowerCase().includes(query)) ||
                    (t.driverName && t.driverName.toLowerCase().includes(query)) ||
                    pText.includes(query) ||
                    dText.includes(query)
                );
            });
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
            const fareFormatted = Number(this.getTripFare(t)).toLocaleString('vi-VN') + ' ₫';
            const timeFormatted = t.createdAt ? new Date(t.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Vừa xong';
            const pickupShort = this.escapeHtml(this.getTripLocationText(t, 'pickup'));
            const dropoffShort = this.escapeHtml(this.getTripLocationText(t, 'destination'));

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
            const matchStatus = (status === 'all') || 
                (status.toLowerCase() === 'completed' ? this.isCompletedTrip(t) : (t.status || '').toLowerCase() === status.toLowerCase());
            const pText = this.getTripLocationText(t, 'pickup').toLowerCase();
            const dText = this.getTripLocationText(t, 'destination').toLowerCase();
            const matchQuery = !query || 
                (t.id && String(t.id).toLowerCase().includes(query)) ||
                (t.customerName && t.customerName.toLowerCase().includes(query)) ||
                (t.driverName && t.driverName.toLowerCase().includes(query)) ||
                pText.includes(query) ||
                dText.includes(query);
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
            const fareFormatted = Number(this.getTripFare(t)).toLocaleString('vi-VN') + ' ₫';
            const pickupShort = this.escapeHtml(this.getTripLocationText(t, 'pickup'));
            const dropoffShort = this.escapeHtml(this.getTripLocationText(t, 'destination'));

            return `
                <tr>
                    <td style="font-weight:700; color:var(--color-primary); font-family:monospace;">#${t.id}</td>
                    <td>
                        <div style="font-weight:600;">${this.escapeHtml(t.customerName || '--')}</div>
                        <div style="font-size:0.75rem; color:var(--color-gray-500);">${this.escapeHtml(t.customerPhone || '')}</div>
                    </td>
                    <td>${t.driverName ? this.escapeHtml(t.driverName) : '<span style="color:var(--color-gray-400);">Chưa gán</span>'}</td>
                    <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis;" title="${pickupShort}">${pickupShort}</td>
                    <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis;" title="${dropoffShort}">${dropoffShort}</td>
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

        const pickupText = this.getTripLocationText(trip, 'pickup');
        const destText = this.getTripLocationText(trip, 'destination');

        document.getElementById('modal-trip-title').textContent = `Chỉnh sửa chuyến đi #${trip.id}`;
        document.getElementById('trip-form-id').value = trip.id;
        document.getElementById('trip-form-customer').value = trip.customerName || '';
        document.getElementById('trip-form-phone').value = trip.customerPhone || '';
        document.getElementById('trip-form-driver').value = trip.driverName || '';
        document.getElementById('trip-form-pickup').value = pickupText === '--' ? '' : pickupText;
        document.getElementById('trip-form-dest').value = destText === '--' ? '' : destText;
        document.getElementById('trip-form-fare').value = trip.fare || trip.fareAmount || 40000;
        document.getElementById('trip-form-status').value = (trip.status || 'requested').toLowerCase();

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
                const existing = trips[idx];
                const updatedPickup = (existing.pickup && typeof existing.pickup === 'object')
                    ? { ...existing.pickup, name: pickup, address: pickup }
                    : pickup;
                const updatedDest = (existing.destination && typeof existing.destination === 'object')
                    ? { ...existing.destination, name: destination, address: destination }
                    : destination;

                const updatedTrip = {
                    ...existing,
                    customerName,
                    customerPhone,
                    driverName,
                    pickup: updatedPickup,
                    destination: updatedDest,
                    pickupName: pickup,
                    dropoffName: destination,
                    fare,
                    fareAmount: fare,
                    status,
                    updatedAt: new Date().toISOString()
                };
                trips[idx] = updatedTrip;

                // Sync to Firebase Cloud
                if (window.realtimeSync && window.realtimeSync.isAvailable()) {
                    try {
                        window.realtimeSync.db.ref('goride_trips/' + idInput).update(updatedTrip);
                    } catch (fbErr) {}
                }

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
                pickupName: pickup,
                dropoffName: destination,
                fare,
                fareAmount: fare,
                status,
                createdAt: new Date().toISOString()
            };
            trips.unshift(newTrip);

            // Sync to Firebase Cloud
            if (window.realtimeSync && window.realtimeSync.isAvailable()) {
                try {
                    window.realtimeSync.db.ref('goride_trips/' + newId).set(newTrip);
                } catch (fbErr) {}
            }

            this.showToast(`Đã thêm mới chuyến đi #${newId}!`, 'success');
        }

        this.saveStoredTrips(trips);
        this.closeModal('modal-trip');
        this.loadTripsTable();
        this.loadRecentTripsTable();
        this.loadDashboard();
    }

    /* ==========================================================================
       DRIVERS MANAGEMENT (FULL CRUD & REAL DRIVER APPROVALS)
       ========================================================================== */

    async loadDriversList() {
        // Sync active registered drivers from cloud
        if (window.realtimeSync) {
            try {
                let cloudDrivers = null;
                let cloudUsers = null;
                if (window.realtimeSync.isAvailable()) {
                    const [dSnap, uSnap] = await Promise.all([
                        window.realtimeSync.db.ref('goride_drivers').once('value').catch(() => null),
                        window.realtimeSync.db.ref('goride_users').once('value').catch(() => null)
                    ]);
                    if (dSnap) cloudDrivers = dSnap.val();
                    if (uSnap) cloudUsers = uSnap.val();
                } else if (typeof window.realtimeSync._restGet === 'function') {
                    const [dData, uData] = await Promise.all([
                        window.realtimeSync._restGet('goride_drivers').catch(() => null),
                        window.realtimeSync._restGet('goride_users').catch(() => null)
                    ]);
                    cloudDrivers = dData;
                    cloudUsers = uData;
                }

                const deletedIds = new Set(this.getDeletedUserIds().map(x => String(x).toLowerCase().trim()));
                const isDeleted = (id, email) => {
                    if (id && deletedIds.has(String(id).toLowerCase().trim())) return true;
                    if (email && deletedIds.has(String(email).toLowerCase().trim())) return true;
                    return false;
                };

                let drivers = this.getStoredDrivers();
                let hasChange = false;

                const processDriverRecord = (cd) => {
                    if (!cd || !cd.id) return;
                    if (isDeleted(cd.id, cd.email)) return;
                    if (cd.status === 'pending' || cd.status === 'Chờ duyệt') return; // Pending belongs in Approvals
                    const vType = cd.vehicleType || cd.vehicle?.type || 'motorbike';
                    const isBike = (vType === 'bike' || vType === 'motorbike');
                    const vLabel = isBike ? 'Xe máy (Navigo Bike)' : (vType === 'car7' ? 'Ô tô 7 chỗ (Navigo XL)' : 'Ô tô 4 chỗ (Navigo Car)');
                    const record = {
                        id: cd.id,
                        name: cd.name,
                        email: cd.email,
                        phone: cd.phone,
                        vehicleType: vType,
                        vehicleTypeName: vLabel,
                        plate: cd.plate || cd.licensePlate || cd.vehicle?.plate || '--',
                        experience: cd.experienceYears || cd.experience || 1,
                        status: cd.status || 'active',
                        createdAt: cd.createdAt || new Date().toISOString()
                    };

                    const idx = drivers.findIndex(d => d.id === cd.id || (cd.email && d.email === cd.email));
                    if (idx !== -1) {
                        drivers[idx] = { ...drivers[idx], ...record };
                        hasChange = true;
                    } else {
                        drivers.push(record);
                        hasChange = true;
                    }
                };

                if (cloudDrivers && typeof cloudDrivers === 'object') {
                    Object.values(cloudDrivers).forEach(processDriverRecord);
                }
                if (cloudUsers && typeof cloudUsers === 'object') {
                    Object.values(cloudUsers).filter(u => u && u.role === 'driver' && u.status !== 'pending' && u.status !== 'Chờ duyệt').forEach(processDriverRecord);
                }

                if (hasChange) {
                    this.saveStoredDrivers(drivers);
                }
            } catch (e) {
                console.warn('[Admin] Cloud drivers sync notice:', e);
            }
        }

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

        // 1. Live C++ backend API check (Fast non-blocking with 800ms timeout)
        if (typeof apiClient !== 'undefined') {
            try {
                const apiRes = await Promise.race([
                    apiClient.getPendingDrivers(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 800))
                ]);
                if (apiRes && apiRes.data && Array.isArray(apiRes.data.drivers)) {
                    pendingList = apiRes.data.drivers;
                }
            } catch (err) {
                // Silently fallback if C++ backend is not running on web deploy
            }
        }

        // 2. Query Firebase Realtime Cloud for ALL pending drivers
        // Check goride_pending_drivers, goride_users (role=driver & status=pending), and goride_drivers (status=pending)
        const deletedIds = new Set(this.getDeletedUserIds().map(x => String(x).toLowerCase().trim()));
        const isDeleted = (id, email) => {
            if (id && deletedIds.has(String(id).toLowerCase().trim())) return true;
            if (email && deletedIds.has(String(email).toLowerCase().trim())) return true;
            return false;
        };

        if (window.realtimeSync) {
            try {
                let cloudPending = {};
                let cloudUsers = {};
                let cloudDrivers = {};

                if (window.realtimeSync.isAvailable()) {
                    const [pSnap, uSnap, dSnap] = await Promise.all([
                        window.realtimeSync.db.ref('goride_pending_drivers').once('value').catch(() => null),
                        window.realtimeSync.db.ref('goride_users').once('value').catch(() => null),
                        window.realtimeSync.db.ref('goride_drivers').once('value').catch(() => null)
                    ]);
                    if (pSnap) cloudPending = pSnap.val() || {};
                    if (uSnap) cloudUsers = uSnap.val() || {};
                    if (dSnap) cloudDrivers = dSnap.val() || {};
                } else if (typeof window.realtimeSync._restGet === 'function') {
                    const [pData, uData, dData] = await Promise.all([
                        window.realtimeSync._restGet('goride_pending_drivers').catch(() => null),
                        window.realtimeSync._restGet('goride_users').catch(() => null),
                        window.realtimeSync._restGet('goride_drivers').catch(() => null)
                    ]);
                    if (pData) cloudPending = pData || {};
                    if (uData) cloudUsers = uData || {};
                    if (dData) cloudDrivers = dData || {};
                }

                // If Firebase connects later, auto re-run
                if (!window.realtimeSync.isAvailable() && !this._driverApprovalsReadyHooked) {
                    this._driverApprovalsReadyHooked = true;
                    window.realtimeSync.onReady(() => {
                        this.loadDriverApprovals();
                    });
                }

                // Helper to validate and normalize a real pending applicant
                const parseValidPending = (d, keyFallback) => {
                    if (!d || typeof d !== 'object') return null;
                    const id = String(d.id || keyFallback || '').trim();
                    if (!id || id === 'undefined' || id === 'null') return null;
                    const name = (d.name || '').trim();
                    const email = (d.email || '').trim();
                    const phone = (d.phone || '').trim();
                    // A real driver applicant MUST have at least name, email, or phone!
                    if (!name && !email && !phone) return null;
                    const status = String(d.status || '').toLowerCase().trim();
                    if (status !== 'pending' && status !== 'chờ duyệt') return null;
                    return {
                        id,
                        name: name || 'Tài xế mới',
                        email: email || '--',
                        phone: phone || '--',
                        vehicleType: d.vehicleType || d.vehicle?.type || 'motorbike',
                        plate: d.plate || d.licensePlate || d.vehicle?.plate || '--',
                        experienceYears: Number(d.experienceYears || d.experience) || 1,
                        status: 'pending',
                        createdAt: d.createdAt || new Date().toISOString()
                    };
                };

                // A. Extract from goride_pending_drivers
                Object.entries(cloudPending).forEach(([key, cp]) => {
                    const valid = parseValidPending(cp, key);
                    if (!valid) return;
                    if (isDeleted(valid.id, valid.email)) return;
                    if (!pendingList.some(p => p.id === valid.id || (valid.email !== '--' && p.email === valid.email))) {
                        pendingList.push(valid);
                    }
                });

                // B. Extract from goride_users (role === 'driver' && status === 'pending')
                Object.entries(cloudUsers).forEach(([key, cu]) => {
                    if (!cu || cu.role !== 'driver') return;
                    const valid = parseValidPending(cu, key);
                    if (!valid) return;
                    if (isDeleted(valid.id, valid.email)) return;
                    if (!pendingList.some(p => p.id === valid.id || (valid.email !== '--' && p.email === valid.email))) {
                        pendingList.push(valid);
                    }
                });

                // C. Extract from goride_drivers (status === 'pending')
                Object.entries(cloudDrivers).forEach(([key, cd]) => {
                    const valid = parseValidPending(cd, key);
                    if (!valid) return;
                    if (isDeleted(valid.id, valid.email)) return;
                    if (!pendingList.some(p => p.id === valid.id || (valid.email !== '--' && p.email === valid.email))) {
                        pendingList.push(valid);
                    }
                });
            } catch (e) {
                console.warn('[Admin] Cloud pending drivers fetch warning:', e);
            }
        }

        // 3. Combine with real registered applicants in localStorage
        const localPending = this.getPendingDrivers();
        localPending.forEach(lp => {
            const valid = parseValidPending(lp, lp.id);
            if (!valid) return;
            if (isDeleted(valid.id, valid.email)) return;
            if (!pendingList.some(p => p.id === valid.id || (valid.email !== '--' && p.email === valid.email))) {
                pendingList.push(valid);
            }
        });

        // 4. CRITICAL: Persist to localStorage on this Admin device for instant access across tabs
        this.savePendingDrivers(pendingList);

        // 5. Update UI Badges synchronously
        if (badge) badge.textContent = pendingList.length;

        const sidebarDriversBadge = document.getElementById('sidebar-drivers-count');
        if (sidebarDriversBadge) {
            const drivers = this.getStoredDrivers();
            sidebarDriversBadge.textContent = pendingList.length > 0 ? `${drivers.length} (${pendingList.length} chờ)` : drivers.length;
        }

        // 6. If no real applicants, show clean empty state
        if (pendingList.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:28px 16px; text-align:center; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
                    <div style="font-size:2rem; margin-bottom:6px;">✨</div>
                    <p style="font-weight:600; color:var(--color-gray-700); margin:0;">Không có hồ sơ tài xế nào đang chờ duyệt.</p>
                    <p style="font-size:0.8rem; color:var(--color-gray-500); margin:4px 0 0 0;">Khi có người đăng ký tài xế trên web hoặc điện thoại, hồ sơ thực tế sẽ lập tức xuất hiện tại đây để Quản trị viên duyệt.</p>
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
                                <h4 style="margin:0; font-size:1.05rem;">${this.escapeHtml(driver.name)}</h4>
                                <span class="badge badge-warning" style="font-size:0.75rem;">Chờ duyệt</span>
                                <span style="font-size:0.75rem; color:var(--color-gray-500); font-family:monospace;">ID: ${this.escapeHtml(driver.id)}</span>
                            </div>
                            <p style="color:var(--color-gray-600); font-size:0.875rem; margin:2px 0;">
                                ✉️ ${this.escapeHtml(driver.email || '--')} &bull; 📞 ${this.escapeHtml(driver.phone || '--')}
                            </p>
                            <p style="color:var(--color-gray-700); font-size:0.85rem; margin:2px 0; font-weight:500;">
                                ${vLabel} &bull; Biển số: <strong style="color:var(--color-primary);">${this.escapeHtml(driver.plate || driver.licensePlate || '---')}</strong> &bull; Kinh nghiệm: ${driver.experienceYears || driver.experience || 1} năm
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
        const rawId = driverId;
        driverId = String(driverId || '').trim();

        // Xử lý dứt điểm trường hợp ID rác / vô danh / rỗng / 'undefined' / 'null':
        if (!driverId || driverId === 'undefined' || driverId === 'null') {
            console.warn('[Admin] Phê duyệt/từ chối hồ sơ không hợp lệ (Ghost driver):', rawId);

            // 1. Dọn dẹp sạch hồ sơ rác trong localStorage
            try {
                let pending = this.getPendingDrivers();
                pending = pending.filter(d => d && d.id && String(d.id).trim() !== '' && String(d.id).trim() !== 'undefined' && String(d.id).trim() !== 'null' && ((d.name && d.name.trim()) || (d.phone && d.phone.trim()) || (d.email && d.email.trim() && d.email !== '--')));
                this.savePendingDrivers(pending);
            } catch (e) {}

            // 2. Xóa các node rác 'undefined' / 'null' trên Firebase Cloud
            if (window.realtimeSync) {
                try {
                    if (window.realtimeSync.isAvailable()) {
                        window.realtimeSync.db.ref('goride_pending_drivers/undefined').remove();
                        window.realtimeSync.db.ref('goride_pending_drivers/null').remove();
                        window.realtimeSync.db.ref('goride_drivers/undefined').remove();
                        window.realtimeSync.db.ref('goride_drivers/null').remove();
                        window.realtimeSync.db.ref('goride_users/undefined').remove();
                        window.realtimeSync.db.ref('goride_users/null').remove();
                    }
                    if (typeof window.realtimeSync._restDelete === 'function') {
                        window.realtimeSync._restDelete('goride_pending_drivers/undefined');
                        window.realtimeSync._restDelete('goride_pending_drivers/null');
                        window.realtimeSync._restDelete('goride_drivers/undefined');
                        window.realtimeSync._restDelete('goride_drivers/null');
                        window.realtimeSync._restDelete('goride_users/undefined');
                        window.realtimeSync._restDelete('goride_users/null');
                    }
                } catch (e) {}
            }

            // 3. Xóa ngay thẻ rác trên giao diện nếu đang hiển thị
            document.querySelectorAll("[id^='approval-'], #driver-approvals .card").forEach(el => {
                if (el.id === 'approval-' || el.id === 'approval-undefined' || el.id === 'approval-null' || el.innerText.includes('ID: \n') || el.innerText.includes('ID:  ') || (el.innerText.includes('Chờ duyệt') && el.innerText.includes('✉️ -- • 📞 --'))) {
                    el.remove();
                }
            });

            this.showToast('Đã xóa bỏ hoàn toàn hồ sơ tài xế không hợp lệ khỏi hệ thống!', 'info');
            await this.loadDriverApprovals();
            return;
        }

        if (this.isProcessingApproval.has(driverId)) return;
        this.isProcessingApproval.add(driverId);

        const card = document.getElementById('approval-' + driverId);
        if (card) {
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';
        }

        try {
            // 1. Call backend API endpoint if reachable (fast non-blocking)
            if (typeof apiClient !== 'undefined') {
                try {
                    await Promise.race([
                        approved ? apiClient.approveDriver(driverId) : apiClient.rejectDriver(driverId),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 800))
                    ]);
                } catch (e) {
                    console.warn('[Admin] Backend approval call notice:', e.message);
                }
            }

            // 2. Read pending list & find applicant
            let pending = this.getPendingDrivers();
            let applicant = pending.find(d => d.id === driverId);

            // Cloud query fallback if applicant is not cached in local storage
            if (!applicant && window.realtimeSync) {
                try {
                    if (window.realtimeSync.isAvailable()) {
                        const snap = await window.realtimeSync.db.ref(`goride_pending_drivers/${driverId}`).once('value');
                        applicant = snap.val();
                        if (!applicant) {
                            const uSnap = await window.realtimeSync.db.ref(`goride_users/${driverId}`).once('value');
                            applicant = uSnap.val();
                        }
                    } else if (typeof window.realtimeSync._restGet === 'function') {
                        applicant = await window.realtimeSync._restGet(`goride_pending_drivers/${driverId}`);
                        if (!applicant) {
                            applicant = await window.realtimeSync._restGet(`goride_users/${driverId}`);
                        }
                    }
                } catch (e) {}
            }

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
                const existingIdx = drivers.findIndex(d => d.id === driverId || (applicant.email && d.email === applicant.email));
                const vType = applicant.vehicleType || applicant.vehicle?.type || 'motorbike';
                const isBike = (vType === 'bike' || vType === 'motorbike');
                const vLabel = isBike ? 'Xe máy (Navigo Bike)' : (vType === 'car7' ? 'Ô tô 7 chỗ (Navigo XL)' : 'Ô tô 4 chỗ (Navigo Car)');
                const driverRecord = {
                    id: driverId,
                    name: applicant.name,
                    email: applicant.email,
                    phone: applicant.phone,
                    vehicleType: vType,
                    vehicleTypeName: vLabel,
                    plate: applicant.plate || applicant.licensePlate || applicant.vehicle?.plate || '--',
                    experience: applicant.experienceYears || applicant.experience || 1,
                    status: 'active',
                    createdAt: applicant.createdAt || new Date().toISOString()
                };

                if (existingIdx !== -1) {
                    drivers[existingIdx] = { ...drivers[existingIdx], ...driverRecord };
                } else {
                    drivers.unshift(driverRecord);
                }
                this.saveStoredDrivers(drivers);
            }

            // 5. Remove from pending list locally & sanitize
            pending = pending.filter(d => d && d.id && d.id !== driverId && d.id !== 'undefined' && d.id !== 'null' && ((d.name && d.name.trim()) || (d.phone && d.phone.trim()) || (d.email && d.email.trim() && d.email !== '--')));
            this.savePendingDrivers(pending);

            // 6. Synchronize status across Firebase Realtime Cloud
            if (window.realtimeSync) {
                const newStatus = approved ? 'active' : 'rejected';
                const cloudUpdate = {
                    status: newStatus,
                    updatedAt: new Date().toISOString()
                };

                if (window.realtimeSync.isAvailable()) {
                    try {
                        await window.realtimeSync.db.ref(`goride_pending_drivers/${driverId}`).remove();
                        await window.realtimeSync.db.ref(`goride_drivers/${driverId}`).update(cloudUpdate);
                        await window.realtimeSync.db.ref(`goride_users/${driverId}`).update(cloudUpdate);

                        if (applicant && applicant.email) {
                            try {
                                const uSnap = await window.realtimeSync.db.ref('goride_users').once('value');
                                const allUsers = uSnap.val() || {};
                                for (const k of Object.keys(allUsers)) {
                                    if (allUsers[k] && allUsers[k].email && allUsers[k].email.toLowerCase() === applicant.email.toLowerCase()) {
                                        await window.realtimeSync.db.ref(`goride_users/${k}`).update(cloudUpdate);
                                    }
                                }
                            } catch (e) {}
                        }
                    } catch (e) {}
                }

                if (typeof window.realtimeSync._restDelete === 'function') {
                    try {
                        await window.realtimeSync._restDelete(`goride_pending_drivers/${driverId}`);
                        await window.realtimeSync._restPatch(`goride_drivers/${driverId}`, cloudUpdate);
                        await window.realtimeSync._restPatch(`goride_users/${driverId}`, cloudUpdate);
                    } catch (e) {}
                }
            }

            this.showToast(approved 
                ? `Đã phê duyệt tài xế "${applicant ? applicant.name : driverId}" thành công! Tài khoản đã được kích hoạt.` 
                : 'Đã từ chối hồ sơ đăng ký tài xế.', 
                approved ? 'success' : 'info'
            );

            if (card) card.remove();
            
            // 7. Reload badge, pending approvals, driver list, and dashboard
            await this.loadDriverApprovals();
            await this.loadDriversList();
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
       CUSTOMER / USER ACCOUNT MANAGEMENT SYSTEM
       ========================================================================== */

    setupCustomerFilters() {
        const searchInput = document.getElementById('customer-search-input');
        const roleFilter = document.getElementById('customer-role-filter');
        const statusFilter = document.getElementById('customer-status-filter');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterCustomers());
        }
        if (roleFilter) {
            roleFilter.addEventListener('change', () => this.filterCustomers());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterCustomers());
        }
    }

    resetCustomerFilters() {
        const searchInput = document.getElementById('customer-search-input');
        const roleFilter = document.getElementById('customer-role-filter');
        const statusFilter = document.getElementById('customer-status-filter');
        if (searchInput) searchInput.value = '';
        if (roleFilter) roleFilter.value = 'all';
        if (statusFilter) statusFilter.value = 'all';
        this.filterCustomers();
    }

    async getStoredCustomers() {
        const userMap = new Map();
        const deletedIds = new Set(this.getDeletedUserIds().map(x => String(x).toLowerCase().trim()));
        const isUserDeleted = (u) => {
            if (!u) return true;
            if (u.id && deletedIds.has(String(u.id).toLowerCase().trim())) return true;
            return false;
        };

        // 1. Fetch from C++ Backend API if reachable
        if (typeof apiClient !== 'undefined') {
            try {
                const res = await apiClient.get('/admin/users');
                if (res && res.data && Array.isArray(res.data.users)) {
                    res.data.users.forEach(u => {
                        if (u && u.id && !isUserDeleted(u)) {
                            userMap.set(u.id, u);
                        }
                    });
                }
            } catch (e) {}
        }

        // 2. Query Firebase Realtime Cloud goride_users
        if (window.realtimeSync) {
            try {
                if (window.realtimeSync.isAvailable()) {
                    const snap = await window.realtimeSync.db.ref('goride_users').once('value');
                    const cloudUsers = snap.val() || {};
                    Object.values(cloudUsers).forEach(u => {
                        if (u && (u.id || u.email)) {
                            if (isUserDeleted(u)) {
                                try {
                                    if (u.id) window.realtimeSync.db.ref(`goride_users/${u.id}`).remove();
                                } catch (e) {}
                                return;
                            }
                            const key = u.id || u.email;
                            userMap.set(key, { ...userMap.get(key), ...u });
                        }
                    });
                }
                // Dual REST fallback for customers
                if (typeof window.realtimeSync._restGet === 'function') {
                    const restUsers = await window.realtimeSync._restGet('goride_users');
                    if (restUsers && typeof restUsers === 'object') {
                        Object.values(restUsers).forEach(u => {
                            if (u && (u.id || u.email)) {
                                if (isUserDeleted(u)) return;
                                const key = u.id || u.email;
                                userMap.set(key, { ...userMap.get(key), ...u });
                            }
                        });
                    }
                }
            } catch (e) {}
        }

        // 3. Query localStorage goride_offline_users
        try {
            const offline = JSON.parse(localStorage.getItem('goride_offline_users') || '[]');
            offline.forEach(u => {
                if (u && (u.id || u.email)) {
                    if (isUserDeleted(u)) return;
                    const key = u.id || u.email;
                    userMap.set(key, { ...u, ...userMap.get(key) });
                }
            });
        } catch (e) {}

        // Baseline admin account (no hardcoded demo customer so deleted customers never resurrect)
        const defaultAccounts = [
            {
                id: 'adm_admin',
                name: 'Quản trị viên Hệ thống',
                email: 'admin@navigo.vn',
                phone: '0988888888',
                role: 'admin',
                status: 'active',
                createdAt: '2025-01-01T00:00:00.000Z'
            }
        ];
        defaultAccounts.forEach(da => {
            if (!isUserDeleted(da) && !userMap.has(da.id) && !userMap.has(da.email)) {
                userMap.set(da.id, da);
            }
        });

        return Array.from(userMap.values()).filter(u => !isUserDeleted(u));
    }

    async loadCustomers() {
        const tbody = document.getElementById('customers-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding:28px; color:var(--color-gray-500);">Đang đồng bộ dữ liệu người dùng từ máy chủ và đám mây...</td></tr>';
        }

        this.cachedCustomers = await this.getStoredCustomers();
        this.filterCustomers();
        this.updateCustomerMetrics();
    }

    filterCustomers() {
        if (!this.cachedCustomers) return;

        const searchInput = document.getElementById('customer-search-input');
        const roleFilter = document.getElementById('customer-role-filter');
        const statusFilter = document.getElementById('customer-status-filter');

        const query = (searchInput?.value || '').toLowerCase().trim();
        const role = roleFilter?.value || 'all';
        const status = statusFilter?.value || 'all';

        const filtered = this.cachedCustomers.filter(c => {
            const matchRole = (role === 'all') || (c.role === role);
            const matchStatus = (status === 'all') || ((c.status || 'active') === status);
            const matchQuery = !query ||
                (c.name && c.name.toLowerCase().includes(query)) ||
                (c.email && c.email.toLowerCase().includes(query)) ||
                (c.phone && c.phone.includes(query)) ||
                (c.id && c.id.toLowerCase().includes(query));
            return matchRole && matchStatus && matchQuery;
        });

        this.renderCustomersTable(filtered);
    }

    updateCustomerMetrics() {
        const list = this.cachedCustomers || [];
        const activeCount = list.filter(c => (c.status || 'active') === 'active').length;
        const lockedCount = list.filter(c => c.status === 'locked').length;
        const adminCount = list.filter(c => c.role === 'admin').length;

        const statTotal = document.getElementById('stat-total-customers');
        const statActive = document.getElementById('stat-active-customers');
        const statAdmin = document.getElementById('stat-admin-users');
        const statLocked = document.getElementById('stat-locked-customers');
        const sidebarCount = document.getElementById('sidebar-customers-count');

        if (statTotal) statTotal.textContent = list.length;
        if (statActive) statActive.textContent = activeCount;
        if (statAdmin) statAdmin.textContent = adminCount;
        if (statLocked) statLocked.textContent = lockedCount;
        if (sidebarCount) sidebarCount.textContent = list.length;
    }

    renderCustomersTable(customers) {
        const tbody = document.getElementById('customers-table-body');
        if (!tbody) return;

        if (!customers || customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding:28px; color:var(--color-gray-500);">Không tìm thấy tài khoản người dùng phù hợp.</td></tr>';
            return;
        }

        // Count completed trips per customer
        const trips = this.getStoredTrips();
        const tripCountMap = new Map();
        trips.forEach(t => {
            if (t && this.isCompletedTrip(t)) {
                if (t.customerId) tripCountMap.set(t.customerId, (tripCountMap.get(t.customerId) || 0) + 1);
                if (t.customerPhone) tripCountMap.set(t.customerPhone, (tripCountMap.get(t.customerPhone) || 0) + 1);
                if (t.customerEmail) tripCountMap.set(t.customerEmail, (tripCountMap.get(t.customerEmail) || 0) + 1);
            }
        });

        tbody.innerHTML = customers.map(u => {
            const isAdmin = u.role === 'admin';
            const isLocked = u.status === 'locked';
            const completedCount = tripCountMap.get(u.id) || tripCountMap.get(u.phone) || tripCountMap.get(u.email) || 0;
            const createdDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '--';
            const avatarInitial = (u.name || 'U').charAt(0).toUpperCase();
            const avatarHtml = u.avatar || u.avatar_path
                ? `<img src="${u.avatar || u.avatar_path}" alt="" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">`
                : `<div class="avatar avatar-sm" style="width:32px; height:32px; border-radius:50%; background:${isAdmin ? '#ef4444' : '#0288d1'}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px;">${avatarInitial}</div>`;

            return `
                <tr id="customer-row-${u.id}">
                    <td style="font-family:monospace; font-weight:700; color:var(--color-gray-600); font-size:0.75rem; max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="#${this.escapeHtml(u.id || '--')}">#${this.escapeHtml(u.id || '--')}</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                            ${avatarHtml}
                            <div style="min-width:0;">
                                <div style="font-weight:700; color:#0f172a; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${this.escapeHtml(u.name || 'Người dùng')}">${this.escapeHtml(u.name || 'Người dùng')}</div>
                                <div style="font-size:0.72rem; color:#64748b; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${this.escapeHtml(u.email || '--')}">${this.escapeHtml(u.email || '--')}</div>
                            </div>
                        </div>
                    </td>
                    <td style="font-weight:600; font-family:monospace; color:#334155; white-space:nowrap;">${this.escapeHtml(u.phone || '--')}</td>
                    <td style="font-size:0.8rem; color:#475569; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${this.escapeHtml(u.email || '--')}">${this.escapeHtml(u.email || '--')}</td>
                    <td>
                        <span class="badge ${isAdmin ? 'badge-danger' : 'badge-info'}" style="font-weight:700; font-size:0.72rem; padding:3px 8px; white-space:nowrap;">
                            ${isAdmin ? '👑 Quản trị viên' : '👤 Khách hàng'}
                        </span>
                    </td>
                    <td style="font-weight:700; color:#0f766e; text-align:center; white-space:nowrap;">${completedCount} chuyến</td>
                    <td>
                        <span class="badge ${isLocked ? 'badge-danger' : 'badge-success'}" style="font-size:0.72rem; padding:3px 8px; white-space:nowrap;">
                            ${isLocked ? '🔒 Đã khóa' : '🟢 Hoạt động'}
                        </span>
                    </td>
                    <td style="font-size:0.75rem; color:#64748b; white-space:nowrap;">${createdDate}</td>
                    <td class="td-actions" style="text-align:right;">
                        <div class="table-actions" style="display:flex; gap:6px; justify-content:flex-end; align-items:center;">
                            <button type="button" class="btn btn-sm ${isAdmin ? 'btn-ghost' : 'btn-primary'}" 
                                style="font-size:0.74rem; padding:4px 8px; border-radius:6px; font-weight:700; white-space:nowrap;"
                                onclick="adminController.toggleAdminRole('${u.id}')"
                                title="${isAdmin ? 'Hạ quyền xuống Khách hàng' : 'Thăng cấp lên Quản trị viên (Admin)'}">
                                ${isAdmin ? '🔻 Bỏ Admin' : '⭐ Quyền Admin'}
                            </button>
                            <button type="button" class="btn btn-sm ${isLocked ? 'btn-success' : 'btn-ghost'}"
                                style="font-size:0.74rem; padding:4px 8px; border-radius:6px; font-weight:700; white-space:nowrap;"
                                onclick="adminController.toggleCustomerLock('${u.id}')"
                                title="${isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản này'}">
                                ${isLocked ? '🔓 Mở khóa' : '🔒 Khóa'}
                            </button>
                            <button type="button" class="btn-action-edit" onclick="adminController.openEditCustomerModal('${u.id}')" title="Sửa thông tin" style="flex-shrink:0;">
                                ✏️
                            </button>
                            <button type="button" class="btn-action-delete" onclick="adminController.openDeleteModal('customer', '${u.id}')" title="Xóa tài khoản sạch hoàn toàn" style="flex-shrink:0;">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async toggleAdminRole(userId) {
        if (!userId) return;
        const user = (this.cachedCustomers || []).find(c => c.id === userId);
        if (!user) return;

        const newRole = user.role === 'admin' ? 'customer' : 'admin';
        const roleLabel = newRole === 'admin' ? 'Quản trị viên (Admin)' : 'Khách hàng';

        if (!confirm(`Bạn có chắc muốn chuyển vai trò của tài khoản "${user.name}" thành ${roleLabel}?`)) {
            return;
        }

        try {
            user.role = newRole;

            // 1. Update SQLite backend if available
            if (typeof apiClient !== 'undefined') {
                try {
                    await apiClient.post('/admin/users/role', { userId, role: newRole });
                } catch (e) {}
            }

            // 2. Update Firebase Realtime Cloud
            if (window.realtimeSync && window.realtimeSync.isAvailable()) {
                try {
                    await window.realtimeSync.db.ref(`goride_users/${userId}`).update({
                        role: newRole,
                        updatedAt: new Date().toISOString()
                    });
                } catch (e) {}
            }

            // 3. Update localStorage goride_offline_users
            try {
                const users = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USERS) || '[]');
                const idx = users.findIndex(u => u.id === userId || (user.email && u.email === user.email));
                if (idx !== -1) {
                    users[idx].role = newRole;
                    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
                }
            } catch (e) {}

            this.showToast(`Đã chuyển vai trò tài khoản thành ${roleLabel}!`, 'success');
            this.filterCustomers();
            this.updateCustomerMetrics();
        } catch (err) {
            this.showToast('Lỗi cập nhật quyền: ' + err.message, 'error');
        }
    }

    async toggleCustomerLock(userId) {
        if (!userId) return;
        const user = (this.cachedCustomers || []).find(c => c.id === userId);
        if (!user) return;

        const newStatus = user.status === 'locked' ? 'active' : 'locked';
        const statusLabel = newStatus === 'locked' ? 'Khóa' : 'Mở khóa';

        try {
            user.status = newStatus;

            // 1. Update SQLite backend if available
            if (typeof apiClient !== 'undefined') {
                try {
                    await apiClient.post('/admin/users/status', { userId, status: newStatus });
                } catch (e) {}
            }

            // 2. Update Firebase Realtime Cloud
            if (window.realtimeSync && window.realtimeSync.isAvailable()) {
                try {
                    await window.realtimeSync.db.ref(`goride_users/${userId}`).update({
                        status: newStatus,
                        updatedAt: new Date().toISOString()
                    });
                } catch (e) {}
            }

            // 3. Update localStorage goride_offline_users
            try {
                const users = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USERS) || '[]');
                const idx = users.findIndex(u => u.id === userId || (user.email && u.email === user.email));
                if (idx !== -1) {
                    users[idx].status = newStatus;
                    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
                }
            } catch (e) {}

            this.showToast(`Đã ${statusLabel.toLowerCase()} tài khoản "${user.name}" thành công!`, 'success');
            this.filterCustomers();
            this.updateCustomerMetrics();
        } catch (err) {
            this.showToast('Lỗi thay đổi trạng thái: ' + err.message, 'error');
        }
    }

    openAddCustomerModal() {
        document.getElementById('modal-customer-title').textContent = 'Thêm tài khoản mới';
        document.getElementById('customer-form-id').value = '';
        document.getElementById('customer-form-name').value = '';
        document.getElementById('customer-form-email').value = '';
        document.getElementById('customer-form-phone').value = '';
        document.getElementById('customer-form-role').value = 'customer';
        document.getElementById('customer-form-status').value = 'active';
        this.openModal('modal-customer');
    }

    openEditCustomerModal(userId) {
        const user = (this.cachedCustomers || []).find(c => c.id === userId);
        if (!user) return;

        document.getElementById('modal-customer-title').textContent = 'Sửa thông tin tài khoản #' + userId;
        document.getElementById('customer-form-id').value = user.id || '';
        document.getElementById('customer-form-name').value = user.name || '';
        document.getElementById('customer-form-email').value = user.email || '';
        document.getElementById('customer-form-phone').value = user.phone || '';
        document.getElementById('customer-form-role').value = user.role || 'customer';
        document.getElementById('customer-form-status').value = user.status || 'active';
        this.openModal('modal-customer');
    }

    async saveCustomer(e) {
        e.preventDefault();
        const id = document.getElementById('customer-form-id').value.trim();
        const name = document.getElementById('customer-form-name').value.trim();
        const email = document.getElementById('customer-form-email').value.trim();
        const phone = document.getElementById('customer-form-phone').value.trim();
        const role = document.getElementById('customer-form-role').value;
        const status = document.getElementById('customer-form-status').value;

        if (!name || !email || !phone) {
            this.showToast('Vui lòng nhập đầy đủ các trường bắt buộc (*)', 'error');
            return;
        }

        const isEdit = !!id;
        const userId = isEdit ? id : `usr_${Date.now().toString(36)}`;
        const customerData = {
            id: userId,
            name,
            email,
            phone,
            role,
            status,
            updatedAt: new Date().toISOString()
        };

        if (!isEdit) {
            customerData.createdAt = new Date().toISOString();
        }

        try {
            // 1. Firebase Cloud Sync
            if (window.realtimeSync && window.realtimeSync.isAvailable()) {
                await window.realtimeSync.db.ref(`goride_users/${userId}`).update(customerData);
            }

            // 2. localStorage Sync
            const users = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USERS) || '[]');
            const idx = users.findIndex(u => u.id === userId || (email && u.email === email));
            if (idx !== -1) {
                users[idx] = { ...users[idx], ...customerData };
            } else {
                users.unshift(customerData);
            }
            localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));

            this.showToast(isEdit ? 'Đã cập nhật thông tin tài khoản!' : 'Đã tạo tài khoản người dùng mới thành công!', 'success');
            this.closeModal('modal-customer');
            await this.loadCustomers();
        } catch (err) {
            this.showToast('Lỗi lưu tài khoản: ' + err.message, 'error');
        }
    }

    /* ==========================================================================
       DELETE CONFIRMATION DIALOG (FOR TRIPS, DRIVERS & CUSTOMERS)
       ========================================================================== */

    openDeleteModal(type, id) {
        this.deleteTarget = { type, id };
        const msgEl = document.getElementById('delete-modal-msg');
        if (msgEl) {
            if (type === 'trip') {
                msgEl.textContent = `Bạn có chắc chắn muốn xóa chuyến đi #${id} khỏi hệ thống dữ liệu?`;
            } else if (type === 'driver') {
                msgEl.textContent = `Bạn có chắc chắn muốn xóa tài xế #${id} khỏi danh sách?`;
            } else if (type === 'customer') {
                msgEl.textContent = `Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản #${id}? Toàn bộ dữ liệu của người dùng này trong hệ thống và đám mây sẽ bị xóa sạch hoàn toàn.`;
            }
        }

        const confirmBtn = document.getElementById('btn-confirm-delete');
        if (confirmBtn) {
            confirmBtn.onclick = () => this.confirmDelete();
        }

        this.openModal('modal-delete');
    }

    async confirmDelete() {
        if (!this.deleteTarget) return;
        const { type, id } = this.deleteTarget;

        if (type === 'trip') {
            this.addDeletedTripId(id);

            let trips = this.getStoredTrips();
            trips = trips.filter(t => t && t.id !== id);
            this.saveStoredTrips(trips);

            // Clean active trip if matching
            try {
                const activeTrip = JSON.parse(localStorage.getItem('goride_active_trip'));
                if (activeTrip && (activeTrip.id === id || activeTrip.tripId === id)) {
                    localStorage.removeItem('goride_active_trip');
                }
            } catch (e) {}

            // Permanently remove from Firebase Cloud
            if (window.realtimeSync && window.realtimeSync.isAvailable()) {
                try {
                    window.realtimeSync.db.ref('goride_trips/' + id).remove();
                } catch (e) {}
            }

            this.loadTripsTable();
            this.loadRecentTripsTable();
            this.loadDashboard();
            this.showToast(`Đã xóa vĩnh viễn chuyến đi #${id}!`, 'info');
        } else if (type === 'driver') {
            let drivers = this.getStoredDrivers();
            const targetDriver = drivers.find(d => d && d.id === id);
            this.addDeletedUserId(id);

            drivers = drivers.filter(d => d && d.id !== id);
            this.saveStoredDrivers(drivers);

            // Clean from backend API
            if (typeof apiClient !== 'undefined') {
                try {
                    apiClient.post('/admin/users/delete', { userId: id });
                } catch (e) {}
            }

            // Also clean from pending, offline users, online, and Firebase
            try {
                let pending = this.getPendingDrivers();
                pending = pending.filter(d => d && d.id !== id);
                this.savePendingDrivers(pending);

                let users = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USERS) || '[]');
                users = users.filter(u => u && u.id !== id && (!targetDriver?.email || u.email !== targetDriver.email));
                localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));

                let online = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ONLINE_DRIVERS) || '{}');
                delete online[id];
                localStorage.setItem(this.STORAGE_KEYS.ONLINE_DRIVERS, JSON.stringify(online));

                if (window.realtimeSync && typeof window.realtimeSync.deleteUser === 'function') {
                    window.realtimeSync.deleteUser(id, targetDriver?.email);
                } else if (window.realtimeSync && window.realtimeSync.isAvailable()) {
                    window.realtimeSync.db.ref('goride_users/' + id).remove();
                    window.realtimeSync.db.ref('goride_drivers/' + id).remove();
                    window.realtimeSync.db.ref('goride_pending_drivers/' + id).remove();
                    window.realtimeSync.db.ref('goride_online_drivers/' + id).remove();
                }
            } catch (e) {}

            this.loadDriversList();
            this.loadDriverApprovals();
            this.loadDashboard();
            this.showToast(`Đã xóa vĩnh viễn tài xế #${id} khỏi hệ thống!`, 'info');
        } else if (type === 'customer') {
            try {
                const targetCustomer = (this.cachedCustomers || []).find(c => c.id === id);

                // 1. Record in blacklisted/deleted user IDs so mock never resurrects
                this.addDeletedUserId(id);

                // 2. Delete from SQLite Backend API
                if (typeof apiClient !== 'undefined') {
                    try {
                        await apiClient.post('/admin/users/delete', { userId: id });
                    } catch (e) {}
                }

                // 3. Delete cleanly from Firebase Realtime Cloud via RealtimeSyncManager
                if (window.realtimeSync && typeof window.realtimeSync.deleteUser === 'function') {
                    await window.realtimeSync.deleteUser(id, targetCustomer?.email);
                } else if (window.realtimeSync && window.realtimeSync.isAvailable()) {
                    window.realtimeSync.db.ref(`goride_users/${id}`).remove();
                    window.realtimeSync.db.ref(`goride_drivers/${id}`).remove();
                    window.realtimeSync.db.ref(`goride_pending_drivers/${id}`).remove();
                    window.realtimeSync.db.ref(`goride_online_drivers/${id}`).remove();
                }

                // 4. Purge cleanly from localStorage
                let users = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USERS) || '[]');
                users = users.filter(u => !(u && (u.id === id || (targetCustomer && targetCustomer.email && u.email === targetCustomer.email))));
                localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));

                let adminDrivers = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.DRIVERS) || '[]');
                adminDrivers = adminDrivers.filter(d => !(d && (d.id === id || (targetCustomer && targetCustomer.email && d.email === targetCustomer.email))));
                localStorage.setItem(this.STORAGE_KEYS.DRIVERS, JSON.stringify(adminDrivers));

                let pending = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PENDING) || '[]');
                pending = pending.filter(p => !(p && (p.id === id || (targetCustomer && targetCustomer.email && p.email === targetCustomer.email))));
                localStorage.setItem(this.STORAGE_KEYS.PENDING, JSON.stringify(pending));

                let online = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ONLINE_DRIVERS) || '{}');
                delete online[id];
                localStorage.setItem(this.STORAGE_KEYS.ONLINE_DRIVERS, JSON.stringify(online));

                // Clean session if current user was deleted
                try {
                    const cur = JSON.parse(sessionStorage.getItem('ride_rtree_user') || 'null');
                    if (cur && (cur.id === id || (targetCustomer?.email && cur.email === targetCustomer.email))) {
                        sessionStorage.removeItem('ride_rtree_user');
                        sessionStorage.removeItem('ride_rtree_token');
                    }
                } catch (e) {}

                // Clean cached list & DOM immediately
                if (this.cachedCustomers) {
                    this.cachedCustomers = this.cachedCustomers.filter(c => c.id !== id && (!targetCustomer?.email || c.email !== targetCustomer.email));
                }
                const domRow = document.getElementById(`customer-row-${id}`);
                if (domRow) domRow.remove();

                this.showToast(`Đã xóa vĩnh viễn tài khoản #${id} và dọn dẹp sạch toàn bộ database.`, 'info');
                await this.loadCustomers();
                this.loadDriversList();
                this.loadDriverApprovals();
                this.loadDashboard();
            } catch (err) {
                this.showToast('Lỗi xóa tài khoản: ' + err.message, 'error');
            }
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
        const s = String(status || '').toLowerCase().trim();
        const map = {
            'completed': { label: 'Hoàn thành', cls: 'badge-success' },
            'finished': { label: 'Hoàn thành', cls: 'badge-success' },
            'finish': { label: 'Hoàn thành', cls: 'badge-success' },
            'done': { label: 'Hoàn thành', cls: 'badge-success' },
            'in_progress': { label: 'Đang di chuyển', cls: 'badge-primary' },
            'accepted': { label: 'Đã nhận', cls: 'badge-primary' },
            'requested': { label: 'Đang tìm xe', cls: 'badge-warning' },
            'offered': { label: 'Đang tìm xe', cls: 'badge-warning' },
            'cancelled': { label: 'Đã hủy', cls: 'badge-danger' },
            'canceled': { label: 'Đã hủy', cls: 'badge-danger' }
        };
        return map[s] || { label: status || 'Chờ', cls: 'badge-info' };
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
