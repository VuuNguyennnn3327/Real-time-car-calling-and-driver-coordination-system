# Navigo ⚡
> **“Di chuyển xanh thuần điện — GSM”**

Hệ thống đặt xe thuần điện trực tuyến & điều phối tài xế thời gian thực bằng xe Navigo (VF 5 Plus, VF e34, VF 8, Feliz S, Evo200) - Ứng dụng cấu trúc dữ liệu không gian R-Tree và giải thuật tối ưu lộ trình Dijkstra.

---

## 🌟 Giới thiệu tổng quan

**Navigo** là nền tảng di chuyển thuần điện 100% đầu tiên tại Việt Nam, kết hợp giải thuật không gian hiện đại và công nghệ đồng bộ đám mây thời gian thực:
- **Đồng bộ thời gian thực 24/7 (Realtime Cloud Sync)**: Tích hợp **Firebase Realtime Database** đảm bảo khách hàng đặt chuyến và tài xế nhận chuyến tức thì giữa các thiết bị khác nhau (PC Desktop, Điện thoại di động, Tablet) mà không cần cài đặt phức tạp.
- **Giải thuật không gian (Spatial Indexing)**: Mô phỏng cấu trúc **R-Tree** giúp lập chỉ mục không gian hai chiều, tối ưu hóa thuật toán tìm $k$ tài xế lân cận ($k$-Nearest Neighbors) trong bán kính đón khách.
- **Định tuyến & Lộ trình thông minh (Routing Engine)**: Ứng dụng giải thuật **Dijkstra** trên đồ thị mạng lưới giao thông thực tế TP. Hồ Chí Minh kết hợp OpenStreetMap/OSRM cho cự ly và thời gian chính xác theo thời gian thực.
- **Hệ sinh thái di chuyển xanh thuần điện**: Tích hợp danh mục xe điện Navigo, tra cứu mạng lưới **Trạm sạc V-GREEN** và kết nối tuyến xe buýt điện thông minh **VinBus**.

---

## 🚀 Danh mục dịch vụ Navigo

### 1. Dành cho Khách hàng (`frontend/pages/customer.html`)
- **Twin-Inputs Tìm kiếm**: Tự động gợi ý điểm đón & điểm đến tại TP.HCM, lọc tức thì theo từ khóa.
- **Xác nhận Điểm đón trên Bản đồ**: Ghim trung tâm động màu Xanh Ngọc Teal, định vị GPS một chạm, tùy chọn cuốc xe (*Chuyến đi yên lặng*, *Xuất hóa đơn VAT cho công ty*).
- **Đội xe thuần điện Navigo & Ước tính cước minh bạch**:
  - 🛵 **Navigo Bike**: Navigo Feliz S / Evo200 — Di chuyển linh hoạt, mũ sạch thơm mát, không mùi xăng dầu.
  - 🚗 **Navigo Taxi**: Navigo VF 5 Plus / VF e34 — Êm ái, tiện nghi 4-5 chỗ, máy lạnh mát mẻ.
  - 🚘 **Navigo Luxury**: Navigo VF 8 — SUV cao cấp 5 sao, tài xế vest lịch thiệp, nước uống khăn lạnh riêng biệt.
  - 🚐 **Navigo Taxi 7 chỗ**: Navigo VF 9 — Rộng rãi cho gia đình và nhóm bạn.
  - ⚡ **Bản đồ Trạm sạc V-GREEN**: Tra cứu các cổng sạc nhanh/siêu nhanh 30kW - 250kW rảnh quanh khu vực.
- **Theo dõi Trực tiếp 24/7**: Radar quét tài xế, mô phỏng xe điện di chuyển thực tế trên bản đồ Leaflet theo dải màu cyan teal của lộ trình.

### 2. Dành cho Đối tác Tài xế (`frontend/pages/driver.html`)
- **Bật / Tắt Trực tuyến**: Cập nhật trạng thái sẵn sàng đón khách ngay trên hệ thống đám mây.
- **Quản lý Xe điện & Pin (SOC %)**: Hiển thị dung lượng pin còn lại, chỉ số $CO_2$ tiết kiệm và doanh thu thực tế.
- **Nhận Cuốc xe Tức thì**: Modal phát sóng cuốc xe hiển thị rõ lộ trình đón - trả, khoảng cách và giá cước.
- **Dẫn đường & Cập nhật Trạng thái**: Bắt đầu đón khách -> Đã đến điểm đón -> Đang chở khách -> Hoàn thành chuyến đi.

### 3. Dành cho Quản trị viên (`frontend/pages/admin.html`)
- **Thống kê Tổng quan**: Doanh thu, số cuốc xe thành công, số lượng xe điện lưu thông, lượng $CO_2$ giảm thiểu.
- **Bản đồ Giám sát Toàn thành phố**: Theo dõi trực tiếp vị trí các phương tiện xanh đang lưu thông.
- **Quản lý Cuốc xe**: Danh sách toàn bộ các chuyến xe theo thời gian thực.

---

## 🎨 Hệ thống nhận diện & Thiết kế lõi (Design System Core)

- **Primary Cyan Teal (`#00B1A9`)**: Màu xanh ngọc lục lam đặc trưng cho di chuyển xanh thuần điện.
- **Primary Dark Navy (`#0F2D3C`)**: Xanh biển sẫm cho header, tiêu đề và button chính.
- **Surface & Background (`#F7F9FA` & `#FFFFFF`)**: Nền sáng tối giản giúp bản đồ và thông tin nổi bật.
- **Ngôn ngữ hình khối Squircle**: Bo góc mềm mại từ `12px` đến `24px` mô phỏng nóc xe khí động học Navigo.
- **Đáp ứng đa thiết bị**: Hỗ trợ toàn diện giao diện Điện thoại (Floating Bottom Sheet kéo thả 3 nấc), Máy tính bảng (Master-Detail 38/62%) và Máy tính để bàn (Split Dashboard).

---

## 📂 Cấu trúc thư mục dự án

```text
.
├── CMakeLists.txt          # Cấu hình build C++17 cho DSA backend
├── backend/                # Mã nguồn C++ (Dijkstra, R-Tree, Road Graph)
├── database/               # SQLite schema
├── data/                   # Dữ liệu mạng lưới giao thông TP.HCM (OSM)
├── .gitignore              # Cấu hình loại bỏ file tạm
├── README.md               # Tài liệu dự án Navigo
└── frontend/               # Giao diện Web App tương tác
    ├── index.html          # Trang chủ ứng dụng Navigo (Landing & Services)
    ├── css/                # Hệ thống CSS Design Tokens chuẩn Navigo
    │   ├── design-system.css
    │   ├── components.css
    │   ├── layout.css
    │   └── responsive.css
    ├── js/
    │   ├── core/           # Quản lý phiên, Router, Demo Adapter, Firebase Realtime
    │   ├── customer/       # Cổng đặt xe khách hàng (Quản lý vòng đời cuốc xe)
    │   ├── driver/         # Cổng đối tác tài xế xe điện
    │   ├── admin/          # Bảng điều khiển quản trị viên
    │   └── map/            # Điều khiển bản đồ Leaflet & hiển thị xe điện
    └── pages/
        ├── customer.html   # Giao diện đặt xe khách hàng
        ├── driver.html     # Cổng đối tác tài xế
        ├── admin.html      # Bảng điều khiển quản trị viên
        ├── login.html      # Đăng nhập tài khoản
        ├── register.html   # Đăng ký tài khoản
        ├── profile.html    # Hồ sơ người dùng
        └── dsa-demo.html   # Mô phỏng thuật toán DSA
```

---

## ⚡ Hướng dẫn khởi chạy

1. **Khởi chạy trực tiếp (Static Web / Vercel)**:
   - Mở trực tiếp file `frontend/index.html` hoặc file `index.html` tại thư mục gốc trên trình duyệt web bất kỳ.
   - Hoặc triển khai lên Vercel / Live Server: Ứng dụng tự động kết nối Firebase Realtime Database đám mây.

2. **Tài khoản trải nghiệm**:
   - Khách hàng: `customer@demo.com` (Mật khẩu bất kỳ)
   - Đối tác Tài xế: `driver@demo.com` (Mật khẩu bất kỳ)
   - Quản trị viên: `admin` (Mật khẩu: `admin`)
