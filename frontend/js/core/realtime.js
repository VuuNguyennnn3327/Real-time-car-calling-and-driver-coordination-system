/**
 * GoRide - Realtime Cloud Synchronization Engine (Firebase Realtime Database)
 * 
 * Kiến trúc Hybrid 2 tầng:
 * - Tầng 1: Đám mây Firebase Realtime Database (đồng bộ tức thì giữa 2 điện thoại khác nhau ở bất cứ đâu).
 * - Tầng 2: LocalStorage & Storage Event Fallback (tự động kích hoạt khi offline hoặc khi chưa nhập Firebase config).
 */

class RealtimeSyncManager {
    constructor() {
        this.initialized = false;
        this.firebaseApp = null;
        this.db = null;
        this.activeListeners = new Map();
        this.connectionStatus = 'offline'; // 'connected' | 'offline' | 'unconfigured'

        this._initFirebase();
    }

    /**
     * Khởi tạo kết nối Firebase
     * @private
     */
    _initFirebase() {
        if (typeof window === 'undefined') return;

        let config = window.NAVIGO_FIREBASE_CONFIG || window.GORIDE_FIREBASE_CONFIG;
        try {
            const saved = localStorage.getItem('navigo_firebase_config') || localStorage.getItem('goride_firebase_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && (parsed.databaseURL || parsed.projectId || parsed.apiKey)) {
                    config = parsed;
                }
            }
        } catch (e) {}

        const hasValidConfig = config && (
            (config.databaseURL && config.databaseURL.startsWith('http')) ||
            (config.projectId && config.projectId.trim().length > 0 && config.apiKey && config.apiKey.trim().length > 0)
        );

        if (!hasValidConfig) {
            this.connectionStatus = 'unconfigured';
            console.log('[RealtimeSync] Firebase chưa được cấu hình. Hệ thống đang chạy chế độ mô phỏng trình duyệt (LocalStorage).');
            return;
        }

        if (typeof firebase === 'undefined') {
            console.warn('[RealtimeSync] Firebase SDK chưa được nạp vào trang. Đang dùng fallback.');
            this.connectionStatus = 'unconfigured';
            return;
        }

        try {
            // Tránh khởi tạo duplicate apps
            if (!firebase.apps || firebase.apps.length === 0) {
                this.firebaseApp = firebase.initializeApp(config);
            } else {
                this.firebaseApp = firebase.apps[0];
            }

            this.db = firebase.database();
            this.initialized = true;
            this.connectionStatus = 'connected';
            console.log('[RealtimeSync] ✅ Đã kết nối thành công Firebase Realtime Cloud!');

            // Lắng nghe trạng thái kết nối mạng thực tế của Firebase
            const connectedRef = this.db.ref('.info/connected');
            connectedRef.on('value', (snap) => {
                const isOnline = !!snap.val();
                this.connectionStatus = isOnline ? 'connected' : 'offline';
                window.dispatchEvent(new CustomEvent('realtime:connection', { detail: { online: isOnline } }));
            });
        } catch (err) {
            console.warn('[RealtimeSync] Lỗi khởi tạo Firebase:', err.message);
            this.connectionStatus = 'offline';
        }
    }

    /**
     * Kiểm tra xem Firebase Realtime đã sẵn sàng hoạt động hay chưa
     * @returns {boolean}
     */
    isAvailable() {
        return this.initialized && this.db !== null && this.connectionStatus !== 'unconfigured';
    }

    /**
     * Lưu cấu hình Firebase người dùng nhập từ giao diện
     * @param {Object} configObj 
     */
    saveConfig(configObj) {
        try {
            localStorage.setItem('navigo_firebase_config', JSON.stringify(configObj));
            localStorage.setItem('goride_firebase_config', JSON.stringify(configObj));
            if (window.NAVIGO_FIREBASE_CONFIG) {
                Object.assign(window.NAVIGO_FIREBASE_CONFIG, configObj);
            }
            if (window.GORIDE_FIREBASE_CONFIG) {
                Object.assign(window.GORIDE_FIREBASE_CONFIG, configObj);
            }
            this._initFirebase();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Lấy cấu hình Firebase hiện tại
     */
    getConfig() {
        try {
            const saved = localStorage.getItem('navigo_firebase_config') || localStorage.getItem('goride_firebase_config');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return window.NAVIGO_FIREBASE_CONFIG || window.GORIDE_FIREBASE_CONFIG || {};
    }

    /* ==========================================================================
       TRIP LIFECYCLE (KHÁCH ĐẶT XE -> TÀI XẾ NHẬN -> ĐÓN -> TRẢ -> HOÀN THÀNH)
       ========================================================================== */

    /**
     * 1. Khách hàng tạo yêu cầu đặt chuyến
     * @param {Object} trip 
     */
    async createTrip(trip) {
        if (!trip.id) {
            trip.id = `TRP-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        }
        trip.createdAt = trip.createdAt || new Date().toISOString();
        trip.status = trip.status || 'REQUESTED';

        // Đồng bộ lên Firebase Đám mây nếu có kết nối
        if (this.isAvailable()) {
            try {
                // Lưu vào danh sách chuyến đi chung
                await this.db.ref(`goride_trips/${trip.id}`).set(trip);
                // Đưa vào danh sách cuốc xe đang chờ phát sóng cho tài xế
                await this.db.ref(`goride_active_offers/${trip.id}`).set(trip);
                console.log('[RealtimeSync] 🚀 Đã gửi cuốc xe lên Firebase Cloud:', trip.id);
            } catch (err) {
                console.warn('[RealtimeSync] Lỗi ghi Firebase createTrip:', err.message);
            }
        }

        // Luôn đồng bộ vào LocalStorage để đảm bảo mượt mà cả khi offline
        this._syncTripToLocalStorage(trip);

        return trip;
    }

    /**
     * 2. Tài xế lắng nghe các cuốc xe mới được phát sóng trong bán kính
     * @param {Function} onNewOfferCallback 
     * @returns {Function} Hàm hủy đăng ký lắng nghe (unsubscribe)
     */
    listenTripOffers(onNewOfferCallback) {
        if (this.isAvailable()) {
            const offersRef = this.db.ref('goride_active_offers');

            const handleOffer = (snapshot) => {
                const offer = snapshot.val();
                if (offer && (offer.status === 'REQUESTED' || offer.status === 'OFFERED')) {
                    onNewOfferCallback(offer);
                }
            };

            offersRef.on('child_added', handleOffer);
            offersRef.on('child_changed', handleOffer);

            return () => {
                offersRef.off('child_added', handleOffer);
                offersRef.off('child_changed', handleOffer);
            };
        }

        // Fallback: Lắng nghe qua storage event (khi mở 2 tab local)
        const storageHandler = (e) => {
            if (e.key === 'goride_pending_trip_offers') {
                try {
                    const list = JSON.parse(e.newValue || '[]');
                    if (Array.isArray(list) && list.length > 0) {
                        onNewOfferCallback(list[0]);
                    }
                } catch (err) {}
            }
        };

        window.addEventListener('storage', storageHandler);
        return () => window.removeEventListener('storage', storageHandler);
    }

    /**
     * 3. Tài xế bấm nhận cuốc xe
     * @param {string} tripId 
     * @param {Object} driverInfo - { id, name, phone, licensePlate, vehicleModel, rating, lat, lng }
     */
    async acceptTrip(tripId, driverInfo) {
        const updateData = {
            status: 'ACCEPTED',
            acceptedAt: new Date().toISOString(),
            driverId: driverInfo.id || 'drv_' + (driverInfo.phone || '0901'),
            driverName: driverInfo.name || 'Tài xế GoRide',
            driverPhone: driverInfo.phone || '0901234567',
            licensePlate: driverInfo.licensePlate || driverInfo.plate || '59-S3 889.24',
            vehicleModel: driverInfo.vehicleModel || driverInfo.model || 'Honda Wave',
            driverRating: driverInfo.rating || '5.0',
            driverLat: driverInfo.lat || 10.7769,
            driverLng: driverInfo.lng || 106.7009
        };

        if (this.isAvailable()) {
            try {
                // Cập nhật trạng thái chuyến xe
                await this.db.ref(`goride_trips/${tripId}`).update(updateData);
                // Xóa khỏi danh sách chờ nhận (để tài xế khác không thấy nữa)
                await this.db.ref(`goride_active_offers/${tripId}`).remove();
                console.log('[RealtimeSync] 🚕 Tài xế đã nhận cuốc trên Firebase:', tripId);
            } catch (err) {
                console.warn('[RealtimeSync] Lỗi acceptTrip Firebase:', err.message);
            }
        }

        // Cập nhật LocalStorage
        this._updateLocalStorageTrip(tripId, updateData);
        return updateData;
    }

    /**
     * 4. Lắng nghe trạng thái của một chuyến xe cụ thể (Dùng cho cả Khách & Tài xế)
     * @param {string} tripId 
     * @param {Function} callback 
     * @returns {Function} Hàm hủy đăng ký
     */
    listenTrip(tripId, callback) {
        if (!tripId) return () => {};

        if (this.isAvailable()) {
            const tripRef = this.db.ref(`goride_trips/${tripId}`);
            const handler = (snapshot) => {
                const val = snapshot.val();
                if (val) callback(val);
            };
            tripRef.on('value', handler);
            return () => tripRef.off('value', handler);
        }

        // Fallback: Lắng nghe qua storage event
        const storageHandler = (e) => {
            if (e.key === 'goride_active_trip' || e.key === 'goride_admin_trips') {
                try {
                    const active = JSON.parse(localStorage.getItem('goride_active_trip') || 'null');
                    if (active && active.id === tripId) {
                        callback(active);
                    }
                } catch (err) {}
            }
        };

        window.addEventListener('storage', storageHandler);
        return () => window.removeEventListener('storage', storageHandler);
    }

    /**
     * 5. Cập nhật vị trí GPS động của tài xế (Xe di chuyển trên bản đồ)
     * @param {string} tripId 
     * @param {string} driverId 
     * @param {number} lat 
     * @param {number} lng 
     * @param {number} heading - Góc xoay xe (0 - 360 độ)
     */
    async updateDriverLocation(tripId, driverId, lat, lng, heading = 0) {
        const numLat = Number(lat);
        const numLng = Number(lng);
        const loc = { lat: numLat, lng: numLng, heading: Number(heading), updatedAt: Date.now() };

        if (this.isAvailable()) {
            try {
                if (tripId) {
                    this.db.ref(`goride_trips/${tripId}/driverLocation`).set(loc);
                }
                if (driverId) {
                    this.db.ref(`goride_drivers/${driverId}`).update({
                        lat: numLat,
                        lng: numLng,
                        location: loc,
                        updatedAt: new Date().toISOString()
                    });
                }
            } catch (err) {}
        }

        // LocalStorage broadcast
        if (driverId) {
            try {
                const onlineDrivers = JSON.parse(localStorage.getItem('goride_online_drivers') || '{}');
                if (onlineDrivers[driverId]) {
                    onlineDrivers[driverId].lat = numLat;
                    onlineDrivers[driverId].lng = numLng;
                    onlineDrivers[driverId].location = loc;
                    onlineDrivers[driverId].updatedAt = new Date().toISOString();
                    localStorage.setItem('goride_online_drivers', JSON.stringify(onlineDrivers));
                }
            } catch (e) {}
        }

        if (tripId) {
            try {
                const active = JSON.parse(localStorage.getItem('goride_active_trip') || '{}');
                if (active && active.id === tripId) {
                    active.driverLocation = loc;
                    active.driverLat = numLat;
                    active.driverLng = numLng;
                    localStorage.setItem('goride_active_trip', JSON.stringify(active));
                }
            } catch (e) {}
        }
    }

    /**
     * 6. Cập nhật tiến trình chuyến xe (ARRIVED -> IN_PROGRESS -> COMPLETED -> CANCELLED)
     * @param {string} tripId 
     * @param {'ARRIVED'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED'} status 
     * @param {Object} [extraData] 
     */
    async updateTripStatus(tripId, status, extraData = {}) {
        const payload = {
            status: status.toUpperCase(),
            updatedAt: new Date().toISOString(),
            ...extraData
        };

        if (this.isAvailable()) {
            try {
                await this.db.ref(`goride_trips/${tripId}`).update(payload);
                if (status === 'COMPLETED' || status === 'CANCELLED') {
                    await this.db.ref(`goride_active_offers/${tripId}`).remove();
                }
                console.log(`[RealtimeSync] 🔄 Chuyến đi ${tripId} chuyển sang trạng thái: ${status}`);
            } catch (err) {}
        }

        this._updateLocalStorageTrip(tripId, payload);
    }

    /**
     * 7. Cập nhật trạng thái trực tuyến / ngoại tuyến của tài xế
     * @param {string} driverId 
     * @param {boolean} isOnline 
     * @param {Object} driverData 
     */
    async setDriverOnline(driverId, isOnline, driverData = {}) {
        const payload = {
            id: driverId,
            isOnline: !!isOnline,
            status: isOnline ? 'available' : 'offline',
            updatedAt: new Date().toISOString(),
            ...driverData
        };

        if (this.isAvailable()) {
            try {
                const driverRef = this.db.ref(`goride_drivers/${driverId}`);
                if (isOnline) {
                    await driverRef.set(payload);
                    // Hook tự động ngắt kết nối khi tài xế tắt trình duyệt/tab:
                    driverRef.onDisconnect().update({
                        isOnline: false,
                        status: 'offline',
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    driverRef.onDisconnect().cancel();
                    await driverRef.update({
                        isOnline: false,
                        status: 'offline',
                        updatedAt: new Date().toISOString()
                    });
                }
            } catch (err) {}
        }

        // Sync local online drivers map
        try {
            const drivers = JSON.parse(localStorage.getItem('goride_online_drivers') || '{}');
            if (isOnline) {
                drivers[driverId] = payload;
            } else {
                delete drivers[driverId];
            }
            localStorage.setItem('goride_online_drivers', JSON.stringify(drivers));
        } catch (e) {}
    }

    /**
     * 8. Lắng nghe danh sách tất cả tài xế đang trực tuyến (cho Customer & Admin)
     * Có bộ lọc TTL (2 phút): Chỉ trả về tài xế thực sự đang hoạt động, loại bỏ ghost driver.
     * @param {Function} callback 
     */
    listenOnlineDrivers(callback) {
        const isLiveDriver = (d) => {
            if (!d || d.isOnline !== true) return false;
            const lastTime = d.location?.updatedAt || (d.updatedAt ? new Date(d.updatedAt).getTime() : 0);
            // Nếu quá 2 phút không gửi tín hiệu thì coi như đã ngoại tuyến
            if (lastTime && (Date.now() - lastTime > 120000)) return false;
            return true;
        };

        const formatDriver = (d) => {
            const lat = Number(d.location?.lat !== undefined ? d.location.lat : d.lat);
            const lng = Number(d.location?.lng !== undefined ? d.location.lng : d.lng);
            return { ...d, lat, lng };
        };

        if (this.isAvailable()) {
            const driversRef = this.db.ref('goride_drivers');
            const handler = (snapshot) => {
                const data = snapshot.val() || {};
                const onlineList = Object.values(data).filter(isLiveDriver).map(formatDriver);
                callback(onlineList);
            };
            driversRef.on('value', handler);
            return () => driversRef.off('value', handler);
        }

        // Fallback local storage
        const storageHandler = (e) => {
            if (e.key === 'goride_online_drivers') {
                try {
                    const data = JSON.parse(e.newValue || '{}');
                    const list = Object.values(data).filter(isLiveDriver).map(formatDriver);
                    callback(list);
                } catch (e) {}
            }
        };
        window.addEventListener('storage', storageHandler);
        return () => window.removeEventListener('storage', storageHandler);
    }

    /**
     * 9. Dọn dẹp các tài xế ma (stale ghost drivers) trên Firebase Realtime Database
     */
    async cleanStaleDrivers() {
        if (!this.isAvailable()) return;
        try {
            const snap = await this.db.ref('goride_drivers').once('value');
            const data = snap.val() || {};
            const now = Date.now();
            Object.entries(data).forEach(([key, driver]) => {
                if (!driver) return;
                const lastTime = driver.location?.updatedAt || (driver.updatedAt ? new Date(driver.updatedAt).getTime() : 0);
                if (driver.isOnline && (!lastTime || (now - lastTime > 120000))) {
                    this.db.ref(`goride_drivers/${key}`).update({
                        isOnline: false,
                        status: 'offline',
                        updatedAt: new Date().toISOString()
                    });
                    console.log(`[RealtimeSync] Đã chuyển tài xế ma sang ngoại tuyến: ${driver.name || key}`);
                }
            });
        } catch (e) {}
    }

    /* ==========================================================================
       LOCAL STORAGE HELPERS (FALLBACK VÀ CHIA SẺ TRÌNH DUYỆT)
       ========================================================================== */

    _syncTripToLocalStorage(trip) {
        try {
            const activeData = {
                id: trip.id,
                status: (trip.status || 'REQUESTED').toUpperCase(),
                customerName: trip.customerName || 'Khách hàng',
                customerPhone: trip.customerPhone || '0901234567',
                driverName: trip.driverName || null,
                pickup: trip.pickup || { name: trip.pickupName || 'Điểm đón', lat: trip.pickupLat, lng: trip.pickupLon },
                destination: trip.destination || { name: trip.dropoffName || 'Điểm đến', lat: trip.dropoffLat, lng: trip.dropoffLon },
                fareAmount: trip.fareAmount || trip.fare || 45000,
                vehicleType: trip.vehicleType || 'car4',
                createdAt: trip.createdAt
            };

            localStorage.setItem('goride_active_trip', JSON.stringify(activeData));
            localStorage.setItem('goride_pending_trip_offers', JSON.stringify([trip]));

            const adminTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
            const idx = adminTrips.findIndex(t => t.id === trip.id);
            if (idx === -1) {
                adminTrips.unshift({
                    id: trip.id,
                    customerName: activeData.customerName,
                    customerPhone: activeData.customerPhone,
                    driverName: activeData.driverName || 'Chưa gán',
                    pickup: activeData.pickup.name,
                    destination: activeData.destination.name,
                    fare: activeData.fareAmount,
                    status: (trip.status || 'requested').toLowerCase(),
                    createdAt: trip.createdAt
                });
            }
            localStorage.setItem('goride_admin_trips', JSON.stringify(adminTrips));
        } catch (e) {}
    }

    _updateLocalStorageTrip(tripId, patch) {
        try {
            const active = JSON.parse(localStorage.getItem('goride_active_trip') || 'null');
            if (active && active.id === tripId) {
                Object.assign(active, patch);
                localStorage.setItem('goride_active_trip', JSON.stringify(active));
            }

            const adminTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
            const idx = adminTrips.findIndex(t => t.id === tripId);
            if (idx !== -1) {
                if (patch.status) adminTrips[idx].status = patch.status.toLowerCase();
                if (patch.driverName) adminTrips[idx].driverName = patch.driverName;
                if (patch.fareAmount) adminTrips[idx].fare = patch.fareAmount;
                localStorage.setItem('goride_admin_trips', JSON.stringify(adminTrips));
            }
        } catch (e) {}
    }
}

// Global Singleton Instance
const realtimeSync = new RealtimeSyncManager();

if (typeof window !== 'undefined') {
    window.RealtimeSyncManager = RealtimeSyncManager;
    window.realtimeSync = realtimeSync;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RealtimeSyncManager, realtimeSync };
}
