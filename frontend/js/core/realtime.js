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
        this.databaseURL = '';
        this.permissionDenied = false;
        this.activeListeners = new Map();
        this.connectionStatus = 'offline'; // 'connected' | 'offline' | 'unconfigured' | 'permission_denied'

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

        this.databaseURL = (config && config.databaseURL) ? config.databaseURL.replace(/\/+$/, '') : '';

        if (typeof firebase === 'undefined') {
            console.warn('[RealtimeSync] Firebase SDK chưa được nạp vào trang. Đang dùng REST fallback.');
            this.connectionStatus = 'offline';
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
            console.warn('[RealtimeSync] Lỗi khởi tạo Firebase SDK:', err.message);
            this.connectionStatus = 'offline';
        }
    }

    /**
     * Xử lý khi Firebase phản hồi lỗi phân quyền 401 (Permission Denied)
     * @private
     */
    _handlePermissionDenied(context = '') {
        this.permissionDenied = true;
        this.connectionStatus = 'permission_denied';
        console.warn(`[RealtimeSync] ⚠️ Firebase Realtime Cloud bị khóa quyền truy cập (401 Permission Denied)! ${context}`);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('realtime:permission_denied', {
                detail: {
                    databaseURL: this.databaseURL,
                    context: context,
                    message: 'Firebase Realtime Database đang khóa quyền (401 Permission Denied).'
                }
            }));
        }
    }

    /**
     * REST API Helper: GET
     */
    async _restGet(path) {
        if (!this.databaseURL) return null;
        try {
            const res = await fetch(`${this.databaseURL}/${path}.json`);
            if (res.status === 401) {
                this._handlePermissionDenied(`GET ${path}`);
                return null;
            }
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    }

    /**
     * REST API Helper: PUT
     */
    async _restPut(path, data) {
        if (!this.databaseURL) return false;
        try {
            const res = await fetch(`${this.databaseURL}/${path}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.status === 401) {
                this._handlePermissionDenied(`PUT ${path}`);
                return false;
            }
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    /**
     * REST API Helper: PATCH
     */
    async _restPatch(path, data) {
        if (!this.databaseURL) return false;
        try {
            const res = await fetch(`${this.databaseURL}/${path}.json`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.status === 401) {
                this._handlePermissionDenied(`PATCH ${path}`);
                return false;
            }
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    /**
     * REST API Helper: DELETE
     */
    async _restDelete(path) {
        if (!this.databaseURL) return false;
        try {
            const res = await fetch(`${this.databaseURL}/${path}.json`, {
                method: 'DELETE'
            });
            if (res.status === 401) {
                this._handlePermissionDenied(`DELETE ${path}`);
                return false;
            }
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    /**
     * Kiểm tra trạng thái kết nối đám mây thực tế và quyền truy cập
     */
    async testCloudConnection() {
        if (!this.databaseURL) {
            return {
                success: false,
                status: 'unconfigured',
                message: 'Chưa cấu hình Firebase databaseURL.'
            };
        }
        try {
            const readRes = await fetch(`${this.databaseURL}/goride_health_ping.json`);
            if (readRes.status === 401) {
                this._handlePermissionDenied('Test Read Ping');
                return {
                    success: false,
                    status: 401,
                    code: 'PERMISSION_DENIED',
                    message: 'Firebase Realtime Database đang bị KHÓA QUYỀN (401 Permission Denied). Vui lòng mở Rules trên Firebase Console.'
                };
            }

            const writeRes = await fetch(`${this.databaseURL}/goride_health_ping.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pingAt: new Date().toISOString(), ts: Date.now() })
            });

            if (writeRes.status === 401) {
                this._handlePermissionDenied('Test Write Ping');
                return {
                    success: false,
                    status: 401,
                    code: 'PERMISSION_DENIED',
                    message: 'Firebase Realtime Database từ chối quyền GHI (401 Permission Denied). Vui lòng cập nhật Rules trên Firebase Console.'
                };
            }

            this.permissionDenied = false;
            this.connectionStatus = 'connected';
            window.dispatchEvent(new CustomEvent('realtime:connection', { detail: { online: true, verified: true } }));
            return {
                success: true,
                status: 200,
                message: 'Kết nối Firebase Realtime Cloud thành công! Đọc và ghi hoạt động hoàn hảo đa thiết bị.'
            };
        } catch (err) {
            return {
                success: false,
                status: 'network_error',
                message: 'Không thể kết nối đến máy chủ Firebase: ' + err.message
            };
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
     * Chờ cho tới khi Firebase sẵn sàng và thực thi callback
     * @param {Function} callback 
     */
    onReady(callback) {
        if (typeof callback !== 'function') return;
        if (this.isAvailable()) {
            try { callback(); } catch (e) { console.warn('[RealtimeSync] onReady error:', e); }
            return;
        }
        const onConnect = (e) => {
            if (this.isAvailable() || (e && e.detail && e.detail.online)) {
                window.removeEventListener('realtime:connection', onConnect);
                try { callback(); } catch (err) { console.warn('[RealtimeSync] onReady error:', err); }
            }
        };
        window.addEventListener('realtime:connection', onConnect);
        let tries = 0;
        const interval = setInterval(() => {
            tries++;
            if (this.isAvailable()) {
                clearInterval(interval);
                window.removeEventListener('realtime:connection', onConnect);
                try { callback(); } catch (err) {}
            } else if (tries > 30) {
                clearInterval(interval);
            }
        }, 100);
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

        // REST fallback write to guarantee cross-device cloud sync
        if (this.databaseURL) {
            try {
                await this._restPut(`goride_trips/${trip.id}`, trip);
                await this._restPut(`goride_active_offers/${trip.id}`, trip);
            } catch (e) {}
        }

        // Luôn đồng bộ vào LocalStorage để đảm bảo mượt mà cả khi offline
        this._syncTripToLocalStorage(trip);

        return trip;
    }

    /**
     * 2. Tài xế lắng nghe các cuốc xe mới được phát sóng trong bán kính
     * Hỗ trợ đa thiết bị: Tự động gắn listener Firebase khi SDK sẵn sàng,
     * kết hợp REST initial fetch và fallback storage event.
     * @param {Function} onNewOfferCallback 
     * @returns {Function} Hàm hủy đăng ký lắng nghe (unsubscribe)
     */
    listenTripOffers(onNewOfferCallback) {
        if (typeof onNewOfferCallback !== 'function') return () => {};

        // REST initial fetch fallback (cho thiết bị khác mạng/máy chủ)
        if (this.databaseURL) {
            this._restGet('goride_active_offers').then(data => {
                if (data && typeof data === 'object') {
                    Object.values(data).forEach(offer => {
                        if (offer && (offer.status === 'REQUESTED' || offer.status === 'OFFERED')) {
                            onNewOfferCallback(offer);
                        }
                    });
                }
            }).catch(() => {});
        }

        let firebaseUnsub = null;
        const attachFirebase = () => {
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
            return null;
        };

        firebaseUnsub = attachFirebase();
        this.onReady(() => {
            if (!firebaseUnsub) {
                firebaseUnsub = attachFirebase();
            }
        });

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
        return () => {
            if (firebaseUnsub) firebaseUnsub();
            window.removeEventListener('storage', storageHandler);
        };
    }

    /**
     * 3. Tài xế bấm nhận cuốc xe (Đồng bộ đa thiết bị tức thì)
     * @param {string} tripId 
     * @param {Object} driverInfo - { id, name, phone, licensePlate, vehicleModel, rating, lat, lng }
     */
    async acceptTrip(tripId, driverInfo) {
        const dLat = Number(driverInfo.lat) || 10.7769;
        const dLng = Number(driverInfo.lng) || 106.7009;
        const updateData = {
            status: 'ACCEPTED',
            acceptedAt: new Date().toISOString(),
            driverId: driverInfo.id || 'drv_' + (driverInfo.phone || '0901'),
            driverName: driverInfo.name || 'Tài xế GoRide',
            driverPhone: driverInfo.phone || '0901234567',
            licensePlate: driverInfo.licensePlate || driverInfo.plate || '59-S3 889.24',
            vehicleModel: driverInfo.vehicleModel || driverInfo.model || 'Honda Wave',
            driverRating: driverInfo.rating || '5.0',
            driverLat: dLat,
            driverLng: dLng,
            driverLon: dLng,
            driverLocation: {
                lat: dLat,
                lng: dLng,
                heading: 0,
                updatedAt: Date.now()
            }
        };

        // 1. Firebase SDK update
        if (this.isAvailable()) {
            try {
                await this.db.ref(`goride_trips/${tripId}`).update(updateData);
                await this.db.ref(`goride_active_offers/${tripId}`).remove();
                console.log('[RealtimeSync] 🚕 Tài xế đã nhận cuốc trên Firebase SDK:', tripId);
            } catch (err) {
                console.warn('[RealtimeSync] Lỗi acceptTrip Firebase SDK:', err.message);
            }
        }

        // 2. Dual REST fallback write to guarantee cross-device delivery
        if (this.databaseURL) {
            try {
                await this._restPatch(`goride_trips/${tripId}`, updateData);
                await this._restDelete(`goride_active_offers/${tripId}`);
            } catch (e) {}
        }

        // 3. LocalStorage sync
        this._updateLocalStorageTrip(tripId, updateData);
        return updateData;
    }

    /**
     * 4. Lắng nghe trạng thái của một chuyến xe cụ thể (Dùng cho cả Khách & Tài xế qua Đám mây)
     * @param {string} tripId 
     * @param {Function} callback 
     * @returns {Function} Hàm hủy đăng ký
     */
    listenTrip(tripId, callback) {
        if (!tripId || typeof callback !== 'function') return () => {};

        // REST initial fetch fallback
        if (this.databaseURL) {
            this._restGet(`goride_trips/${tripId}`).then(val => {
                if (val) callback(val);
            }).catch(() => {});
        }

        let firebaseUnsub = null;
        const attachFirebase = () => {
            if (this.isAvailable()) {
                const tripRef = this.db.ref(`goride_trips/${tripId}`);
                const handler = (snapshot) => {
                    const val = snapshot.val();
                    if (val) callback(val);
                };
                tripRef.on('value', handler);
                return () => tripRef.off('value', handler);
            }
            return null;
        };

        firebaseUnsub = attachFirebase();
        this.onReady(() => {
            if (!firebaseUnsub) {
                firebaseUnsub = attachFirebase();
            }
        });

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
        return () => {
            if (firebaseUnsub) firebaseUnsub();
            window.removeEventListener('storage', storageHandler);
        };
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

        // Dual REST fallback write
        if (this.databaseURL) {
            try {
                await this._restPatch(`goride_trips/${tripId}`, payload);
                if (status === 'COMPLETED' || status === 'CANCELLED') {
                    await this._restDelete(`goride_active_offers/${tripId}`);
                }
            } catch (e) {}
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

        // Dual REST fallback write
        if (this.databaseURL) {
            try {
                if (isOnline) {
                    await this._restPut(`goride_drivers/${driverId}`, payload);
                } else {
                    await this._restPatch(`goride_drivers/${driverId}`, {
                        isOnline: false,
                        status: 'offline',
                        updatedAt: new Date().toISOString()
                    });
                }
            } catch (e) {}
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
        if (typeof callback !== 'function') return () => {};

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

        // REST initial fetch fallback
        if (this.databaseURL) {
            this._restGet('goride_drivers').then(data => {
                if (data && typeof data === 'object') {
                    const onlineList = Object.values(data).filter(isLiveDriver).map(formatDriver);
                    if (onlineList.length > 0) callback(onlineList);
                }
            }).catch(() => {});
        }

        let firebaseUnsub = null;
        const attachFirebase = () => {
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
            return null;
        };

        firebaseUnsub = attachFirebase();
        this.onReady(() => {
            if (!firebaseUnsub) {
                firebaseUnsub = attachFirebase();
            }
        });

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
        return () => {
            if (firebaseUnsub) firebaseUnsub();
            window.removeEventListener('storage', storageHandler);
        };
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
       USER & DRIVER CLOUD SYNCHRONIZATION (CROSS-DEVICE SYNC)
       ========================================================================== */

    /**
     * 10. Đăng ký tài khoản người dùng hoặc tài xế lên Firebase Realtime Database
     * Đảm bảo đồng bộ tức thì sang thiết bị khác (Admin PC nhận hồ sơ tài xế ngay)
     * @param {Object} user 
     */
    async registerUser(user) {
        if (!user || !user.id) return user;

        let syncedToCloud = false;

        // 1. Firebase SDK Write
        if (this.isAvailable()) {
            try {
                // Lưu vào danh bạ người dùng hệ thống
                await this.db.ref(`goride_users/${user.id}`).set(user);

                // Nếu là tài xế, đưa vào hàng đợi chờ duyệt của Quản trị viên
                if (user.role === 'driver') {
                    const pendingData = {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        vehicleType: user.vehicleType || user.vehicle?.type || 'motorbike',
                        plate: user.licensePlate || user.plate || user.vehicle?.plate || '--',
                        experienceYears: user.experienceYears || user.experience || 1,
                        status: 'pending',
                        createdAt: user.createdAt || new Date().toISOString()
                    };
                    await this.db.ref(`goride_pending_drivers/${user.id}`).set(pendingData);
                    await this.db.ref(`goride_drivers/${user.id}`).set({
                        ...pendingData,
                        isOnline: false,
                        walletBalance: 0,
                        rating: 5.0,
                        totalRides: 0
                    });
                }
                syncedToCloud = true;
                console.log('[RealtimeSync] 🚀 Đã đồng bộ tài khoản người dùng lên Firebase SDK:', user.id);
            } catch (err) {
                if (err.message && err.message.includes('PERMISSION_DENIED')) {
                    this._handlePermissionDenied('registerUser SDK');
                }
                console.warn('[RealtimeSync] Lỗi lưu Firebase SDK registerUser:', err.message);
            }
        }

        // 2. Dual REST fallback write to ensure cloud persistence even if SDK had issues
        if (!syncedToCloud && this.databaseURL) {
            try {
                const putUser = await this._restPut(`goride_users/${user.id}`, user);
                if (putUser && user.role === 'driver') {
                    const pendingData = {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        vehicleType: user.vehicleType || user.vehicle?.type || 'motorbike',
                        plate: user.licensePlate || user.plate || user.vehicle?.plate || '--',
                        experienceYears: user.experienceYears || user.experience || 1,
                        status: 'pending',
                        createdAt: user.createdAt || new Date().toISOString()
                    };
                    await this._restPut(`goride_pending_drivers/${user.id}`, pendingData);
                    await this._restPut(`goride_drivers/${user.id}`, {
                        ...pendingData,
                        isOnline: false,
                        walletBalance: 0,
                        rating: 5.0,
                        totalRides: 0
                    });
                }
                if (putUser) syncedToCloud = true;
            } catch (restErr) {}
        }

        user._syncedToCloud = syncedToCloud;
        return user;
    }

    /**
     * 11. Lắng nghe danh sách hồ sơ tài xế đang chờ duyệt từ Firebase (Real-time Cloud)
     * @param {Function} callback 
     */
    listenPendingDrivers(callback) {
        if (typeof callback !== 'function') return () => {};

        // REST initial fetch fallback
        if (this.databaseURL) {
            this._restGet('goride_pending_drivers').then(data => {
                if (data && typeof data === 'object') {
                    const list = Object.values(data).filter(d => d && (d.status === 'pending' || !d.status));
                    if (list.length > 0) callback(list);
                }
            }).catch(() => {});
        }

        const attachListener = () => {
            if (this.isAvailable()) {
                const pendingRef = this.db.ref('goride_pending_drivers');
                const handler = (snapshot) => {
                    const data = snapshot.val() || {};
                    const list = Object.values(data).filter(d => d && (d.status === 'pending' || !d.status));
                    callback(list);
                };
                pendingRef.on('value', handler);
                return () => pendingRef.off('value', handler);
            }
            return null;
        };

        let unsub = attachListener();

        // Nếu Firebase kết nối sau, tự động gắn listener
        this.onReady(() => {
            if (!unsub) {
                unsub = attachListener();
            }
        });

        // Fallback local storage
        const storageHandler = (e) => {
            if (e.key === 'goride_pending_drivers') {
                try {
                    const list = JSON.parse(e.newValue || '[]');
                    callback(list);
                } catch (err) {}
            }
        };
        window.addEventListener('storage', storageHandler);

        return () => {
            if (unsub) unsub();
            window.removeEventListener('storage', storageHandler);
        };
    }

    /**
     * 12. Lắng nghe danh sách tất cả tài khoản người dùng từ Firebase (Khách hàng & Admin)
     * @param {Function} callback 
     */
    listenUsers(callback) {
        if (typeof callback !== 'function') return () => {};

        // REST initial fetch fallback
        if (this.databaseURL) {
            this._restGet('goride_users').then(data => {
                if (data && typeof data === 'object') {
                    const list = Object.values(data).filter(u => u && u.id);
                    if (list.length > 0) callback(list);
                }
            }).catch(() => {});
        }

        const attachListener = () => {
            if (this.isAvailable()) {
                const usersRef = this.db.ref('goride_users');
                const handler = (snapshot) => {
                    const data = snapshot.val() || {};
                    const list = Object.values(data).filter(u => u && u.id);
                    callback(list);
                };
                usersRef.on('value', handler);
                return () => usersRef.off('value', handler);
            }
            return null;
        };

        let unsub = attachListener();
        this.onReady(() => {
            if (!unsub) {
                unsub = attachListener();
            }
        });

        const storageHandler = (e) => {
            if (e.key === 'goride_offline_users') {
                try {
                    const list = JSON.parse(e.newValue || '[]');
                    callback(list);
                } catch (err) {}
            }
        };
        window.addEventListener('storage', storageHandler);

        return () => {
            if (unsub) unsub();
            window.removeEventListener('storage', storageHandler);
        };
    }

    /**
     * 13. Cập nhật vai trò người dùng (Ví dụ: Thêm quyền Admin hoặc chuyển về Khách hàng)
     * @param {string} userId 
     * @param {'customer'|'driver'|'admin'} newRole 
     */
    async updateUserRole(userId, newRole) {
        if (!userId) return false;
        const patch = {
            role: newRole,
            updatedAt: new Date().toISOString()
        };

        if (this.isAvailable()) {
            try {
                await this.db.ref(`goride_users/${userId}`).update(patch);
                console.log(`[RealtimeSync] Đã cập nhật quyền người dùng ${userId} -> ${newRole}`);
            } catch (e) {
                if (e.message && e.message.includes('PERMISSION_DENIED')) this._handlePermissionDenied('updateUserRole');
                console.warn('[RealtimeSync] Lỗi updateUserRole:', e.message);
            }
        }
        await this._restPatch(`goride_users/${userId}`, patch);

        // Local storage sync
        try {
            const users = JSON.parse(localStorage.getItem('goride_offline_users') || '[]');
            const idx = users.findIndex(u => u.id === userId);
            if (idx !== -1) {
                users[idx].role = newRole;
                localStorage.setItem('goride_offline_users', JSON.stringify(users));
            }
        } catch (e) {}

        return true;
    }

    /**
     * 14. Cập nhật trạng thái người dùng (active | locked)
     * @param {string} userId 
     * @param {'active'|'locked'} newStatus 
     */
    async updateUserStatus(userId, newStatus) {
        if (!userId) return false;
        const patch = {
            status: newStatus,
            updatedAt: new Date().toISOString()
        };

        if (this.isAvailable()) {
            try {
                await this.db.ref(`goride_users/${userId}`).update(patch);
                console.log(`[RealtimeSync] Đã cập nhật trạng thái người dùng ${userId} -> ${newStatus}`);
            } catch (e) {
                if (e.message && e.message.includes('PERMISSION_DENIED')) this._handlePermissionDenied('updateUserStatus');
                console.warn('[RealtimeSync] Lỗi updateUserStatus:', e.message);
            }
        }
        await this._restPatch(`goride_users/${userId}`, patch);

        // Local storage sync
        try {
            const users = JSON.parse(localStorage.getItem('goride_offline_users') || '[]');
            const idx = users.findIndex(u => u.id === userId);
            if (idx !== -1) {
                users[idx].status = newStatus;
                localStorage.setItem('goride_offline_users', JSON.stringify(users));
            }
        } catch (e) {}

        return true;
    }

    /**
     * 15. Xóa vĩnh viễn và triệt để người dùng khỏi Database đám mây & LocalStorage
     * Không còn lưu bất cứ dữ liệu rác nào trong hệ thống
     * @param {string} userId 
     * @param {string} [userEmail] 
     */
    async deleteUser(userId, userEmail) {
        if (!userId && !userEmail) return false;

        // 1. Xóa khỏi Firebase Realtime Database qua SDK
        if (this.isAvailable()) {
            try {
                if (userId) {
                    await this.db.ref(`goride_users/${userId}`).remove();
                    await this.db.ref(`goride_pending_drivers/${userId}`).remove();
                    await this.db.ref(`goride_drivers/${userId}`).remove();
                    await this.db.ref(`goride_online_drivers/${userId}`).remove();
                }
                // Nếu có email, quét xóa nếu key khác userId
                if (userEmail) {
                    const normEmail = userEmail.toLowerCase().trim();
                    const uSnap = await this.db.ref('goride_users').once('value');
                    const uVal = uSnap.val() || {};
                    for (const [k, u] of Object.entries(uVal)) {
                        if (u && u.email && u.email.toLowerCase().trim() === normEmail) {
                            await this.db.ref(`goride_users/${k}`).remove();
                            await this.db.ref(`goride_pending_drivers/${k}`).remove();
                            await this.db.ref(`goride_drivers/${k}`).remove();
                            await this.db.ref(`goride_online_drivers/${k}`).remove();
                        }
                    }
                }
                console.log(`[RealtimeSync] 🗑️ Đã xóa sạch dữ liệu người dùng ${userId || userEmail} trên Firebase Realtime Cloud!`);
            } catch (err) {
                if (err.message && err.message.includes('PERMISSION_DENIED')) this._handlePermissionDenied('deleteUser');
                console.warn('[RealtimeSync] Lỗi xóa Firebase deleteUser:', err.message);
            }
        }

        // 2. Dual REST fallback delete
        if (this.databaseURL && userId) {
            await this._restDelete(`goride_users/${userId}`);
            await this._restDelete(`goride_pending_drivers/${userId}`);
            await this._restDelete(`goride_drivers/${userId}`);
            await this._restDelete(`goride_online_drivers/${userId}`);
        }

        // 3. Xóa sạch sẽ trong LocalStorage
        try {
            const normEmail = (userEmail || '').toLowerCase().trim();
            const users = JSON.parse(localStorage.getItem('goride_offline_users') || '[]');
            const filtered = users.filter(u => !(u.id === userId || (normEmail && u.email && u.email.toLowerCase().trim() === normEmail)));
            localStorage.setItem('goride_offline_users', JSON.stringify(filtered));

            // Xóa khỏi danh sách tài xế
            const drivers = JSON.parse(localStorage.getItem('goride_admin_drivers') || '[]');
            const filteredDrivers = drivers.filter(d => !(d.id === userId || (normEmail && d.email && d.email.toLowerCase().trim() === normEmail)));
            localStorage.setItem('goride_admin_drivers', JSON.stringify(filteredDrivers));

            // Xóa khỏi danh sách chờ duyệt
            const pending = JSON.parse(localStorage.getItem('goride_pending_drivers') || '[]');
            const filteredPending = pending.filter(p => !(p.id === userId || (normEmail && p.email && p.email.toLowerCase().trim() === normEmail)));
            localStorage.setItem('goride_pending_drivers', JSON.stringify(filteredPending));

            // Xóa khỏi online drivers
            const online = JSON.parse(localStorage.getItem('goride_online_drivers') || '{}');
            if (userId && online[userId]) delete online[userId];
            localStorage.setItem('goride_online_drivers', JSON.stringify(online));

            // Xóa toàn bộ key cuốc xe cách ly của tài khoản này
            const targetKeys = [
                userId ? `goride_trips_${String(userId).trim().toLowerCase().replace(/[^a-z0-9_@.-]/gi, '_')}` : null,
                normEmail ? `goride_trips_${normEmail.replace(/[^a-z0-9_@.-]/gi, '_')}` : null
            ].filter(Boolean);

            targetKeys.forEach(k => {
                try { localStorage.removeItem(k); } catch (e) {}
            });
        } catch (e) {}

        return true;
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
