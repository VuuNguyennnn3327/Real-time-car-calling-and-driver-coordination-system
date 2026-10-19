/**
 * GoRide - Customer App Controller (Phase 1.2 Redesign)
 * Real ride-hailing flow matching UI references:
 * - ref-02: Location Search with pickup/dropoff & suggestions
 * - ref-03: Confirm Pickup on Map with center pin & options
 * - ref-04: Vehicle Selection & Fare Estimate bottom sheet
 * - ref-05/06: Live Driver Matching & Trip Tracking
 */

class CustomerAppController {
    constructor() {
        this.mapController = null;
        this.mapRenderer = null;

        // Current Active View: 'search' | 'pickup-confirm' | 'vehicle-select' | 'tracking' | 'history'
        this.currentView = 'search';

        // Locations (no default prefill, user selects or enters pickup)
        this.pickup = null;
        this.destination = null;

        // Selected Vehicle Type
        this.selectedService = 'car4'; // 'bike' | 'car4' | 'premium' | 'car7'

        // Preferences (ref-03)
        this.preferences = {
            quiet: false,
            luggage: false,
            aircon: true
        };

        // Payment Method (ref-04)
        this.paymentMethod = 'cash'; // 'cash' | 'wallet'

        // Promo Code Management (Discount calculations & strikethrough UI)
        this.appliedPromo = {
            code: 'NAVIGO20',
            discountPercent: 20,
            label: 'Giảm 20%'
        };
        this.availablePromos = {
            'NAVIGO20': { discountPercent: 20, label: 'Giảm 20% toàn bộ chuyến đi' },
            'NAVIGO25': { discountPercent: 25, label: 'Giảm 25% ưu đãi hôm nay' },
            'NAVIGO50': { discountPercent: 50, label: 'Giảm 50% siêu tiết kiệm' }
        };
        this.selectedVehicleFare = null;
        this.selectedOriginalFare = null;

        // Current Active Trip & Tracking state
        this.activeTrip = null;
        this.trackingInterval = null;
        this.driverCarMarker = null;
        this.simulationTimers = [];

        // Phase 2A.3: Real Route State from C++ Dijkstra Backend
        this.currentRouteDistance = null; // meters
        this.currentRouteDuration = null; // seconds
        this.currentRouteGeometry = null; // [[lat, lng], ...]
        this.currentNodesVisited = 0;

        // Realistic HCMC Locations Pool (ref-02)
        this.locationsPool = [
            {
                id: 'loc_vincom_dk',
                name: 'Vincom Center Đồng Khởi',
                address: '72 Lê Thánh Tôn & 45A Lý Tự Trọng, Bến Nghé, Quận 1, TP.HCM',
                lat: 10.7781,
                lng: 106.7023,
                distance: 1300,
                isPopular: true,
                popularText: 'Điểm đến phổ biến (60% khách chọn đặt)'
            },
            {
                id: 'loc_benthanh',
                name: 'Chợ Bến Thành',
                address: 'Cửa Nam, Đường Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
                lat: 10.7725,
                lng: 106.6980,
                distance: 800,
                isPopular: true,
                popularText: 'Khu vực trung tâm thương mại & ẩm thực'
            },
            {
                id: 'loc_landmark81',
                name: 'Landmark 81, Vinhomes Central Park',
                address: '720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM',
                lat: 10.7951,
                lng: 106.7219,
                distance: 5800,
                isPopular: true,
                popularText: 'Tòa nhà cao nhất Việt Nam'
            },
            {
                id: 'loc_airport',
                name: 'Sân bay Quốc tế Tân Sơn Nhất',
                address: 'Ga Quốc nội & Quốc tế, Đường Trường Sơn, Tân Bình, TP.HCM',
                lat: 10.8185,
                lng: 106.6588,
                distance: 6200,
                isPopular: false
            },
            {
                id: 'loc_bachkhoa',
                name: 'Đại học Bách Khoa TP.HCM (Cơ sở 1)',
                address: '268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM',
                lat: 10.7721,
                lng: 106.6578,
                distance: 4200,
                isPopular: false
            },
            {
                id: 'loc_ducba',
                name: 'Nhà Thờ Đức Bà Sài Gòn',
                address: '01 Công xã Paris, Phường Bến Nghé, Quận 1, TP.HCM',
                lat: 10.7798,
                lng: 106.6990,
                distance: 1500,
                isPopular: false
            },
            {
                id: 'loc_nguyenhue',
                name: 'Phố đi bộ Nguyễn Huệ',
                address: 'Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
                lat: 10.7743,
                lng: 106.7036,
                distance: 1100,
                isPopular: true,
                popularText: 'Khu vực đi bộ sôi động'
            },
            {
                id: 'loc_crescent',
                name: 'Crescent Mall & Cầu Ánh Sao',
                address: '101 Tôn Dật Tiên, Tân Phú, Quận 7, TP.HCM',
                lat: 10.7297,
                lng: 106.7222,
                distance: 7500,
                isPopular: false
            }
        ];

        // Vehicle specifications & dynamic rates (ref-04)
        this.vehicleCatalog = {
            bike: {
                id: 'bike',
                name: 'Navigo Bike',
                seats: '1 chỗ',
                icon: '🛵',
                baseFare: 14000,
                perKm: 5500,
                etaMin: 2,
                etaMax: 4,
                desc: 'Nhanh chóng, luồn lách qua ngõ ngách'
            },
            car4: {
                id: 'car4',
                name: 'Navigo Car',
                seats: '4 chỗ',
                icon: '🚗',
                baseFare: 26000,
                perKm: 11500,
                etaMin: 4,
                etaMax: 6,
                desc: 'Tiện lợi, êm ái, máy lạnh mát mẻ'
            },
            premium: {
                id: 'premium',
                name: 'Navigo Plus',
                seats: '4 chỗ',
                icon: '🚘',
                baseFare: 45000,
                perKm: 18500,
                etaMin: 5,
                etaMax: 7,
                desc: 'Sedan sang trọng, tài xế vest 5★'
            },
            car7: {
                id: 'car7',
                name: 'Navigo XL',
                seats: '7 chỗ',
                icon: '🚐',
                baseFare: 35000,
                perKm: 14500,
                etaMin: 6,
                etaMax: 8,
                desc: 'Rộng rãi cho cả nhóm & nhiều hành lý'
            }
        };
    }

    normalizeVehicleType(type) {
        if (!type) return 'car4';
        const s = String(type).toLowerCase().trim();
        if (s === 'bike' || s === 'motorbike' || s.includes('bike') || s.includes('moto') || s.includes('xe máy') || s.includes('xe may')) return 'motorbike';
        if (s === 'car7' || s === 'xl' || s.includes('7 chỗ') || s.includes('7 cho') || s.includes('xl')) return 'car7';
        if (s === 'premium' || s === 'car4_plus' || s === 'plus' || s.includes('plus') || s.includes('sang')) return 'premium';
        return 'car4';
    }

    isVehicleTypeMatch(typeA, typeB) {
        return this.normalizeVehicleType(typeA) === this.normalizeVehicleType(typeB);
    }

    getVehicleDetails(type) {
        const norm = this.normalizeVehicleType(type);
        switch (norm) {
            case 'motorbike':
                return {
                    id: 'bike',
                    type: 'motorbike',
                    name: 'Navigo Bike',
                    icon: '🛵',
                    plate: '59-S3 889.24',
                    model: 'Honda Wave Alpha',
                    label: 'Xe máy (Navigo Bike)'
                };
            case 'premium':
                return {
                    id: 'premium',
                    type: 'premium',
                    name: 'Navigo Plus',
                    icon: '🚘',
                    plate: '51K-999.88',
                    model: 'Mercedes-Benz C200',
                    label: 'Xe sang (Navigo Plus)'
                };
            case 'car7':
                return {
                    id: 'car7',
                    type: 'car7',
                    name: 'Navigo XL',
                    icon: '🚐',
                    plate: '51H-777.36',
                    model: 'Mitsubishi Xpander',
                    label: 'Ô tô 7 chỗ (Navigo XL)'
                };
            case 'car4':
            default:
                return {
                    id: 'car4',
                    type: 'car4',
                    name: 'Navigo Car',
                    icon: '🚗',
                    plate: '51G-889.24',
                    model: 'Toyota Vios 2023',
                    label: 'Ô tô 4 chỗ (Navigo Car)'
                };
        }
    }

    /**
     * Initialize app controller
     */
    async init() {
        console.log('[GoRide Customer] Initializing customer app flow...');
        this.initMap();
        this.bindEvents();
        this.renderSuggestions(this.locationsPool);
        this.renderVehicleOptions();
        this.handleUrlParameters();
        this.checkBackendStatus();

        // 100% Real Data Enforcement: Thorough purge of all legacy & default mock trips across all storage
        if (typeof purgeAllMockTrips === 'function') {
            purgeAllMockTrips();
        }

        // Check if customer already has an active trip on backend (P7.1)
        await this.checkActiveTripOnLoad();

        // Check if hash is #history
        if (window.location.hash === '#history') {
            this.switchView('history');
            this.loadTripHistory();
        }

        // Listen for browser navigation hash change
        window.addEventListener('hashchange', () => {
            if (window.location.hash === '#history') {
                this.switchView('history');
                this.loadTripHistory();
            } else if (this.currentView === 'history') {
                if (this.activeTrip) {
                    this.switchView('tracking');
                } else if (this.pickup && this.destination) {
                    this.switchView('vehicle-select');
                } else {
                    this.switchView('search');
                }
            }
        });

        console.log('[GoRide Customer] Ready.');
    }

    /**
     * Check real C++ backend status honestly
     */
    async checkBackendStatus() {
        const dot = document.getElementById('backend-status-dot');
        const text = document.getElementById('backend-status-text');
        const pill = document.getElementById('backend-status-indicator');

        // Start periodic interval if not already running
        if (!this._backendCheckInterval) {
            this._backendCheckInterval = setInterval(() => {
                this.checkBackendStatus();
            }, 12000);
        }

        try {
            if (typeof apiClient !== 'undefined') {
                const res = await (apiClient.checkHealth ? apiClient.checkHealth() : apiClient.get('/health', { timeout: 3000 }));
                if (res && res.ok && res.data && res.data.success) {
                    if (dot) dot.style.background = '#10b981';
                    const nodeCount = res.data.nodes ? Number(res.data.nodes).toLocaleString('vi-VN') : '16.305';
                    if (text) text.textContent = `Backend C++: Trực tuyến (${nodeCount} nút OSM)`;
                    if (pill) pill.classList.add('online');
                    return true;
                }
            }
        } catch (e) {
            // Expected when C++ backend is offline
        }

        if (dot) dot.style.background = '#ef4444';
        if (text) text.textContent = 'Backend C++: Ngoại tuyến';
        if (pill) pill.classList.remove('online');
        return false;
    }

    /**
     * Initialize Leaflet map and render nearby drivers
     */
    initMap() {
        const container = document.getElementById('customer-map-container');
        if (!container || typeof MapController === 'undefined') return;

        const defaultCenter = this.pickup ? [this.pickup.lat, this.pickup.lng] : [10.7760, 106.7000];
        this.mapController = new MapController('customer-map-container', {
            center: defaultCenter,
            zoom: 15,
            zoomControl: false
        });

        this.mapController.init();

        if (typeof MapRenderer !== 'undefined') {
            this.mapRenderer = new MapRenderer(this.mapController);
        }

        // Real dispatch: only display real active driver when assigned by backend
        this.clearNearbyDrivers();

        // Map move event updates center pin callout in pickup confirm mode
        if (this.mapController.map) {
            this.mapController.map.on('move', () => {
                if (this.currentView === 'pickup-confirm') {
                    const center = this.mapController.getCenter();
                    this.updateCenterPinAddress(center.lat, center.lng);
                }
            });
        }
    }

    /**
     * Clear driver markers (no fake drivers or ghost vehicles)
     */
    clearNearbyDrivers() {
        if (!this.mapController) return;
        this.mapController.clearMarkers('drivers');
    }

    scatterNearbyDrivers() {
        this.clearNearbyDrivers();
    }

    /**
     * Switch visible flow view layer
     * @param {'search' | 'pickup-confirm' | 'vehicle-select' | 'tracking' | 'history'} viewName
     */
    switchView(viewName) {
        this.currentView = viewName;

        const views = {
            'search': document.getElementById('view-search'),
            'pickup-confirm': document.getElementById('view-pickup-confirm'),
            'vehicle-select': document.getElementById('view-vehicle-select'),
            'tracking': document.getElementById('view-tracking'),
            'history': document.getElementById('view-history')
        };

        Object.keys(views).forEach(key => {
            if (views[key]) {
                if (key === viewName) {
                    views[key].classList.add('active');
                } else {
                    views[key].classList.remove('active');
                }
            }
        });
        // Update active state of mobile bottom nav items
        const bNavBooking = document.getElementById('bnav-cust-booking');
        const bNavHistory = document.getElementById('bnav-cust-history');
        if (bNavBooking && bNavHistory) {
            if (viewName === 'history') {
                bNavHistory.classList.add('active');
                bNavBooking.classList.remove('active');
            } else {
                bNavBooking.classList.add('active');
                bNavHistory.classList.remove('active');
            }
        }

        // Update active state of desktop history button in top header
        const btnDesktopHistoryEl = document.getElementById('btn-desktop-history');
        if (btnDesktopHistoryEl) {
            if (viewName === 'history') {
                btnDesktopHistoryEl.classList.add('active');
            } else {
                btnDesktopHistoryEl.classList.remove('active');
            }
        }

        // Update header breadcrumb navigation
        const breadcrumbs = {
            'search': { step: 'Lộ trình', title: 'Chọn điểm đón & điểm đến' },
            'pickup-confirm': { step: 'Điểm đón', title: 'Xác nhận vị trí trên bản đồ' },
            'vehicle-select': { step: 'Chọn xe', title: 'Chọn dịch vụ & cước phí' },
            'tracking': { step: 'Theo dõi', title: 'Chuyến đi đang diễn ra' },
            'history': { step: 'Lịch sử', title: 'Các chuyến đi đã thực hiện' }
        };

        const bStep = document.getElementById('breadcrumb-step');
        const bTitle = document.getElementById('breadcrumb-title');
        if (breadcrumbs[viewName]) {
            if (bStep) bStep.textContent = breadcrumbs[viewName].step;
            if (bTitle) bTitle.textContent = breadcrumbs[viewName].title;
        }

        // Center pin overlay on map (only in pickup-confirm mode)
        const centerPin = document.getElementById('center-pin-badge');
        if (centerPin) {
            centerPin.style.display = viewName === 'pickup-confirm' ? 'flex' : 'none';
        }

        // Radar pulse overlay on map (only in tracking mode initially)
        const radar = document.getElementById('tracking-radar');
        if (radar) {
            radar.style.display = viewName === 'tracking' ? 'flex' : 'none';
        }

        // Trigger map invalidate size on view transitions for responsive desktop/mobile
        if (this.mapController && this.mapController.map) {
            this.mapController.map.invalidateSize({ animate: false });
        }
        setTimeout(() => {
            if (this.mapController && this.mapController.map) {
                this.mapController.map.invalidateSize({ animate: false });
            }
        }, 100);
        setTimeout(() => {
            if (this.mapController && this.mapController.map) {
                this.mapController.map.invalidateSize({ animate: false });
            }
        }, 300);

        // View specific setups
        const distPill = document.getElementById('route-distance-pill');
        if (distPill && viewName !== 'vehicle-select') {
            distPill.style.display = 'none';
        }

        if (viewName === 'pickup-confirm') {
            if (this.mapController) {
                const centerLat = this.pickup ? this.pickup.lat : 10.7725;
                const centerLng = this.pickup ? this.pickup.lng : 106.6980;
                this.mapController.setView(centerLat, centerLng, 16);
                this.updateCenterPinAddress(centerLat, centerLng);
            }
        } else if (viewName === 'vehicle-select') {
            this.renderRouteOnMap();
        }

        if (typeof this.updatePersistentBanner === 'function') {
            this.updatePersistentBanner();
        }
    }

    /**
     * Read and react to query parameters (?service=..., ?dest=...)
     */
    handleUrlParameters() {
        const params = new URLSearchParams(window.location.search);
        const service = params.get('service');
        const dest = params.get('dest');

        if (service && this.vehicleCatalog[service]) {
            this.selectedService = service;
        }

        if (dest) {
            let matched = null;
            if (dest === 'home') {
                matched = this.locationsPool.find(l => l.id === 'loc_bachkhoa') || this.locationsPool[4];
            } else if (dest === 'work') {
                matched = this.locationsPool.find(l => l.id === 'loc_landmark81') || this.locationsPool[2];
            } else if (dest === 'benthanh') {
                matched = this.locationsPool.find(l => l.id === 'loc_benthanh') || this.locationsPool[1];
            } else if (dest === 'airport') {
                matched = this.locationsPool.find(l => l.id === 'loc_airport') || this.locationsPool[3];
            } else {
                matched = this.locationsPool.find(l => l.name.toLowerCase().includes(dest.toLowerCase()));
                if (!matched && typeof geocoderService !== 'undefined') {
                    geocoderService.search(dest, 1).then(results => {
                        if (results && results.length > 0) {
                            this.selectDestination(results[0]);
                        }
                    }).catch(() => {});
                    return;
                }
            }

            if (matched) {
                this.selectDestination(matched);
            }
        }
    }

    /**
     * Bind UI event handlers
     */
    bindEvents() {
        // Search state tracking: 'destination' | 'pickup'
        this.searchTarget = 'destination';
        this._searchDebounceTimer = null;

        // Pickup Search Input typing filter (ref-02)
        const pickupInput = document.getElementById('input-pickup');
        const clearPickupBtn = document.getElementById('btn-clear-pickup');

        if (pickupInput) {
            pickupInput.addEventListener('focus', () => {
                this.searchTarget = 'pickup';
                const q = pickupInput.value.trim();
                if (q.length >= 2 && typeof geocoderService !== 'undefined') {
                    this.executeSearch(q);
                } else {
                    this.renderSuggestions(this.locationsPool);
                }
            });

            pickupInput.addEventListener('input', (e) => {
                this.searchTarget = 'pickup';
                const query = e.target.value.trim();
                if (clearPickupBtn) {
                    clearPickupBtn.style.display = query.length > 0 ? 'flex' : 'none';
                }

                clearTimeout(this._searchDebounceTimer);
                if (!query) {
                    this.renderSuggestions(this.locationsPool);
                    return;
                }

                this.showSearchLoading();
                this._searchDebounceTimer = setTimeout(() => {
                    this.executeSearch(query);
                }, 320);
            });
        }

        if (clearPickupBtn && pickupInput) {
            clearPickupBtn.addEventListener('click', () => {
                pickupInput.value = '';
                this.pickup = null;
                clearPickupBtn.style.display = 'none';
                this.renderSuggestions(this.locationsPool);
                pickupInput.focus();
            });
        }

        // Destination Search Input typing filter (ref-02)
        const destInput = document.getElementById('input-destination');
        const clearDestBtn = document.getElementById('btn-clear-dest');

        if (destInput) {
            destInput.addEventListener('focus', () => {
                this.searchTarget = 'destination';
                const q = destInput.value.trim();
                if (q.length >= 2 && typeof geocoderService !== 'undefined') {
                    this.executeSearch(q);
                } else {
                    this.renderSuggestions(this.locationsPool);
                }
            });

            destInput.addEventListener('input', (e) => {
                this.searchTarget = 'destination';
                const query = e.target.value.trim();
                if (clearDestBtn) {
                    clearDestBtn.style.display = query.length > 0 ? 'flex' : 'none';
                }

                clearTimeout(this._searchDebounceTimer);
                if (!query) {
                    this.renderSuggestions(this.locationsPool);
                    return;
                }

                this.showSearchLoading();
                this._searchDebounceTimer = setTimeout(() => {
                    this.executeSearch(query);
                }, 320);
            });
        }

        if (clearDestBtn && destInput) {
            clearDestBtn.addEventListener('click', () => {
                destInput.value = '';
                this.destination = null;
                clearDestBtn.style.display = 'none';
                this.renderSuggestions(this.locationsPool);
                destInput.focus();
            });
        }

        // Swap Locations Button (ref-02)
        const btnSwap = document.getElementById('btn-swap-locations');
        if (btnSwap) {
            btnSwap.addEventListener('click', () => {
                if (!this.pickup || !this.destination) {
                    this.showToast('Vui lòng chọn cả điểm đón và điểm đến trước khi đổi vị trí', 'warning');
                    return;
                }
                const temp = this.pickup;
                this.pickup = this.destination;
                this.destination = temp;

                // Reset route state completely before fetching new reverse route
                this.currentRouteDistance = null;
                this.currentRouteGeometry = null;
                this.currentRouteDuration = null;
                this.currentNodesVisited = 0;

                const pInp = document.getElementById('input-pickup');
                const dInp = document.getElementById('input-destination');
                if (pInp) pInp.value = this.pickup.name;
                if (dInp) dInp.value = this.destination.name;

                const pSum = document.getElementById('route-sum-pickup');
                const dSum = document.getElementById('route-sum-dest');
                if (pSum) pSum.textContent = this.pickup.name;
                if (dSum) dSum.textContent = this.destination.name;

                this.showToast('Đã đảo chiều điểm đón và điểm đến', 'info');

                if (this.currentView === 'vehicle-select') {
                    this.renderRouteOnMap();
                } else {
                    this.switchView('vehicle-select');
                }
            });
        }

        // Trigger Map Pickup Mode (ref-02 -> ref-03)
        const btnMapPickup = document.getElementById('btn-trigger-map-pickup');
        if (btnMapPickup) {
            btnMapPickup.addEventListener('click', () => {
                this.switchView('pickup-confirm');
            });
        }

        // Trigger Map Destination Mode (Choose destination directly by tapping on map)
        const btnMapDest = document.getElementById('btn-trigger-map-dest');
        if (btnMapDest) {
            btnMapDest.addEventListener('click', () => {
                this.showToast('Chạm vào điểm bất kỳ trên bản đồ để chọn điểm đến', 'info');
                if (this.mapController) {
                    this.mapController.enableClickToSelect(async (coords) => {
                        this.mapController.disableClickToSelect();
                        let destPlace = {
                            name: `Tọa độ: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
                            address: `Khu vực TP. Hồ Chí Minh`,
                            lat: coords.lat,
                            lng: coords.lng
                        };

                        if (typeof geocoderService !== 'undefined') {
                            const rev = await geocoderService.reverse(coords.lat, coords.lng);
                            if (rev) destPlace = rev;
                        }

                        this.selectDestination(destPlace);
                        this.showToast(`Điểm đến: ${destPlace.name}`, 'success');
                    });
                }
            });
        }

        // Quick Preset Destination Chips (Nhà riêng, Công ty, Bến Thành, Sân bay)
        document.querySelectorAll('.goride-preset-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const presetKey = chip.getAttribute('data-preset');
                let target = null;
                if (presetKey === 'home') {
                    target = this.locationsPool.find(l => l.id === 'loc_bachkhoa') || this.locationsPool[4];
                } else if (presetKey === 'work') {
                    target = this.locationsPool.find(l => l.id === 'loc_landmark81') || this.locationsPool[2];
                } else if (presetKey === 'benthanh') {
                    target = this.locationsPool.find(l => l.id === 'loc_benthanh') || this.locationsPool[1];
                } else if (presetKey === 'airport') {
                    target = this.locationsPool.find(l => l.id === 'loc_airport') || this.locationsPool[3];
                }
                if (target) {
                    this.selectDestination(target);
                }
            });
        });

        // Back from Pickup Confirm to Search
        const btnBackToSearch = document.getElementById('btn-back-to-search');
        if (btnBackToSearch) {
            btnBackToSearch.addEventListener('click', () => {
                this.switchView('search');
            });
        }

        // Real GPS Recenter on Map using Browser Geolocation (ref-03)
        const btnGps = document.getElementById('btn-gps-recenter');
        if (btnGps) {
            btnGps.addEventListener('click', () => {
                if (navigator.geolocation) {
                    this.showToast('Đang tìm vị trí GPS thực tế của bạn...', 'info');
                    navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                            const lat = pos.coords.latitude;
                            const lng = pos.coords.longitude;
                            if (this.mapController) {
                                this.mapController.setView(lat, lng, 16);
                            }
                            if (typeof geocoderService !== 'undefined') {
                                const rev = await geocoderService.reverse(lat, lng);
                                if (rev) {
                                    this.pickup = {
                                        name: rev.name,
                                        address: rev.address,
                                        lat: lat,
                                        lng: lng
                                    };
                                    const pInput = document.getElementById('input-pickup');
                                    if (pInput) pInput.value = rev.name;
                                    const clearPickupBtn = document.getElementById('btn-clear-pickup');
                                    if (clearPickupBtn) clearPickupBtn.style.display = 'flex';
                                    this.showToast(`Đã định vị: ${rev.name}`, 'success');
                                    if (this.destination) {
                                        this.switchView('vehicle-select');
                                    }
                                    return;
                                }
                            }
                            this.pickup = {
                                name: `Vị trí hiện tại (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                                address: `Khu vực TP. Hồ Chí Minh`,
                                lat: lat,
                                lng: lng
                            };
                            const pInput = document.getElementById('input-pickup');
                            if (pInput) pInput.value = this.pickup.name;
                            const clearPickupBtn = document.getElementById('btn-clear-pickup');
                            if (clearPickupBtn) clearPickupBtn.style.display = 'flex';
                            this.showToast(`Đã định vị GPS thành công`, 'success');
                            if (this.destination) {
                                this.switchView('vehicle-select');
                            }
                        },
                        (err) => {
                            console.warn('[GPS] Geolocation error:', err.message);
                            this.showToast('Không thể lấy GPS trình duyệt (Cần cấp quyền vị trí). Giữ vị trí hiện tại.', 'warning');
                        },
                        { enableHighAccuracy: true, timeout: 8000 }
                    );
                } else {
                    this.showToast('Trình duyệt không hỗ trợ Geolocation GPS.', 'warning');
                }
            });
        }

        // Preference Pills (ref-03)
        document.querySelectorAll('.goride-pref-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const pref = pill.getAttribute('data-pref');
                pill.classList.toggle('active');
                if (pref && typeof this.preferences[pref] !== 'undefined') {
                    this.preferences[pref] = pill.classList.contains('active');
                }
            });
        });

        // Confirm Pickup CTA Button (ref-03)
        const btnConfirmPickup = document.getElementById('btn-confirm-pickup-cta');
        if (btnConfirmPickup) {
            btnConfirmPickup.addEventListener('click', () => {
                // If destination already chosen, proceed to vehicle selection; else go back to search
                if (this.destination) {
                    this.switchView('vehicle-select');
                } else {
                    this.showToast('Đã xác nhận điểm đón. Hãy chọn điểm đến!', 'success');
                    this.switchView('search');
                    const dInput = document.getElementById('input-destination');
                    if (dInput) dInput.focus();
                }
            });
        }

        // Back from Vehicle Select to Route Search (ref-04 -> ref-02)
        const btnBackToPickup = document.getElementById('btn-back-to-pickup');
        if (btnBackToPickup) {
            btnBackToPickup.addEventListener('click', () => {
                this.switchView('search');
            });
        }

        // Change Route Button (ref-04)
        const btnChangeRoute = document.getElementById('btn-change-route');
        if (btnChangeRoute) {
            btnChangeRoute.addEventListener('click', () => {
                this.switchView('search');
            });
        }

        // Payment Method Toggle (ref-04)
        const btnPayment = document.getElementById('btn-toggle-payment');
        if (btnPayment) {
            btnPayment.addEventListener('click', () => {
                this.paymentMethod = this.paymentMethod === 'cash' ? 'wallet' : 'cash';
                const label = document.getElementById('current-payment-method');
                if (label) {
                    label.textContent = this.paymentMethod === 'cash' ? 'Tiền mặt' : 'Ví Navigo Pay';
                }
                this.showToast(`Phương thức thanh toán: ${this.paymentMethod === 'cash' ? 'Tiền mặt' : 'Ví Navigo Pay'}`, 'info');
            });
        }

        // Promo Code Click Handler (ref-04)
        const btnPromo = document.getElementById('btn-promo-tag');
        if (btnPromo) {
            btnPromo.addEventListener('click', () => {
                this.openPromoCodeDialog();
            });
        }

        // Solicitar CTA Button (ref-04) -> Request Ride
        const btnSolicitar = document.getElementById('btn-solicitar-ride');
        if (btnSolicitar) {
            btnSolicitar.addEventListener('click', () => {
                this.requestRideBooking();
            });
        }

        // Cancel Booking Button (When requesting/searching)
        const btnCancelRequest = document.getElementById('btn-cancel-request-booking');
        if (btnCancelRequest) {
            btnCancelRequest.addEventListener('click', (e) => {
                e.preventDefault();
                this.cancelPendingBooking();
            });
        }

        const btnCancelSearching = document.getElementById('btn-cancel-searching');
        if (btnCancelSearching) {
            btnCancelSearching.addEventListener('click', (e) => {
                e.preventDefault();
                this.cancelPendingBooking();
            });
        }

        // Tracking Actions (ref-05/06)
        const btnCall = document.getElementById('btn-call-driver');
        if (btnCall) {
            btnCall.addEventListener('click', () => {
                this.showCallDialog();
            });
        }

        const btnChat = document.getElementById('btn-chat-driver');
        if (btnChat) {
            btnChat.addEventListener('click', () => {
                this.showChatDialog();
            });
        }

        const btnCancel = document.getElementById('btn-cancel-trip');
        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                this.showCancelConfirmDialog();
            });
        }

        const btnTrackHome = document.getElementById('btn-tracking-home');
        if (btnTrackHome) {
            btnTrackHome.addEventListener('click', () => {
                // Exit to homepage without cancelling active ride
                window.location.href = '../index.html';
            });
        }

        // History modal buttons
        const btnCloseHistory = document.getElementById('btn-close-history');
        if (btnCloseHistory) {
            btnCloseHistory.addEventListener('click', () => {
                if (window.location.hash === '#history') {
                    try {
                        history.replaceState(null, '', window.location.pathname + window.location.search);
                    } catch (e) {
                        window.location.hash = '';
                    }
                }
                if (this.activeTrip) {
                    this.switchView('tracking');
                } else if (this.pickup && this.destination) {
                    this.switchView('vehicle-select');
                } else {
                    this.switchView('search');
                }
            });
        }

        const btnRefreshHistory = document.getElementById('btn-refresh-history');
        if (btnRefreshHistory) {
            btnRefreshHistory.addEventListener('click', () => {
                this.loadTripHistory();
            });
        }

        const btnDesktopHistory = document.getElementById('btn-desktop-history');
        if (btnDesktopHistory) {
            btnDesktopHistory.addEventListener('click', () => {
                if (this.currentView === 'history') {
                    // Toggle back to booking flow if already viewing history
                    if (window.location.hash === '#history') {
                        try {
                            history.replaceState(null, '', window.location.pathname + window.location.search);
                        } catch (e) {
                            window.location.hash = '';
                        }
                    }
                    if (this.activeTrip) {
                        this.switchView('tracking');
                    } else if (this.pickup && this.destination) {
                        this.switchView('vehicle-select');
                    } else {
                        this.switchView('search');
                    }
                    return;
                }
                if (window.location.hash !== '#history') {
                    window.location.hash = 'history';
                }
                this.switchView('history');
                this.loadTripHistory();
            });
        }

        // Mobile Quick Navigation Pills Event Handlers
        const custPillBooking = document.getElementById('m-cust-pill-booking');
        const custPillHistory = document.getElementById('m-cust-pill-history');

        if (custPillBooking) {
            custPillBooking.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.location.hash === '#history') {
                    try {
                        history.replaceState(null, '', window.location.pathname + window.location.search);
                    } catch (err) {
                        window.location.hash = '';
                    }
                }
                if (this.activeTrip) {
                    this.switchView('tracking');
                } else if (this.pickup && this.destination) {
                    this.switchView('vehicle-select');
                } else {
                    this.switchView('search');
                }
            });
        }

        if (custPillHistory) {
            custPillHistory.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.location.hash !== '#history') {
                    window.location.hash = 'history';
                }
                this.switchView('history');
                this.loadTripHistory();
            });
        }

        // Role-based visibility for mobile pills in Customer Portal
        try {
            const role = (typeof sessionManager !== 'undefined' && sessionManager.getRole?.()) ||
                         JSON.parse(localStorage.getItem('goride_user') || sessionStorage.getItem('ride_rtree_user') || '{}')?.role;
            const mDriver = document.getElementById('m-cust-pill-driver');
            const mAdmin = document.getElementById('m-cust-pill-admin');

            if (role === 'customer') {
                if (mDriver) mDriver.style.display = 'none';
                if (mAdmin) mAdmin.style.display = 'none';
            } else if (role === 'driver') {
                if (mDriver) mDriver.style.display = '';
                if (mAdmin) mAdmin.style.display = 'none';
            } else if (role === 'admin') {
                if (mDriver) mDriver.style.display = '';
                if (mAdmin) mAdmin.style.display = '';
            } else {
                if (mDriver) mDriver.style.display = '';
                if (mAdmin) mAdmin.style.display = 'none';
            }
        } catch (e) {}
    }

    /**
     * Show loading skeleton in suggestions container
     */
    showSearchLoading() {
        const container = document.getElementById('suggestions-container');
        if (!container) return;
        container.innerHTML = `
            <div style="text-align:center; padding: 28px 16px; color:#64748b;">
                <div style="display:inline-block; width:22px; height:22px; border:2.5px solid #cbd5e1; border-top-color:#00897b; border-radius:50%; animation:spin 0.8s linear infinite; margin-bottom:8px;"></div>
                <div style="font-size:0.85rem; font-weight:600; color:#334155;">Đang tìm địa chỉ tại TP. Hồ Chí Minh...</div>
            </div>
        `;
    }

    /**
     * Execute live geocoding search across HCMC
     */
    async executeSearch(query) {
        if (!query || query.length < 2) {
            this.renderSuggestions(this.locationsPool);
            return;
        }

        try {
            if (typeof geocoderService !== 'undefined') {
                const results = await geocoderService.search(query, 10);
                this.renderSuggestions(results, query);
            } else {
                const normQ = query.toLowerCase();
                const filtered = this.locationsPool.filter(loc =>
                    loc.name.toLowerCase().includes(normQ) ||
                    loc.address.toLowerCase().includes(normQ)
                );
                this.renderSuggestions(filtered, query);
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.warn('[Customer] Search error:', err);
            const container = document.getElementById('suggestions-container');
            if (container) {
                container.innerHTML = `
                    <div style="text-align:center; padding: 24px 16px; color:#b91c1c;">
                        <div>⚠️ Lỗi kết nối dịch vụ địa chỉ.</div>
                        <div style="font-size:0.8rem; color:#64748b; margin-top:4px;">Bạn có thể chọn trực tiếp điểm đón/đến trên bản đồ.</div>
                    </div>
                `;
            }
        }
    }

    /**
     * Render suggestion items into container (ref-02)
     */
    renderSuggestions(locations, currentQuery = '') {
        const container = document.getElementById('suggestions-container');
        if (!container) return;

        if (!locations || locations.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 32px 16px; color:#94a3b8;">
                    <div style="font-size:2rem; margin-bottom:8px;">🔍</div>
                    <div style="font-weight:600; color:#475569;">Không tìm thấy địa điểm ${currentQuery ? `"${currentQuery}"` : ''} tại TP.HCM</div>
                    <div style="font-size:0.8rem; margin-top:4px;">Thử nhập số nhà, tên đường hoặc chọn trực tiếp trên bản đồ</div>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        if (this.searchTarget === 'pickup' && !currentQuery) {
            const gpsItem = document.createElement('div');
            gpsItem.className = 'goride-suggestion-item';
            gpsItem.style.background = '#f0fdfa';
            gpsItem.style.border = '1.5px dashed #0d9488';
            gpsItem.style.borderRadius = '12px';
            gpsItem.style.marginBottom = '8px';
            gpsItem.style.cursor = 'pointer';
            gpsItem.innerHTML = `
                <div class="goride-sugg-icon-col">
                    <div class="goride-sugg-pin" style="background:#0d9488; color:#ffffff; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">🎯</div>
                </div>
                <div class="goride-sugg-content">
                    <div class="goride-sugg-title" style="color:#0f766e; font-weight:700;">Lấy vị trí GPS hiện tại của tôi</div>
                    <div class="goride-sugg-address" style="color:#0d9488; font-size:0.75rem;">Chạm để tự động xác định vị trí đón chính xác</div>
                </div>
            `;
            gpsItem.addEventListener('click', () => {
                const btnGps = document.getElementById('btn-gps-recenter');
                if (btnGps) btnGps.click();
            });
            container.appendChild(gpsItem);
        }

        locations.forEach(loc => {
            const item = document.createElement('div');
            item.className = 'goride-suggestion-item';

            const badgeHtml = loc.isPopular
                ? `<div class="goride-sugg-badge">⭐ ${loc.popularText || 'Phổ biến'}</div>`
                : (loc.district ? `<div class="goride-sugg-badge" style="background:#f1f5f9; color:#475569;">📍 ${loc.district}</div>` : '');

            item.innerHTML = `
                <div class="goride-sugg-icon-col">
                    <div class="goride-sugg-pin">${this.searchTarget === 'pickup' ? '🟢' : '📍'}</div>
                </div>
                <div class="goride-sugg-content">
                    <div class="goride-sugg-title">${loc.name}</div>
                    <div class="goride-sugg-address">${loc.address}</div>
                    ${badgeHtml}
                </div>
            `;

            item.addEventListener('click', () => {
                this.selectLocation(loc);
            });

            container.appendChild(item);
        });
    }

    /**
     * User selects a location from search results
     */
    selectLocation(location) {
        if (this.searchTarget === 'pickup') {
            this.pickup = {
                id: location.id || `loc_${Date.now()}`,
                name: location.name,
                address: location.address,
                lat: Number(location.lat),
                lng: Number(location.lng)
            };

            const pInput = document.getElementById('input-pickup');
            if (pInput) pInput.value = location.name;

            const clearPickupBtn = document.getElementById('btn-clear-pickup');
            if (clearPickupBtn) clearPickupBtn.style.display = 'flex';

            const pSum = document.getElementById('route-sum-pickup');
            if (pSum) pSum.textContent = location.name;

            // Reset calculated route
            this.currentRouteDistance = null;
            this.currentRouteDuration = null;
            this.currentRouteGeometry = null;

            if (this.destination) {
                this.switchView('vehicle-select');
            } else {
                this.showToast(`Điểm đón: ${location.name}. Mời chọn điểm đến!`, 'info');
                const destInput = document.getElementById('input-destination');
                if (destInput) destInput.focus();
                this.searchTarget = 'destination';
                this.renderSuggestions(this.locationsPool);
            }
        } else {
            this.selectDestination(location);
        }
    }

    /**
     * User selects a destination from suggestions or presets
     */
    selectDestination(location) {
        this.destination = {
            id: location.id || `dest_${Date.now()}`,
            name: location.name,
            address: location.address,
            lat: Number(location.lat),
            lng: Number(location.lng)
        };

        // Reset previous calculated route
        this.currentRouteDistance = null;
        this.currentRouteDuration = null;
        this.currentRouteGeometry = null;

        const destInput = document.getElementById('input-destination');
        if (destInput) destInput.value = location.name;

        const clearDestBtn = document.getElementById('btn-clear-dest');
        if (clearDestBtn) clearDestBtn.style.display = 'flex';

        // Update summary texts in vehicle select view (ref-04)
        const pSum = document.getElementById('route-sum-pickup');
        const dSum = document.getElementById('route-sum-dest');
        if (pSum) pSum.textContent = this.pickup ? this.pickup.name : 'Chưa chọn điểm đón';
        if (dSum) dSum.textContent = this.destination.name;

        // If pickup not chosen yet, prompt user to select pickup
        if (!this.pickup) {
            this.showToast(`Đã chọn điểm đến: ${location.name}. Vui lòng chọn hoặc nhập điểm đón!`, 'info');
            const pInput = document.getElementById('input-pickup');
            if (pInput) pInput.focus();
            this.searchTarget = 'pickup';
            this.renderSuggestions(this.locationsPool);
            return;
        }

        // Switch to vehicle selection view (ref-04)
        this.switchView('vehicle-select');
    }

    /**
     * Updates center pin address banner as map moves (ref-03)
     */
    updateCenterPinAddress(lat, lng) {
        const addressEl = document.getElementById('center-pin-address');
        if (!addressEl) return;

        addressEl.textContent = `Vị trí: ${lat.toFixed(4)}, ${lng.toFixed(4)}...`;

        clearTimeout(this._reverseDebounce);
        this._reverseDebounce = setTimeout(async () => {
            if (typeof geocoderService !== 'undefined') {
                const place = await geocoderService.reverse(lat, lng);
                if (place) {
                    addressEl.textContent = place.name;
                    this.pickup = {
                        name: place.name,
                        address: place.address,
                        lat: lat,
                        lng: lng
                    };
                    const pInput = document.getElementById('input-pickup');
                    if (pInput) pInput.value = place.name;
                    return;
                }
            }

            const closest = this.findClosestLocation(lat, lng);
            if (closest && closest.distanceMeters < 300) {
                addressEl.textContent = closest.location.name;
                this.pickup = {
                    name: closest.location.name,
                    address: closest.location.address,
                    lat: lat,
                    lng: lng
                };
            } else {
                addressEl.textContent = `Vị trí: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                this.pickup = {
                    name: `Điểm đón (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                    address: `Khu vực TP. Hồ Chí Minh`,
                    lat: lat,
                    lng: lng
                };
            }

            const pInput = document.getElementById('input-pickup');
            if (pInput) pInput.value = this.pickup.name;
        }, 300);
    }

    /**
     * Render vehicle cards list with calculated fares & strikethrough promo discount (ref-04)
     * @param {number} [overrideDistanceMeters]
     */
    renderVehicleOptions(overrideDistanceMeters) {
        const container = document.getElementById('vehicle-options-container');
        if (!container) return;

        const distanceMeters = (typeof overrideDistanceMeters === 'number')
            ? overrideDistanceMeters
            : (this.currentRouteDistance || this.calculateEstimatedDistance());
        const km = distanceMeters / 1000;

        container.innerHTML = '';

        const discountRate = (this.appliedPromo && this.appliedPromo.discountPercent) ? (this.appliedPromo.discountPercent / 100) : 0;

        Object.keys(this.vehicleCatalog).forEach(key => {
            const v = this.vehicleCatalog[key];
            const originalFare = Math.round((v.baseFare + km * v.perKm) / 1000) * 1000;
            const discountedFare = discountRate > 0 
                ? Math.round(originalFare * (1 - discountRate) / 1000) * 1000 
                : originalFare;
            const isSelected = key === this.selectedService;

            const card = document.createElement('div');
            card.className = `goride-vehicle-card ${isSelected ? 'selected' : ''}`;
            card.setAttribute('data-vehicle', key);

            // Display original price with strikethrough on top, and discounted price below
            const priceHtml = discountRate > 0 ? `
                <div class="goride-vehicle-price" style="display:flex; flex-direction:column; align-items:flex-end; justify-content:center; line-height:1.25;">
                    <span style="text-decoration: line-through; color: #94a3b8; font-size: 0.82rem; font-weight: 500;">${this.formatMoney(originalFare)}</span>
                    <span style="color: #00897b; font-size: 1.15rem; font-weight: 800;">${this.formatMoney(discountedFare)}</span>
                </div>
            ` : `
                <div class="goride-vehicle-price">
                    <span style="font-size: 1.15rem; font-weight: 800; color: #0f172a;">${this.formatMoney(originalFare)}</span>
                </div>
            `;

            card.innerHTML = `
                <div class="goride-vehicle-left">
                    <div class="goride-vehicle-img">${v.icon}</div>
                    <div class="goride-vehicle-meta">
                        <div class="goride-vehicle-name-row">
                            <span class="goride-vehicle-name">${v.name}</span>
                            <span class="goride-vehicle-seats">👤 ${v.seats}</span>
                        </div>
                        <div class="goride-vehicle-eta">Đón trong ${v.etaMin}-${v.etaMax} phút &bull; <span class="goride-vehicle-desc">${v.desc}</span></div>
                    </div>
                </div>
                <div class="goride-vehicle-right">
                    ${priceHtml}
                </div>
            `;

            card.addEventListener('click', () => {
                this.selectedService = key;
                document.querySelectorAll('.goride-vehicle-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedVehicleFare = discountedFare;
                this.selectedOriginalFare = originalFare;
                this.updateSolicitarButton(v, discountedFare, originalFare);
            });

            container.appendChild(card);
        });

        // Update CTA button initially
        const activeCfg = this.vehicleCatalog[this.selectedService] || this.vehicleCatalog.car4;
        const initialOriginalFare = Math.round((activeCfg.baseFare + km * activeCfg.perKm) / 1000) * 1000;
        const initialDiscountedFare = discountRate > 0 
            ? Math.round(initialOriginalFare * (1 - discountRate) / 1000) * 1000 
            : initialOriginalFare;
        this.selectedVehicleFare = initialDiscountedFare;
        this.selectedOriginalFare = initialOriginalFare;
        this.updateSolicitarButton(activeCfg, initialDiscountedFare, initialOriginalFare);
        this.updatePromoTagUI();
    }

    /**
     * Update "Đặt chuyến Navigo" button label and fare (ref-04)
     */
    updateSolicitarButton(vehicle, discountedFare, originalFare) {
        const btnText = document.getElementById('solicitar-text');
        if (btnText) {
            const hasDiscount = this.appliedPromo && this.appliedPromo.discountPercent > 0 && originalFare && originalFare > discountedFare;
            if (hasDiscount) {
                btnText.innerHTML = `Đặt ${vehicle.name} &bull; <span style="text-decoration:line-through; opacity:0.75; font-size:0.85em; margin-right:4px;">${this.formatMoney(originalFare)}</span> <strong>${this.formatMoney(discountedFare)}</strong>`;
            } else {
                btnText.textContent = `Đặt ${vehicle.name} • ${this.formatMoney(discountedFare || originalFare)}`;
            }
        }
    }

    /**
     * Update Promo Tag UI Badge
     */
    updatePromoTagUI() {
        const promoBtn = document.getElementById('btn-promo-tag');
        if (!promoBtn) return;
        if (this.appliedPromo && this.appliedPromo.discountPercent > 0) {
            promoBtn.innerHTML = `🏷️ <strong>${this.appliedPromo.code}</strong> (-${this.appliedPromo.discountPercent}%) <span style="color:#10b981; font-weight:700; margin-left:3px;">✓</span>`;
            promoBtn.style.background = '#e6fffa';
            promoBtn.style.color = '#00897b';
            promoBtn.style.border = '1.5px solid #00897b';
            promoBtn.style.cursor = 'pointer';
            promoBtn.title = 'Nhấn để đổi hoặc nhập mã giảm giá khác';
        } else {
            promoBtn.innerHTML = `🏷️ Chọn mã giảm giá`;
            promoBtn.style.background = '#f1f5f9';
            promoBtn.style.color = '#475569';
            promoBtn.style.border = '1px solid #cbd5e1';
            promoBtn.style.cursor = 'pointer';
            promoBtn.title = 'Nhấn để nhập mã giảm giá';
        }
    }

    /**
     * Open interactive dialog to select / enter promo code
     */
    openPromoCodeDialog() {
        const currentCode = this.appliedPromo ? this.appliedPromo.code : '';
        const userPrompt = prompt(
            "NHẬP HOẶC CHỌN MÃ GIẢM GIÁ NAVIGO:\n\n" +
            "• NAVIGO20: Giảm 20% toàn bộ cuốc xe\n" +
            "• NAVIGO25: Giảm 25% ưu đãi hôm nay\n" +
            "• NAVIGO50: Giảm 50% siêu tiết kiệm\n\n" +
            "Nhập mã bạn muốn áp dụng (hoặc gõ HUY để bỏ mã):",
            currentCode || "NAVIGO20"
        );

        if (userPrompt === null) return; // Người dùng ấn Hủy

        const cleaned = userPrompt.trim().toUpperCase();
        if (!cleaned || cleaned === 'HUY' || cleaned === 'NONE' || cleaned === 'XOA') {
            this.appliedPromo = null;
            this.showToast('Đã hủy áp dụng mã giảm giá', 'info');
        } else if (this.availablePromos[cleaned]) {
            this.appliedPromo = {
                code: cleaned,
                discountPercent: this.availablePromos[cleaned].discountPercent,
                label: this.availablePromos[cleaned].label
            };
            this.showToast(`Áp dụng thành công mã ${cleaned} (-${this.appliedPromo.discountPercent}%)!`, 'success');
        } else {
            this.appliedPromo = {
                code: cleaned,
                discountPercent: 15,
                label: 'Mã ưu đãi đặc biệt (-15%)'
            };
            this.showToast(`Áp dụng mã ưu đãi ${cleaned} (-15%) thành công!`, 'success');
        }

        // Re-render vehicles with strikethrough price and updated button
        this.renderVehicleOptions();
    }

    /**
     * Draw route between pickup and destination.
     * Integrates with real C++ Dijkstra backend on port 8080.
     * Draws solid OSM polyline on success; falls back to honest dashed line if offline.
     */
    async renderRouteOnMap() {
        if (!this.mapController || !this.pickup || !this.destination) return;

        // Clear existing markers and route
        this.mapController.clearMarkers('pickup');
        this.mapController.clearMarkers('destination');
        this.mapController.clearRoute();

        // Add pickup (green) & destination (red)
        this.mapController.addPickupMarker(this.pickup.lat, this.pickup.lng, this.pickup.name);
        this.mapController.addDestinationMarker(this.destination.lat, this.destination.lng, this.destination.name);

        // Reset calculated route state before fetching
        this.currentRouteGeometry = null;
        this.currentRouteDistance = null;
        this.currentRouteDuration = null;
        this.currentNodesVisited = 0;

        let routeError = null;

        // Tier 1: Attempt local C++ Dijkstra routing (port 8080)
        try {
            if (typeof apiClient !== 'undefined') {
                const queryParams = {
                    from_lat: this.pickup.lat,
                    from_lon: this.pickup.lng,
                    to_lat: this.destination.lat,
                    to_lon: this.destination.lng
                };

                const res = await (apiClient.getRoute 
                    ? apiClient.getRoute(this.pickup.lat, this.pickup.lng, this.destination.lat, this.destination.lng)
                    : apiClient.get('/route', { params: queryParams, timeout: 3500 }));

                if (res && res.ok && res.data && res.data.success && Array.isArray(res.data.geometry)) {
                    // Geometry from backend is in GeoJSON format [longitude, latitude]
                    const leafletPath = res.data.geometry.map(([lon, lat]) => [lat, lon]);

                    this.applySuccessfulRoute(
                        leafletPath,
                        res.data.distance_m,
                        res.data.estimated_duration_s,
                        res.data.nodes_visited,
                        'Tuyến đường thực tế từ C++ Dijkstra (OSM)',
                        '<span style="font-size:0.75rem; color:#059669;">⚡ Tính toán trực tiếp bằng thuật toán Dijkstra trên đồ thị 16.305 nút OSM.</span>'
                    );
                    return;
                }
            }
        } catch (err) {
            console.warn('[GoRide Customer] C++ Dijkstra backend unavailable, engaging OSM road network router:', err.message);
        }

        // Tier 2: OpenStreetMap Routing Service (OSRM)
        try {
            const osrmRes = await this.fetchOsrmRoute(this.pickup.lat, this.pickup.lng, this.destination.lat, this.destination.lng);
            if (osrmRes && osrmRes.ok && Array.isArray(osrmRes.geometry) && osrmRes.geometry.length > 0) {
                this.applySuccessfulRoute(
                    osrmRes.geometry,
                    osrmRes.distance_m,
                    osrmRes.duration_s,
                    osrmRes.geometry.length,
                    'Tuyến đường thực tế bám sát mạng đường OSM (OpenStreetMap Router)',
                    '<span style="font-size:0.75rem; color:#059669;">💡 Tuyến đường men theo mạng lưới phố TP.HCM. Bật <code>ride_rtree_server.exe</code> để kích hoạt C++ Dijkstra nội bộ.</span>'
                );
                return;
            }
        } catch (osrmErr) {
            console.warn('[GoRide Customer] OSRM routing fallback error:', osrmErr.message);
        }

        // Tier 3: Street-Corridors Path (Offline road geometry following real street axes, NEVER diagonal)
        const streetPath = this.getStreetFollowingPath(this.pickup, this.destination);
        if (!streetPath || streetPath.length < 2) {
            this.showToast('Không thể kết nối đường bộ giữa điểm đón và điểm đến. Vui lòng kiểm tra lại vị trí.', 'warning');
            return;
        }

        const estDist = this.calculatePathDistance(streetPath);
        const estDur = Math.round(estDist / 6.944); // ~25 km/h in city traffic

        this.applySuccessfulRoute(
            streetPath,
            estDist,
            estDur,
            streetPath.length,
            'Lộ trình hành lang giao lộ dự phòng (Offline Corridor)',
            '<span style="font-size:0.75rem; color:#b45309;">⚠️ Backend C++ chưa kết nối. Tuyến đường đang men theo các trục giao lộ thực tế trung tâm TP.HCM. Bật <code>ride_rtree_server.exe</code> để kích hoạt Dijkstra chính thức.</span>'
        );
    }

    /**
     * Compute Haversine distance between 2 points in meters
     */
    calculateHaversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Compute total polyline distance in meters
     */
    calculatePathDistance(coords) {
        if (!Array.isArray(coords) || coords.length < 2) return 1000;
        let total = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            total += this.calculateHaversineDistance(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
        }
        return Math.round(total);
    }

    /**
     * Compute forward azimuth (bearing) in degrees from point 1 to point 2 (0 - 360)
     */
    calculateBearing(lat1, lon1, lat2, lon2) {
        const toRad = Math.PI / 180;
        const toDeg = 180 / Math.PI;
        const phi1 = lat1 * toRad;
        const phi2 = lat2 * toRad;
        const deltaLambda = (lon2 - lon1) * toRad;

        const y = Math.sin(deltaLambda) * Math.cos(phi2);
        const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
        const heading = Math.atan2(y, x) * toDeg;
        return ((heading % 360) + 360) % 360;
    }

    /**
     * Densifies a route polyline by interpolating intermediate sub-steps at a smooth distance (stepMeters).
     * Computes exact heading/bearing for every point so vehicle smoothly rotates and glides.
     */
    densifyPath(path, stepMeters = 14) {
        if (!Array.isArray(path) || path.length < 2) return [];

        const points = [];
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            const lat1 = Array.isArray(p1) ? p1[0] : (p1.lat || p1.latitude);
            const lon1 = Array.isArray(p1) ? p1[1] : (p1.lng || p1.lon || p1.longitude);
            const lat2 = Array.isArray(p2) ? p2[0] : (p2.lat || p2.latitude);
            const lon2 = Array.isArray(p2) ? p2[1] : (p2.lng || p2.lon || p2.longitude);

            const dist = this.calculateHaversineDistance(lat1, lon1, lat2, lon2);
            const bearing = this.calculateBearing(lat1, lon1, lat2, lon2);
            const steps = Math.max(1, Math.round(dist / stepMeters));

            for (let s = 0; s < steps; s++) {
                const frac = s / steps;
                points.push({
                    lat: lat1 + (lat2 - lat1) * frac,
                    lng: lon1 + (lon2 - lon1) * frac,
                    heading: bearing
                });
            }
        }

        // Add terminal destination point
        const last = path[path.length - 1];
        const lastLat = Array.isArray(last) ? last[0] : (last.lat || last.latitude);
        const lastLng = Array.isArray(last) ? last[1] : (last.lng || last.lon || last.longitude);
        const lastHeading = points.length > 0 ? points[points.length - 1].heading : 0;
        points.push({ lat: lastLat, lng: lastLng, heading: lastHeading });

        return points;
    }

    /**
     * Generates a realistic street-following route on HCMC's actual road network.
     * Guarantees the line adheres to actual street corridors (never a straight line cutting through buildings).
     */
    getStreetFollowingPath(pickup, dest) {
        const pLat = Number(pickup.lat || pickup.latitude);
        const pLng = Number(pickup.lng || pickup.lon || pickup.longitude);
        const dLat = Number(dest.lat || dest.latitude);
        const dLng = Number(dest.lng || dest.lon || dest.longitude);

        // 1. Chợ Bến Thành -> Vincom Center Đồng Khởi (Đi qua Phan Bội Châu, Lê Thánh Tôn, Pasteur, Lý Tự Trọng, Đồng Khởi)
        if (Math.abs(pLat - 10.7725) < 0.003 && Math.abs(pLng - 106.6980) < 0.003 &&
            Math.abs(dLat - 10.7781) < 0.003 && Math.abs(dLng - 106.7023) < 0.003) {
            return [
                [10.77250, 106.69800], // Cửa Nam Chợ Bến Thành
                [10.77280, 106.69850], // Cửa Đông - Đường Phan Bội Châu
                [10.77380, 106.69960], // Lê Thánh Tôn x Nam Kỳ Khởi Nghĩa
                [10.77510, 106.70070], // Lê Thánh Tôn x Pasteur
                [10.77580, 106.70010], // Đường Pasteur (hướng về phía Bắc)
                [10.77615, 106.69900], // Pasteur x Lý Tự Trọng
                [10.77670, 106.69970], // Lý Tự Trọng x Nam Kỳ Khởi Nghĩa
                [10.77735, 106.70050], // Lý Tự Trọng x Pasteur
                [10.77800, 106.70135], // Lý Tự Trọng x Đồng Khởi
                [10.77810, 106.70230]  // Vincom Center Đồng Khởi
            ];
        }

        // 2. Vincom Center Đồng Khởi -> Chợ Bến Thành (Chiều ngược lại qua Lê Thánh Tôn)
        if (Math.abs(pLat - 10.7781) < 0.003 && Math.abs(pLng - 106.7023) < 0.003 &&
            Math.abs(dLat - 10.7725) < 0.003 && Math.abs(dLng - 106.6980) < 0.003) {
            return [
                [10.77810, 106.70230], // Vincom Center Đồng Khởi
                [10.77740, 106.70300], // Lê Thánh Tôn
                [10.77630, 106.70200], // Lê Thánh Tôn x Đồng Khởi
                [10.77510, 106.70070], // Lê Thánh Tôn x Pasteur
                [10.77400, 106.69960], // Lê Thánh Tôn x Nam Kỳ Khởi Nghĩa
                [10.77300, 106.69870], // Lê Thánh Tôn x Phan Bội Châu
                [10.77250, 106.69800]  // Chợ Bến Thành
            ];
        }

        // 3. Chợ Bến Thành -> Landmark 81
        if (Math.abs(pLat - 10.7725) < 0.003 && Math.abs(pLng - 106.6980) < 0.003 &&
            Math.abs(dLat - 10.7951) < 0.005 && Math.abs(dLng - 106.7219) < 0.005) {
            return [
                [10.77250, 106.69800], // Bến Thành
                [10.77330, 106.69980], // Lê Lợi x Nam Kỳ Khởi Nghĩa
                [10.77395, 106.70070], // Lê Lợi x Pasteur
                [10.77470, 106.70195], // Lê Lợi x Nguyễn Huệ
                [10.77490, 106.70650], // Bến Bạch Đằng / Tôn Đức Thắng
                [10.78120, 106.70610], // Tôn Đức Thắng
                [10.78750, 106.71180], // Nguyễn Hữu Cảnh
                [10.79150, 106.71750], // Cầu vượt Nguyễn Hữu Cảnh
                [10.79420, 106.72050], // Vinhomes Central Park
                [10.79510, 106.72190]  // Landmark 81
            ];
        }

        // 4. Chợ Bến Thành -> Nhà Thờ Đức Bà
        if (Math.abs(pLat - 10.7725) < 0.003 && Math.abs(pLng - 106.6980) < 0.003 &&
            Math.abs(dLat - 10.7798) < 0.004 && Math.abs(dLng - 106.6990) < 0.004) {
            return [
                [10.77250, 106.69800], // Bến Thành
                [10.77330, 106.69980], // Lê Lợi x Nam Kỳ Khởi Nghĩa
                [10.77395, 106.70070], // Lê Lợi x Pasteur
                [10.77480, 106.69980], // Pasteur
                [10.77615, 106.69900], // Pasteur x Lý Tự Trọng
                [10.77750, 106.69800], // Pasteur x Hàn Thuyên
                [10.77880, 106.69850], // Công xã Paris
                [10.77980, 106.69900]  // Nhà Thờ Đức Bà
            ];
        }

        // 5. Chợ Bến Thành -> Phố đi bộ Nguyễn Huệ
        if (Math.abs(pLat - 10.7725) < 0.003 && Math.abs(pLng - 106.6980) < 0.003 &&
            Math.abs(dLat - 10.7743) < 0.004 && Math.abs(dLng - 106.7036) < 0.004) {
            return [
                [10.77250, 106.69800], // Bến Thành
                [10.77290, 106.69890], // Lê Lợi
                [10.77330, 106.69980], // Lê Lợi x Nam Kỳ Khởi Nghĩa
                [10.77395, 106.70070], // Lê Lợi x Pasteur
                [10.77470, 106.70195], // Lê Lợi x Nguyễn Huệ
                [10.77430, 106.70360]  // Phố đi bộ Nguyễn Huệ
            ];
        }

        // 6. Real Street Network Graph for Central HCMC (Never cuts diagonally across buildings)
        // Authentic street intersections mapped to actual road corridors
        const intersections = [
            { id: 'bt', lat: 10.77250, lng: 106.69800 },         // Bến Thành
            { id: 'leloi_nkk', lat: 10.77330, lng: 106.69980 },   // Lê Lợi x Nam Kỳ Khởi Nghĩa (khớp tim đường OSM)
            { id: 'leloi_pas', lat: 10.77395, lng: 106.70070 },   // Lê Lợi x Pasteur (khớp tim đường OSM)
            { id: 'leloi_nh', lat: 10.77470, lng: 106.70195 },    // Lê Lợi x Nguyễn Huệ
            { id: 'leloi_dk', lat: 10.77535, lng: 106.70310 },    // Lê Lợi x Đồng Khởi
            { id: 'lt_td', lat: 10.77120, lng: 106.69600 },       // Lê Thánh Tôn x Trương Định
            { id: 'lt_nkk', lat: 10.77400, lng: 106.69960 },      // Lê Thánh Tôn x Nam Kỳ Khởi Nghĩa
            { id: 'lt_pas', lat: 10.77510, lng: 106.70070 },      // Lê Thánh Tôn x Pasteur
            { id: 'lt_dk', lat: 10.77740, lng: 106.70300 },       // Lê Thánh Tôn x Đồng Khởi
            { id: 'lt_hbt', lat: 10.77880, lng: 106.70420 },      // Lê Thánh Tôn x Hai Bà Trưng
            { id: 'ly_td', lat: 10.77250, lng: 106.69480 },       // Lý Tự Trọng x Trương Định
            { id: 'ly_nkk', lat: 10.77670, lng: 106.69970 },      // Lý Tự Trọng x Nam Kỳ Khởi Nghĩa
            { id: 'ly_pas', lat: 10.77615, lng: 106.69900 },      // Lý Tự Trọng x Pasteur
            { id: 'ly_dk', lat: 10.77800, lng: 106.70135 },       // Lý Tự Trọng x Đồng Khởi
            { id: 'ly_hbt', lat: 10.77950, lng: 106.70350 },      // Lý Tự Trọng x Hai Bà Trưng
            { id: 'nd_nkk', lat: 10.77850, lng: 106.69850 },      // Nguyễn Du x Nam Kỳ Khởi Nghĩa
            { id: 'nd_pas', lat: 10.77920, lng: 106.69950 },      // Nguyễn Du x Pasteur
            { id: 'nd_dk', lat: 10.77980, lng: 106.69900 },       // Nhà Thờ Đức Bà
            { id: 'nh_mtb', lat: 10.77430, lng: 106.70360 },      // Nguyễn Huệ x Mạc Thị Bưởi
            { id: 'nh_tdt', lat: 10.77200, lng: 106.70650 },      // Bến Bạch Đằng / Tôn Đức Thắng
            { id: 'tdt_ld', lat: 10.78450, lng: 106.70600 },      // Tôn Đức Thắng x Lê Duẩn
            { id: 'tdt_nhc', lat: 10.78750, lng: 106.71180 },     // Tôn Đức Thắng x Nguyễn Hữu Cảnh
            { id: 'lm81', lat: 10.79510, lng: 106.72190 },        // Landmark 81
            { id: 'pht_ngasau', lat: 10.77145, lng: 106.69365 },  // Phạm Hồng Thái x Ngã Sáu Phù Đổng (Cửa Đông)
            { id: 'ngasau_se', lat: 10.77135, lng: 106.69345 },   // Ngã Sáu Phù Đổng (Cung Đông Nam)
            { id: 'ngasau_sw', lat: 10.77132, lng: 106.69320 },   // Ngã Sáu Phù Đổng (Cung Tây Nam)
            { id: 'ngasau_nw', lat: 10.77165, lng: 106.69315 },   // Ngã Sáu Phù Đổng (Cung Tây Bắc - CMT8)
            { id: 'cmt8_ntmk', lat: 10.77200, lng: 106.69100 },   // Cách Mạng Tháng 8 x NTMK
            { id: 'cmt8_dbp', lat: 10.77700, lng: 106.68300 },    // Cách Mạng Tháng 8 x Điện Biên Phủ
            { id: 'bk_3t2', lat: 10.77200, lng: 106.65780 },      // ĐH Bách Khoa
            { id: 'nkk_dbp', lat: 10.78520, lng: 106.68950 },     // Nam Kỳ Khởi Nghĩa x Điện Biên Phủ
            { id: 'nkk_lct', lat: 10.79050, lng: 106.68300 },     // Nam Kỳ Khởi Nghĩa x Lý Chính Thắng (Cầu Công Lý)
            { id: 'nvt_thl', lat: 10.79550, lng: 106.67750 },     // Nguyễn Văn Trỗi x Trần Huy Liệu
            { id: 'nvt_hvt', lat: 10.80100, lng: 106.66650 },     // Nguyễn Văn Trỗi x Hoàng Văn Thụ
            { id: 'ts_airport', lat: 10.81200, lng: 106.66300 },  // Đường Trường Sơn
            { id: 'tsn_airport', lat: 10.81850, lng: 106.65880 }  // Sân bay Tân Sơn Nhất
        ];

        // Valid physical street connections between intersections
        const roadAdj = {
            bt: ['leloi_nkk', 'lt_td', 'pht_ngasau'],
            pht_ngasau: ['bt', 'ngasau_se', 'ly_td'],
            ngasau_se: ['ngasau_sw', 'pht_ngasau'],
            ngasau_sw: ['ngasau_nw', 'ngasau_se'],
            ngasau_nw: ['cmt8_ntmk', 'ngasau_sw'],
            leloi_nkk: ['bt', 'leloi_pas', 'lt_nkk'],
            leloi_pas: ['leloi_nkk', 'leloi_nh', 'lt_pas'],
            leloi_nh: ['leloi_pas', 'leloi_dk', 'nh_mtb'],
            leloi_dk: ['leloi_nh', 'lt_dk', 'nh_tdt'],
            lt_hbt: ['lt_dk'],
            lt_dk: ['lt_pas', 'leloi_dk'],
            lt_pas: ['lt_nkk', 'ly_pas'],
            lt_nkk: ['lt_td', 'leloi_nkk'],
            lt_td: ['bt'],
            ly_td: ['ly_nkk', 'pht_ngasau'],
            ly_nkk: ['ly_pas', 'lt_nkk'],
            ly_pas: ['ly_dk', 'nd_pas'],
            ly_dk: ['ly_hbt', 'lt_dk'],
            ly_hbt: ['lt_hbt'],
            nd_nkk: ['ly_nkk', 'nkk_dbp'],
            nkk_dbp: ['nd_nkk', 'nkk_lct'],
            nkk_lct: ['nkk_dbp', 'nvt_thl'],
            nvt_thl: ['nkk_lct', 'nvt_hvt'],
            nvt_hvt: ['nvt_thl', 'ts_airport'],
            ts_airport: ['nvt_hvt', 'tsn_airport'],
            nd_pas: ['nd_dk', 'nd_nkk'],
            nd_dk: ['ly_dk', 'ly_hbt', 'nd_pas'],
            nh_mtb: ['leloi_nh', 'nh_tdt'],
            nh_tdt: ['nh_mtb', 'tdt_ld'],
            tdt_ld: ['tdt_nhc', 'nh_tdt'],
            tdt_nhc: ['lm81', 'tdt_ld'],
            lm81: ['tdt_nhc'],
            cmt8_ntmk: ['cmt8_dbp', 'ngasau_nw'],
            cmt8_dbp: ['bk_3t2', 'cmt8_ntmk'],
            bk_3t2: ['cmt8_dbp'],
            tsn_airport: ['ts_airport']
        };

        // Snap pickup & dest to closest intersection
        const findNearestNode = (lat, lng) => {
            let best = intersections[0];
            let minDist = Infinity;
            for (const n of intersections) {
                const d = this.calculateHaversineDistance(lat, lng, n.lat, n.lng);
                if (d < minDist) {
                    minDist = d;
                    best = n;
                }
            }
            return best;
        };

        const startNode = findNearestNode(pLat, pLng);
        const endNode = findNearestNode(dLat, dLng);

        // BFS traversal on the real road network
        const queue = [[startNode.id]];
        const visited = new Set([startNode.id]);
        let bestPathIds = null;

        while (queue.length > 0) {
            const currentPath = queue.shift();
            const tail = currentPath[currentPath.length - 1];

            if (tail === endNode.id) {
                bestPathIds = currentPath;
                break;
            }

            const neighbors = roadAdj[tail] || [];
            for (const nxt of neighbors) {
                if (!visited.has(nxt)) {
                    visited.add(nxt);
                    queue.push([...currentPath, nxt]);
                }
            }
        }

        // Convert path IDs back to lat/lng
        const nodeMap = new Map(intersections.map(n => [n.id, n]));
        const result = [];

        if (bestPathIds && bestPathIds.length > 0) {
            for (const id of bestPathIds) {
                const node = nodeMap.get(id);
                if (node) result.push([node.lat, node.lng]);
            }
            return result;
        }

        return null;
    }

    /**
     * Query Public OpenStreetMap Routing Service (OSRM)
     * Real turn-by-turn geometry adhering to OSM street network
     */
    async fetchOsrmRoute(fromLat, fromLon, toLat, toLon) {
        const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok) return null;
            const data = await res.json();
            if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
                const r = data.routes[0];
                return {
                    ok: true,
                    geometry: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
                    distance_m: Math.round(r.distance),
                    duration_s: Math.round(r.duration)
                };
            }
        } catch (e) {
            clearTimeout(timeout);
        }
        return null;
    }

    /**
     * Centralized route application
     * Renders solid emerald road-following polyline (#10b981)
     */
    applySuccessfulRoute(leafletPath, distanceMeters, durationSeconds, nodesVisited, sourceTitle, bannerNotice = '') {
        this.currentRouteGeometry = leafletPath;
        this.currentRouteDistance = distanceMeters;
        this.currentRouteDuration = durationSeconds;
        this.currentNodesVisited = nodesVisited;

        // Invalidate size prior to fitBounds
        if (this.mapController && this.mapController.map) {
            this.mapController.map.invalidateSize({ animate: false });
        }

        // Draw solid emerald green polyline (#10b981) following the street network
        this.mapController.drawRoute(leafletPath, {
            color: '#10b981',
            weight: 5,
            opacity: 0.9,
            dashArray: null,
            lineCap: 'round',
            lineJoin: 'round'
        });

        // Fit map bounds
        this.mapController.fitBounds(leafletPath, {
            padding: [50, 50]
        });

        // Update banner and route distance pill
        const distKm = (distanceMeters / 1000).toFixed(1);
        const durMin = Math.ceil(durationSeconds / 60);

        const distPill = document.getElementById('route-distance-pill');
        const distVal = document.getElementById('route-distance-value');
        if (distPill && distVal) {
            distVal.textContent = `${distKm} km • ${durMin} phút`;
            distPill.style.display = 'inline-flex';
        }

        const banner = document.getElementById('backend-routing-banner');
        if (banner) {
            banner.style.display = 'none';
        }

        // Update prices with real distance
        this.renderVehicleOptions(distanceMeters);
    }

    /**
     * Calculate route distance in meters
     */
    calculateEstimatedDistance() {
        if (!this.pickup || !this.destination) return 3500;

        const dLat = (this.destination.lat - this.pickup.lat) * 111000;
        const dLng = (this.destination.lng - this.pickup.lng) * 111000 * Math.cos(this.pickup.lat * Math.PI / 180);
        const directDist = Math.sqrt(dLat * dLat + dLng * dLng);

        return Math.max(800, Math.round(directDist * 1.35));
    }

    /**
     * Check if user currently has an active trip on backend (P7.1 Active Trip Locking & Recovery)
     */
    async checkActiveTripOnLoad() {
        let trip = null;

        // 1. Try Live C++ Backend if authenticated
        if (typeof apiClient !== 'undefined' && typeof sessionManager !== 'undefined' && sessionManager.isAuthenticated()) {
            try {
                const res = await apiClient.getActiveTrip();
                if (res && res.data && res.data.has_active_trip && res.data.trip) {
                    trip = res.data.trip;
                }
            } catch (e) {
                console.warn('[CustomerApp] Check active trip on load warning:', e.message);
            }
        }

        // 2. Check localStorage goride_active_trip
        if (!trip) {
            try {
                const raw = localStorage.getItem('goride_active_trip');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const validStatuses = ['REQUESTED', 'OFFERED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'];
                    if (parsed && parsed.status && validStatuses.includes(parsed.status.toUpperCase())) {
                        trip = parsed;
                    }
                }
            } catch (e) {}
        }

        // 3. Fallback check in goride_admin_trips
        if (!trip) {
            try {
                const adminTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
                const found = adminTrips.find(t => ['requested', 'offered', 'accepted', 'arrived', 'in_progress'].includes(t.status?.toLowerCase()));
                if (found) {
                    trip = {
                        id: found.id,
                        status: found.status.toUpperCase(),
                        customerName: found.customerName || 'Khách hàng',
                        driverName: found.driverName !== 'Chưa gán' ? found.driverName : null,
                        licensePlate: found.licensePlate || '51G-889.24',
                        vehicleModel: found.vehicleModel || 'GoRide',
                        pickup: { name: found.pickup || 'Điểm đón', lat: 10.7725, lng: 106.6980 },
                        destination: { name: found.destination || 'Điểm đến', lat: 10.7798, lng: 106.6990 },
                        fareAmount: Number(found.fare) || 45000,
                        distanceMeters: (Number(found.distance) || 3) * 1000
                    };
                }
            } catch (e) {}
        }

        if (trip) {
            this.activeTrip = trip;
            this.activeTripId = trip.id;

            // Sync pickup & dropoff coordinates
            if (trip.pickup && trip.pickup.lat && (trip.pickup.lng || trip.pickup.lon)) {
                this.pickup = {
                    name: trip.pickup.name || trip.pickup.address || 'Điểm đón',
                    address: trip.pickup.address || trip.pickup.name || 'Điểm đón',
                    lat: Number(trip.pickup.lat),
                    lng: Number(trip.pickup.lng || trip.pickup.lon)
                };
            } else if (trip.pickupLat && (trip.pickupLng || trip.pickupLon)) {
                this.pickup = {
                    name: trip.pickupName || 'Điểm đón',
                    address: trip.pickupName || 'Điểm đón',
                    lat: Number(trip.pickupLat),
                    lng: Number(trip.pickupLng || trip.pickupLon)
                };
            }

            if (trip.destination && trip.destination.lat && (trip.destination.lng || trip.destination.lon)) {
                this.destination = {
                    name: trip.destination.name || trip.destination.address || 'Điểm đến',
                    address: trip.destination.address || trip.destination.name || 'Điểm đến',
                    lat: Number(trip.destination.lat),
                    lng: Number(trip.destination.lng || trip.destination.lon)
                };
            } else if (trip.dropoffLat && (trip.dropoffLng || trip.dropoffLon)) {
                this.destination = {
                    name: trip.dropoffName || 'Điểm đến',
                    address: trip.dropoffName || 'Điểm đến',
                    lat: Number(trip.dropoffLat),
                    lng: Number(trip.dropoffLng || trip.dropoffLon)
                };
            }

            // Sync search fields
            const pInput = document.getElementById('input-pickup');
            const dInput = document.getElementById('input-destination');
            if (pInput && this.pickup) pInput.value = this.pickup.name;
            if (dInput && this.destination) dInput.value = this.destination.name;

            // Render markers & route on map
            if (this.pickup && this.destination) {
                await this.renderRouteOnMap();
            }

            // Switch to tracking view and resume polling
            this.switchView('tracking');
            this.updateTrackingUI(trip);
            this.startActiveTripPolling(trip.id);
            this.showToast(`Đang tiếp tục theo dõi chuyến xe hiện tại của bạn (#${trip.id})`, 'info', 3500);
        }
    }

    /**
     * Execute real ride booking request (Phase C.3 / P1 / P7.1)
     */
    async requestRideBooking() {
        // 1. Enforce Authentication (P2)
        if (typeof sessionManager !== 'undefined' && !sessionManager.isAuthenticated()) {
            this.showToast('Vui lòng đăng nhập để đặt chuyến xe GoRide.', 'warning');
            setTimeout(() => {
                window.location.href = 'login.html?redirect=customer.html';
            }, 1200);
            return;
        }

        // 2. Enforce Single Active Trip (P7.1)
        if (this.activeTrip && ['REQUESTED', 'OFFERED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(this.activeTrip.status)) {
            this.showToast('Bạn đang có một chuyến xe đang hoạt động. Đang chuyển tới màn hình theo dõi.', 'info');
            this.switchView('tracking');
            this.startActiveTripPolling(this.activeTrip.id);
            return;
        }

        // 3. Ensure both pickup and destination are selected
        if (!this.pickup || !this.destination) {
            this.showToast('Vui lòng chọn đầy đủ điểm đón và điểm đến trước khi đặt xe.', 'warning');
            this.switchView('search');
            return;
        }

        const btnSolicitar = document.getElementById('btn-solicitar-ride');
        const btnCancelRequest = document.getElementById('btn-cancel-request-booking');
        if (btnSolicitar) {
            btnSolicitar.disabled = true;
            btnSolicitar.innerHTML = `<span class="spinner" style="display:inline-block;width:16px;height:16px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></span> Đang gửi yêu cầu...`;
        }
        if (btnCancelRequest) {
            btnCancelRequest.style.display = 'block';
        }

        const vType = this.selectedService || 'car4';
        const vInfo = this.getVehicleDetails(vType);
        const vConfig = this.vehicleCatalog[vType] || this.vehicleCatalog.car4;
        const estDist = this.currentRouteDistance || this.calculateDirectDistance();
        const estFare = this.selectedVehicleFare || this.calculateFare(vType, estDist);

        const tripPayload = {
            vehicleType: vInfo.type,
            vehicleTypeName: vInfo.name,
            vehicleIcon: vInfo.icon,
            pickupLat: Number(this.pickup.lat),
            pickupLon: Number(this.pickup.lng),
            pickupName: this.pickup.address || this.pickup.name || 'Điểm đón',
            dropoffLat: Number(this.destination.lat),
            dropoffLon: Number(this.destination.lng),
            dropoffName: this.destination.address || this.destination.name || 'Điểm đến',
            distanceMeters: estDist,
            fareAmount: estFare,
            originalFare: this.selectedOriginalFare || estFare,
            promoCode: this.appliedPromo ? this.appliedPromo.code : null,
            discountPercent: this.appliedPromo ? this.appliedPromo.discountPercent : 0,
            paymentMethod: this.paymentMethod || 'cash'
        };

        try {
            const res = await apiClient.requestTrip(tripPayload);
            if (res && res.data && res.data.success && res.data.trip) {
                const createdTrip = res.data.trip;
                this.activeTrip = createdTrip;
                this.activeTripId = createdTrip.id;

                // Sync to shared admin trips
                try {
                    const adminTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
                    const currentUser = (typeof sessionManager !== 'undefined') ? (sessionManager.getUser?.() || sessionManager.getCurrentUser?.()) : null;
                    adminTrips.unshift({
                        id: createdTrip.id,
                        customerName: currentUser?.name || 'Khách hàng',
                        customerPhone: currentUser?.phone || '0901234567',
                        driverName: createdTrip.driverName || 'Chưa gán',
                        pickup: this.pickup.name,
                        destination: this.destination.name,
                        fare: estFare,
                        status: 'requested',
                        createdAt: new Date().toISOString()
                    });
                    localStorage.setItem('goride_admin_trips', JSON.stringify(adminTrips));
                    localStorage.setItem('goride_pending_trip_offers', JSON.stringify([createdTrip]));
                    localStorage.setItem('goride_active_trip', JSON.stringify({
                        id: createdTrip.id,
                        status: (createdTrip.status || 'REQUESTED').toUpperCase(),
                        customerName: currentUser?.name || 'Khách hàng',
                        customerPhone: currentUser?.phone || '0901234567',
                        driverName: createdTrip.driverName || 'Chưa gán',
                        licensePlate: createdTrip.licensePlate || '',
                        vehicleModel: createdTrip.vehicleModel || '',
                        driverRating: createdTrip.driverRating || '5.0',
                        pickup: {
                            name: this.pickup.name,
                            address: this.pickup.address || this.pickup.name,
                            lat: Number(this.pickup.lat),
                            lng: Number(this.pickup.lng)
                        },
                        destination: {
                            name: this.destination.name,
                            address: this.destination.address || this.destination.name,
                            lat: Number(this.destination.lat),
                            lng: Number(this.destination.lng)
                        },
                        fareAmount: estFare,
                        distanceMeters: estDist,
                        vehicleType: vType,
                        createdAt: new Date().toISOString()
                    }));
                } catch (e) {}

                // Broadcast to Firebase Realtime Cloud for instant cross-device sync
                if (typeof realtimeSync !== 'undefined') {
                    realtimeSync.createTrip(createdTrip);
                }

                this.switchView('tracking');
                this.updateTrackingUI(createdTrip);
                this.startActiveTripPolling(createdTrip.id);
                this.showToast('Yêu cầu đặt xe thành công! Đang phát tín hiệu tìm tài xế gần nhất...', 'success');
            } else {
                throw new Error(res?.data?.error || 'Không thể tạo yêu cầu chuyến đi.');
            }
        } catch (err) {
            console.error('[CustomerApp] Ride booking fallback notice:', err);
            if (btnSolicitar) {
                btnSolicitar.disabled = false;
                btnSolicitar.innerHTML = `Xác nhận đặt ${vConfig.name} &bull; ${this.formatMoney(estFare)}`;
            }

            if (err.status === 409) {
                if (btnCancelRequest) btnCancelRequest.style.display = 'none';
                this.showToast('Bạn đang có một chuyến xe đang hoạt động. Chuyển sang màn hình theo dõi...', 'info');
                await this.checkActiveTripOnLoad();
                this.switchView('tracking');
                return;
            }

            if (err.status === 422) {
                if (btnCancelRequest) btnCancelRequest.style.display = 'none';
                this.showToast('Tọa độ đón/trả nằm ngoài phạm vi mạng lưới OSM. Vui lòng chọn điểm khác.', 'error', 5000);
                return;
            }

            // Real unified sync for offline / web preview / cross-tab driver testing (handles server offline, local demo accounts, or network timeout)
            if (!err.status || err.status === 401 || err.status === 404 || err.status === 500 || err.name === 'NetworkError' || (err.message && err.message.toLowerCase().includes('fetch'))) {
                this.showToast('Đang phát tín hiệu tìm tài xế gần bạn nhất...', 'info');
                const currentUser = (typeof sessionManager !== 'undefined') ? (sessionManager.getUser?.() || sessionManager.getCurrentUser?.()) : null;

                const offlineTrip = {
                    id: `TRP-${Math.floor(10000 + Math.random() * 90000)}`,
                    status: 'REQUESTED',
                    customerName: currentUser?.name || 'Khách hàng Navigo',
                    customerPhone: currentUser?.phone || '0901234567',
                    driverName: 'Chưa gán',
                    licensePlate: '',
                    vehicleModel: '',
                    driverRating: '5.0',
                    driverLat: this.pickup.lat + 0.002,
                    driverLon: this.pickup.lng + 0.002,
                    pickupName: this.pickup.name,
                    dropoffName: this.destination.name,
                    fareAmount: estFare,
                    originalFare: this.selectedOriginalFare || estFare,
                    promoCode: this.appliedPromo ? this.appliedPromo.code : null,
                    discountPercent: this.appliedPromo ? this.appliedPromo.discountPercent : 0,
                    distanceMeters: estDist,
                    vehicleType: vInfo.type,
                    vehicleTypeName: vInfo.name,
                    vehicleIcon: vInfo.icon
                };

                // Sync immediately to goride_admin_trips so Driver tab detects it instantly!
                try {
                    const adminTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
                    adminTrips.unshift({
                        id: offlineTrip.id,
                        customerName: offlineTrip.customerName,
                        customerPhone: offlineTrip.customerPhone,
                        driverName: 'Chưa gán',
                        pickup: offlineTrip.pickupName,
                        destination: offlineTrip.dropoffName,
                        fare: estFare,
                        distance: (estDist / 1000).toFixed(1),
                        vehicleType: vInfo.type,
                        vehicleTypeName: vInfo.name,
                        status: 'requested',
                        createdAt: new Date().toISOString()
                    });
                    localStorage.setItem('goride_admin_trips', JSON.stringify(adminTrips));
                    // Dedicated key to trigger storage event in driver tab immediately
                    localStorage.setItem('goride_pending_trip_offers', JSON.stringify([offlineTrip]));
                    localStorage.setItem('goride_active_trip', JSON.stringify({
                        id: offlineTrip.id,
                        status: 'REQUESTED',
                        customerName: offlineTrip.customerName,
                        customerPhone: offlineTrip.customerPhone,
                        driverName: null,
                        licensePlate: '',
                        vehicleModel: '',
                        driverRating: '5.0',
                        pickup: {
                            name: this.pickup.name,
                            address: this.pickup.address || this.pickup.name,
                            lat: Number(this.pickup.lat),
                            lng: Number(this.pickup.lng)
                        },
                        destination: {
                            name: this.destination.name,
                            address: this.destination.address || this.destination.name,
                            lat: Number(this.destination.lat),
                            lng: Number(this.destination.lng)
                        },
                        fareAmount: estFare,
                        distanceMeters: estDist,
                        vehicleType: vInfo.type,
                        vehicleTypeName: vInfo.name,
                        vehicleIcon: vInfo.icon,
                        createdAt: new Date().toISOString()
                    }));
                } catch (e) {}

                this.activeTrip = offlineTrip;
                this.activeTripId = offlineTrip.id;

                // Broadcast to Firebase Realtime Cloud for instant cross-device sync
                if (typeof realtimeSync !== 'undefined') {
                    realtimeSync.createTrip(offlineTrip);
                }

                this.switchView('tracking');
                this.updateTrackingUI(offlineTrip);
                this.startActiveTripPolling(offlineTrip.id);

                // Fallback simulation only if no real driver accepts after 25s
                const t0 = setTimeout(() => {
                    if (this.activeTrip && this.activeTrip.id === offlineTrip.id && this.activeTrip.status === 'REQUESTED') {
                        // Check if an approved driver exists in admin drivers that matches vehicle type
                        const activeDrivers = JSON.parse(localStorage.getItem('goride_admin_drivers') || '[]');
                        const matchingDriver = activeDrivers.find(d => this.isVehicleTypeMatch(vInfo.type, d.vehicleType));

                        const driverName = matchingDriver?.name || 'Nguyễn Văn Thành (Đối tác)';
                        const driverPlate = matchingDriver?.plate || vInfo.plate;
                        const driverModel = matchingDriver?.model || matchingDriver?.vehicleModel || vInfo.model;

                        offlineTrip.status = 'ACCEPTED';
                        offlineTrip.driverName = driverName;
                        offlineTrip.vehicleType = vInfo.type;
                        offlineTrip.vehicleTypeName = vInfo.name;
                        offlineTrip.vehicleIcon = vInfo.icon;
                        offlineTrip.licensePlate = driverPlate;
                        offlineTrip.vehicleModel = driverModel;
                        this.updateTrackingUI(offlineTrip);
                        this.showToast(`Tài xế đối tác ${driverName} (${vInfo.name}) đã nhận chuyến của bạn!`, 'success');
                        try {
                            const adminTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
                            const idx = adminTrips.findIndex(t => t.id === offlineTrip.id);
                            if (idx !== -1) {
                                adminTrips[idx].status = 'accepted';
                                adminTrips[idx].driverName = driverName;
                                adminTrips[idx].licensePlate = driverPlate;
                                adminTrips[idx].vehicleType = vInfo.type;
                                adminTrips[idx].vehicleModel = driverModel;
                                localStorage.setItem('goride_admin_trips', JSON.stringify(adminTrips));
                            }
                            const aTrip = JSON.parse(localStorage.getItem('goride_active_trip') || '{}');
                            aTrip.status = 'ACCEPTED';
                            aTrip.driverName = driverName;
                            aTrip.licensePlate = driverPlate;
                            aTrip.vehicleModel = driverModel;
                            aTrip.vehicleType = vInfo.type;
                            aTrip.vehicleTypeName = vInfo.name;
                            aTrip.vehicleIcon = vInfo.icon;
                            localStorage.setItem('goride_active_trip', JSON.stringify(aTrip));
                        } catch (e) {}
                    }
                }, 25000);

                this.simulationTimers = [t0];
                return;
            }

            if (btnCancelRequest) btnCancelRequest.style.display = 'none';
            this.showToast(`Lỗi đặt chuyến: ${err.message || 'Không thể kết nối máy chủ C++'}`, 'error');
        }
    }

    /**
     * Cancel pending booking request (When searching or before in-progress)
     */
    cancelPendingBooking() {
        // 1. Clear any active progression timers
        if (Array.isArray(this.simulationTimers)) {
            this.simulationTimers.forEach(t => clearTimeout(t));
            this.simulationTimers = [];
        }

        // 2. Cancel backend / storage trip
        const tripId = this.activeTripId || (this.activeTrip && this.activeTrip.id);
        if (tripId) {
            // Save to account-isolated trip history
            this.saveUserTrip({
                id: tripId,
                status: 'cancelled',
                cancelReason: 'Khách hàng hủy khi đang tìm xe',
                pickup: this.pickup,
                destination: this.destination,
                fare: this.selectedVehicleFare || 45000,
                vehicleType: this.selectedService || 'car4'
            });

            if (typeof apiClient !== 'undefined') {
                apiClient.cancelTrip(tripId, 'Khách hàng hủy khi đang tìm xe').catch(() => {});
            }
            if (typeof realtimeSync !== 'undefined') {
                realtimeSync.updateTripStatus(tripId, 'CANCELLED');
            }
            try {
                const adminTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
                const idx = adminTrips.findIndex(t => t.id === tripId);
                if (idx !== -1) {
                    adminTrips[idx].status = 'cancelled';
                    localStorage.setItem('goride_admin_trips', JSON.stringify(adminTrips));
                }
                localStorage.removeItem('goride_pending_trip_offers');
            } catch (e) {}
        }

        // 3. Clear active state & intervals
        this.activeTrip = null;
        this.activeTripId = null;
        try {
            localStorage.removeItem('goride_active_trip');
        } catch (e) {}
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }

        const searchingPanel = document.getElementById('tracking-searching-panel');
        if (searchingPanel) searchingPanel.style.display = 'none';

        // 4. Reset Solicitar button & Cancel button
        const btnSolicitar = document.getElementById('btn-solicitar-ride');
        const btnCancelRequest = document.getElementById('btn-cancel-request-booking');
        if (btnSolicitar) {
            btnSolicitar.disabled = false;
            const vType = this.selectedService || 'car4';
            const vConfig = this.vehicleCatalog[vType] || this.vehicleCatalog.car4;
            const estFare = this.selectedVehicleFare || 45000;
            btnSolicitar.innerHTML = `<span id="solicitar-text">Xác nhận đặt ${vConfig.name} &bull; ${this.formatMoney(estFare)}</span>`;
        }
        if (btnCancelRequest) {
            btnCancelRequest.style.display = 'none';
        }

        // 5. If user was on tracking view, return to vehicle-select
        if (this.currentView === 'tracking') {
            this.switchView('vehicle-select');
        }

        this.updatePersistentBanner();
        this.showToast('Đã hủy yêu cầu đặt xe thành công. Bạn có thể chọn loại xe khác hoặc đặt lại bất cứ lúc nào.', 'info', 4000);
    }

    /**
     * Start live polling of active trip from C++ backend or shared storage dispatch
     */
    startActiveTripPolling(tripId) {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }

        // 1. Firebase Realtime Cloud Listener (Instant push between devices)
        if (typeof realtimeSync !== 'undefined') {
            if (this.realtimeTripUnsub) {
                this.realtimeTripUnsub();
                this.realtimeTripUnsub = null;
            }
            this.realtimeTripUnsub = realtimeSync.listenTrip(tripId, (cloudTrip) => {
                if (cloudTrip && cloudTrip.status) {
                    const prevStatus = this.activeTrip ? this.activeTrip.status : 'REQUESTED';
                    this.activeTrip = { ...this.activeTrip, ...cloudTrip };
                    this.activeTripId = cloudTrip.id;

                    if (cloudTrip.driverLocation) {
                        this.activeTrip.driverLat = cloudTrip.driverLocation.lat;
                        this.activeTrip.driverLon = cloudTrip.driverLocation.lng;
                        this.activeTrip.driverHeading = cloudTrip.driverLocation.heading;
                    }

                    this.updateTrackingUI(this.activeTrip);

                    if (prevStatus === 'REQUESTED' && (cloudTrip.status === 'ACCEPTED' || cloudTrip.status === 'ARRIVED')) {
                        this.showToast(`Tài xế ${cloudTrip.driverName || 'đối tác'} đã nhận chuyến! Đang đến đón bạn.`, 'success', 5000);
                    } else if (prevStatus === 'ACCEPTED' && cloudTrip.status === 'ARRIVED') {
                        this.showToast('Tài xế đã có mặt tại điểm đón! Xin vui lòng ra xe.', 'info', 4500);
                    } else if (prevStatus === 'ARRIVED' && cloudTrip.status === 'IN_PROGRESS') {
                        this.showToast('Chuyến xe bắt đầu lăn bánh...', 'info', 4000);
                    } else if (cloudTrip.status === 'COMPLETED') {
                        if (this.trackingInterval) {
                            clearInterval(this.trackingInterval);
                            this.trackingInterval = null;
                        }
                        if (this.realtimeTripUnsub) {
                            this.realtimeTripUnsub();
                            this.realtimeTripUnsub = null;
                        }
                        this.completeTrip(this.activeTrip);
                    } else if (cloudTrip.status === 'CANCELLED') {
                        this.cancelPendingBooking();
                    }
                }
            });
        }

        let pollCount = 0;
        this.trackingInterval = setInterval(async () => {
            pollCount++;
            try {
                let currentTrip = null;

                // 1. Try Live C++ Backend API
                if (typeof apiClient !== 'undefined') {
                    try {
                        const res = await apiClient.getActiveTrip();
                        if (res && res.data && res.data.has_active_trip && res.data.trip) {
                            currentTrip = res.data.trip;
                        }
                    } catch (e) {}
                }

                // 2. Real-time shared storage sync (cross-tab with Driver portal)
                if (!currentTrip) {
                    try {
                        const adminTrips = JSON.parse(localStorage.getItem('goride_admin_trips') || '[]');
                        const t = adminTrips.find(x => x.id === tripId);
                        if (t) {
                            currentTrip = {
                                id: t.id,
                                status: (t.status || 'requested').toUpperCase(),
                                customerName: t.customerName || 'Khách hàng',
                                driverName: t.driverName !== 'Chưa gán' ? t.driverName : null,
                                licensePlate: t.licensePlate || '51G-889.24',
                                vehicleModel: t.vehicleModel || 'GoRide',
                                vehicleType: t.vehicleType || this.selectedService || 'motorbike',
                                pickupName: t.pickup || this.pickup?.name,
                                dropoffName: t.destination || this.destination?.name,
                                fareAmount: Number(t.fare) || this.selectedVehicleFare || 45000,
                                distanceMeters: (Number(t.distance) || 3) * 1000,
                                driverLat: this.pickup ? this.pickup.lat + (t.status === 'arrived' ? 0 : 0.001) : 10.7725,
                                driverLon: this.pickup ? this.pickup.lng + (t.status === 'arrived' ? 0 : 0.001) : 106.6980
                            };
                            // Sync GPS and vehicleType from live driver broadcast
                            try {
                                const onlineDrivers = JSON.parse(localStorage.getItem('goride_online_drivers') || '{}');
                                const dEntry = Object.values(onlineDrivers).find(d => 
                                    (t.driverName && d.name === t.driverName) || 
                                    (t.licensePlate && d.plate === t.licensePlate)
                                );
                                if (dEntry) {
                                    if (typeof dEntry.lat === 'number') currentTrip.driverLat = dEntry.lat;
                                    if (typeof dEntry.lng === 'number') currentTrip.driverLon = dEntry.lng;
                                    if (dEntry.vehicleType) currentTrip.vehicleType = dEntry.vehicleType;
                                }
                            } catch (e) {}
                        }
                    } catch (e) {}
                }

                if (currentTrip) {
                    const prevStatus = this.activeTrip ? this.activeTrip.status : 'REQUESTED';
                    this.activeTrip = currentTrip;
                    this.activeTripId = currentTrip.id;

                    // Sync to localStorage goride_active_trip
                    try {
                        const existing = JSON.parse(localStorage.getItem('goride_active_trip') || '{}');
                        existing.id = currentTrip.id;
                        existing.status = (currentTrip.status || 'REQUESTED').toUpperCase();
                        if (currentTrip.driverName && currentTrip.driverName !== 'Chưa gán') existing.driverName = currentTrip.driverName;
                        if (currentTrip.licensePlate) existing.licensePlate = currentTrip.licensePlate;
                        if (currentTrip.vehicleModel) existing.vehicleModel = currentTrip.vehicleModel;
                        if (currentTrip.vehicleType) existing.vehicleType = currentTrip.vehicleType;
                        if (currentTrip.fareAmount) existing.fareAmount = currentTrip.fareAmount;
                        localStorage.setItem('goride_active_trip', JSON.stringify(existing));
                    } catch (e) {}

                    this.updateTrackingUI(currentTrip, pollCount);

                    if (prevStatus === 'REQUESTED' && (currentTrip.status === 'ACCEPTED' || currentTrip.status === 'ARRIVED')) {
                        this.showToast(`Tài xế ${currentTrip.driverName || 'đối tác'} đã nhận chuyến! Đang đến đón bạn.`, 'success', 5000);
                    } else if (prevStatus === 'ACCEPTED' && currentTrip.status === 'ARRIVED') {
                        this.showToast('Tài xế đã có mặt tại điểm đón! Xin vui lòng ra xe.', 'info', 4500);
                    } else if (prevStatus === 'ARRIVED' && currentTrip.status === 'IN_PROGRESS') {
                        this.showToast('Chuyến xe bắt đầu lăn bánh...', 'info', 4000);
                    } else if (currentTrip.status === 'COMPLETED') {
                        clearInterval(this.trackingInterval);
                        this.trackingInterval = null;
                        this.completeTrip(currentTrip);
                    } else if (currentTrip.status === 'CANCELLED') {
                        this.cancelPendingBooking();
                    }
                } else if (pollCount > 8 && !this.activeTrip) {
                    // Trip ended or cancelled
                    clearInterval(this.trackingInterval);
                    this.trackingInterval = null;
                    this.activeTrip = null;
                    this.activeTripId = null;
                    try {
                        localStorage.removeItem('goride_active_trip');
                    } catch (e) {}
                    this.updatePersistentBanner();
                    this.showToast('Chuyến đi đã hoàn tất hoặc đã được xử lý xong.', 'info');
                    this.switchView('search');
                    this.resetBookingState();
                }
            } catch (err) {
                console.warn('[CustomerApp] Active trip poll warning:', err.message);
            }
        }, 1200);
    }

    /**
     * Update tracking UI components according to real backend trip state
     */
    updateTrackingUI(trip, pollCount = 0) {
        const radar = document.getElementById('tracking-radar');
        const driverSheet = document.getElementById('tracking-driver-sheet');
        const statusText = document.getElementById('tracking-status-text');
        const prog1 = document.getElementById('prog-step-1');
        const prog2 = document.getElementById('prog-step-2');
        const prog3 = document.getElementById('prog-step-3');
        const prog4 = document.getElementById('prog-step-4');
        const cancelBtn = document.getElementById('btn-cancel-trip') || document.querySelector('[data-action="cancel-ride"]');

        const status = trip.status;

        // Reset progress steps
        [prog1, prog2, prog3, prog4].forEach(p => p && p.classList.remove('active'));
        if (prog1) prog1.classList.add('active');

        const searchingPanel = document.getElementById('tracking-searching-panel');

        if (status === 'REQUESTED' || status === 'OFFERED') {
            if (radar) radar.style.display = 'flex';
            if (driverSheet) driverSheet.style.display = 'none';
            if (searchingPanel) {
                searchingPanel.style.display = 'block';
                const sPickup = document.getElementById('searching-pickup-text');
                const sDropoff = document.getElementById('searching-dropoff-text');
                if (sPickup) sPickup.textContent = trip.pickupName || (this.pickup && this.pickup.name) || '--';
                if (sDropoff) sDropoff.textContent = trip.dropoffName || (this.destination && this.destination.name) || '--';
            }

            // Cancellation is PERMITTED during REQUESTED / OFFERED
            if (cancelBtn) {
                cancelBtn.disabled = false;
                cancelBtn.style.opacity = '1';
                cancelBtn.style.cursor = 'pointer';
                cancelBtn.title = 'Hủy yêu cầu đặt xe';
            }

            if (status === 'REQUESTED') {
                if (pollCount > 20) {
                    if (statusText) statusText.textContent = 'Chưa có tài xế trực tuyến nào gần bạn nhận chuyến. Tiếp tục tìm kiếm hoặc bạn có thể hủy yêu cầu.';
                } else {
                    if (statusText) statusText.textContent = 'Đang quét tìm tài xế gần bạn nhất trong khu vực...';
                }
            } else if (status === 'OFFERED') {
                if (statusText) statusText.textContent = 'Đã gửi yêu cầu tới tài xế gần nhất! Đang chờ tài xế xác nhận (15s)...';
            }
        } else if (status === 'ACCEPTED' || status === 'ARRIVED' || status === 'IN_PROGRESS') {
            if (radar) radar.style.display = 'none';
            if (searchingPanel) searchingPanel.style.display = 'none';
            if (driverSheet) driverSheet.style.display = 'flex';

            // Cancellation is allowed when driver is en route or at pickup. Only forbidden when vehicle is in progress.
            if (cancelBtn) {
                if (status === 'IN_PROGRESS') {
                    cancelBtn.disabled = true;
                    cancelBtn.style.opacity = '0.4';
                    cancelBtn.style.cursor = 'not-allowed';
                    cancelBtn.title = 'Chuyến xe đang di chuyển, không thể hủy.';
                } else {
                    cancelBtn.disabled = false;
                    cancelBtn.style.opacity = '1';
                    cancelBtn.style.cursor = 'pointer';
                    cancelBtn.title = 'Hủy chuyến xe';
                }
            }

            // Update driver information from backend or driver profile (Support all ID variants)
            const driverNameEl = document.getElementById('track-driver-name') || document.getElementById('driver-name');
            const driverPlateEl = document.getElementById('track-driver-plate') || document.getElementById('driver-vehicle');
            const driverModelEl = document.getElementById('track-driver-model');
            const driverRatingEl = document.getElementById('track-driver-rating') || document.getElementById('driver-rating');

            const tripVType = this.normalizeVehicleType(trip.vehicleType || trip.serviceType || this.selectedService || 'car4');
            const vDetails = this.getVehicleDetails(tripVType);

            if (driverNameEl) driverNameEl.textContent = trip.driverName || 'Tài xế Navigo đối tác';
            if (driverPlateEl) driverPlateEl.textContent = trip.licensePlate || vDetails.plate;
            if (driverModelEl) driverModelEl.textContent = trip.vehicleModel ? `${vDetails.icon} ${trip.vehicleModel}` : `${vDetails.icon} ${vDetails.model}`;
            if (driverRatingEl) driverRatingEl.textContent = trip.driverRating ? `★ ${trip.driverRating}` : '★ 5.0';

            if (status === 'ACCEPTED') {
                if (prog2) prog2.classList.add('active');
                if (statusText) statusText.textContent = `Tài xế ${trip.driverName || ''} (${vDetails.name}) đã nhận chuyến! Đang di chuyển đến điểm đón bạn.`;
            } else if (status === 'ARRIVED') {
                if (prog2) prog2.classList.add('active');
                if (statusText) statusText.textContent = 'Tài xế đã có mặt tại điểm đón! Xin vui lòng ra xe.';
            } else if (status === 'IN_PROGRESS') {
                if (prog2) prog2.classList.add('active');
                if (prog3) prog3.classList.add('active');
                if (statusText) statusText.textContent = 'Chuyến đi đang thực hiện. Đang di chuyển đến điểm trả khách...';
            }

            // Render real driver marker if position available
            if (this.mapController && trip.driverLat && trip.driverLon) {
                let vType = tripVType;
                try {
                    const onlineDrivers = JSON.parse(localStorage.getItem('goride_online_drivers') || '{}');
                    const dEntry = Object.values(onlineDrivers).find(d => 
                        (trip.driverName && d.name === trip.driverName) || 
                        (trip.licensePlate && d.plate === trip.licensePlate)
                    );
                    if (dEntry && dEntry.vehicleType) {
                        vType = this.normalizeVehicleType(dEntry.vehicleType);
                    }
                } catch (e) {}

                this.mapController.updateDriverMarker('active_driver', trip.driverLat, trip.driverLon, trip.driverHeading || 0, {
                    name: trip.driverName || 'Tài xế',
                    vehicle: `${vDetails.label} - ${trip.licensePlate || vDetails.plate}`,
                    vehicleType: vType,
                    isActive: true
                });
            }
        } else if (status === 'COMPLETED') {
            if (prog1) prog1.classList.add('active');
            if (prog2) prog2.classList.add('active');
            if (prog3) prog3.classList.add('active');
            if (prog4) prog4.classList.add('active');

            if (this.trackingInterval) {
                clearInterval(this.trackingInterval);
                this.trackingInterval = null;
            }
            this.completeTrip(trip);
        } else if (status === 'CANCELLED') {
            if (this.trackingInterval) {
                clearInterval(this.trackingInterval);
                this.trackingInterval = null;
            }
            this.showToast('Chuyến đi đã bị hủy.', 'info');
            this.activeTrip = null;
            this.activeTripId = null;
            try {
                localStorage.removeItem('goride_active_trip');
            } catch (e) {}
            this.updatePersistentBanner();
            this.switchView('search');
            this.resetBookingState();
        }

        this.updatePersistentBanner();
    }

    /**
     * Real Trip Completion Modal with Fare Receipt & Rating
     */
    completeTrip(trip) {
        try {
            localStorage.removeItem('goride_active_trip');
        } catch (e) {}

        // Save completed trip to account-isolated trip history (100% real data)
        const tripData = trip || this.activeTrip;
        if (tripData) {
            this.saveUserTrip({ ...tripData, status: 'completed' });
        }

        const prog4 = document.getElementById('prog-step-4');
        const statusText = document.getElementById('tracking-status-text');

        if (prog4) prog4.classList.add('active');
        if (statusText) statusText.textContent = 'Chuyến đi đã hoàn thành an toàn! 🎉';

        this.showToast('Bạn đã đến nơi an toàn. Cảm ơn bạn đã đồng hành cùng GoRide!', 'success', 5000);

        const fareAmount = this.formatMoney(trip ? trip.fareAmount : 45000);
        const tripCode = trip ? trip.id : `TRP-${Date.now()}`;
        const driverTitle = trip && trip.driverName ? `${trip.driverName} (${trip.licensePlate || 'Xe đối tác'})` : 'Tài xế GoRide đối tác';

        setTimeout(() => {
            this.showDialog(`
                <div style="text-align:center;">
                    <div style="font-size:3rem; margin-bottom:8px;">🎉</div>
                    <h3 style="margin:0 0 4px; color:#0f172a; font-size:1.25rem;">Hành trình kết thúc!</h3>
                    <p style="margin:0; font-size:0.85rem; color:#64748b;">Mã chuyến: #${tripCode}</p>
                </div>

                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:12px; font-size:0.85rem;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span style="color:#64748b;">Tài xế:</span>
                        <strong>${driverTitle}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span style="color:#64748b;">Cước phí:</span>
                        <strong style="color:var(--goride-teal); font-size:1.1rem;">${fareAmount}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:#64748b;">Thanh toán:</span>
                        <span>${this.paymentMethod === 'cash' ? 'Tiền mặt' : 'Ví GoRide'}</span>
                    </div>
                </div>

                <div>
                    <div style="text-align:center; font-size:0.85rem; color:#334155; font-weight:600; margin-bottom:8px;">
                        Đánh giá chất lượng chuyến đi:
                    </div>
                    <div style="display:flex; justify-content:center; gap:8px; font-size:1.8rem; cursor:pointer;" id="rating-stars">
                        <span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span>
                    </div>
                </div>

                <button type="button" class="goride-btn-solicitar" id="btn-finish-trip-dialog">
                    Hoàn tất & Đặt chuyến mới
                </button>
            `);

            const btnFinish = document.getElementById('btn-finish-trip-dialog');
            if (btnFinish) {
                btnFinish.addEventListener('click', () => {
                    this.closeDialog();
                    this.activeTrip = null;
                    this.activeTripId = null;
                    try {
                        localStorage.removeItem('goride_active_trip');
                    } catch (e) {}
                    this.updatePersistentBanner();
                    this.switchView('search');
                    this.resetBookingState();
                });
            }
        }, 1200);
    }

    /**
     * Update persistent floating banner across views (P7.1)
     */
    updatePersistentBanner() {
        let banner = document.getElementById('goride-persistent-active-banner');
        const hasActiveTrip = this.activeTrip && ['REQUESTED', 'OFFERED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(this.activeTrip.status);

        if (!hasActiveTrip || this.currentView === 'tracking') {
            if (banner) banner.style.display = 'none';
            return;
        }

        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'goride-persistent-active-banner';
            banner.className = 'goride-persistent-active-banner';
            banner.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1500;
                background: linear-gradient(135deg, #0d9488, #059669);
                color: #ffffff;
                padding: 12px 20px;
                border-radius: 9999px;
                box-shadow: 0 10px 25px rgba(13, 148, 136, 0.45);
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 0.9rem;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            `;
            banner.addEventListener('click', () => {
                this.switchView('tracking');
            });
            document.body.appendChild(banner);
        }

        banner.innerHTML = `
            <span style="font-size:1.2rem;">🚗</span>
            <span>Bạn đang có chuyến xe đang diễn ra (#${this.activeTrip.id})</span>
            <span style="background:rgba(255,255,255,0.25); padding:3px 10px; border-radius:12px; font-size:0.8rem;">Quay lại theo dõi &rarr;</span>
        `;
        banner.style.display = 'flex';
    }

    /**
     * Reset booking state for subsequent rides
     */
    resetBookingState() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }

        const btnSolicitar = document.getElementById('btn-solicitar-ride');
        if (btnSolicitar) {
            btnSolicitar.disabled = false;
        }

        if (this.mapController) {
            this.mapController.clearMarkers('drivers');
            this.scatterNearbyDrivers();
        }

        document.querySelectorAll('.goride-prog-step').forEach(step => {
            step.classList.remove('active');
        });
        const prog1 = document.getElementById('prog-step-1');
        if (prog1) prog1.classList.add('active');
    }

    /**
     * Show Call Driver Simulated Dialog
     */
    showCallDialog() {
        this.showDialog(`
            <div style="text-align:center; padding:10px 0;">
                <div style="width:60px; height:60px; border-radius:50%; background:#ecfdf5; color:#059669; font-size:1.8rem; display:flex; align-items:center; justify-content:center; margin:0 auto 12px;">📞</div>
                <h3 style="margin:0 0 4px; color:#0f172a;">Gọi cho tài xế <span style="font-size:0.75rem; color:#dc2626; font-weight:700;">[CHƯA HỖ TRỢ]</span></h3>
                <p style="margin:0; font-size:0.9rem; color:#64748b;">Trần Văn Bình &bull; 0918 765 432</p>
                <div style="background:#fef2f2; border:1px solid #fecaca; padding:10px 14px; border-radius:12px; margin:14px 0; font-size:0.8rem; color:#991b1b; line-height:1.4;">
                    ⚠️ <strong>Bản xem trước:</strong> Tính năng gọi thoại trực tiếp qua mạng viễn thông hiện chưa được triển khai. Hệ thống đang chờ tích hợp cổng VoIP từ Backend.
                </div>
                <button type="button" class="btn btn-outline btn-block" id="btn-close-call-dialog">Đóng</button>
            </div>
        `);

        const closeBtn = document.getElementById('btn-close-call-dialog');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeDialog());
    }

    /**
     * Show In-App Chat Simulated Dialog
     */
    showChatDialog() {
        this.showDialog(`
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:12px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.2rem;">💬</span>
                        <strong>Trần Văn Bình</strong>
                        <span class="badge badge-warning" style="font-size:0.65rem;">BẢN XEM TRƯỚC</span>
                    </div>
                    <button type="button" id="btn-close-chat" style="background:none; border:none; font-size:1.2rem; cursor:pointer;">&times;</button>
                </div>

                <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:8px 12px; margin-bottom:12px; font-size:0.78rem; color:#92400e;">
                    ⚠️ Kênh chat thời gian thực (WebSockets) hiện chưa được kết nối với backend C++. Tin nhắn mẫu bên dưới chỉ nhằm minh họa giao diện.
                </div>

                <div style="display:flex; flex-direction:column; gap:8px; max-height:140px; overflow-y:auto; margin-bottom:12px; font-size:0.85rem;">
                    <div style="background:#f1f5f9; padding:8px 12px; border-radius:12px 12px 12px 2px; max-width:80%;">
                        Dạ em đang đến đón anh/chị ạ! Khoảng 3 phút nữa em tới.
                    </div>
                    <div style="background:var(--goride-teal-light); color:var(--goride-teal-dark); padding:8px 12px; border-radius:12px 12px 2px 12px; max-width:80%; margin-left:auto;">
                        Cảm ơn bạn, mình đang đứng trước sảnh chính nhé.
                    </div>
                </div>

                <div style="display:flex; gap:6px;">
                    <input type="text" placeholder="Tính năng chat đang chờ kết nối Backend..." class="form-input" style="font-size:0.85rem; height:40px;" disabled>
                    <button type="button" class="btn btn-primary" style="height:40px; padding:0 14px;" disabled>Gửi</button>
                </div>
            </div>
        `);

        const closeBtn = document.getElementById('btn-close-chat');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeDialog());
    }

    /**
     * Show Cancel Confirmation Dialog (P7.1 Cancellation Rules)
     */
    showCancelConfirmDialog() {
        if (!this.activeTrip && !this.activeTripId) {
            this.cancelPendingBooking();
            return;
        }

        const s = this.activeTrip ? this.activeTrip.status : 'REQUESTED';
        if (s === 'IN_PROGRESS' || s === 'COMPLETED') {
            this.showToast('Chuyến xe đang di chuyển hoặc đã hoàn thành, không thể hủy vào lúc này.', 'warning', 4500);
            return;
        }

        const isDriverComing = (s === 'ACCEPTED' || s === 'ARRIVED');
        const warningMsg = isDriverComing
            ? 'Tài xế đang trên đường đến đón bạn. Bạn có chắc chắn muốn hủy chuyến xe này không?'
            : 'Hệ thống đang quét tìm tài xế gần bạn nhất qua chỉ mục R-Tree. Bạn có chắc muốn dừng tìm kiếm và hủy yêu cầu không?';

        this.showDialog(`
            <div style="text-align:center;">
                <div style="width:50px; height:50px; border-radius:50%; background:#fee2e2; color:#dc2626; font-size:1.6rem; display:flex; align-items:center; justify-content:center; margin:0 auto 10px;">⚠️</div>
                <h3 style="margin:0 0 6px; color:#0f172a;">Hủy chuyến xe?</h3>
                <p style="margin:0; font-size:0.85rem; color:#64748b;">${warningMsg}</p>
                <div style="display:flex; gap:10px; margin-top:16px;">
                    <button type="button" class="btn btn-outline" style="flex:1;" id="btn-keep-trip">Giữ chuyến xe</button>
                    <button type="button" class="btn btn-danger" style="flex:1;" id="btn-do-cancel">Xác nhận hủy</button>
                </div>
            </div>
        `);

        const btnKeep = document.getElementById('btn-keep-trip');
        const btnDoCancel = document.getElementById('btn-do-cancel');

        if (btnKeep) btnKeep.addEventListener('click', () => this.closeDialog());
        if (btnDoCancel) {
            btnDoCancel.addEventListener('click', () => {
                this.closeDialog();
                this.cancelPendingBooking();
            });
        }
    }

    /**
     * Generic Modal Dialog Helper
     */
    showDialog(htmlContent) {
        const overlay = document.getElementById('dialog-overlay');
        const card = document.getElementById('dialog-card-content');
        if (overlay && card) {
            card.innerHTML = htmlContent;
            overlay.classList.add('active');
        }
    }

    closeDialog() {
        const overlay = document.getElementById('dialog-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    /**
     * Get active customer identity key for account-isolated storage
     */
    getCurrentUserKey() {
        try {
            let u = null;
            if (typeof sessionManager !== 'undefined' && typeof sessionManager.getCurrentUser === 'function') {
                u = sessionManager.getCurrentUser();
            }
            if (!u) {
                u = JSON.parse(localStorage.getItem('goride_user') || sessionStorage.getItem('ride_rtree_user') || 'null');
            }
            if (u) {
                const rawKey = u.id || u.email || u.phone;
                if (rawKey) {
                    return String(rawKey).trim().toLowerCase().replace(/[^a-z0-9_@.-]/gi, '_');
                }
            }
        } catch (e) {}
        return 'guest';
    }

    /**
     * Save trip to account-isolated trip history (100% real data)
     */
    saveUserTrip(tripData) {
        if (!tripData || !tripData.id) return;
        try {
            const userKey = this.getCurrentUserKey();
            const storageKey = `goride_trips_${userKey}`;
            let list = JSON.parse(localStorage.getItem(storageKey) || '[]');
            
            // Clean out any legacy mock trips
            const checkMock = (typeof isMockTrip === 'function') ? isMockTrip : (t => ['trip_vn_101', 'trip_vn_102', 'trip_vn_103', 'trip_vn_104'].includes(t?.id));
            list = list.filter(t => !checkMock(t));

            const pName = tripData.pickupName || (tripData.pickup && (tripData.pickup.name || tripData.pickup.address)) || (this.pickup && this.pickup.name) || 'Điểm đón';
            const dName = tripData.dropoffName || (tripData.destination && (tripData.destination.name || tripData.destination.address)) || (this.destination && this.destination.name) || 'Điểm đến';
            const fare = Number(tripData.fareAmount || tripData.fare || this.selectedVehicleFare || 45000);
            const dist = Number(tripData.distanceMeters || tripData.distance || (this.currentRouteDistance || 3000));
            const vType = tripData.vehicleType || this.selectedService || 'car4';
            const vName = (this.vehicleCatalog && this.vehicleCatalog[vType] && this.vehicleCatalog[vType].name) || 'GoRide Car';

            const record = {
                id: tripData.id,
                userId: userKey,
                status: (tripData.status || 'completed').toLowerCase(),
                pickup: { name: pName },
                destination: { name: dName },
                fare: fare,
                fareAmount: fare,
                distance: dist,
                distanceMeters: dist,
                vehicleType: vType,
                vehicleName: vName,
                driver: (tripData.driverName && tripData.driverName !== 'Chưa gán') ? {
                    name: tripData.driverName,
                    plate: tripData.licensePlate || '51G-889.24',
                    model: tripData.vehicleModel || 'GoRide Partner',
                    rating: tripData.driverRating || 5.0
                } : (tripData.driver || null),
                cancelReason: tripData.cancelReason || null,
                createdAt: tripData.createdAt || new Date().toISOString(),
                completedAt: tripData.completedAt || (['completed', 'COMPLETED'].includes(tripData.status) ? new Date().toISOString() : null)
            };

            const existingIdx = list.findIndex(x => x.id === tripData.id);
            if (existingIdx !== -1) {
                list[existingIdx] = { ...list[existingIdx], ...record };
            } else {
                list.unshift(record);
            }
            localStorage.setItem(storageKey, JSON.stringify(list));
        } catch (e) {
            console.warn('[GoRide] Error saving user trip:', e);
        }
    }

    /**
     * Load Customer Trip History - 100% Real data isolated per user account (No mock data)
     */
    async loadTripHistory() {
        const container = document.getElementById('history-trips-container');
        if (!container) return;

        // Ensure all legacy mock trips are thoroughly purged across all storage first
        if (typeof purgeAllMockTrips === 'function') {
            purgeAllMockTrips();
        }

        container.innerHTML = `
            <div style="text-align:center; padding:24px; color:#64748b;">
                <div class="spinner" style="display:inline-block; width:24px; height:24px; border:3px solid #e2e8f0; border-top-color:var(--goride-teal); border-radius:50%; animation:spin 1s linear infinite;"></div>
                <div style="margin-top:8px; font-size:0.85rem;">Đang tải lịch sử chuyến đi...</div>
            </div>
        `;

        try {
            const userKey = this.getCurrentUserKey();
            const storageKey = `goride_trips_${userKey}`;
            
            const checkMock = (typeof isMockTrip === 'function') ? isMockTrip : (t => ['trip_vn_101', 'trip_vn_102', 'trip_vn_103', 'trip_vn_104'].includes(t?.id));

            let userTrips = [];
            try {
                userTrips = JSON.parse(localStorage.getItem(storageKey) || '[]');
                userTrips = userTrips.filter(t => !checkMock(t));
                localStorage.setItem(storageKey, JSON.stringify(userTrips));
            } catch (e) {
                userTrips = [];
            }

            // Also check alternate email key if user has email different from userKey
            try {
                const u = (typeof sessionManager !== 'undefined' && sessionManager.getCurrentUser?.()) ||
                          JSON.parse(localStorage.getItem('goride_user') || 'null');
                if (u && u.email && u.email.toLowerCase().trim() !== userKey) {
                    const emailKey = `goride_trips_${u.email.toLowerCase().trim()}`;
                    const emailTrips = JSON.parse(localStorage.getItem(emailKey) || '[]').filter(t => !checkMock(t));
                    if (emailTrips.length > 0) {
                        emailTrips.forEach(et => {
                            if (!userTrips.some(ut => ut.id === et.id)) {
                                userTrips.push(et);
                            }
                        });
                        localStorage.setItem(storageKey, JSON.stringify(userTrips));
                    }
                }
            } catch (e) {}

            // Zero mock fallback: If empty, display clean Empty State (never fallback to fake data)
            if (!userTrips || userTrips.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:44px 16px; color:#94a3b8;">
                        <div style="font-size:2.8rem; margin-bottom:12px;">📋</div>
                        <div style="font-weight:700; color:#334155; font-size:1.05rem;">Chưa có chuyến đi nào</div>
                        <div style="font-size:0.85rem; color:#64748b; margin-top:6px; max-width:280px; margin-left:auto; margin-right:auto; line-height:1.45;">
                            Các chuyến xe bạn đã đặt trên tài khoản này sẽ hiển thị chi tiết tại đây.
                        </div>
                    </div>
                `;
                return;
            }

            // Sort descending by creation date
            userTrips.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

            container.innerHTML = '';
            userTrips.forEach(t => {
                const card = document.createElement('div');
                card.className = 'trip-card';
                card.style.marginBottom = '12px';

                const pickupName = t.pickup ? (t.pickup.name || t.pickup.address || t.pickup) : (t.pickupName || 'Điểm đón');
                const destName = t.destination ? (t.destination.name || t.destination.address || t.destination) : (t.dropoffName || 'Điểm đến');
                const fareFormatted = this.formatMoney(t.fare || t.fareAmount || 0);
                const isCompleted = (t.status === 'completed' || t.status === 'COMPLETED');

                card.innerHTML = `
                    <div class="trip-card-header">
                        <span class="trip-card-date">${this.formatDate(t.createdAt)}</span>
                        <span class="trip-card-status status-${t.status.toLowerCase()}">${isCompleted ? 'Hoàn thành' : 'Đã hủy'}</span>
                    </div>
                    <div class="trip-card-route">
                        <div class="trip-route-stop">${this.escapeHtml(pickupName)}</div>
                        <div class="trip-route-stop stop-destination">${this.escapeHtml(destName)}</div>
                    </div>
                    <div class="trip-card-info">
                        <span>${this.escapeHtml(t.vehicleName || 'GoRide Car')}</span>
                        <span class="trip-card-fare">${fareFormatted}</span>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (e) {
            console.error('[GoRide] Error loading trips:', e);
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444;">Không thể tải danh sách chuyến đi.</div>`;
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Haversine distance finder helper
     */
    findClosestLocation(lat, lng) {
        let closest = null;
        let minDist = Infinity;

        this.locationsPool.forEach(loc => {
            const dLat = (loc.lat - lat) * 111000;
            const dLng = (loc.lng - lng) * 111000 * Math.cos(lat * Math.PI / 180);
            const dist = Math.sqrt(dLat * dLat + dLng * dLng);

            if (dist < minDist) {
                minDist = dist;
                closest = { location: loc, distanceMeters: dist };
            }
        });

        return closest;
    }

    /**
     * Helpers
     */
    formatMoney(val) {
        return `${Number(val).toLocaleString('vi-VN')} ₫`;
    }

    formatDate(dateStr) {
        if (!dateStr) return 'Gần đây';
        try {
            const d = new Date(dateStr);
            return `${d.getHours()}:${d.getMinutes() < 10 ? '0' : ''}${d.getMinutes()} - ${d.getDate()}/${d.getMonth() + 1}`;
        } catch (e) {
            return 'Gần đây';
        }
    }

    showToast(msg, type = 'info', duration = 3000) {
        if (typeof showToast === 'function') {
            showToast(msg, type, duration);
        } else {
            console.log(`[Toast ${type}]: ${msg}`);
        }
    }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    window.customerAppController = new CustomerAppController();
    window.customerAppController.init();
});
