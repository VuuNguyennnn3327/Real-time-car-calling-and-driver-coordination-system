/**
 * @file app.js
 * @author Dương (Người phụ trách)
 * @brief Chứa các hàm dùng chung: gọi Polling API, xử lý dữ liệu và hỗ trợ Leaflet.
 *
 * HƯỚNG DẪN DÀNH CHO AI KHI THỰC HIỆN FILE NÀY:
 * - Nguyên tắc: Realtime được cài đặt thuần túy bằng Polling (setInterval gọi fetch API).
 * - Cài đặt hàm apiGet(endpoint) và apiPost(endpoint, data).
 * - Cung cấp hàm pollEndpoint(endpoint, intervalMs, callback).
 */

const API_BASE = 'http://localhost:8080/api';

async function apiGet(endpoint) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn(`Lỗi khi gọi API GET ${endpoint}:`, err);
        return null;
    }
}

async function apiPost(endpoint, data) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn(`Lỗi khi gọi API POST ${endpoint}:`, err);
        return null;
    }
}

// Bắt đầu vòng lặp Polling
function startPolling(fetchFn, intervalMs = 2500) {
    fetchFn();
    return setInterval(fetchFn, intervalMs);
}
