/**
 * Navigo - Firebase Realtime Cloud Configuration
 * 
 * HƯỚNG DẪN DÀNH CHO BẠN:
 * 1. Truy cập: https://console.firebase.google.com/
 * 2. Đăng nhập tài khoản Google -> Nhấn "Add project" (Tạo dự án mới, ví dụ: "navigo-realtime").
 * 3. Ở menu bên trái, chọn: Build -> Realtime Database -> Nhấn "Create Database".
 *    - Chọn vị trí (Location): Singapore (asia-southeast1) hoặc United States (us-central1).
 *    - Chọn "Start in test mode" (chế độ kiểm thử) để cho phép đọc/ghi dữ liệu.
 * 4. Vào mục Project Settings (biểu tượng bánh răng ⚙️ ở góc trên bên trái) -> General.
 * 5. Kéo xuống mục "Your apps" -> Nhấn biểu tượng Web (</>) -> Đặt tên app -> Nhấn "Register app".
 * 6. Copy đoạn `firebaseConfig` và dán vào bên dưới (giữa dấu ngoặc nhọn `{ ... }`).
 */

const NAVIGO_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDuYr444z8n_zZsB9JjFfww9NGqz6j6y90",
    authDomain: "navigo-app-cc7cf.firebaseapp.com",
    databaseURL: "https://navigo-app-cc7cf-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "navigo-app-cc7cf",
    storageBucket: "navigo-app-cc7cf.firebasestorage.app",
    messagingSenderId: "773459543553",
    appId: "1:773459543553:web:9eaa99c09af8c1ef82a200",
    measurementId: "G-B0P9Y00S64"
};

const GORIDE_FIREBASE_CONFIG = NAVIGO_FIREBASE_CONFIG;

// Auto-load config from localStorage if user configured it via Web UI
if (typeof window !== 'undefined') {
    try {
        const stored = localStorage.getItem('navigo_firebase_config') || localStorage.getItem('goride_firebase_config');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && (parsed.databaseURL || parsed.projectId || parsed.apiKey)) {
                Object.assign(NAVIGO_FIREBASE_CONFIG, parsed);
            }
        }
    } catch (e) {}

    window.NAVIGO_FIREBASE_CONFIG = NAVIGO_FIREBASE_CONFIG;
    window.GORIDE_FIREBASE_CONFIG = NAVIGO_FIREBASE_CONFIG;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NAVIGO_FIREBASE_CONFIG, GORIDE_FIREBASE_CONFIG };
}
