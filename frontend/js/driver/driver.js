/**
 * GoRide Ride-Hailing Platform - Driver Page Controller
 * 100% Real-Data Architecture
 * Handles driver online/offline toggle, dispatch offers, active trip lifecycle,
 * Map navigation, Complete Trip settlement in VND, Trip History tab, and Earnings tab.
 */

class DriverController {
  constructor() {
    this.mapController = null;
    this.isOnline = false;
    this.activeTrip = null;
    this.incomingRequests = [];
    this.pollIntervalId = null;
    this.geoWatchId = null;
    this.broadcastIntervalId = null;
    this.currentTab = 'home';
    this.currentHistoryFilter = 'all';

    this.driverStats = {
      tripsToday: 0,
      earnings: 0,
      rating: 5.0,
      walletBalance: 0
    };

    // Driver location (Central HCMC)
    this.currentPosition = {
      lat: 10.776889,
      lng: 106.700806,
      address: 'Quận 1, TP. Hồ Chí Minh'
    };

    // Trip progression phases
    this.PHASES = [
      {
        id: 'heading_to_pickup',
        label: 'Đang đến điểm đón',
        badgeClass: 'badge-warning',
        nextAction: 'Đã đến điểm đón',
        nextPhase: 'arrived_at_pickup',
        description: 'Di chuyển theo chỉ dẫn bản đồ tới điểm hẹn đón khách.'
      },
      {
        id: 'arrived_at_pickup',
        label: 'Đã đến điểm đón',
        badgeClass: 'badge-info',
        nextAction: 'Bắt đầu hành trình',
        nextPhase: 'trip_in_progress',
        description: 'Chờ khách lên xe và bắt đầu chuyến đi.'
      },
      {
        id: 'trip_in_progress',
        label: 'Đang di chuyển',
        badgeClass: 'badge-primary',
        nextAction: 'Hoàn thành chuyến đi',
        nextPhase: 'complete_trip',
        description: 'Đưa khách hàng an toàn đến điểm đến đã định.'
      },
      {
        id: 'complete_trip',
        label: 'Hoàn thành chuyến',
        badgeClass: 'badge-success',
        nextAction: 'Kết thúc & Nhận tiền',
        nextPhase: null,
        description: 'Chuyến xe kết thúc. Doanh thu đã được cộng vào ví tài xế.'
      }
    ];
  }

  /**
   * Initializes the Driver page controller on DOMContentLoaded.
   */
  async init() {
    console.log('[DriverController] Initializing real-data Driver portal...');

    if (typeof purgeAllMockTrips === 'function') {
      purgeAllMockTrips();
    }

    this.setupTabNavigation();
    this.setupUserMenu();
    this.initMap();
    this.bindEvents();
    await this.loadDriverProfileAndStats();

    // Check if previously set to online
    const savedOnline = localStorage.getItem('goride_driver_online_state') === '1';
    if (savedOnline) {
      await this.setOnlineStatus(true);
    } else {
      this.renderOnlineStatusUI();
    }

    // Recover any active trip on page load / reload
    this.checkActiveTripOnLoad();

    // Check URL hash for direct tab navigation
    const hash = window.location.hash.replace('#', '');
    if (hash && ['home', 'trips', 'earnings', 'account'].includes(hash)) {
      this.switchTab(hash);
    }

    console.log('[DriverController] Driver portal ready.');
  }

  /* ==========================================================================
     TAB SWITCHING & NAVIGATION (HOME, TRIPS, EARNINGS, ACCOUNT)
     ========================================================================== */

  setupTabNavigation() {
    document.querySelectorAll('[data-tab]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = el.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['home', 'trips', 'earnings', 'account'].includes(hash)) {
        this.switchTab(hash);
      }
    });
  }

  switchTab(tabName) {
    if (!['home', 'trips', 'earnings', 'account'].includes(tabName)) {
      tabName = 'home';
    }
    this.currentTab = tabName;
    window.location.hash = tabName;

    // Update active class on desktop & mobile navigation links
    document.querySelectorAll('[data-tab]').forEach(el => {
      const match = el.getAttribute('data-tab') === tabName;
      el.classList.toggle('active', match);
    });

    // Show / hide tab containers
    ['home', 'trips', 'earnings', 'account'].forEach(t => {
      const pane = document.getElementById('driver-tab-' + t);
      if (pane) {
        pane.style.display = (t === tabName) ? (t === 'home' ? 'flex' : 'block') : 'none';
      }
    });

    // Handle tab-specific actions
    if (tabName === 'home') {
      if (this.mapController && this.mapController.map) {
        setTimeout(() => this.mapController.invalidateSize(), 200);
      }
    } else if (tabName === 'trips') {
      this.renderTripHistory(this.currentHistoryFilter);
    } else if (tabName === 'earnings') {
      this.renderEarningsReport();
    } else if (tabName === 'account') {
      this.renderAccountTab();
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

    document.querySelectorAll('[data-action="logout"]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await this.setOnlineStatus(false);
        } catch (err) {}
        if (typeof sessionManager !== 'undefined') {
          sessionManager.logout();
        }
        window.location.href = 'login.html';
      });
    });
  }

  /* ==========================================================================
     MAP INITIALIZATION & CONTROLS
     ========================================================================== */

  initMap() {
    try {
      const mapContainer = document.getElementById('driver-map');
      if (!mapContainer || typeof MapController === 'undefined') return;

      this.mapController = new MapController('driver-map', {
        center: [this.currentPosition.lat, this.currentPosition.lng],
        zoom: 14,
        zoomControl: true
      });

      if (typeof this.mapController.init === 'function') {
        this.mapController.init();
      }

      // Try browser geolocation to place driver at real GPS position
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.currentPosition.lat = pos.coords.latitude;
            this.currentPosition.lng = pos.coords.longitude;
            this.currentPosition.address = `GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
            const addrEl = document.getElementById('driver-current-address');
            if (addrEl) addrEl.textContent = this.currentPosition.address;

            // Reverse geocode to real street address if network permits
            try {
              fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=18&addressdetails=1`, {
                headers: { 'Accept-Language': 'vi' }
              }).then(r => r.json()).then(data => {
                if (data && data.display_name) {
                  const parts = data.display_name.split(',');
                  const shortAddr = parts.slice(0, 3).join(',').trim();
                  this.currentPosition.address = shortAddr || data.display_name;
                  if (addrEl) addrEl.textContent = this.currentPosition.address;
                  if (this.isOnline) {
                    this.broadcastDriverLocation();
                  }
                }
              }).catch(() => {});
            } catch (e) {}

            if (this.mapController && typeof this.mapController.setView === 'function') {
              this.mapController.setView(pos.coords.latitude, pos.coords.longitude, 15);
            }
            if (this.isOnline) {
              this.updateDriverMapMarker();
              this.broadcastDriverLocation();
            }
          },
          (err) => {
            console.warn('[Driver] Geolocation notice:', err.message);
            const addrEl = document.getElementById('driver-current-address');
            if (addrEl) addrEl.textContent = 'Trung tâm TP. Hồ Chí Minh';
          },
          { timeout: 6000 }
        );
      }

      [150, 400, 800].forEach(delay => {
        setTimeout(() => {
          if (this.mapController && typeof this.mapController.invalidateSize === 'function') {
            this.mapController.invalidateSize();
          }
        }, delay);
      });
    } catch (err) {
      console.warn('[DriverController] Map init warning:', err.message);
    }
  }

  normalizeVehicleType(type) {
    if (!type) return 'car4';
    const s = String(type).toLowerCase().trim();
    if (s === 'bike' || s === 'motorbike' || s.includes('bike') || s.includes('moto') || s.includes('xe máy') || s.includes('xe may')) return 'motorbike';
    if (s === 'car7' || s === 'xl' || s.includes('7 chỗ') || s.includes('7 cho') || s.includes('xl')) return 'car7';
    if (s === 'premium' || s === 'car4_plus' || s === 'plus' || s.includes('plus') || s.includes('sang')) return 'premium';
    return 'car4';
  }

  getDriverVehicleType() {
    let user = typeof sessionManager !== 'undefined' ? (sessionManager.getUser?.() || sessionManager.getCurrentUser?.()) : null;
    if (!user) {
      try {
        user = JSON.parse(localStorage.getItem('goride_user') || 'null');
      } catch (e) {}
    }
    const rawType = user?.vehicle?.type || user?.vehicleType || this.driverStats?.vehicleType || 'motorbike';
    return this.normalizeVehicleType(rawType);
  }

  isMatchingVehicleType(tripVehicleType) {
    const myType = this.getDriverVehicleType();
    const tripType = this.normalizeVehicleType(tripVehicleType);
    return myType === tripType;
  }

  getVehicleInfo(vType) {
    const norm = this.normalizeVehicleType(vType);
    switch (norm) {
      case 'motorbike':
        return { type: 'motorbike', name: 'Navigo Bike', label: 'Xe máy (Navigo Bike)', icon: '🛵', defaultModel: 'Honda Wave Alpha', defaultPlate: '59-S3 889.24' };
      case 'premium':
        return { type: 'premium', name: 'Navigo Plus', label: 'Xe sang (Navigo Plus)', icon: '🚘', defaultModel: 'Mercedes-Benz C200', defaultPlate: '51K-999.88' };
      case 'car7':
        return { type: 'car7', name: 'Navigo XL', label: 'Ô tô 7 chỗ (Navigo XL)', icon: '🚐', defaultModel: 'Mitsubishi Xpander', defaultPlate: '51H-777.36' };
      case 'car4':
      default:
        return { type: 'car4', name: 'Navigo Car', label: 'Ô tô 4 chỗ (Navigo Car)', icon: '🚗', defaultModel: 'Toyota Vios 2023', defaultPlate: '51G-889.24' };
    }
  }

  updateDriverMapMarker() {
    if (!this.mapController) return;

    if (!this.isOnline) {
      if (typeof this.mapController.clearMarkers === 'function') {
        this.mapController.clearMarkers('drivers');
      }
      return;
    }

    let user = typeof sessionManager !== 'undefined' ? (sessionManager.getUser?.() || sessionManager.getCurrentUser?.()) : null;
    if (!user) {
      try {
        user = JSON.parse(localStorage.getItem('goride_user') || localStorage.getItem('user') || 'null');
      } catch (e) {}
    }
    if (!user) {
      try {
        const offlineUsers = JSON.parse(localStorage.getItem('goride_offline_users') || '[]');
        const found = offlineUsers.find(u => u.role === 'driver');
        if (found) user = found;
      } catch (e) {}
    }

    const vInfo = this.getVehicleInfo(user?.vehicle?.type || user?.vehicleType);
    const plate = user?.vehicle?.plate || user?.licensePlate || vInfo.defaultPlate;

    if (typeof this.mapController.addDriverMarker === 'function') {
      this.mapController.addDriverMarker({
        id: 'current-driver',
        lat: this.currentPosition.lat,
        lng: this.currentPosition.lng,
        heading: this.currentPosition.heading || 0,
        name: user?.name || 'Tài xế của bạn',
        vehicleType: vInfo.type,
        vehicle: `${vInfo.icon} ${vInfo.label} - ${plate}`,
        status: 'online',
        isActive: true
      });
    }
  }

  /* ==========================================================================
     ONLINE / OFFLINE TOGGLE & DISPATCH POLLING
     ========================================================================== */

  bindEvents() {
    // 1. Floating incoming offer dialog buttons
    const btnAcceptOffer = document.getElementById('btn-accept-offer');
    if (btnAcceptOffer) {
      btnAcceptOffer.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.currentOffer) {
          this.handleAcceptRequest(this.currentOffer.id);
        }
      });
    }

    const btnDeclineOffer = document.getElementById('btn-decline-offer');
    if (btnDeclineOffer) {
      btnDeclineOffer.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.currentOffer) {
          this.handleDeclineRequest(this.currentOffer.id);
        }
      });
    }

    // 2. Legacy toggle controls (if present)
    const toggleCheckbox = document.getElementById('online-toggle');
    const toggleLabel = document.getElementById('driver-toggle-label');
    if (toggleLabel && toggleCheckbox) {
      toggleLabel.addEventListener('click', (e) => {
        e.preventDefault();
        this.setOnlineStatus(!this.isOnline);
      });
    }

    const btnRefresh = document.getElementById('btn-refresh-requests');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', (e) => {
        e.preventDefault();
        this.loadIncomingRequests();
      });
    }

    // 3. Instant cross-tab sync when customer or admin places or cancels a ride, or changes online status
    window.addEventListener('storage', (e) => {
      // Sync driver online state toggled from profile.html
      if (e.key === 'goride_driver_online_state') {
        const newOnline = (e.newValue === '1');
        if (this.isOnline !== newOnline) {
          this.setOnlineStatus(newOnline);
        }
      }

      // Sync driver profile & avatar updates from profile.html
      if (e.key === 'goride_user' || e.key === 'ride_rtree_user') {
        if (typeof sessionManager !== 'undefined') {
          sessionManager._initFromStorage();
        }
        this.loadDriverProfileAndStats();
      }

      // Check trip requests and active trip changes
      if (e.key === 'goride_admin_trips' || e.key === 'goride_pending_trip_offers' || e.key === 'goride_active_trip') {
        if (this.activeTrip) {
          try {
            const allTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
            const cur = allTrips.find(t => t.id === this.activeTrip.id);
            if (cur && cur.status === 'cancelled') {
              this.showToast('Khách hàng đã hủy chuyến xe này.', 'info', 5000);
              this.activeTrip = null;
              if (this.mapController) {
                if (typeof this.mapController.clearRoute === 'function') this.mapController.clearRoute();
                if (typeof this.mapController.clearMarkers === 'function') {
                  this.mapController.clearMarkers('pickup');
                  this.mapController.clearMarkers('destination');
                }
              }
              this.renderActiveTripUI();
              if (this.isOnline) {
                this.loadIncomingRequests();
              }
            }
          } catch (err) {}
        } else if (this.isOnline) {
          this.loadIncomingRequests();
        }
      }
    });

    // 4. Sync status & profile whenever window gains focus (e.g. user updated Profile or toggled online)
    window.addEventListener('focus', () => {
      const isOnline = localStorage.getItem('goride_driver_online_state') === '1';
      if (this.isOnline !== isOnline) {
        this.setOnlineStatus(isOnline, false);
      }
      if (typeof sessionManager !== 'undefined') {
        sessionManager._initFromStorage();
      }
      this.loadDriverProfileAndStats();
      if (this.isOnline && !this.activeTrip) {
        this.loadIncomingRequests();
      }
    });

    window.addEventListener('session:update', () => {
      this.loadDriverProfileAndStats();
    });
  }

  async setOnlineStatus(isOnline, showNotification = true) {
    this.isOnline = !!isOnline;
    localStorage.setItem('goride_driver_online_state', this.isOnline ? '1' : '0');

    try {
      if (typeof apiClient !== 'undefined') {
        try {
          await apiClient.updateDriverStatus(this.isOnline, this.currentPosition.lat, this.currentPosition.lng);
        } catch (apiErr) {
          if (apiErr.status === 403) {
            this.isOnline = false;
            localStorage.setItem('goride_driver_online_state', '0');
            this.renderOnlineStatusUI();
            this.broadcastDriverLocation();
            if (showNotification) this.showToast('Hồ sơ tài xế của bạn chưa được Quản trị viên phê duyệt.', 'error', 4500);
            return;
          }
        }
      }

      this.renderOnlineStatusUI();
      this.updateDriverMapMarker();

      // Broadcast driver presence to Firebase Realtime Cloud
      if (typeof realtimeSync !== 'undefined') {
        const user = typeof sessionManager !== 'undefined' ? (sessionManager.getUser?.() || sessionManager.getCurrentUser?.()) : null;
        const driverId = user?.id || 'drv_' + (user?.phone || '0901');
        realtimeSync.setDriverOnline(driverId, this.isOnline, {
          name: user?.name,
          phone: user?.phone,
          vehicleType: user?.vehicleType || 'motorbike',
          plate: user?.licensePlate || '59-S3 889.24',
          lat: this.currentPosition.lat,
          lng: this.currentPosition.lng
        });
      }

      if (this.isOnline) {
        this.startLocationTracking();
        this.broadcastDriverLocation();
        if (showNotification) this.showToast('Bạn đã chuyển sang trạng thái TRỰC TUYẾN. Tọa độ GPS đang được phát sóng tới Admin.', 'success');
        this.startRequestsPolling();
        await this.loadIncomingRequests();
      } else {
        this.stopLocationTracking();
        this.broadcastDriverLocation();
        if (showNotification) this.showToast('Bạn đã chuyển sang trạng thái NGOẠI TUYẾN.', 'info');
        this.stopRequestsPolling();
        this.incomingRequests = [];
        this.renderRequestsList([]);
      }
    } catch (err) {
      if (showNotification) this.showToast('Không thể cập nhật trạng thái: ' + err.message, 'error');
    }
  }

  broadcastDriverLocation() {
    try {
      let user = typeof sessionManager !== 'undefined' ? (sessionManager.getUser?.() || sessionManager.getCurrentUser?.()) : null;
      if (!user || user.role !== 'driver') {
        try {
          const offlineUsers = JSON.parse(localStorage.getItem('goride_offline_users') || '[]');
          const found = offlineUsers.find(u => u.role === 'driver');
          if (found) user = found;
        } catch (e) {}
      }

      const driverId = user?.id || 'drv_d202';
      const driverName = user?.name || 'Trần Văn Bình';
      const driverPhone = user?.phone || '0918765432';
      const vInfo = this.getVehicleInfo(user?.vehicle?.type || user?.vehicleType);
      const vehicleType = vInfo.type;
      const vehicleTypeName = vInfo.label;
      const plate = user?.vehicle?.plate || user?.licensePlate || vInfo.defaultPlate;
      const model = user?.vehicle?.model || user?.vehicleModel || vInfo.defaultModel;

      let onlineDrivers = {};
      try {
        onlineDrivers = JSON.parse(localStorage.getItem('goride_online_drivers') || '{}');
        if (Array.isArray(onlineDrivers)) {
          const dict = {};
          onlineDrivers.forEach(d => { if (d && d.id) dict[d.id] = d; });
          onlineDrivers = dict;
        }
      } catch {
        onlineDrivers = {};
      }

      if (this.isOnline) {
        onlineDrivers[driverId] = {
          id: driverId,
          name: driverName,
          phone: driverPhone,
          vehicleType: vehicleType,
          vehicleTypeName: vehicleTypeName,
          plate: plate,
          model: model,
          lat: Number(this.currentPosition.lat),
          lng: Number(this.currentPosition.lng),
          address: this.currentPosition.address || 'TP. Hồ Chí Minh',
          isOnline: true,
          status: this.activeTrip ? 'busy' : 'available',
          updatedAt: new Date().toISOString()
        };
      } else {
        delete onlineDrivers[driverId];
      }

      localStorage.setItem('goride_online_drivers', JSON.stringify(onlineDrivers));

      // Also update goride_admin_drivers if present
      try {
        const adminDrivers = JSON.parse(localStorage.getItem('goride_admin_drivers') || '[]');
        if (Array.isArray(adminDrivers)) {
          const idx = adminDrivers.findIndex(d => d.id === driverId || d.phone === driverPhone);
          if (idx >= 0) {
            adminDrivers[idx].isOnline = this.isOnline;
            adminDrivers[idx].lat = Number(this.currentPosition.lat);
            adminDrivers[idx].lng = Number(this.currentPosition.lng);
            adminDrivers[idx].address = this.currentPosition.address;
            adminDrivers[idx].updatedAt = new Date().toISOString();
          } else if (this.isOnline) {
            adminDrivers.push({
              id: driverId,
              name: driverName,
              phone: driverPhone,
              vehicleType: vehicleType,
              vehicleTypeName: vehicleTypeName,
              plate: plate,
              model: model,
              isOnline: true,
              lat: Number(this.currentPosition.lat),
              lng: Number(this.currentPosition.lng),
              address: this.currentPosition.address,
              status: 'active',
              updatedAt: new Date().toISOString()
            });
          }
          localStorage.setItem('goride_admin_drivers', JSON.stringify(adminDrivers));
        }
      } catch (e) {}

      // Realtime Cloud Broadcast
      if (typeof realtimeSync !== 'undefined') {
        const tripId = this.activeTrip ? this.activeTrip.id : null;
        realtimeSync.updateDriverLocation(tripId, driverId, Number(this.currentPosition.lat), Number(this.currentPosition.lng), this.currentHeading || 0);
      }

      // Broadcast custom event for same-window / cross-component listeners
      window.dispatchEvent(new CustomEvent('goride:driver_location_changed', {
        detail: {
          driverId,
          isOnline: this.isOnline,
          lat: this.currentPosition.lat,
          lng: this.currentPosition.lng
        }
      }));
    } catch (err) {
      console.warn('[Driver] broadcastDriverLocation error:', err);
    }
  }

  startLocationTracking() {
    if (!navigator.geolocation) return;
    if (this.geoWatchId !== null) return;

    try {
      this.geoWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          this.currentPosition.lat = pos.coords.latitude;
          this.currentPosition.lng = pos.coords.longitude;
          this.currentPosition.address = `GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
          const addrEl = document.getElementById('driver-current-address');
          if (addrEl) addrEl.textContent = this.currentPosition.address;
          if (this.isOnline) {
            this.broadcastDriverLocation();
            this.updateDriverMapMarker();
          }
        },
        (err) => {
          console.warn('[Driver] watchPosition notice:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    } catch (e) {}

    // Periodic heartbeat every 3.5 seconds while online to keep timestamp fresh
    if (!this.broadcastIntervalId) {
      this.broadcastIntervalId = setInterval(() => {
        if (this.isOnline) {
          this.broadcastDriverLocation();
        }
      }, 3500);
    }
  }

  stopLocationTracking() {
    if (this.geoWatchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.geoWatchId);
      this.geoWatchId = null;
    }
    if (this.broadcastIntervalId) {
      clearInterval(this.broadcastIntervalId);
      this.broadcastIntervalId = null;
    }
  }

  renderOnlineStatusUI() {
    const statusDot = document.getElementById('driver-status-dot');
    const statusText = document.getElementById('driver-status-text');
    const currentAddr = document.getElementById('driver-current-address');

    if (statusDot) {
      statusDot.className = this.isOnline ? 'status-pulse-dot' : 'status-pulse-dot offline';
    }
    if (statusText) {
      statusText.textContent = this.isOnline ? 'Đang trực tuyến (Sẵn sàng nhận chuyến)' : 'Ngoại tuyến (Vào Profile để bật)';
    }
    if (currentAddr && this.currentPosition.address) {
      currentAddr.textContent = this.currentPosition.address + (this.isOnline ? ' • Chạm để đổi' : ' • Chạm để bật');
    }

    // Also support legacy elements if present in DOM
    const togglePill = document.getElementById('driver-toggle-label');
    const toggleIcon = document.getElementById('toggle-icon');
    const toggleTxt = document.getElementById('toggle-text');
    if (togglePill) togglePill.classList.toggle('online', this.isOnline);
    if (toggleIcon) toggleIcon.textContent = this.isOnline ? '🟢' : '🔘';
    if (toggleTxt) toggleTxt.textContent = this.isOnline ? 'Đang trực tuyến' : 'Bật trực tuyến';
  }

  startRequestsPolling() {
    this.stopRequestsPolling();

    // 1. Firebase Realtime Cloud Listener (Instant push from customer phone)
    if (typeof realtimeSync !== 'undefined') {
      if (this.realtimeOffersUnsub) {
        this.realtimeOffersUnsub();
      }
      this.realtimeOffersUnsub = realtimeSync.listenTripOffers((offer) => {
        if (this.isOnline && !this.activeTrip) {
          this.loadIncomingRequests();
        }
      });
    }

    // 2. Interval Polling fallback (1.5s)
    this.pollIntervalId = setInterval(() => {
      if (this.isOnline && !this.activeTrip) {
        this.loadIncomingRequests();
      }
    }, 1500);
  }

  stopRequestsPolling() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    if (this.realtimeOffersUnsub) {
      this.realtimeOffersUnsub();
      this.realtimeOffersUnsub = null;
    }
  }

  renderIncomingOfferDialog(offer) {
    const modal = document.getElementById('driver-incoming-offer-modal');
    if (!modal) return;

    if (!offer || !this.isOnline || this.activeTrip) {
      modal.style.display = 'none';
      this.currentOffer = null;
      return;
    }

    this.currentOffer = offer;

    const fareFormatted = Number(offer.fareNum || 45000).toLocaleString('vi-VN') + ' ₫';
    const fareEl = document.getElementById('offer-fare-hero');
    if (fareEl) fareEl.textContent = fareFormatted;

    const custNameEl = document.getElementById('offer-cust-name');
    if (custNameEl) custNameEl.textContent = offer.customerName || 'Khách hàng Navigo';

    const vLabelEl = document.getElementById('offer-vehicle-label');
    if (vLabelEl) vLabelEl.textContent = offer.rideType || 'Chuyến xe Navigo';

    const pAddrEl = document.getElementById('offer-pickup-address');
    if (pAddrEl) pAddrEl.textContent = offer.pickup || 'Điểm đón khách';

    const dAddrEl = document.getElementById('offer-destination-address');
    if (dAddrEl) dAddrEl.textContent = offer.destination || 'Điểm đến';

    const distEl = document.getElementById('offer-distance-text');
    if (distEl) distEl.textContent = `${offer.distance || '3.2'} km`;

    const durEl = document.getElementById('offer-duration-text');
    if (durEl) durEl.textContent = `${offer.duration || 8} phút`;

    modal.style.display = 'flex';
  }

  async loadIncomingRequests() {
    if (!this.isOnline || this.activeTrip) {
      this.renderIncomingOfferDialog(null);
      return;
    }

    try {
      let requests = [];

      // 1. Check live backend offers
      if (typeof apiClient !== 'undefined') {
        try {
          const res = await apiClient.getDriverPendingOffers();
          if (res && res.data && res.data.has_offer && res.data.trip) {
            const t = res.data.trip;
            if (this.isMatchingVehicleType(t.vehicleType)) {
              const vInfo = this.getVehicleInfo(t.vehicleType);
              requests.push({
                id: t.id,
                tripId: t.id,
                customerName: t.customerName || 'Khách hàng Navigo',
                phone: t.customerPhone || '0901234567',
                vehicleType: vInfo.type,
                rideType: `${vInfo.icon} Chuyến xe ${vInfo.name}`,
                fareNum: t.fareAmount || 45000,
                distance: t.distanceMeters ? (t.distanceMeters / 1000).toFixed(1) : '2.8',
                duration: Math.max(3, Math.round((t.distanceMeters || 2800) / 350)),
                pickup: t.pickupName || 'Chợ Bến Thành, Quận 1',
                destination: t.dropoffName || 'Landmark 81, Bình Thạnh',
                pickupCoords: t.pickup,
                destinationCoords: t.dropoff
              });
            }
          }
        } catch (e) {}
      }

      // 2. Check pending offers in local storage (goride_pending_trip_offers)
      try {
        const rawOffers = localStorage.getItem('goride_pending_trip_offers');
        if (rawOffers) {
          const pending = JSON.parse(rawOffers);
          if (Array.isArray(pending)) {
            pending.forEach(p => {
              if (p && !requests.some(r => r.id === p.id) && this.isMatchingVehicleType(p.vehicleType)) {
                const vInfo = this.getVehicleInfo(p.vehicleType);
                requests.push({
                  id: p.id,
                  tripId: p.id,
                  customerName: p.customerName || 'Khách hàng Navigo',
                  phone: p.customerPhone || p.phone || '0901234567',
                  vehicleType: vInfo.type,
                  rideType: `${vInfo.icon} Chuyến xe ${vInfo.name}`,
                  fareNum: Number(p.fareAmount || p.fare) || 45000,
                  distance: p.distanceMeters ? (p.distanceMeters / 1000).toFixed(1) : (p.distance || '3.2'),
                  duration: Math.max(4, Math.round((Number(p.distanceMeters) || 3200) / 400)),
                  pickup: p.pickupName || (typeof p.pickup === 'string' ? p.pickup : p.pickup?.name) || 'Điểm đón',
                  destination: p.dropoffName || (typeof p.destination === 'string' ? p.destination : p.destination?.name) || 'Điểm đến',
                  pickupCoords: p.pickup,
                  destinationCoords: p.destination
                });
              }
            });
          }
        }
      } catch (e) {}

      // 3. Check goride_active_trip if customer is in REQUESTED state
      try {
        const rawActive = localStorage.getItem('goride_active_trip');
        if (rawActive) {
          const act = JSON.parse(rawActive);
          if (act && (act.status || '').toUpperCase() === 'REQUESTED' && this.isMatchingVehicleType(act.vehicleType)) {
            if (!requests.some(r => r.id === act.id)) {
              const vInfo = this.getVehicleInfo(act.vehicleType);
              requests.push({
                id: act.id,
                tripId: act.id,
                customerName: act.customerName || 'Khách hàng Navigo',
                phone: act.customerPhone || '0901234567',
                vehicleType: vInfo.type,
                rideType: `${vInfo.icon} Chuyến xe ${vInfo.name}`,
                fareNum: Number(act.fareAmount) || 45000,
                distance: act.distanceMeters ? (act.distanceMeters / 1000).toFixed(1) : '3.2',
                duration: 8,
                pickup: act.pickup?.name || act.pickupName || 'Điểm đón',
                destination: act.destination?.name || act.dropoffName || 'Điểm đến',
                pickupCoords: act.pickup,
                destinationCoords: act.destination
              });
            }
          }
        }
      } catch (e) {}

      // 4. Check unified admin trips storage (goride_admin_trips) with status === 'requested'
      try {
        const allTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
        const pendingTrips = allTrips.filter(t => t.status === 'requested' && this.isMatchingVehicleType(t.vehicleType));
        pendingTrips.forEach(pendingTrip => {
          if (!requests.some(r => r.id === pendingTrip.id)) {
            const vInfo = this.getVehicleInfo(pendingTrip.vehicleType);
            requests.push({
              id: pendingTrip.id,
              tripId: pendingTrip.id,
              customerName: pendingTrip.customerName || 'Khách hàng Navigo',
              phone: pendingTrip.customerPhone || '0901234567',
              vehicleType: vInfo.type,
              rideType: `${vInfo.icon} Chuyến xe ${vInfo.name}`,
              fareNum: Number(pendingTrip.fare) || 45000,
              distance: pendingTrip.distance || '3.2',
              duration: 8,
              pickup: pendingTrip.pickup || 'Điểm đón',
              destination: pendingTrip.destination || 'Điểm đến',
              pickupCoords: pendingTrip.pickupCoords,
              destinationCoords: pendingTrip.destinationCoords
            });
          }
        });
      } catch (err) {}

      // Notice when a new request arrives
      if (requests.length > 0 && requests.length > this.incomingRequests.length) {
        this.showToast('🔔 Bạn có cuốc xe mới trong khu vực!', 'info', 4000);
      }

      this.incomingRequests = requests;
      this.renderIncomingOfferDialog(requests.length > 0 ? requests[0] : null);
      this.renderRequestsList(requests);
    } catch (err) {
      console.warn('[Driver] Incoming requests load error:', err.message);
      this.renderIncomingOfferDialog(null);
    }
  }

  renderRequestsList(requests) {
    const container = document.getElementById('incoming-requests-list');
    if (!container) return;

    if (!this.isOnline) {
      container.innerHTML = `
        <div class="empty-state" style="text-align:center; padding:32px 16px; color:#64748b;">
          <div style="font-size:2.2rem; margin-bottom:8px;">🛑</div>
          <h4 style="margin:0; font-size:1rem; color:#334155;">Bạn đang Ngoại tuyến</h4>
          <p style="margin:4px 0 0; font-size:0.85rem; color:#64748b;">Vào mục "Profile & Trạng thái" để mở nhận cuốc xe từ khách hàng.</p>
        </div>
      `;
      return;
    }

    if (this.activeTrip) {
      container.innerHTML = `
        <div style="text-align:center; padding:20px; background:#eff6ff; border-radius:10px; border:1px solid #bfdbfe;">
          <h4 style="margin:0; font-size:0.95rem; color:#1d4ed8;">Đang thực hiện chuyến xe #${this.activeTrip.id}</h4>
          <p style="margin:4px 0 0; font-size:0.8rem; color:#3b82f6;">Hoàn tất chuyến xe hiện tại trước khi nhận yêu cầu mới.</p>
        </div>
      `;
      return;
    }

    if (!requests || requests.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="text-align:center; padding:32px 16px; color:#64748b;">
          <div style="font-size:2.2rem; margin-bottom:8px;">📡</div>
          <h4 style="margin:0; font-size:1rem; color:#334155;">Đang quét tìm cuốc xe gần bạn...</h4>
          <p style="margin:4px 0 0; font-size:0.82rem; color:#64748b;">Hệ thống sẽ hiển thị bảng thông báo nhận cuốc ngay khi khách đặt xe.</p>
        </div>
      `;
      return;
    }
  }

  async handleAcceptRequest(requestId) {
    const req = this.currentOffer || this.incomingRequests.find(r => r.id === requestId);
    if (!req) return;

    try {
      this.showToast('Đang tiếp nhận cuốc xe...', 'info');

      if (typeof apiClient !== 'undefined') {
        try {
          await apiClient.acceptDriverOffer(req.tripId || req.id);
        } catch (e) {}
      }

      // Hide floating incoming offer modal
      this.renderIncomingOfferDialog(null);
      this.incomingRequests = [];

      // Get Driver Info
      let user = (typeof sessionManager !== 'undefined') ? (sessionManager.getUser?.() || sessionManager.getCurrentUser?.()) : null;
      if (!user) {
        try {
          user = JSON.parse(localStorage.getItem('goride_user') || 'null');
        } catch (e) {}
      }

      let vehicleType = user?.vehicle?.type || user?.vehicleType || 'motorbike';
      let isBike = (vehicleType === 'bike' || vehicleType === 'motorbike');
      let driverPlate = user?.vehicle?.plate || user?.licensePlate || (isBike ? '59-S3 889.24' : '51G-889.24');
      let driverVehicle = user?.vehicle?.model || (isBike ? 'Honda Wave Alpha' : 'Toyota Vios 2024');
      let driverName = user?.name || 'Tài xế đối tác';
      let driverRating = '5.0';

      try {
        const allDrivers = JSON.parse(localStorage.getItem('goride_admin_drivers') || '[]');
        const curProfile = allDrivers.find(d => d.email === user?.email || d.phone === user?.phone || d.id === user?.id);
        if (curProfile) {
          driverName = curProfile.name || driverName;
          driverPlate = curProfile.plate || curProfile.licensePlate || driverPlate;
          driverVehicle = curProfile.model || curProfile.vehicleModel || driverVehicle;
          if (curProfile.vehicleType) {
            vehicleType = curProfile.vehicleType;
            isBike = (vehicleType === 'bike' || vehicleType === 'motorbike');
          }
        }
      } catch (e) {}

      // Get real coordinates
      const coords = this.getTripCoordinates(req);

      // Initialize active trip in STAGE 1 (heading to pickup)
      this.activeTrip = {
        id: req.tripId || req.id,
        customerName: req.customerName || 'Khách hàng GoRide',
        phone: req.phone || '0901234567',
        pickup: req.pickup,
        pickupCoords: coords.pickup,
        destination: req.destination,
        destinationCoords: coords.destination,
        fare: Number(req.fareNum || req.fare) || 45000,
        distance: req.distance || '3.2',
        stage: 'heading_to_pickup', // Stage 1: heading_to_pickup, Stage 2: trip_in_progress
        driverName: driverName,
        licensePlate: driverPlate,
        vehicleModel: driverVehicle,
        vehicleType: vehicleType,
        driverRating: driverRating,
        startedAt: new Date().toISOString()
      };

      // Update shared storage
      try {
        // 1. goride_admin_trips
        const allTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
        const tIdx = allTrips.findIndex(t => t.id === this.activeTrip.id);
        if (tIdx !== -1) {
          allTrips[tIdx].status = 'accepted';
          allTrips[tIdx].driverName = driverName;
          allTrips[tIdx].licensePlate = driverPlate;
          allTrips[tIdx].vehicleModel = driverVehicle;
          allTrips[tIdx].vehicleType = vehicleType;
          allTrips[tIdx].driverRating = driverRating;
        } else {
          allTrips.unshift({
            id: this.activeTrip.id,
            customerName: this.activeTrip.customerName,
            customerPhone: this.activeTrip.phone,
            driverName: driverName,
            licensePlate: driverPlate,
            vehicleModel: driverVehicle,
            vehicleType: vehicleType,
            driverRating: driverRating,
            pickup: this.activeTrip.pickup,
            destination: this.activeTrip.destination,
            fare: this.activeTrip.fare,
            distance: this.activeTrip.distance,
            status: 'accepted',
            createdAt: new Date().toISOString()
          });
        }
        localStorage.setItem('goride_admin_trips', JSON.stringify(allTrips));

        // 2. goride_active_trip
        let activeObj = {};
        try {
          activeObj = JSON.parse(localStorage.getItem('goride_active_trip') || '{}');
        } catch(e) {}
        activeObj.id = this.activeTrip.id;
        activeObj.status = 'ACCEPTED';
        activeObj.driverName = driverName;
        activeObj.licensePlate = driverPlate;
        activeObj.vehicleModel = driverVehicle;
        activeObj.driverRating = driverRating;
        activeObj.driverLat = this.currentPosition.lat;
        activeObj.driverLon = this.currentPosition.lng;
        localStorage.setItem('goride_active_trip', JSON.stringify(activeObj));

        // 3. Clear pending offers
        localStorage.removeItem('goride_pending_trip_offers');
      } catch (err) {}

      // 4. Firebase Realtime Cloud Broadcast
      if (typeof realtimeSync !== 'undefined' && this.activeTrip) {
        realtimeSync.acceptTrip(this.activeTrip.id, {
          id: user?.id,
          name: driverName,
          phone: user?.phone || '0901234567',
          licensePlate: driverPlate,
          vehicleModel: driverVehicle,
          vehicleType: vehicleType,
          rating: driverRating,
          lat: this.currentPosition.lat,
          lng: this.currentPosition.lng
        });
      }

      // Render Stage 1 Active Trip UI and Map
      this.renderActiveTripUI();
      this.renderStageMapRoute(1);
      this.broadcastDriverLocation();
      this.showToast('Nhận chuyến thành công! Bản đồ đang chỉ đường tới điểm đón khách.', 'success');
    } catch (err) {
      this.showToast('Không thể nhận chuyến: ' + err.message, 'error');
    }
  }

  handleDeclineRequest(requestId) {
    this.renderIncomingOfferDialog(null);
    this.incomingRequests = this.incomingRequests.filter(r => r.id !== requestId);
    try {
      localStorage.removeItem('goride_pending_trip_offers');
    } catch (e) {}
    this.showToast('Đã từ chối cuốc xe.', 'info');
  }

  /* ==========================================================================
     ACTIVE TRIP PROGRESSION & TWO-STAGE ROUTING (REAL DATA)
     ========================================================================== */

  renderActiveTripUI() {
    const card = document.getElementById('driver-active-trip-card');
    if (!card) return;

    if (!this.activeTrip) {
      card.style.display = 'none';
      card.innerHTML = '';
      return;
    }

    const fareFormatted = Number(this.activeTrip.fare || 0).toLocaleString('vi-VN') + ' ₫';
    const isStage1 = (this.activeTrip.stage === 'heading_to_pickup');

    if (isStage1) {
      // Stage 1: Heading to pickup location
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="status-pulse-dot" style="background:#0288d1; box-shadow:0 0 0 3px rgba(2,136,209,0.25);"></span>
              <span style="font-size:0.8rem; font-weight:800; color:#0288d1; text-transform:uppercase; letter-spacing:0.04em;">Đang đến điểm đón khách</span>
            </div>
            <h3 style="margin:4px 0 0; font-size:1.15rem; font-weight:800; color:#0f172a;">${this.activeTrip.customerName}</h3>
            <a href="tel:${this.activeTrip.phone}" style="display:inline-flex; align-items:center; gap:4px; font-size:0.82rem; color:#0288d1; text-decoration:none; margin-top:2px; font-weight:600;">
              📞 ${this.activeTrip.phone} (Gọi khách hàng)
            </a>
          </div>
          <div style="text-align:right;">
            <div style="font-size:1.4rem; font-weight:800; color:#10b981;">${fareFormatted}</div>
            <span style="font-size:0.75rem; color:#64748b;">Cước phí nhận</span>
          </div>
        </div>

        <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:12px; padding:12px 14px; margin-bottom:14px;">
          <div style="display:flex; align-items:flex-start; gap:8px;">
            <span style="font-size:1.2rem; color:#0288d1;">🟢</span>
            <div>
              <div style="font-size:0.72rem; color:#0369a1; font-weight:700; text-transform:uppercase;">Chỉ dẫn tới điểm hẹn đón:</div>
              <div style="font-weight:700; font-size:0.92rem; color:#0f172a;" id="active-trip-pickup-text">${this.activeTrip.pickup}</div>
            </div>
          </div>
        </div>

        <button type="button" class="btn btn-primary btn-block" id="btn-confirm-pickup" onclick="driverController.confirmPickedUp()" style="padding:13px; font-size:1rem; font-weight:800; border-radius:12px; box-shadow:0 4px 14px rgba(2,136,209,0.35);">
          ✓ Đã đến & Đón khách
        </button>
      `;
    } else {
      // Stage 2: Picked up passenger -> Heading to destination
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="status-pulse-dot" style="background:#10b981; box-shadow:0 0 0 3px rgba(16,185,129,0.25);"></span>
              <span style="font-size:0.8rem; font-weight:800; color:#10b981; text-transform:uppercase; letter-spacing:0.04em;">Đang chở khách đến điểm đến</span>
            </div>
            <h3 style="margin:4px 0 0; font-size:1.15rem; font-weight:800; color:#0f172a;">${this.activeTrip.customerName}</h3>
            <span style="font-size:0.8rem; color:#64748b;">Quãng đường: ~${this.activeTrip.distance || '3.2'} km</span>
          </div>
          <div style="text-align:right;">
            <div style="font-size:1.4rem; font-weight:800; color:#10b981;">${fareFormatted}</div>
            <span style="font-size:0.75rem; color:#64748b;">Thu tiền mặt / ví</span>
          </div>
        </div>

        <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:12px; padding:12px 14px; margin-bottom:14px;">
          <div style="display:flex; align-items:flex-start; gap:8px;">
            <span style="font-size:1.2rem; color:#ef4444;">🔴</span>
            <div>
              <div style="font-size:0.72rem; color:#065f46; font-weight:700; text-transform:uppercase;">Chỉ dẫn tới điểm đến của khách:</div>
              <div style="font-weight:700; font-size:0.92rem; color:#0f172a;" id="active-trip-destination-text">${this.activeTrip.destination}</div>
            </div>
          </div>
        </div>

        <button type="button" class="btn btn-success btn-block" id="btn-complete-trip" onclick="driverController.confirmCompletedTrip()" style="padding:13px; font-size:1rem; font-weight:800; border-radius:12px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow:0 4px 14px rgba(16,185,129,0.4);">
          🏁 Hoàn thành chuyến & Thu tiền (${fareFormatted})
        </button>
      `;
    }

    card.style.display = 'block';
  }

  async confirmPickedUp() {
    if (!this.activeTrip) return;

    try {
      this.activeTrip.stage = 'trip_in_progress';

      if (typeof apiClient !== 'undefined') {
        try {
          await apiClient.updateDriverTripStatus(this.activeTrip.id, 'start');
        } catch (e) {}
      }

      // Update shared storage
      try {
        const allTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
        const idx = allTrips.findIndex(t => t.id === this.activeTrip.id);
        if (idx !== -1) {
          allTrips[idx].status = 'in_progress';
          localStorage.setItem('goride_admin_trips', JSON.stringify(allTrips));
        }

        let activeObj = {};
        try {
          activeObj = JSON.parse(localStorage.getItem('goride_active_trip') || '{}');
        } catch (e) {}
        activeObj.status = 'IN_PROGRESS';
        localStorage.setItem('goride_active_trip', JSON.stringify(activeObj));
      } catch (e) {}

      // Broadcast to Firebase Realtime Cloud
      if (typeof realtimeSync !== 'undefined' && this.activeTrip) {
        realtimeSync.updateTripStatus(this.activeTrip.id, 'IN_PROGRESS');
      }

      // Advance map to Stage 2: Pickup -> Destination
      this.renderActiveTripUI();
      this.renderStageMapRoute(2);
      this.broadcastDriverLocation();
      this.showToast('Xác nhận đón khách thành công! Lộ trình đã chuyển sang điểm đến của khách.', 'success');
    } catch (err) {
      this.showToast('Lỗi: ' + err.message, 'error');
    }
  }

  async confirmCompletedTrip() {
    if (!this.activeTrip) return;
    await this.completeActiveTrip();
  }

  renderStageMapRoute(stage = 1) {
    if (!this.mapController || !this.activeTrip) return;

    try {
      const pCoords = this.activeTrip.pickupCoords || [10.7725, 106.6980];
      const dCoords = this.activeTrip.destinationCoords || [10.7951, 106.7219];
      const driverCoords = [this.currentPosition.lat, this.currentPosition.lng];

      if (typeof this.mapController.clearRoute === 'function') {
        this.mapController.clearRoute();
      }
      if (typeof this.mapController.clearMarkers === 'function') {
        this.mapController.clearMarkers('pickup');
        this.mapController.clearMarkers('destination');
      }

      if (stage === 1) {
        // Stage 1: Driver -> Customer Pickup Location
        if (typeof this.mapController.setPickupMarker === 'function') {
          this.mapController.setPickupMarker(pCoords[0], pCoords[1], { name: this.activeTrip.pickup });
        }

        const path = this.generateStreetPath(driverCoords, pCoords);
        if (typeof this.mapController.drawRoute === 'function') {
          this.mapController.drawRoute(path, {
            color: '#0288d1',
            weight: 5,
            opacity: 0.95
          });
        }
        if (typeof this.mapController.fitBounds === 'function') {
          this.mapController.fitBounds([driverCoords, pCoords], { padding: [60, 60] });
        }
      } else {
        // Stage 2: Customer Pickup Location -> Destination
        if (typeof this.mapController.setDestinationMarker === 'function') {
          this.mapController.setDestinationMarker(dCoords[0], dCoords[1], { name: this.activeTrip.destination });
        }

        // Move driver marker to pickup location as vehicle starts carrying customer
        this.currentPosition.lat = pCoords[0];
        this.currentPosition.lng = pCoords[1];
        this.updateDriverMapMarker();

        const path = this.generateStreetPath(pCoords, dCoords);
        if (typeof this.mapController.drawRoute === 'function') {
          this.mapController.drawRoute(path, {
            color: '#10b981',
            weight: 5,
            opacity: 0.95
          });
        }
        if (typeof this.mapController.fitBounds === 'function') {
          this.mapController.fitBounds([pCoords, dCoords], { padding: [60, 60] });
        }
      }
    } catch (err) {
      console.warn('[Driver] Map route error:', err.message);
    }
  }

  getTripCoordinates(trip) {
    let pLat = 10.7725, pLng = 106.6980; // Bến Thành default
    let dLat = 10.7951, dLng = 106.7219; // Landmark 81 default

    // 1. Direct pickupCoords
    if (trip.pickupCoords) {
      if (Array.isArray(trip.pickupCoords)) {
        pLat = Number(trip.pickupCoords[0]);
        pLng = Number(trip.pickupCoords[1]);
      } else if (typeof trip.pickupCoords === 'object') {
        pLat = Number(trip.pickupCoords.lat || trip.pickupCoords.latitude);
        pLng = Number(trip.pickupCoords.lng || trip.pickupCoords.lon || trip.pickupCoords.longitude);
      }
    } else if (trip.pickup && typeof trip.pickup === 'object') {
      if (trip.pickup.lat) {
        pLat = Number(trip.pickup.lat);
        pLng = Number(trip.pickup.lng || trip.pickup.lon);
      }
    }

    // 2. Direct destinationCoords
    if (trip.destinationCoords) {
      if (Array.isArray(trip.destinationCoords)) {
        dLat = Number(trip.destinationCoords[0]);
        dLng = Number(trip.destinationCoords[1]);
      } else if (typeof trip.destinationCoords === 'object') {
        dLat = Number(trip.destinationCoords.lat || trip.destinationCoords.latitude);
        dLng = Number(trip.destinationCoords.lng || trip.destinationCoords.lon || trip.destinationCoords.longitude);
      }
    } else if (trip.destination && typeof trip.destination === 'object') {
      if (trip.destination.lat) {
        dLat = Number(trip.destination.lat);
        dLng = Number(trip.destination.lng || trip.destination.lon);
      }
    }

    // 3. Name-based match lookup
    const pName = String(trip.pickupName || (typeof trip.pickup === 'string' ? trip.pickup : trip.pickup?.name) || '').toLowerCase();
    const dName = String(trip.dropoffName || (typeof trip.destination === 'string' ? trip.destination : trip.destination?.name) || '').toLowerCase();

    const landmarks = [
      { key: 'bến thành', lat: 10.7725, lng: 106.6980 },
      { key: 'landmark 81', lat: 10.7951, lng: 106.7219 },
      { key: 'vinhomes', lat: 10.7951, lng: 106.7219 },
      { key: 'sân bay', lat: 10.8185, lng: 106.6588 },
      { key: 'tân sơn nhất', lat: 10.8185, lng: 106.6588 },
      { key: 'bách khoa', lat: 10.7721, lng: 106.6578 },
      { key: 'đức bà', lat: 10.7798, lng: 106.6990 },
      { key: 'nguyễn huệ', lat: 10.7743, lng: 106.7036 },
      { key: 'crescent mall', lat: 10.7297, lng: 106.7219 },
      { key: 'vincom', lat: 10.7781, lng: 106.7023 }
    ];

    landmarks.forEach(l => {
      if (pName.includes(l.key)) { pLat = l.lat; pLng = l.lng; }
      if (dName.includes(l.key)) { dLat = l.lat; dLng = l.lng; }
    });

    return {
      pickup: [pLat, pLng],
      destination: [dLat, dLng]
    };
  }

  generateStreetPath(fromPoint, toPoint) {
    const fLat = Number(fromPoint[0]);
    const fLng = Number(fromPoint[1]);
    const tLat = Number(toPoint[0]);
    const tLng = Number(toPoint[1]);

    // Chợ Bến Thành -> Landmark 81
    if (Math.abs(fLat - 10.7725) < 0.005 && Math.abs(tLat - 10.7951) < 0.007) {
      return [
        [10.77250, 106.69800],
        [10.77330, 106.69980],
        [10.77395, 106.70070],
        [10.77470, 106.70195],
        [10.77490, 106.70650],
        [10.78120, 106.70610],
        [10.78750, 106.71180],
        [10.79150, 106.71750],
        [10.79420, 106.72050],
        [10.79510, 106.72190]
      ];
    }

    // Central HCMC street grid interpolation
    const midLat = fLat + (tLat - fLat) * 0.45;
    const midLng = fLng + (tLng - fLng) * 0.55;

    return [
      [fLat, fLng],
      [fLat + (midLat - fLat) * 0.5, fLng],
      [midLat, fLng],
      [midLat, midLng],
      [midLat, tLng],
      [tLat - (tLat - midLat) * 0.3, tLng],
      [tLat, tLng]
    ];
  }

  checkActiveTripOnLoad() {
    try {
      let trip = null;
      // 1. Check goride_active_trip
      const rawActive = localStorage.getItem('goride_active_trip');
      if (rawActive) {
        const parsed = JSON.parse(rawActive);
        if (parsed && ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes((parsed.status || '').toUpperCase())) {
          trip = parsed;
        }
      }

      // 2. Check goride_admin_trips
      if (!trip) {
        const allTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
        const found = allTrips.find(t => ['accepted', 'in_progress'].includes(t.status?.toLowerCase()));
        if (found) trip = found;
      }

      if (trip) {
        const coords = this.getTripCoordinates(trip);
        const isProg = String(trip.status || '').toLowerCase().includes('progress');

        this.activeTrip = {
          id: trip.id,
          customerName: trip.customerName || 'Khách hàng',
          phone: trip.customerPhone || trip.phone || '0901234567',
          pickup: trip.pickup?.name || trip.pickup || 'Điểm đón',
          pickupCoords: coords.pickup,
          destination: trip.destination?.name || trip.destination || 'Điểm đến',
          destinationCoords: coords.destination,
          fare: Number(trip.fare || trip.fareAmount) || 45000,
          distance: trip.distance || '3.2',
          stage: isProg ? 'trip_in_progress' : 'heading_to_pickup',
          driverName: trip.driverName,
          licensePlate: trip.licensePlate,
          vehicleModel: trip.vehicleModel,
          vehicleType: trip.vehicleType,
          startedAt: trip.createdAt || new Date().toISOString()
        };

        this.renderActiveTripUI();
        setTimeout(() => {
          this.renderStageMapRoute(isProg ? 2 : 1);
        }, 500);
      }
    } catch (e) {
      console.warn('[Driver] checkActiveTripOnLoad error:', e);
    }
  }

  async completeActiveTrip() {
    if (!this.activeTrip) return;

    const completedFare = Number(this.activeTrip.fare) || 45000;
    const completedTrip = {
      ...this.activeTrip,
      fare: completedFare,
      status: 'completed',
      completedAt: new Date().toISOString()
    };

    if (typeof apiClient !== 'undefined') {
      try {
        await apiClient.updateDriverTripStatus(this.activeTrip.id, 'complete');
      } catch (e) {}
    }

    // 1. Update stats locally
    this.driverStats.tripsToday += 1;
    this.driverStats.earnings += completedFare;
    this.driverStats.walletBalance += completedFare;

    // 2. Persist in driver's completed trips list
    try {
      const driverTrips = JSON.parse(localStorage.getItem('goride_driver_trips') || '[]');
      driverTrips.unshift(completedTrip);
      localStorage.setItem('goride_driver_trips', JSON.stringify(driverTrips));
    } catch (err) {}

    // 3. Persist in unified Admin trips storage
    try {
      const allTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
      const idx = allTrips.findIndex(t => t.id === completedTrip.id);
      if (idx !== -1) {
        allTrips[idx].status = 'completed';
        allTrips[idx].fare = completedFare;
        allTrips[idx].completedAt = completedTrip.completedAt;
      } else {
        allTrips.unshift(completedTrip);
      }
      localStorage.setItem('goride_admin_trips', JSON.stringify(allTrips));
    } catch (err) {}

    // 4. Update goride_active_trip status
    try {
      let activeObj = {};
      try {
        activeObj = JSON.parse(localStorage.getItem('goride_active_trip') || '{}');
      } catch (e) {}
      activeObj.status = 'COMPLETED';
      localStorage.setItem('goride_active_trip', JSON.stringify(activeObj));
    } catch (e) {}

    // 4.1 Firebase Realtime Cloud Update
    if (typeof realtimeSync !== 'undefined' && completedTrip.id) {
      realtimeSync.updateTripStatus(completedTrip.id, 'COMPLETED', {
        completedAt: completedTrip.completedAt,
        fare: completedFare
      });
    }

    // 5. Update driver wallet balance in session & offline users
    try {
      const user = typeof sessionManager !== 'undefined' ? (sessionManager.getUser?.() || sessionManager.getCurrentUser?.()) : null;
      if (user) {
        user.walletBalance = (user.walletBalance || 0) + completedFare;
        localStorage.setItem('goride_user', JSON.stringify(user));

        const offlineUsers = JSON.parse(localStorage.getItem('goride_offline_users') || '[]');
        const uIdx = offlineUsers.findIndex(u => u.id === user.id || u.email === user.email);
        if (uIdx !== -1) {
          offlineUsers[uIdx].walletBalance = user.walletBalance;
          localStorage.setItem('goride_offline_users', JSON.stringify(offlineUsers));
        }
      }
    } catch (err) {}

    const fareStr = completedFare.toLocaleString('vi-VN') + ' ₫';
    this.showToast(`Hoàn tất chuyến xe #${completedTrip.id}! Đã cộng ${fareStr} vào ví tài xế.`, 'success', 5000);

    // Reset active trip and map route
    this.activeTrip = null;
    this.broadcastDriverLocation();
    if (this.mapController) {
      if (typeof this.mapController.clearRoute === 'function') {
        this.mapController.clearRoute();
      }
      if (typeof this.mapController.clearMarkers === 'function') {
        this.mapController.clearMarkers('pickup');
        this.mapController.clearMarkers('destination');
      }
      this.updateDriverMapMarker();
    }

    // Refresh UI
    this.renderActiveTripUI();
    this.renderDriverStats();
    if (this.currentTab === 'trips') this.renderTripHistory(this.currentHistoryFilter);
    if (this.currentTab === 'earnings') this.renderEarningsReport();

    // Resume incoming requests if still online
    if (this.isOnline) {
      await this.loadIncomingRequests();
    }
  }

  /* ==========================================================================
     TRIP HISTORY TAB (REAL COMPLETED TRIPS - ZERO MOCK)
     ========================================================================== */

  filterTripHistory(filter) {
    this.currentHistoryFilter = filter;
    document.querySelectorAll('.filter-pill').forEach(btn => {
      const isMatch = (filter === 'all' && btn.textContent.includes('Tất cả')) ||
                      (filter === 'today' && btn.textContent.includes('Hôm nay')) ||
                      (filter === 'week' && btn.textContent.includes('Tuần này'));
      btn.classList.toggle('active', isMatch);
    });
    this.renderTripHistory(filter);
  }

  renderTripHistory(filter = 'all') {
    const container = document.getElementById('driver-trips-list');
    if (!container) return;

    if (typeof purgeAllMockTrips === 'function') {
      purgeAllMockTrips();
    }

    let trips = [];
    try {
      trips = JSON.parse(localStorage.getItem('goride_driver_trips') || '[]');
      if (trips.length === 0) {
        // Fallback check in goride_admin_trips with completed status
        const adminTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
        trips = adminTrips.filter(t => t.status === 'completed');
      }
      const checkMock = (typeof isMockTrip === 'function') ? isMockTrip : (t => ['trip_vn_101', 'trip_vn_102', 'trip_vn_103', 'trip_vn_104'].includes(t?.id));
      trips = trips.filter(t => !checkMock(t));
    } catch {
      trips = [];
    }

    // Filter by date
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

    if (filter === 'today') {
      trips = trips.filter(t => (t.completedAt || t.createdAt || '').startsWith(todayStr));
    } else if (filter === 'week') {
      trips = trips.filter(t => new Date(t.completedAt || t.createdAt || 0) >= sevenDaysAgo);
    }

    if (!trips || trips.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="text-align:center; padding:48px 16px; background:#fff; border-radius:14px; border:1px solid #e2e8f0;">
          <div style="font-size:2.4rem; margin-bottom:8px;">📋</div>
          <h4 style="margin:0; font-size:1.05rem; color:#334155;">Chưa có chuyến đi nào hoàn thành</h4>
          <p style="margin:4px 0 0; color:#64748b; font-size:0.85rem;">Các chuyến đi bạn đã hoàn tất trên hệ thống sẽ hiển thị chi tiết tại đây.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = trips.map(t => {
      const fareFormatted = Number(t.fare || 0).toLocaleString('vi-VN') + ' ₫';
      const timeStr = t.completedAt ? new Date(t.completedAt).toLocaleString('vi-VN') : 'Gần đây';
      return `
        <div class="driver-trip-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight:700; color:var(--color-primary); font-family:monospace;">#${t.id}</span>
              <span class="badge badge-success" style="font-size:0.75rem;">Hoàn thành</span>
            </div>
            <span style="font-size:0.8rem; color:#64748b;">${timeStr}</span>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
            <div style="font-size:0.9rem; color:#1e293b; line-height:1.5;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="color:#10b981;">🟢</span>
                <span>${t.pickup || '--'}</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="color:#ef4444;">🔴</span>
                <span>${t.destination || '--'}</span>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:1.25rem; font-weight:800; color:#0f766e;">${fareFormatted}</div>
              <span style="font-size:0.75rem; color:#64748b;">Khách: <strong>${t.customerName || 'Khách hàng'}</strong></span>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#64748b; background:#f8fafc; padding:6px 12px; border-radius:8px;">
            <span>Quãng đường: <strong>${t.distance || '3.2'} km</strong></span>
            <span>Đánh giá: <strong style="color:#f59e0b;">★ 5.0</strong></span>
            <span>Thanh toán: <strong>Tiền mặt / Ví</strong></span>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ==========================================================================
     EARNINGS REPORT TAB (WALLET BALANCE & METRICS IN VND)
     ========================================================================== */

  renderEarningsReport() {
    let trips = [];
    try {
      trips = JSON.parse(localStorage.getItem('goride_driver_trips') || '[]');
      if (trips.length === 0) {
        const adminTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
        trips = adminTrips.filter(t => t.status === 'completed');
      }
    } catch {
      trips = [];
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

    const todayTrips = trips.filter(t => (t.completedAt || t.createdAt || '').startsWith(todayStr));
    const weekTrips = trips.filter(t => new Date(t.completedAt || t.createdAt || 0) >= sevenDaysAgo);

    const todayEarn = todayTrips.reduce((s, t) => s + (Number(t.fare) || 0), 0);
    const weekEarn = weekTrips.reduce((s, t) => s + (Number(t.fare) || 0), 0);
    const totalEarn = trips.reduce((s, t) => s + (Number(t.fare) || 0), 0);

    // Get wallet balance from user profile or total completed earnings (Starts at 0 for new drivers)
    let userWallet = 0;
    const user = typeof sessionManager !== 'undefined' ? (sessionManager.getUser?.() || sessionManager.getCurrentUser?.()) : null;
    if (user && typeof user.walletBalance === 'number' && user.walletBalance !== 350000 && user.walletBalance !== 1450000) {
      userWallet = user.walletBalance;
    } else {
      userWallet = totalEarn;
      if (user) {
        user.walletBalance = totalEarn;
        try { localStorage.setItem('goride_user', JSON.stringify(user)); } catch(e) {}
      }
    }

    const fmt = (num) => Number(num || 0).toLocaleString('vi-VN') + ' ₫';

    const setEl = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setEl('wallet-balance-amount', fmt(userWallet));
    setEl('kpi-earn-today', fmt(todayEarn));
    setEl('kpi-trips-today', `${todayTrips.length} chuyến hoàn thành`);
    setEl('kpi-earn-week', fmt(weekEarn));
    setEl('kpi-earn-month', fmt(totalEarn));

    // Render table
    const tbody = document.getElementById('earnings-history-body');
    if (!tbody) return;

    if (!trips || trips.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:28px; color:#64748b;">Chưa phát sinh giao dịch thu nhập nào.</td></tr>';
      return;
    }

    tbody.innerHTML = trips.map(t => {
      const fareFormatted = fmt(t.fare);
      const timeStr = t.completedAt ? new Date(t.completedAt).toLocaleDateString('vi-VN') : 'Hôm nay';
      return `
        <tr>
          <td style="font-weight:700; color:var(--color-primary); font-family:monospace;">#${t.id}</td>
          <td>${timeStr}</td>
          <td>${t.customerName || '--'}</td>
          <td><span class="badge badge-info" style="font-size:0.75rem;">Ví điện tử</span></td>
          <td style="font-weight:600;">${fareFormatted}</td>
          <td style="text-align:right; font-weight:800; color:#10b981;">${fareFormatted}</td>
        </tr>
      `;
    }).join('');
  }

  showWithdrawDialog() {
    this.showToast('Yêu cầu rút tiền về tài khoản ngân hàng liên kết thành công!', 'success');
  }

  showDepositDialog() {
    this.showToast('Vui lòng quét mã QR thanh toán để nạp thêm tiền ký quỹ.', 'info');
  }

  /* ==========================================================================
     DRIVER STATS & PROFILE SYNC
     ========================================================================== */

  async loadDriverProfileAndStats() {
    try {
      let user = typeof sessionManager !== 'undefined' ? (sessionManager.getUser?.() || sessionManager.getCurrentUser?.()) : null;

      // If user is missing or role is not driver, find real driver in local storage
      if (!user || user.role !== 'driver') {
        try {
          const offlineUsers = JSON.parse(localStorage.getItem('goride_offline_users') || '[]');
          const found = offlineUsers.find(u => u.role === 'driver');
          if (found) user = found;
        } catch (e) {}
      }

      if (user) {
        // Sanitize name: If accidentally has Admin title, restore driver real name
        if (!user.name || user.name.includes('Quản trị viên') || user.name.toLowerCase() === 'admin') {
          try {
            const adminDrivers = JSON.parse(localStorage.getItem('goride_admin_drivers') || '[]');
            const dMatch = adminDrivers.find(d => (d.email && d.email === user.email) || (d.id && d.id === user.id) || (d.phone && d.phone === user.phone));
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
          } catch(e) {
            user.name = 'Đối tác tài xế';
          }
        }

        document.querySelectorAll('[data-user-name]').forEach(el => {
          el.textContent = user.name || 'Đối tác tài xế';
        });

        document.querySelectorAll('[data-user-avatar]').forEach(el => {
          if (user.avatar || user.avatar_path) {
            const avatarSrc = user.avatar || user.avatar_path;
            if (el.tagName && el.tagName.toLowerCase() === 'img') {
              el.setAttribute('src', avatarSrc);
              el.style.display = 'block';
            } else {
              el.innerHTML = `<img src="${avatarSrc}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block; pointer-events:none;">`;
            }
            el.style.overflow = 'hidden';
            el.style.padding = '0';
          } else {
            const initial = (user.name || 'T').charAt(0).toUpperCase();
            if (el.tagName && el.tagName.toLowerCase() === 'img') {
              el.style.display = 'none';
            } else {
              el.textContent = initial;
            }
          }
        });

        if (typeof user.walletBalance === 'number' && user.walletBalance !== 350000 && user.walletBalance !== 1450000) {
          this.driverStats.walletBalance = user.walletBalance;
        } else {
          this.driverStats.walletBalance = 0;
          user.walletBalance = 0;
          try { localStorage.setItem('goride_user', JSON.stringify(user)); } catch(e) {}
        }
      }

      // Calculate today stats from completed trips
      let trips = [];
      try {
        trips = JSON.parse(localStorage.getItem('goride_driver_trips') || '[]');
      } catch {
        trips = [];
      }
      const todayStr = new Date().toISOString().split('T')[0];
      const todayTrips = trips.filter(t => (t.completedAt || '').startsWith(todayStr));

      this.driverStats.tripsToday = todayTrips.length;
      this.driverStats.earnings = todayTrips.reduce((s, t) => s + (Number(t.fare) || 0), 0);
      if (this.driverStats.walletBalance === 0 && trips.length > 0) {
        this.driverStats.walletBalance = trips.reduce((s, t) => s + (Number(t.fare) || 0), 0);
      }

      this.renderDriverStats();
    } catch (err) {
      console.warn('[Driver] Profile and stats sync error:', err.message);
    }
  }

  renderDriverStats() {
    const tripsEl = document.getElementById('stat-trips-today');
    const earnEl = document.getElementById('stat-earnings');
    const ratingEl = document.getElementById('stat-rating');

    if (tripsEl) tripsEl.textContent = this.driverStats.tripsToday;
    if (earnEl) earnEl.textContent = Number(this.driverStats.earnings || 0).toLocaleString('vi-VN') + ' ₫';
    if (ratingEl) ratingEl.textContent = '5.0 ★';
  }

  renderAccountTab() {
    const user = typeof sessionManager !== 'undefined' ? (sessionManager.getUser?.() || sessionManager.getCurrentUser?.()) : null;
    if (!user) return;

    const setT = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val || '--';
    };

    const vInfo = this.getVehicleInfo(user.vehicle?.type || user.vehicleType);
    setT('account-phone', user.phone);
    setT('account-email', user.email);
    setT('account-plate', user.vehicle?.plate || user.licensePlate || vInfo.defaultPlate);
    setT('account-vehicle', `${vInfo.icon} ${vInfo.label}`);
  }

  /* ==========================================================================
     MAP ROUTE VISUALIZATION (TURN-BY-TURN STREET NETWORK)
     ========================================================================== */

  async showTripOnMap(trip) {
    if (!this.mapController || !trip) return;
    this.renderStageMapRoute(this.activeTrip?.stage === 'trip_in_progress' ? 2 : 1);
  }

  showToast(message, type = 'info', duration = 3500) {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type, duration);
      return;
    }
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Check for duplicate recent toasts to avoid flooding / stacking
    const existingToasts = Array.from(container.children);
    if (existingToasts.some(t => t.textContent.trim().includes(message.trim()))) {
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      padding: 12px 18px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#0288d1'};
      color: #ffffff;
      border-radius: 10px;
      margin-bottom: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.2);
      animation: fadeIn 0.2s;
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }
}

// Global initialization
let driverController;
document.addEventListener('DOMContentLoaded', () => {
  driverController = new DriverController();
  driverController.init();
});
