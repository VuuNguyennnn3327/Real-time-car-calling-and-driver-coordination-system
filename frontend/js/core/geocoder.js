/**
 * GoRide Geocoding Service (Phase B)
 * Enterprise-grade geocoding and reverse-geocoding for Ho Chi Minh City.
 * 
 * Features:
 * - Decoupled provider architecture (Photon by Komoot as primary, OSM Nominatim as secondary, Local Cache as fallback)
 * - Strict bounding box enforcement for Ho Chi Minh City
 * - Vietnamese diacritic insensitive search (e.g. "Nguyen Hue" matches "Nguyễn Huệ")
 * - LRU query caching & debouncing
 * - Reverse geocoding for pin-on-map selection
 * - Honest error & empty state handling (never silently defaults to Ben Thanh)
 */

(function (window) {
    'use strict';

    // Ho Chi Minh City Bounding Box (expanded to encompass all urban districts, Thu Duc, Nha Be, Hoc Mon)
    const HCMC_BBOX = {
        minLat: 10.3500,
        maxLat: 11.1500,
        minLon: 106.3500,
        maxLon: 107.0500,
        centerLat: 10.7769,
        centerLon: 106.7009
    };

    /**
     * Remove Vietnamese diacritics for flexible fuzzy matching
     */
    function stripVietnameseDiacritics(str) {
        if (!str) return '';
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, (match) => (match === 'đ' ? 'd' : 'D'))
            .toLowerCase()
            .trim();
    }

    /**
     * Fallback landmark dataset for offline or zero-network conditions in HCMC
     */
    const LOCAL_HCMC_LANDMARKS = [
        {
            name: 'Chợ Bến Thành',
            address: 'Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
            lat: 10.7725,
            lng: 106.6980,
            type: 'poi',
            district: 'Quận 1'
        },
        {
            name: 'Vincom Center Đồng Khởi',
            address: '72 Lê Thánh Tôn & 45A Lý Tự Trọng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
            lat: 10.7781,
            lng: 106.7023,
            type: 'poi',
            district: 'Quận 1'
        },
        {
            name: 'Landmark 81, Vinhomes Central Park',
            address: '720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
            lat: 10.7951,
            lng: 106.7219,
            type: 'poi',
            district: 'Bình Thạnh'
        },
        {
            name: 'Sân bay Quốc tế Tân Sơn Nhất',
            address: 'Đường Trường Sơn, Phường 2, Tân Bình, TP. Hồ Chí Minh',
            lat: 10.8185,
            lng: 106.6588,
            type: 'poi',
            district: 'Tân Bình'
        },
        {
            name: 'Đại học Bách Khoa TP.HCM (Cơ sở 1)',
            address: '268 Lý Thường Kiệt, Phường 14, Quận 10, TP. Hồ Chí Minh',
            lat: 10.7721,
            lng: 106.6578,
            type: 'poi',
            district: 'Quận 10'
        },
        {
            name: 'Đại học Khoa học Tự nhiên TP.HCM',
            address: '227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP. Hồ Chí Minh',
            lat: 10.7628,
            lng: 106.6825,
            type: 'poi',
            district: 'Quận 5'
        },
        {
            name: 'Nhà Thờ Đức Bà Sài Gòn',
            address: '01 Công xã Paris, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
            lat: 10.7798,
            lng: 106.6990,
            type: 'poi',
            district: 'Quận 1'
        },
        {
            name: 'Phố đi bộ Nguyễn Huệ',
            address: 'Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
            lat: 10.7743,
            lng: 106.7036,
            type: 'poi',
            district: 'Quận 1'
        },
        {
            name: 'Bệnh viện Chợ Rẫy',
            address: '201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP. Hồ Chí Minh',
            lat: 10.7578,
            lng: 106.6593,
            type: 'poi',
            district: 'Quận 5'
        },
        {
            name: 'Crescent Mall Phú Mỹ Hưng',
            address: '101 Tôn Dật Tiên, Phường Tân Phú, Quận 7, TP. Hồ Chí Minh',
            lat: 10.7297,
            lng: 106.7222,
            type: 'poi',
            district: 'Quận 7'
        },
        {
            name: 'Bến xe Miền Đông Mới',
            address: 'Đường Hoàng Hữu Nam, Phường Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh',
            lat: 10.8782,
            lng: 106.8164,
            type: 'poi',
            district: 'TP. Thủ Đức'
        },
        {
            name: 'Bến xe Miền Tây',
            address: '395 Kinh Dương Vương, Phường An Lạc, Bình Tân, TP. Hồ Chí Minh',
            lat: 10.7418,
            lng: 106.6172,
            type: 'poi',
            district: 'Bình Tân'
        },
        {
            name: 'Hồ Con Rùa',
            address: 'Vòng xoay Công trường Quốc Tế, Phường 6, Quận 3, TP. Hồ Chí Minh',
            lat: 10.7827,
            lng: 106.6958,
            type: 'poi',
            district: 'Quận 3'
        },
        {
            name: 'Thảo Cầm Viên Sài Gòn',
            address: '02 Nguyễn Bỉnh Khiêm, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
            lat: 10.7875,
            lng: 106.7053,
            type: 'poi',
            district: 'Quận 1'
        },
        {
            name: 'Chợ Lớn (Chợ Bình Tây)',
            address: '57A Tháp Mười, Phường 2, Quận 6, TP. Hồ Chí Minh',
            lat: 10.7502,
            lng: 106.6517,
            type: 'poi',
            district: 'Quận 6'
        }
    ];

    class GeocoderService {
        constructor() {
            // LRU-style cache for forward & reverse geocoding queries
            this.cache = new Map();
            this.maxCacheSize = 100;
            this.activeAbortController = null;
        }

        /**
         * Checks if a coordinate is within Ho Chi Minh City bounds
         */
        isInHcmc(lat, lon) {
            return (
                lat >= HCMC_BBOX.minLat &&
                lat <= HCMC_BBOX.maxLat &&
                lon >= HCMC_BBOX.minLon &&
                lon <= HCMC_BBOX.maxLon
            );
        }

        /**
         * Primary Search method: queries Photon API bounded to HCMC,
         * falls back to OSM Nominatim, then to local landmarks.
         * 
         * @param {string} query - Search text (street, house number, POI)
         * @param {number} [limit=8] - Max results
         * @returns {Promise<Array<Object>>}
         */
        async search(query, limit = 8) {
            if (!query || typeof query !== 'string') return [];
            const cleanQuery = query.trim();
            if (cleanQuery.length < 2) return [];

            const cacheKey = `search:${cleanQuery.toLowerCase()}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            // Cancel any pending request
            if (this.activeAbortController) {
                this.activeAbortController.abort();
            }
            this.activeAbortController = new AbortController();
            const signal = this.activeAbortController.signal;

            let results = [];

            // Tier 1: Photon API by Komoot (supports typo tolerance & OSM database)
            try {
                results = await this._queryPhoton(cleanQuery, limit, signal);
            } catch (err) {
                if (err.name === 'AbortError') throw err;
                console.warn('[Geocoder] Photon API query failed:', err.message);
            }

            // Tier 2: OpenStreetMap Nominatim if Tier 1 yielded 0 results
            if (!results || results.length === 0) {
                try {
                    results = await this._queryNominatim(cleanQuery, limit, signal);
                } catch (err) {
                    if (err.name === 'AbortError') throw err;
                    console.warn('[Geocoder] Nominatim API query failed:', err.message);
                }
            }

            // Tier 3: Local Offline Landmarks if remote APIs fail or return 0
            if (!results || results.length === 0) {
                results = this._queryLocalLandmarks(cleanQuery, limit);
            }

            // Save to LRU cache
            if (results && results.length > 0) {
                if (this.cache.size >= this.maxCacheSize) {
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }
                this.cache.set(cacheKey, results);
            }

            return results || [];
        }

        /**
         * Reverse geocoding: finds real street address from coordinates (lat, lon)
         * 
         * @param {number} lat
         * @param {number} lon
         * @returns {Promise<Object>}
         */
        async reverse(lat, lon) {
            const numLat = Number(lat);
            const numLon = Number(lon);
            if (isNaN(numLat) || isNaN(numLon)) {
                return null;
            }

            const cacheKey = `rev:${numLat.toFixed(5)},${numLon.toFixed(5)}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            let result = null;

            // Tier 1: Photon reverse geocoder
            try {
                const url = `https://photon.komoot.io/reverse?lat=${numLat}&lon=${numLon}`;
                const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.features && data.features.length > 0) {
                        result = this._formatPhotonFeature(data.features[0]);
                    }
                }
            } catch (err) {
                console.warn('[Geocoder] Photon reverse failed:', err.message);
            }

            // Tier 2: Nominatim reverse geocoder
            if (!result) {
                try {
                    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${numLat}&lon=${numLon}&zoom=18&addressdetails=1`;
                    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.display_name) {
                            result = {
                                id: `nom_${data.osm_id || Date.now()}`,
                                name: (() => {
                                    const raw = data.name ? String(data.name).trim() : '';

                                    const addr = data.address || {};
                                    let cleanRoad = '';
                                    if (addr.road) {
                                        const r = String(addr.road).trim();
                                        cleanRoad = /^[a-zA-Z]$/.test(r) ? `Đường ${r.toUpperCase()}` : (/^\d+$/.test(r) ? `Đường Số ${r}` : r);
                                    }
                                    const cleanHouse = addr.house_number ? String(addr.house_number).trim() : '';
                                    let roadPart = (cleanHouse && cleanRoad) ? `${cleanHouse} ${cleanRoad}` : (cleanRoad || (cleanHouse ? `Số ${cleanHouse}` : ''));
                                    const areaPart = addr.suburb || addr.quarter || addr.neighbourhood || addr.city_district || (addr.city && !addr.city.toLowerCase().includes('chi minh') ? addr.city : '');
                                    const isTrivial = !raw || raw.length <= 2 || /^(\d+[\s\/-]*[a-zA-Z]?|[a-zA-Z0-9\s-]{1,2})$/i.test(raw);
                                    const mainPart = (!isTrivial && raw !== cleanRoad) ? raw : (roadPart || raw || '');
                                    if (mainPart && areaPart) {
                                        return mainPart.toLowerCase().includes(areaPart.toLowerCase()) ? mainPart : `${mainPart}, ${areaPart}`;
                                    }
                                    if (mainPart) return mainPart;
                                    if (areaPart) return areaPart;



                                    if (data.display_name) {
                                        const parts = data.display_name.split(',').map(s => s.trim()).filter(s => s.length > 2);
                                        return parts.slice(0, 2).join(', ') || 'Vị trí đã chọn';
                                    }
                                    return 'Vị trí đã chọn';
                                })(),
                                address: data.display_name,
                                lat: numLat,
                                lng: numLon,
                                district: (data.address && (data.address.city_district || data.address.suburb || data.address.quarter)) || 'TP. Hồ Chí Minh',
                                source: 'nominatim'
                            };
                        }
                    }
                } catch (err) {
                    console.warn('[Geocoder] Nominatim reverse failed:', err.message);
                }
            }

            // Tier 3: Local landmark proximity check
            if (!result) {
                let closest = null;
                let minDist = Infinity;
                for (const lm of LOCAL_HCMC_LANDMARKS) {
                    const d = Math.hypot(numLat - lm.lat, numLon - lm.lng);
                    if (d < minDist) {
                        minDist = d;
                        closest = lm;
                    }
                }
                if (closest && minDist < 0.003) { // ~300 meters
                    result = {
                        id: `local_${Date.now()}`,
                        name: closest.name,
                        address: closest.address,
                        lat: numLat,
                        lng: numLon,
                        district: closest.district,
                        source: 'local'
                    };
                } else {
                    result = {
                        id: `coord_${Date.now()}`,
                        name: `Tọa độ: ${numLat.toFixed(5)}, ${numLon.toFixed(5)}`,
                        address: `Khu vực TP. Hồ Chí Minh (${numLat.toFixed(5)}, ${numLon.toFixed(5)})`,
                        lat: numLat,
                        lng: numLon,
                        district: 'TP. Hồ Chí Minh',
                        source: 'coordinates'
                    };
                }
            }

            if (result) {
                this.cache.set(cacheKey, result);
            }
            return result;
        }

        /**
         * Photon API query implementation
         * @private
         */
        async _queryPhoton(query, limit, signal) {
            // Encode query with explicit HCMC bias and bounding box
            const encoded = encodeURIComponent(query);
            const url = `https://photon.komoot.io/api/?q=${encoded}&lat=${HCMC_BBOX.centerLat}&lon=${HCMC_BBOX.centerLon}&bbox=${HCMC_BBOX.minLon},${HCMC_BBOX.minLat},${HCMC_BBOX.maxLon},${HCMC_BBOX.maxLat}&limit=${limit}`;

            const res = await fetch(url, { signal, headers: { 'Accept': 'application/json' } });
            if (!res.ok) return [];

            const data = await res.json();
            if (!data || !data.features || !Array.isArray(data.features)) return [];

            const results = [];
            for (const f of data.features) {
                const item = this._formatPhotonFeature(f);
                if (item && this.isInHcmc(item.lat, item.lng)) {
                    results.push(item);
                }
            }
            return results;
        }

        /**
         * Formats a raw GeoJSON Feature from Photon into GoRide place object
         * @private
         */
        _formatPhotonFeature(f) {
            if (!f || !f.geometry || !f.geometry.coordinates) return null;
            const [lon, lat] = f.geometry.coordinates;
            const p = f.properties || {};

            const rawPhotonName = p.name ? String(p.name).trim() : '';
            const isPhotonNameTrivial = !rawPhotonName || rawPhotonName.length <= 2 || /^(\d+[\s\/-]*[a-zA-Z]?|[a-zA-Z0-9\s-]{1,2})$/i.test(rawPhotonName);
            let cleanStreet = '';
            if (p.street) {
                const s = String(p.street).trim();
                cleanStreet = /^[a-zA-Z]$/.test(s) ? `Đường ${s.toUpperCase()}` : (/^\d+$/.test(s) ? `Đường Số ${s}` : s);
            }
            const cleanHouse = p.housenumber ? String(p.housenumber).trim() : '';
            let photonStreet = (cleanHouse && cleanStreet) ? `${cleanHouse} ${cleanStreet}` : (cleanStreet || (cleanHouse ? `Số ${cleanHouse}` : ''));
            let areaPart = p.district || p.suburb || p.quarter || p.locality || '';
            if (!areaPart && p.city && !p.city.toLowerCase().includes('chi minh')) {
                areaPart = p.city;
            }
            let name = '';
            if (!isPhotonNameTrivial) {
                name = (areaPart && !rawPhotonName.toLowerCase().includes(areaPart.toLowerCase())) ? `${rawPhotonName}, ${areaPart}` : rawPhotonName;
            } else if (photonStreet) {
                name = (areaPart && !photonStreet.toLowerCase().includes(areaPart.toLowerCase())) ? `${photonStreet}, ${areaPart}` : photonStreet;
            } else if (p.district) {
                name = p.district;
            } else if (p.city) {
                name = p.city;
            } else {
                name = 'Địa điểm tại TP.HCM';
            }
            const parts = [];
            if (p.housenumber) parts.push(p.housenumber);
            if (cleanStreet) parts.push(cleanStreet);
            if (areaPart && !parts.includes(areaPart)) parts.push(areaPart);
            if (p.city && !p.city.toLowerCase().includes('chi minh') && !parts.includes(p.city)) parts.push(p.city);
            if (parts.length === 0 && rawPhotonName && !isPhotonNameTrivial) parts.push(rawPhotonName);
            parts.push('TP. Hồ Chí Minh');

            const fullAddress = parts.join(', ');

            return {
                id: `photon_${p.osm_id || Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                name: name,
                address: fullAddress,
                lat: Number(lat),
                lng: Number(lon),
                type: p.osm_value || 'place',
                district: areaPart || p.district || p.city || 'TP. Hồ Chí Minh',
                source: 'photon'
            };
        }

        /**
         * OpenStreetMap Nominatim query implementation
         * @private
         */
        async _queryNominatim(query, limit, signal) {
            // Include Ho Chi Minh City explicitly to bound search
            const fullQuery = query.toLowerCase().includes('hồ chí minh') || query.toLowerCase().includes('hcm')
                ? query
                : `${query}, Hồ Chí Minh`;

            const encoded = encodeURIComponent(fullQuery);
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=vn&viewbox=${HCMC_BBOX.minLon},${HCMC_BBOX.maxLat},${HCMC_BBOX.maxLon},${HCMC_BBOX.minLat}&bounded=1&limit=${limit}&addressdetails=1`;

            const res = await fetch(url, { signal, headers: { 'Accept': 'application/json' } });
            if (!res.ok) return [];

            const data = await res.json();
            if (!Array.isArray(data)) return [];

            return data.map(item => {
                const addr = item.address || {};
                const rawNomItemName = item.name ? String(item.name).trim() : '';
                const isNomItemTrivial = !rawNomItemName || rawNomItemName.length <= 2 || /^(\d+[\s\/-]*[a-zA-Z]?|[a-zA-Z0-9\s-]{1,2})$/i.test(rawNomItemName);
                let cleanRoad = '';
                if (addr.road) {
                    const r = String(addr.road).trim();
                    cleanRoad = /^[a-zA-Z]$/.test(r) ? `Đường ${r.toUpperCase()}` : (/^\d+$/.test(r) ? `Đường Số ${r}` : r);
                }
                const cleanHouse = addr.house_number ? String(addr.house_number).trim() : '';
                const itemStreet = (cleanHouse && cleanRoad) ? `${cleanHouse} ${cleanRoad}` : (cleanRoad || (cleanHouse ? `Số ${cleanHouse}` : ''));
                const areaPart = addr.suburb || addr.quarter || addr.neighbourhood || addr.city_district || (addr.city && !addr.city.toLowerCase().includes('chi minh') ? addr.city : '');
                const main = (!isNomItemTrivial && rawNomItemName !== cleanRoad) ? rawNomItemName : (itemStreet || rawNomItemName);
                let name = '';
                if (main && areaPart) {
                    name = main.toLowerCase().includes(areaPart.toLowerCase()) ? main : `${main}, ${areaPart}`;
                } else if (main) {
                    name = main;
                } else if (areaPart) {
                    name = areaPart;
                } else {
                    name = 'Địa điểm tại TP.HCM';
                }
                return {
                    id: `nom_${item.osm_id || Date.now()}`,
                    name: name,
                    address: item.display_name,
                    lat: Number(item.lat),
                    lng: Number(item.lon),
                    type: item.type || 'place',
                    district: areaPart || addr.city_district || addr.suburb || addr.quarter || 'TP. Hồ Chí Minh',
                    source: 'nominatim'
                };
            }).filter(item => this.isInHcmc(item.lat, item.lng));
        }

        /**
         * Local landmark fuzzy search
         * @private
         */
        _queryLocalLandmarks(query, limit) {
            const normQuery = stripVietnameseDiacritics(query);
            const matches = [];

            for (const lm of LOCAL_HCMC_LANDMARKS) {
                const normName = stripVietnameseDiacritics(lm.name);
                const normAddr = stripVietnameseDiacritics(lm.address);

                if (normName.includes(normQuery) || normAddr.includes(normQuery)) {
                    matches.push({
                        id: `local_${lm.lat}_${lm.lng}`,
                        name: lm.name,
                        address: lm.address,
                        lat: lm.lat,
                        lng: lm.lng,
                        type: lm.type,
                        district: lm.district,
                        source: 'local_preset'
                    });
                }
                if (matches.length >= limit) break;
            }

            return matches;
        }
    }

    // Export singleton
    const geocoderService = new GeocoderService();
    window.GeocoderService = GeocoderService;
    window.geocoderService = geocoderService;

})(window);
