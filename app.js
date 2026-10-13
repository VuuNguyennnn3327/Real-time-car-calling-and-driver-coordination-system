// Hàm nạp và hiển thị toàn bộ dữ liệu tài xế & cuốc xe
async function loadDashboardData() {
    try {
        // 1. Tải dữ liệu từ tệp JSON mẫu
        let response = await fetch('../data/sample/drivers.json');
        if (!response.ok) {
            response = await fetch('data/sample/drivers.json'); // Dự phòng đường dẫn tương đối
        }
        const drivers = await response.json();

        // 2. Cập nhật thẻ thống kê Tổng Tài Xế (sử dụng đúng ID: totalDriversCount)
        const totalDriversEl = document.getElementById('totalDriversCount');
        if (totalDriversEl) {
            totalDriversEl.innerText = drivers.length;
        }

        // 3. Tính và cập nhật số Cuốc Xe Hoạt Động (sử dụng đúng ID: activeRidesCount)
        // Kiểm tra các trạng thái xe bận/đang chạy cuốc (IN_TRIP, BUSY, ACCEPTED)
        const activeDrivers = drivers.filter(d => {
            const status = String(d.status || '').toUpperCase();
            return status === 'IN_TRIP' || status === 'BUSY' || status === 'ACCEPTED' || status === 'ON_TRIP';
        });

        const activeTripsEl = document.getElementById('activeRidesCount');
        if (activeTripsEl) {
            activeTripsEl.innerText = activeDrivers.length;
        }

        // 4. Render danh sách tài xế/cuốc xe vào bảng (sử dụng đúng ID: ridesTableBody)
        const tripTableBody = document.getElementById('ridesTableBody');
        if (tripTableBody) {
            if (drivers.length === 0) {
                tripTableBody.innerHTML = '<tr><td colspan="3">Chưa có cuốc xe nào</td></tr>';
            } else {
                tripTableBody.innerHTML = drivers.map(driver => `
                    <tr>
                        <td>${driver.id || driver.driver_id || '---'}</td>
                        <td><span class="status-badge ${driver.status}">${driver.status || 'UNKNOWN'}</span></td>
                        <td>${driver.name || driver.driver_name || 'Tài xế'}</td>
                    </tr>
                `).join('');
            }
        }

        // 5. Vẽ Marker lên bản đồ
        drivers.forEach(driver => {
            const lat = Number(driver.lat ?? driver.latitude ?? driver.y);
            const lng = Number(driver.lng ?? driver.longitude ?? driver.x);

            if (Number.isFinite(lat) && Number.isFinite(lng) && typeof map !== 'undefined') {
                const marker = L.marker([lat, lng]).addTo(map);
                marker.bindPopup(`<b>${driver.name || 'Tài xế'}</b><br>ID: ${driver.id}<br>Trạng thái: ${driver.status}`);
            }
        });

    } catch (error) {
        console.error('Lỗi nạp dữ liệu dashboard:', error);
    }
}

// Khởi chạy sau khi tải trang
document.addEventListener('DOMContentLoaded', loadDashboardData);