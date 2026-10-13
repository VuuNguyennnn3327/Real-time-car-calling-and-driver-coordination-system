/**
 * @file app.js
 * @author Duong <6651071010@st.utc2.edu.vn>
 * @brief API helpers, polling and shared Leaflet/data utilities for RIDE-RTREE.
 * Realtime is implemented with HTTP polling only (no WebSocket).
 */
const API_BASE = 'http://localhost:8080/api';

async function apiRequest(method, endpoint, data) {
    try {
        const options = { method, headers: { Accept: 'application/json' } };
        if (data !== undefined) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const text = await response.text();
        let payload = null;
        if (text) {
            try { payload = JSON.parse(text); }
            catch { payload = text; }
        }
        if (!response.ok) {
            const message = payload && typeof payload === 'object' && (payload.error || payload.message)
                ? (payload.error || payload.message)
                : `HTTP ${response.status}`;
            throw new Error(message);
        }
        return payload;
    } catch (error) {
        console.error(`[RIDE-RTREE] ${method} ${endpoint}:`, error);
        return null;
    }
}

function apiGet(endpoint) { return apiRequest('GET', endpoint); }
function apiPost(endpoint, data) { return apiRequest('POST', endpoint, data); }

/** Poll endpoint immediately, then at intervalMs. Requests never overlap. Returns stop(). */
function pollEndpoint(endpoint, intervalMs = 2500, callback = () => {}, onError = () => {}) {
    let stopped = false;
    let timer = null;
    let running = false;
    const tick = async () => {
        if (stopped || running || document.hidden) return;
        running = true;
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, { headers: { Accept: 'application/json' } });
            const text = await response.text();
            const payload = text ? JSON.parse(text) : null;
            if (!response.ok) throw new Error((payload && (payload.error || payload.message)) || `HTTP ${response.status}`);
            callback(payload);
        } catch (error) {
            onError(error);
            console.warn(`[RIDE-RTREE] Polling ${endpoint} failed:`, error.message);
        } finally {
            running = false;
        }
    };
    tick();
    timer = window.setInterval(tick, Math.max(1000, intervalMs));
    return () => { stopped = true; if (timer !== null) window.clearInterval(timer); };
}

/** Poll arbitrary async fetch function without overlapping calls. */
function startPolling(fetchFn, intervalMs = 2500) {
    let stopped = false;
    let running = false;
    const tick = async () => {
        if (stopped || running || document.hidden) return;
        running = true;
        try { await fetchFn(); }
        catch (error) { console.warn('[RIDE-RTREE] Polling failed:', error); }
        finally { running = false; }
    };
    tick();
    const timer = window.setInterval(tick, Math.max(1000, intervalMs));
    return () => { stopped = true; window.clearInterval(timer); };
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
}
function formatKm(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(2)} km` : '—';
}
function formatMs(value) {
    return Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)} ms` : '—';
}
function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}
function showNotice(element, message, type = 'info') {
    if (!element) return;
    element.textContent = message;
    element.className = `notice notice-${type}`;
    element.hidden = false;
}
function hideNotice(element) { if (element) element.hidden = true; }
function normalizeArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.drivers)) return payload.drivers;
    if (payload && Array.isArray(payload.rides)) return payload.rides;
    if (payload && Array.isArray(payload.results)) return payload.results;
    if (payload && Array.isArray(payload.points)) return payload.points;
    return [];
}
function validLatLng(item) {
    return item && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng));
}
