# Navigo 🚗
> **“Dẫn lối chuẩn xác, đón rước tận nơi”**

Hệ thống đặt xe trực tuyến & điều phối tài xế thời gian thực - Đồ án môn Cấu trúc Dữ liệu và Giải thuật (DSA).

---

## 🌟 Giới thiệu tổng quan

**Navigo** là nền tảng đặt xe thông minh đa phương thức kết hợp giải thuật không gian hiện đại và công nghệ đồng bộ đám mây thời gian thực:
- **Đồng bộ thời gian thực 24/7 (Realtime Cloud Sync)**: Tích hợp **Firebase Realtime Database** đảm bảo khách hàng đặt chuyến và tài xế nhận chuyến tức thì giữa các thiết bị khác nhau (PC, Điện thoại di động, Tablet) mà không cần cài đặt phức tạp.
- **Giải thuật không gian (Spatial Indexing)**: Mô phỏng cấu trúc **R-Tree** giúp lập chỉ mục không gian hai chiều, tối ưu hóa thuật toán tìm $k$ tài xế lân cận ($k$-Nearest Neighbors) trong bán kính đón khách.
- **Định tuyến & Lộ trình thông minh (Routing Engine)**: Ứng dụng giải thuật **Dijkstra** trên đồ thị mạng lưới giao thông thực tế TP. Hồ Chí Minh kết hợp OpenStreetMap/OSRM cho cự ly và thời gian chính xác theo thời gian thực.

---

## 🚀 Tính năng nổi bật

### 1. Dành cho Khách hàng (`frontend/pages/customer.html`)
- **Twin-Inputs Tìm kiếm**: Tự động gợi ý điểm đón & điểm đến tại TP.HCM, lọc tức thì theo từ khóa.
- **Xác nhận Điểm đón trên Bản đồ**: Ghim trung tâm động, định vị GPS một chạm, tùy chọn cuốc xe (*Chuyến đi yên lặng*, *Hành lý cồng kềnh*).
- **Đa dạng Phương tiện & Ước tính Cước**:
  - 🛵 **Navigo Bike**: Tiết kiệm, luồn lách nhanh trong đô thị.
  - 🚗 **Navigo Car (4 chỗ)**: Êm ái, tiện lợi, điều hòa mát lạnh.
  - 🚘 **Navigo Plus**: Xe sang cao cấp, tài xế 5 sao.
  - 🚐 **Navigo XL (7 chỗ)**: Rộng rãi cho gia đình và nhóm bạn.
- **Theo dõi Trực tiếp 24/7**: Radar quét tài xế, mô phỏng xe tài xế di chuyển thực tế trên bản đồ Leaflet theo polyline tuyến đường.

### 2. Dành cho Đối tác Tài xế (`frontend/pages/driver.html`)
- **Bật / Tắt Trực tuyến**: Cập nhật trạng thái sẵn sàng đón khách ngay trên hệ thống đám mây.
- **Nhận Cuốc xe Tức thì**: Modal phát sóng cuốc xe hiển thị rõ lộ trình đón - trả, khoảng cách và giá cước.
- **Dẫn đường & Cập nhật Trạng thái**: Bắt đầu đón khách -> Đã đến điểm đón -> Đang chở khách -> Hoàn thành chuyến đi.

### 3. Dành cho Quản trị viên (`frontend/pages/admin.html`)
- **Thống kê Tổng quan**: Doanh thu, số cuốc xe thành công, số tài xế trực tuyến, tỷ lệ hoàn thành.
- **Bản đồ Giám sát Toàn thành phố**: Theo dõi trực tiếp vị trí các phương tiện đang lưu thông.
- **Quản lý Cuốc xe**: Danh sách toàn bộ các chuyến xe theo thời gian thực.

---

## 📂 Cấu trúc thư mục dự án

```text
.
├── CMakeLists.txt          # Cấu hình build C++17 cho DSA backend
├── backend/                # Mã nguồn C++ (Dijkstra, R-Tree, Road Graph)
├── database/               # SQLite schema
├── data/                   # Dữ liệu mạng lưới giao thông TP.HCM (OSM)
├── .gitignore              # Cấu hình loại bỏ file tạm và báo cáo AI
├── README.md               # Tài liệu hướng dẫn dự án
└── frontend/               # Giao diện Web App tương tác
    ├── index.html          # Trang chủ ứng dụng (App Home)
    ├── pages/
    │   ├── customer.html   # Giao diện đặt xe khách hàng
    │   ├── driver.html     # Cổng đối tác tài xế
    │   ├── admin.html      # Bảng điều khiển quản trị viên
    │   ├── login.html      # Đăng nhập tài khoản
    │   ├── register.html   # Đăng ký tài khoản
    │   ├── profile.html    # Hồ sơ người dùng
    │   └── dsa-demo.html   # Mô phỏng thuật toán DSA
    ├── css/                # Hệ thống CSS Design System chuẩn mực
    └── js/                 # Bộ điều khiển Javascript & Firebase Realtime
        ├── core/
        │   ├── firebase-config.js  # Cấu hình đám mây Firebase Realtime
        │   ├── realtime.js         # Động cơ đồng bộ hai chiều 24/7
        │   ├── api.js              # REST API Client
        │   ├── session.js          # Quản lý phiên đăng nhập
        │   └── app.js              # Khởi tạo App & Utilities
        ├── customer/               # Điều phối giao diện khách hàng
        ├── driver/                 # Điều phối giao diện tài xế
        └── admin/                  # Điều phối giao diện quản trị
```

---

## 🛠️ Hướng dẫn Khởi chạy Nhanh

### Cách 1: Chạy trực tiếp trên trình duyệt
1. Mở file `frontend/index.html` hoặc `frontend/pages/customer.html` bằng bất kỳ trình duyệt nào.
2. Hệ thống đã được tích hợp sẵn cấu hình đám mây Firebase Realtime, tự động kết nối và đồng bộ 24/7.

### Cách 2: Chạy với Local Server
```bash
# Sử dụng Python
python -m http.server 8080

# Hoặc sử dụng Node.js
npx serve .
```
Truy cập: `http://localhost:8080`

---

## 👥 Tài khoản Demo dùng thử

| Vai trò | Email đăng nhập | Mật khẩu |
|---|---|---|
| **Khách hàng** | `customer@demo.com` | `123456` (hoặc bất kỳ) |
| **Tài xế** | `driver@demo.com` | `123456` (hoặc bất kỳ) |
| **Quản trị viên** | `admin@demo.com` | `123456` (hoặc bất kỳ) |

---

## 📜 Giấy phép
DSA Course Project - Phục vụ mục đích học tập và nghiên cứu.
