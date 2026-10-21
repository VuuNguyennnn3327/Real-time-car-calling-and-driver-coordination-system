/**
 * Navigo Notification Engine
 * - Strict per-account storage isolation (navigo_user_notifs_${userKey})
 * - Guest mode protection (Zero notifications for unauthenticated guests)
 * - Trip notifications (Booking, Driver matching, Cancellation, Trip completion)
 * - Admin broadcasts with targeted audience (customer, driver, all)
 * - Vietnamese Solar Calendar Holidays & Important Annual Events
 */

const VIETNAM_SOLAR_HOLIDAYS = [
    {
        key: 'tet_duong_lich',
        name: '01/01 - Chúc mừng Năm Mới (Tết Dương Lịch)',
        title: '🎆 CHÚC MỪNG NĂM MỚI - VẠN SỰ HANH THÔNG CÙNG NAVIGO',
        body: 'Navigo kính chúc bạn và gia đình một năm mới bình an, vạn sự hanh thông trên mọi nẻo đường di chuyển xanh!',
        category: 'promo',
        icon: '🎆',
        promoCode: 'CHUNN2025',
        discountPercent: 30,
        target: 'all'
    },
    {
        key: 'valentine',
        name: '14/02 - Lễ Tình Nhân (Valentine)',
        title: '💖 VALENTINE NGỌT NGÀO - ĐỒNG HÀNH YÊU THƯƠNG',
        body: 'Cùng người thương vi vu dạo phố êm ái với xe thuần điện Navigo. Nhập mã VALENTINE để nhận ngay ưu đãi hẹn hò lãng mạn!',
        category: 'promo',
        icon: '💖',
        promoCode: 'VALENTINE',
        discountPercent: 25,
        target: 'customer'
    },
    {
        key: 'quoc_te_phu_nu',
        name: '08/03 - Ngày Quốc tế Phụ Nữ',
        title: '🌸 MỪNG QUỐC TẾ PHỤ NỮ 8/3 - TÔN VINH PHÁI ĐẸP',
        body: 'Navigo xin gửi lời chúc tốt đẹp nhất tới một nửa thế giới. Chúc bạn luôn rạng rỡ, hạnh phúc và bình an trên mọi cung đường!',
        category: 'promo',
        icon: '🌸',
        promoCode: 'PHUNU83',
        discountPercent: 35,
        target: 'all'
    },
    {
        key: 'giai_phong_thong_nhat',
        name: '30/04 - Giải phóng miền Nam & Thống nhất đất nước',
        title: '🇻🇳 KỶ NIỆM NGÀY THỐNG NHẤT ĐẤT NƯỚC 30/4',
        body: 'Tự hào non sông gấm vóc liền một dải! Navigo đồng hành cùng kỳ nghỉ lễ thảnh thơi của gia đình bạn với ưu đãi đặc quyền.',
        category: 'promo',
        icon: '🇻🇳',
        promoCode: 'THONGNHAT',
        discountPercent: 40,
        target: 'all'
    },
    {
        key: 'quoc_te_lao_dong',
        name: '01/05 - Ngày Quốc tế Lao Động',
        title: '⭐ TRI ÂN NGÀY QUỐC TẾ LAO ĐỘNG 1/5 - TRI ÂN TÀI XẾ & NGƯỜI LAO ĐỘNG',
        body: 'Tôn vinh những cống hiến bền bỉ của các đối tác tài xế và người lao động trên khắp mọi miền tổ quốc!',
        category: 'system',
        icon: '⭐',
        promoCode: 'LAODONG0105',
        discountPercent: 20,
        target: 'all'
    },
    {
        key: 'quoc_te_thieu_nhi',
        name: '01/06 - Ngày Quốc tế Thiếu Nhi',
        title: '🎈 CHÚC MỪNG QUỐC TẾ THIẾU NHI 1/6 - VI VU CÙNG BÉ',
        body: 'Cùng bé yêu khám phá thế giới di chuyển xanh êm ái, không mùi khói xăng. Nhận mã giảm giá dành riêng cho chuyến đi gia đình.',
        category: 'promo',
        icon: '🎈',
        promoCode: 'THIEUNHI0106',
        discountPercent: 25,
        target: 'customer'
    },
    {
        key: 'quoc_khanh_vn',
        name: '02/09 - Ngày Quốc Khánh Nước CHXHCN Việt Nam',
        title: '🇻🇳 TỰ HÀO QUỐC KHÁNH 2/9 - RỰC RỠ CỜ HOA CÙNG XE THUẦN ĐIỆN',
        body: 'Chào mừng 79 năm Quốc khánh Việt Nam! Tự hào thương hiệu di chuyển xanh tiên phong vì tương lai không phát thải.',
        category: 'promo',
        icon: '🇻🇳',
        promoCode: 'VIETNAM0209',
        discountPercent: 50,
        target: 'all'
    },
    {
        key: 'phu_nu_vn',
        name: '20/10 - Ngày Phụ Nữ Việt Nam',
        title: '💐 20/10 RỘNG RÀNG - NAVIGO BIKE ĐÓN CHÀNG VÀ NÀNG',
        body: 'Đón người phụ nữ yêu thương vi vu phố phường với xe thuần điện êm ái, thân thiện môi trường. Giảm 50% cho chuyến đi tiếp theo.',
        category: 'promo',
        icon: '💐',
        promoCode: 'NAVIGO2010',
        discountPercent: 50,
        target: 'all'
    },
    {
        key: 'nha_giao_vn',
        name: '20/11 - Ngày Nhà Giáo Việt Nam',
        title: '📚 TRI ÂN NGÀY NHÀ GIÁO VIỆT NAM 20/11',
        body: 'Navigo gửi lời tri ân sâu sắc tới quý thầy cô giáo. Nhập mã để nhận chuyến xe tri ân thầy cô trên mọi hành trình.',
        category: 'promo',
        icon: '📚',
        promoCode: 'TRIAN2011',
        discountPercent: 30,
        target: 'customer'
    },
    {
        key: 'giang_sinh',
        name: '25/12 - Lễ Giáng Sinh (Noel)',
        title: '🎄 GIÁNG SINH AN LÀNH - ẤM ÁP CÙNG NAVIGO',
        body: 'Chúc bạn một mùa Giáng sinh an lành, ấm áp bên người thân và bạn bè cùng những hành trình thuần điện thân thiện môi trường!',
        category: 'promo',
        icon: '🎄',
        promoCode: 'NOEL2025',
        discountPercent: 25,
        target: 'all'
    }
];

class NavigoNotificationManager {
    constructor() {
        this.STORAGE_PREFIX = 'navigo_user_notifs_';
        this.BROADCAST_STORAGE = 'navigo_admin_broadcasts';
        this.initDefaultBroadcasts();
        this.initRealtimeBroadcastListener();
    }

    /**
     * Seed initial default broadcasts if not yet created
     */
    initDefaultBroadcasts() {
        try {
            if (!localStorage.getItem(this.BROADCAST_STORAGE)) {
                const initial = [
                    {
                        id: 'bcast_init_2010',
                        title: '20/10 RỘNG RÀNG - NAVIGO BIKE ĐÓN CHÀNG VÀ NÀNG',
                        body: 'Đón người phụ nữ yêu thương vi vu phố phường với xe thuần điện êm ái, thân thiện môi trường. Áp dụng mã NAVIGO2010 giảm 50%.',
                        category: 'promo',
                        target: 'all',
                        promoCode: 'NAVIGO2010',
                        discountPercent: 50,
                        createdAt: Date.now() - 86400000,
                        date: 'Hôm qua',
                        icon: '💐'
                    },
                    {
                        id: 'bcast_init_0209',
                        title: 'TỰ HÀO QUỐC KHÁNH 2/9 - DI CHUYỂN XANH VIỆT NAM',
                        body: 'Chào mừng Quốc khánh Việt Nam! Tự hào giải pháp di chuyển 100% thuần điện vì môi trường xanh không khói bụi.',
                        category: 'promo',
                        target: 'all',
                        promoCode: 'VIETNAM0209',
                        discountPercent: 50,
                        createdAt: Date.now() - 172800000,
                        date: 'Tuần này',
                        icon: '🇻🇳'
                    },
                    {
                        id: 'bcast_init_driver',
                        title: 'CHƯƠNG TRÌNH THƯỞNG NÓNG DÀNH RIÊNG CHO ĐỐI TÁC TÀI XẾ',
                        body: 'Hoàn thành 10 cuốc xe thuần điện trong ngày nhận ngay thưởng nóng 150.000đ trực tiếp vào ví thu nhập tài xế!',
                        category: 'promo',
                        target: 'driver',
                        promoCode: 'TAIXEVIP',
                        discountPercent: 15,
                        createdAt: Date.now() - 259200000,
                        date: 'Tuần này',
                        icon: '🚗'
                    },
                    {
                        id: 'bcast_init_customer',
                        title: 'CHÀO MỪNG BẠN MỚI - GIẢM 25% CHUYẾN ĐI ĐẦU TIÊN',
                        body: 'Chào mừng bạn đến với mạng lưới xe thuần điện thông minh Navigo. Nhập mã XINCHAO để trải nghiệm ngay!',
                        category: 'promo',
                        target: 'customer',
                        promoCode: 'XINCHAO',
                        discountPercent: 25,
                        createdAt: Date.now() - 345600000,
                        date: 'Tháng này',
                        icon: '🎁'
                    }
                ];
                localStorage.setItem(this.BROADCAST_STORAGE, JSON.stringify(initial));
            }
        } catch (e) {
            console.warn('[NotificationManager] Init broadcasts error:', e);
        }
    }

    /**
     * Compute unique isolated storage key for active logged in user
     */
    getUserKey() {
        if (typeof sessionManager === 'undefined') return null;
        const user = sessionManager.getUser();
        if (!user) return null;
        const raw = user.id || user.email || user.phone;
        if (!raw) return null;
        return this.STORAGE_PREFIX + String(raw).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }

    /**
     * Retrieve all notifications for the currently logged in user
     * If user is a guest, strictly returns empty array.
     */
    getNotifications() {
        const key = this.getUserKey();
        if (!key) return []; // Guests have ZERO notifications!

        // Synchronize any pending admin broadcasts for this account's role
        this.syncBroadcasts();

        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * Synchronize broadcasts to current user account without duplicates
     */
    syncBroadcasts() {
        if (typeof sessionManager === 'undefined') return;
        const user = sessionManager.getUser();
        if (!user) return;
        const role = user.role || 'customer';
        const key = this.getUserKey();
        if (!key) return;

        try {
            const broadcasts = JSON.parse(localStorage.getItem(this.BROADCAST_STORAGE) || '[]');
            const userNotifs = JSON.parse(localStorage.getItem(key) || '[]');
            let changed = false;

            broadcasts.forEach(b => {
                if (b.target === 'all' || b.target === role) {
                    const uniqueId = `bcast_${b.id}`;
                    if (!userNotifs.some(n => n.id === uniqueId)) {
                        userNotifs.push({
                            id: uniqueId,
                            category: b.category || 'promo',
                            title: b.title,
                            body: b.body,
                            date: b.date || 'Gần đây',
                            timestamp: b.createdAt || Date.now(),
                            icon: b.icon || '🎁',
                            unread: true,
                            actionUrl: role === 'driver' ? 'driver.html' : 'customer.html',
                            actionText: b.category === 'promo' ? 'Dùng ngay' : 'Xem chi tiết'
                        });
                        changed = true;
                    }
                }
            });

            if (changed) {
                userNotifs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                localStorage.setItem(key, JSON.stringify(userNotifs));
            }
        } catch (e) {}
    }

    /**
     * Add notification strictly into the current logged-in user's account
     */
    /**
     * Synchronize notifications directly from Database (Firebase RTDB Cloud)
     */
    async syncFromDatabase() {
        const key = this.getUserKey();
        if (!key) return [];
        if (typeof realtimeSync !== 'undefined' && typeof realtimeSync.getUserNotifications === 'function') {
            try {
                const dbNotifs = await realtimeSync.getUserNotifications(key);
                if (Array.isArray(dbNotifs) && dbNotifs.length > 0) {
                    const localList = JSON.parse(localStorage.getItem(key) || '[]');
                    dbNotifs.forEach(dn => {
                        const idx = localList.findIndex(ln => ln.id === dn.id);
                        if (idx !== -1) {
                            localList[idx] = { ...localList[idx], ...dn };
                        } else {
                            localList.push(dn);
                        }
                    });
                    localList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    localStorage.setItem(key, JSON.stringify(localList));
                    return localList;
                }
            } catch (e) {
                console.warn('[NotificationManager] Error syncing from database:', e);
            }
        }
        return this.getNotifications();
    }

    addNotification(notif) {
        const key = this.getUserKey();
        if (!key) return;

        try {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            const now = Date.now();
            const dateStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' hôm nay';

            const item = {
                id: notif.id || `notif_${now}_${Math.random().toString(36).substr(2, 5)}`,
                category: notif.category || 'trips',
                title: notif.title || 'Thông báo Navigo',
                body: notif.body || '',
                date: notif.date || dateStr,
                timestamp: now,
                icon: notif.icon || '⚡',
                unread: true,
                actionUrl: notif.actionUrl || null,
                actionText: notif.actionText || 'Xem chi tiết'
            };

            // Prepend
            list.unshift(item);
            localStorage.setItem(key, JSON.stringify(list));
            window.dispatchEvent(new CustomEvent('navigo:notification', { detail: item }));

            // Persist to Database (Firebase RTDB Cloud)
            if (typeof realtimeSync !== 'undefined' && typeof realtimeSync.saveUserNotification === 'function') {
                realtimeSync.saveUserNotification(key, item);
            }
        } catch (e) {
            console.error('[NotificationManager] Error saving notification:', e);
        }
    }

    /**
     * Mark all notifications as read for current user
     */
    markAllAsRead() {
        const key = this.getUserKey();
        if (!key) return;
        try {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            list.forEach(n => n.unread = false);
            localStorage.setItem(key, JSON.stringify(list));
            window.dispatchEvent(new CustomEvent('navigo:notification-read'));
            if (typeof realtimeSync !== 'undefined' && typeof realtimeSync.markAllNotificationsRead === 'function') {
                realtimeSync.markAllNotificationsRead(key);
            }
        } catch (e) {}
    }

    /**
     * Mark single notification as read
     */
    markAsRead(id) {
        const key = this.getUserKey();
        if (!key) return;
        try {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            const item = list.find(n => n.id === id);
            if (item) {
                item.unread = false;
                localStorage.setItem(key, JSON.stringify(list));
                window.dispatchEvent(new CustomEvent('navigo:notification-read'));
                if (typeof realtimeSync !== 'undefined' && typeof realtimeSync.markNotificationRead === 'function') {
                    realtimeSync.markNotificationRead(key, id);
                }
            }
        } catch (e) {}
    }

    /**
     * Admin publishes a new Broadcast
     * @param {Object} broadcastData { title, body, target ('all'|'customer'|'driver'), category ('promo'|'system'), promoCode, discountPercent, icon }
     */
    /**
     * Admin publishes a new Broadcast with strict role-based targeting and instant cross-device sync
     * @param {Object} broadcastData { title, body, target ('all'|'customer'|'driver'), category ('promo'|'system'), promoCode, discountPercent, icon }
     */
    publishBroadcast(broadcastData) {
        try {
            const broadcasts = JSON.parse(localStorage.getItem(this.BROADCAST_STORAGE) || '[]');
            const now = Date.now();
            const newBroadcast = {
                id: `bcast_${now}_${Math.random().toString(36).substr(2, 4)}`,
                title: broadcastData.title,
                body: broadcastData.body,
                target: broadcastData.target || 'all',
                category: broadcastData.category || 'promo',
                promoCode: broadcastData.promoCode || null,
                discountPercent: broadcastData.discountPercent || null,
                createdAt: now,
                date: new Date().toLocaleDateString('vi-VN'),
                icon: broadcastData.icon || (broadcastData.category === 'promo' ? '🎟️' : '🇻🇳')
            };

            broadcasts.unshift(newBroadcast);
            localStorage.setItem(this.BROADCAST_STORAGE, JSON.stringify(broadcasts));

            // Instantly push to all matching stored user accounts
            this.pushBroadcastToAllStoredUsers(newBroadcast);

            // Sync to Firebase Realtime DB for instant cross-device push
            if (typeof realtimeSync !== 'undefined' && realtimeSync.db) {
                try {
                    realtimeSync.db.ref('goride_broadcasts/' + newBroadcast.id).set(newBroadcast);
                    if (typeof realtimeSync._restPut === 'function') {
                        realtimeSync._restPut('goride_broadcasts/' + newBroadcast.id, newBroadcast).catch(() => {});
                    }
                } catch (err) {
                    console.warn('[NotificationManager] Firebase broadcast write skipped:', err);
                }
            }

            // If active user matches target, sync immediately
            this.syncBroadcasts();

            // Dispatch global event and update navigation badge dots
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('navigo:notification', { detail: newBroadcast }));
                if (typeof updateNavBadgeDots === 'function') updateNavBadgeDots();
            }

            return newBroadcast;
        } catch (e) {
            console.error('[NotificationManager] Publish broadcast error:', e);
            return null;
        }
    }

    /**
     * Instantly pushes the broadcast notification into the isolated storage of every matching stored user account
     */
    pushBroadcastToAllStoredUsers(broadcast) {
        try {
            const target = broadcast.target || 'all';
            const uniqueId = `bcast_${broadcast.id}`;

            // Process all accounts registered in goride_offline_users with strict role targeting
            const offUsers = JSON.parse(localStorage.getItem('goride_offline_users') || '[]');
            offUsers.forEach(u => {
                const uRole = u.role || 'customer';
                if (target === 'all' || target === uRole) {
                    const raw = u.id || u.email || u.phone;
                    if (raw) {
                        const notifItem = {
                            id: uniqueId,
                            category: broadcast.category || 'promo',
                            title: broadcast.title,
                            body: broadcast.body,
                            date: broadcast.date || 'Hôm nay',
                            timestamp: broadcast.createdAt || Date.now(),
                            icon: broadcast.icon || '🎁',
                            unread: true,
                            actionUrl: uRole === 'driver' ? 'driver.html' : 'customer.html',
                            actionText: broadcast.category === 'promo' ? 'Dùng ngay' : 'Xem chi tiết'
                        };
                        const key = this.STORAGE_PREFIX + String(raw).toLowerCase().replace(/[^a-z0-9_]/g, '_');
                        const userNotifs = JSON.parse(localStorage.getItem(key) || '[]');
                        if (!userNotifs.some(n => n.id === uniqueId)) {
                            userNotifs.unshift(notifItem);
                            localStorage.setItem(key, JSON.stringify(userNotifs));
                        }
                    }
                }
            });
        } catch (e) {
            console.warn('[NotificationManager] Error pushing broadcast to stored users:', e);
        }
    }

    /**
     * Realtime Firebase listener for broadcasts from other devices/admins
     */
    initRealtimeBroadcastListener() {
        if (typeof window === 'undefined') return;
        setTimeout(() => {
            if (typeof realtimeSync !== 'undefined' && realtimeSync.db) {
                try {
                    realtimeSync.db.ref('goride_broadcasts').on('child_added', (snapshot) => {
                        const bcast = snapshot.val();
                        if (!bcast || !bcast.id) return;
                        const broadcasts = JSON.parse(localStorage.getItem(this.BROADCAST_STORAGE) || '[]');
                        if (!broadcasts.some(b => b.id === bcast.id)) {
                            broadcasts.unshift(bcast);
                            localStorage.setItem(this.BROADCAST_STORAGE, JSON.stringify(broadcasts));
                            this.pushBroadcastToAllStoredUsers(bcast);
                            this.syncBroadcasts();
                            window.dispatchEvent(new CustomEvent('navigo:notification', { detail: bcast }));
                            if (typeof updateNavBadgeDots === 'function') updateNavBadgeDots();
                        }
                    });
                } catch(e) {}
            }
        }, 800);
    }

    /**
     * Retrieve all broadcasts published by admin
     */
    getBroadcasts() {
        try {
            return JSON.parse(localStorage.getItem(this.BROADCAST_STORAGE) || '[]');
        } catch (e) {
            return [];
        }
    }
}

// Global Singleton
const navigoNotifications = new NavigoNotificationManager();

if (typeof window !== 'undefined') {
    window.navigoNotifications = navigoNotifications;
    window.VIETNAM_SOLAR_HOLIDAYS = VIETNAM_SOLAR_HOLIDAYS;

    // Automatic Navigation Badge Dot synchronization across all pages
    function updateNavBadgeDots() {
        try {
            if (typeof document === 'undefined') return;
            const dots = document.querySelectorAll('.gsm-nav-badge-dot');
            if (!dots.length) return;
            if (typeof sessionManager === 'undefined' || !sessionManager.isAuthenticated()) {
                dots.forEach(d => d.style.display = 'none');
                return;
            }
            const notifs = navigoNotifications.getNotifications();
            const hasUnread = notifs.some(n => n.unread);
            dots.forEach(d => d.style.display = hasUnread ? 'block' : 'none');
        } catch (e) {}
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', updateNavBadgeDots);
        } else {
            updateNavBadgeDots();
        }
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('session:change', updateNavBadgeDots);
        window.addEventListener('session:login', updateNavBadgeDots);
        window.addEventListener('session:logout', updateNavBadgeDots);
        window.addEventListener('navigo:notification', updateNavBadgeDots);
        window.addEventListener('navigo:notification-read', updateNavBadgeDots);
        window.addEventListener('storage', (e) => {
            if (!e.key || e.key.startsWith('navigo_user_notifs_') || e.key === 'navigo_admin_broadcasts' || e.key.includes('user')) {
                updateNavBadgeDots();
            }
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { navigoNotifications, NavigoNotificationManager, VIETNAM_SOLAR_HOLIDAYS };
}
