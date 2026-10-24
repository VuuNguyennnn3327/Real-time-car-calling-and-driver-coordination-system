# ⚡ NAVIGO — Hệ Thống Đặt Xe Thuần Điện & Điều Phối Thời Gian Thực

> **Nền tảng di chuyển xanh thuần điện 100% tích hợp cấu trúc dữ liệu không gian R-Tree và giải thuật định tuyến Dijkstra trên mạng lưới giao thông thực tế TP. Hồ Chí Minh.**

[![C++ Standard](https://img.shields.io/badge/C%2B%2B-17-00599C?logo=c%2B%2B)](https://isocpp.org/)
[![Build System](https://img.shields.io/badge/Build-CMake%203.16%2B-064F8C?logo=cmake)](https://cmake.org/)
[![Database](https://img.shields.io/badge/Database-SQLite3-003B57?logo=sqlite)](https://www.sqlite.org/)
[![Cloud Sync](https://img.shields.io/badge/Realtime-Firebase%209.x-FFCA28?logo=firebase)](https://firebase.google.com/)
[![Map Engine](https://img.shields.io/badge/Map-Leaflet%201.9-199900?logo=leaflet)](https://leafletjs.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📑 Mục lục
1. [🌟 Giới thiệu tổng quan](#-giới-thiệu-tổng-quan)
2. [📐 Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
3. [🧠 Cấu trúc dữ liệu & Giải thuật lõi (DSA Engine)](#-cấu-trúc-dữ-liệu--giải-thuật-lõi-dsa-engine)
4. [📱 Các phân hệ chức năng](#-các-phân-hệ-chức-năng)
   - [Cổng Khách hàng (Customer Portal)](#1-cổng-khách-hàng-customer-portal)
   - [Cổng Tài xế đối tác (Driver Portal)](#2-cổng-tài-xế-đối-tác-driver-portal)
   - [Cổng Quản trị viên (Admin Dashboard)](#3-cổng-quản-trị-viên-admin-dashboard)
   - [Hệ sinh thái Ví điện tử NaviPay](#4-hệ-sinh-thái-ví-điện-tử-navipay)
5. [🎨 Hệ thống thiết kế UI/UX (GSM Design System)](#-hệ-thống-thiết-kế-uiux-gsm-design-system)
6. [📂 Cấu trúc thư mục dự án](#-cấu-trúc-thư-mục-dự-án)
7. [🛠️ Hướng dẫn cài đặt & Khởi chạy](#️-hướng-dẫn-cài-đặt--khởi-chạy)
8. [🧪 Bộ kiểm thử tự động (Automated Test Suites)](#-bộ-kiểm-thử-tự-động-automated-test-suites)
9. [🔑 Tài khoản demo nghiệm thu](#-tài-khoản-demo-nghiệm-thu)

---

## 🌟 Giới thiệu tổng quan

**Navigo** (CarDSA) là giải pháp phần mềm kết hợp giữa **Khoa học máy tính chuyên sâu (Data Structures & Algorithms - DSA)** và **Kỹ thuật phát triển Web thời gian thực hiện đại**. Dự án lấy cảm hứng từ hệ sinh thái taxi và xe máy điện thông minh (VinFast / GSM Xanh SM), mang đến trải nghiệm đặt xe mượt mà, minh bạch và thân thiện với môi trường.

### Điểm nổi bật công nghệ:
- **Xử lý không gian hiệu năng cao**: Tự thiết kế và cài đặt cấu trúc **R-Tree** & **Spatial Grid** bằng C++17 giúp tìm kiếm tài xế lân cận ($k$-Nearest Neighbors) trong thời gian $O(\log N)$ thay vì quét tuần tự $O(N)$.
- **Định tuyến đường bộ thực tế**: Giải thuật **Dijkstra** kết hợp hàng đợi ưu tiên (Min-Heap / `std::priority_queue`) tính toán lộ trình ngắn nhất trên đồ thị hơn 10.000 nút giao của bản đồ OpenStreetMap (OSM) TP.HCM.
- **Đồng bộ đám mây đa thiết bị 24/7**: Tích hợp **Firebase Realtime Database** song song với Local Storage giúp khách đặt xe trên điện thoại và tài xế nhận cuốc trên máy tính/máy tính bảng diễn ra tức thời theo cơ chế Reactive Event-Driven.
- **Ví điện tử NaviPay**: Mô phỏng giải pháp thanh toán không tiền mặt toàn diện (Nạp tiền, rút về ATM ngân hàng số, quét và tạo mã QR, bảo mật giao dịch).
- **Trải nghiệm người dùng cao cấp**: Hiệu ứng chuyển trang mượt (View Transitions API + Link Prefetching), thanh điều hướng nổi kính mờ (Floating Glass Capsule) cùng thiết kế đa nền tảng Responsive (Desktop, Tablet, Mobile).

---

## 📐 Kiến trúc hệ thống

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (FRONTEND)                         │
│   Desktop Web / Tablet / Mobile (Responsive HTML5, CSS3, ES6+ JS)      │
│                                                                        │
│  [ Khách hàng ]           [ Tài xế đối tác ]          [ Quản trị viên ]│
│  customer.html               driver.html                 admin.html    │
│  - Tìm kiếm & ghim map      - Bật/tắt trực tuyến        - Giám sát xe  │
│  - Chọn xe & cước phí       - Nhận/từ chối cuốc         - Thống kê     │
│  - Live trip tracking       - Dẫn đường Dijkstra        - Phát ưu đãi  │
│                                                                        │
│                 [ Ví NaviPay & Ngân hàng số liên kết ]                 │
│                 wallet.html  •  navipay-bank.html                      │
└───────────────────────────────┬────────────────────────────────────────┘
                                │ (Fetch REST API / WebSocket / Realtime)
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      REALTIME & API GATEWAY LAYER                      │
│                                                                        │
│   ┌──────────────────────────────┐    ┌────────────────────────────┐   │
│   │   Firebase Realtime Cloud    │    │  Native C++ HTTP Server    │   │
│   │   - Dispatching Events       │    │  - Port: 8080 (WinSock2)   │   │
│   │   - Driver Location Telemetry│    │  - Multi-threaded Worker   │   │
│   │   - Cross-device Instant Sync│    │  - RESTful JSON Endpoints  │   │
│   └──────────────────────────────┘    └──────────────┬─────────────┘   │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │
                                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    DSA ENGINE & CORE SERVICES (C++17)                  │
│                                                                        │
│  ┌─────────────────────────┐   ┌────────────────────────────────────┐  │
│  │   Spatial Indexing      │   │   Routing Engine                   │  │
│  │   - 2D R-Tree & Grid    │   │   - RoadGraph (OSM HCMC Dataset)   │  │
│  │   - k-NN Driver Search  │   │   - Dijkstra Shortest Path         │  │
│  │   - Bounding Box Prune  │   │   - Priority Queue Min-Heap        │  │
│  └─────────────────────────┘   └────────────────────────────────────┘  │
│  ┌─────────────────────────┐   ┌────────────────────────────────────┐  │
│  │   Trip Service (FSM)    │   │   Authentication & Storage         │  │
│  │   - Trip Lifecycle FSM  │   │   - Role-Based Access Control      │  │
│  │   - Dynamic Fare Engine │   │   - SQLite3 Relational Engine      │  │
│  └─────────────────────────┘   └────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Cấu trúc dữ liệu & Giải thuật lõi (DSA Engine)

### 1. Cấu trúc cây không gian R-Tree (Spatial Indexing)
- **Vấn đề**: Khi có hàng ngàn tài xế di chuyển liên tục, việc tìm $k$ tài xế gần nhất với khách hàng bằng phương pháp duyệt vét cạn sẽ tốn $O(N)$ cho mỗi yêu cầu đặt xe.
- **Giải pháp**: Cài đặt cấu trúc dữ liệu **R-Tree** phân chia không gian thành các hình hộp bao chữ nhật tối thiểu (**Minimum Bounding Boxes - MBR**):
  - Mỗi nút lá chứa tọa độ địa lý $(\text{lat}, \text{lng})$ và định danh xe.
  - Mỗi nút trong chứa MBR bao bọc tất cả các nút con.
  - Thuật toán tìm kiếm sử dụng **Best-First Search** kết hợp hàng đợi ưu tiên theo khoảng cách nhỏ nhất từ điểm đón đến MBR (`minDist`), giảm độ phức tạp xuống xấp xỉ $O(\log N)$.

### 2. Thuật toán Dijkstra trên đồ thị giao thông thực tế (Shortest Path)
- **Biểu diễn đồ thị**: Lớp `RoadGraph` đọc và phân tích mạng lưới đường bộ TP.HCM từ dữ liệu OpenStreetMap (`data/osm/processed/hcmc_roads.json`) thành danh sách kề (`std::vector<std::vector<Edge>>`).
- **Trọng số động**: Khoảng cách đường đi thực tế tính theo công thức cự ly mặt cầu **Haversine**:
  $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
- **Tối ưu hóa**: Dijkstra sử dụng cấu trúc `std::priority_queue<std::pair<double, int>, ..., std::greater>` (Min-Heap) để đạt độ phức tạp thời gian $O((V + E) \log V)$, xuất ra danh sách tọa độ Polyline dẫn đường chính xác từng khúc cua.

### 3. Máy trạng thái hữu hạn cho vòng đời chuyến đi (Finite State Machine - FSM)
Vòng đời mỗi chuyến đi được kiểm soát nghiêm ngặt nhằm tránh race condition giữa các thiết bị:
$$\text{IDLE} \xrightarrow{\text{Yêu cầu}} \text{REQUESTED} \xrightarrow{\text{Nhận cuốc}} \text{ACCEPTED} \xrightarrow{\text{Đến điểm đón}} \text{ARRIVED} \xrightarrow{\text{Đón khách}} \text{IN\_PROGRESS} \xrightarrow{\text{Trả khách}} \text{COMPLETED}$$

---

## 📱 Các phân hệ chức năng

### 1. Cổng Khách hàng (`customer.html`)
- **Twin-Inputs Search Bar**: Nhập điểm đón & điểm đến với tính năng tự động gợi ý tức thì, hoán đổi 2 chiều và xóa nhanh.
- **Xác nhận điểm đón trên bản đồ**: Di chuyển ghim đón/trả trực tiếp trên nền Google Maps VN; tự động đảo ngược tọa độ thành địa chỉ đọc được (Reverse Geocoding).
- **Hệ thống phân hạng xe điện**:
  - 🛵 **Navigo Bike**: Xe máy điện thông minh Feliz S / Evo200.
  - 🚗 **Navigo Taxi (4 chỗ)**: VF 5 Plus / VF e34 tiện nghi, êm ái.
  - 🚘 **Navigo Luxury**: SUV cao cấp 5 sao VF 8 sang trọng.
  - 🚐 **Navigo Taxi (7 chỗ)**: Không gian rộng rãi cho gia đình VF 9.
- **Ước tính cước & Khuyến mãi**: Hiển thị bảng giá minh bạch, cước cũ gạch ngang khi áp dụng mã giảm giá (`NAVIGO20`, `NAVIGO25`, `NAVIGO50`, đối tác `Vietnam Airlines`).
- **Thanh toán linh hoạt**: Tùy chọn tiền mặt hoặc trừ trực tiếp số dư khả dụng qua Ví điện tử NaviPay.
- **Theo dõi hành trình thực tế**: Radar quét tài xế lân cận, mô phỏng xe chạy theo thời gian thực dọc theo tuyến đường Dijkstra, nút gọi điện và nhắn tin trực tiếp với tài xế.

### 2. Cổng Tài xế đối tác (`driver.html`)
- **Quản lý trạng thái**: Nút gạt chuyển đổi trạng thái Bật / Tắt trực tuyến (Online / Offline).
- **Bộ đếm xe điện & Môi trường**: Theo dõi dung lượng pin (% SOC), chỉ số tiết kiệm phát thải $CO_2$ tích lũy và thu nhập ngày.
- **Phát sóng nhận cuốc tức thì (Realtime Dispatch Offer)**: Hộp thoại nổi đếm ngược 15 giây hiển thị chi tiết điểm đón, điểm trả, khoảng cách và giá tiền trước khi nhận.
- **Bản đồ tác nghiệp tài xế**: Toàn màn hình với tính năng tự động định vị lại GPS, hiển thị lộ trình đón khách và lộ trình chở khách.
- **Cập nhật tiến trình**: Thao tác lần lượt qua các nút "Đã đến điểm đón" -> "Bắt đầu chuyến đi" -> "Hoàn thành chuyến".

### 3. Cổng Quản trị viên (`admin.html`)
- **Dashboard tổng quan**: Thống kê số lượng chuyến xe hoàn thành, tổng doanh thu hệ thống, số phương tiện đang hoạt động và tổng lượng phát thải $CO_2$ cắt giảm.
- **Bản đồ không gian thành phố (Spatial Map)**: Giám sát toàn cảnh vị trí các tài xế đối tác theo thời gian thực trên khắp các quận huyện TP.HCM.
- **Quản lý danh sách chuyến đi**: Bảng tra cứu, lọc chuyến xe theo thời gian thực và trạng thái.
- **Trung tâm thông báo & Sự kiện**: Tính năng phát tin tức ưu đãi toàn hệ thống cho tài xế và khách hàng.
- **Đồng bộ hóa đám mây**: Modal kiểm tra trạng thái kết nối Firebase và nút nạp dữ liệu mẫu tức thì.

### 4. Hệ sinh thái Ví điện tử NaviPay (`wallet.html` & `navipay-bank.html`)
- **Thẻ định danh số NaviPay**: Hiển thị số dư khả dụng, mã thẻ cá nhân hóa.
- **Nạp tiền (Deposit)**: Đa dạng hạn mức (50k, 100k, 200k, 500k, 1M, 2M) qua cổng ngân hàng số.
- **Rút tiền (Withdraw)**: Rút tiền về tài khoản ATM ngân hàng thụ hưởng liên kết với mật mã xác nhận.
- **Quét & Tạo mã QR Code**:
  - Quét mã QR hóa đơn thanh toán thông qua camera máy tính/điện thoại bằng thư viện `Html5Qrcode`.
  - Tạo mã QR thanh toán cá nhân chuẩn tĩnh/động bằng `QRCode.js`.
- **Lịch sử giao dịch thông minh**: Phân loại tiền vào (+) màu xanh lục và tiền ra (-) màu đỏ kèm mốc thời gian chi tiết.

---

## 🎨 Hệ thống thiết kế UI/UX (GSM Design System)

Giao diện Navigo được xây dựng theo tiêu chuẩn ngôn ngữ thiết kế **Pure EV Modern Glassmorphism**:
- **Bảng màu chủ đạo**:
  - `Primary Cyan Teal` (`#00B1A9`): Tượng trưng cho năng lượng sạch và phát triển bền vững.
  - `Dark Navy` (`#0F2D3C`): Màu xanh biển sẫm lịch lãm, gia tăng độ tương phản và chiều sâu.
  - `Surface White` (`#FFFFFF`): Tối giản, tập trung vào nội dung và bản đồ.
- **Thanh điều hướng dưới dạng viên nang kính mờ (`.gsm-floating-bottom-nav`)**:
  - Thiết kế nổi độc quyền với độ mờ hậu cảnh (`backdrop-filter: blur(28px)`).
  - Tích hợp nút **Trophy Orb** phát sáng dẫn đến chương trình tích điểm thưởng và ưu đãi Navigo Race.
- **Thiết kế Responsive đa thiết bị**:
  - **Mobile (< 768px)**: Tối ưu hóa điều hướng một tay, Bottom Sheet kéo vuốt thông minh.
  - **Tablet (768px - 1024px)**: Bố cục cân đối, thanh điều hướng thích ứng không bị vỡ layout.
  - **Desktop (>= 1025px)**: Phân tách trực quan giữa Sidebar tác vụ bên trái và Canvas bản đồ tương tác toàn màn hình bên phải.
- **Hiệu ứng chuyển trang**: Tích hợp `setupSmoothPageTransitions` tạo cảm giác liền mạch giữa các trang như một ứng dụng Native App thực thụ.

---

## 📂 Cấu trúc thư mục dự án

```text
CarDSA/
├── CMakeLists.txt              # Cấu hình biên dịch C++17 và các test suite
├── README.md                   # Tài liệu hướng dẫn toàn diện dự án
├── .gitignore                  # Cấu hình loại trừ file nhị phân & file tạm
│
├── backend/                    # Core DSA & Backend C++
│   ├── main.cpp                # Điểm khởi chạy HTTP Server
│   ├── include/                # Header files (.h)
│   │   ├── road_graph.h        # Khai báo đồ thị giao thông OSM
│   │   ├── dijkstra.h          # Giải thuật tìm đường ngắn nhất
│   │   ├── spatial_grid.h      # Lưới không gian & R-Tree index
│   │   ├── r_tree.h            # Cấu trúc dữ liệu cây R-Tree
│   │   ├── http_server.h       # HTTP Server đa luồng (WinSock/POSIX)
│   │   ├── database.h          # Tương tác cơ sở dữ liệu SQLite3
│   │   ├── auth_service.h      # Xác thực & phân quyền RBAC
│   │   └── trip_service.h      # Quản lý vòng đời chuyến đi
│   └── src/                    # Triển khai mã nguồn C++ (.cpp)
│
├── database/                   # Cơ sở dữ liệu quan hệ
│   └── schema.sql              # Lược đồ bảng (users, trips, drivers, transactions)
│
├── data/                       # Dữ liệu mạng lưới giao thông
│   └── osm/processed/          # File đồ thị đường phố TP.HCM dạng JSON
│       └── hcmc_roads.json
│
├── tests/                      # Bộ kiểm thử tự động thuật toán C++
│   ├── test_road_graph.cpp     # Test nạp đồ thị & kết nối nút giao
│   ├── test_api_routing.cpp    # Test API tính toán lộ trình
│   ├── test_auth.cpp           # Test mã hóa mật khẩu & cấp quyền
│   ├── test_trip.cpp           # Test máy trạng thái chuyến đi
│   ├── test_trip_api.cpp       # Test bộ định tuyến REST API
│   └── test_r_tree.cpp         # Test chèn, xóa và k-NN trên R-Tree
│
├── index.html                  # Cổng điều hướng gốc (Chuyển tiếp loading)
│
└── frontend/                   # Giao diện ứng dụng Client
    ├── index.html              # Trang chủ ứng dụng Navigo (Dịch vụ & Đặt xe)
    ├── loading.html            # Màn hình Splash Screen xe điện
    │
    ├── assets/                 # Tài nguyên đồ họa & âm thanh
    │   └── gsm/                # Vector SVG xe điện (car_vf5, bike_feliz,...), icons
    │
    ├── css/                    # Hệ thống Style Sheets chuẩn hóa
    │   ├── design-system.css   # Biến màu sắc, khoảng cách, font chữ Tokens
    │   ├── components.css      # Nút bấm, bảng, thẻ thông tin, badge
    │   ├── layout.css          # Hệ thống lưới layout, khung hiển thị
    │   ├── responsive.css      # Định dạng thích ứng đa màn hình
    │   ├── gsm-app.css         # Phong cách Glassmorphism, thanh nav nổi
    │   └── loading-splash.css  # Animation cho màn hình tải
    │
    ├── js/                     # Logic phía máy khách
    │   ├── core/               # Lõi điều khiển
    │   │   ├── app.js          # Khởi tạo App & chuyển trang
    │   │   ├── session.js      # Đồng bộ trạng thái đăng nhập & Navbar
    │   │   ├── router.js       # Bộ định tuyến luồng trang
    │   │   ├── api.js          # Client gọi API backend C++
    │   │   ├── firebase-config.js # Cấu hình Firebase
    │   │   ├── realtime.js     # Đồng bộ thời gian thực đám mây
    │   │   ├── wallet.js       # Nghiệp vụ ví điện tử NaviPay
    │   │   ├── notifications.js# Quản lý thông báo
    │   │   └── geocoder.js     # Chuyển đổi tọa độ - địa chỉ
    │   ├── customer/           # Logic cổng khách hàng (customer.js)
    │   ├── driver/             # Logic cổng tài xế (driver.js)
    │   ├── admin/              # Logic cổng quản trị (admin.js)
    │   └── map/                # Bộ điều khiển bản đồ Leaflet & vẽ xe
    │
    └── pages/                  # Các trang màn hình chuyên biệt
        ├── customer.html       # Màn hình đặt xe & theo dõi chuyến đi
        ├── driver.html         # Màn hình nhận chuyến cho tài xế
        ├── admin.html          # Màn hình quản trị hệ thống
        ├── wallet.html         # Màn hình Ví điện tử NaviPay
        ├── navipay-bank.html   # Cổng ngân hàng số liên kết
        ├── activity.html       # Lịch sử hoạt động các cuốc xe
        ├── notifications.html  # Trung tâm thông báo & ưu đãi
        ├── profile.html        # Hồ sơ cá nhân & hội viên
        ├── login.html          # Đăng nhập hệ thống
        ├── register.html       # Đăng ký tài khoản mới
        └── dsa-demo.html       # Trang trực quan hóa thuật toán DSA
```

---

## 🛠️ Hướng dẫn cài đặt & Khởi chạy

### Cách 1: Khởi chạy trực tiếp Frontend (Nhanh nhất - Không cần biên dịch)
Toàn bộ hệ thống Client đã được tích hợp bộ mô phỏng dữ liệu thông minh và kết nối đám mây Firebase Realtime 24/7:
1. Mở file `index.html` (ở thư mục gốc) hoặc `frontend/index.html` bằng trình duyệt web bất kỳ (Chrome, Edge, Firefox, Safari).
2. Hoặc sử dụng tiện ích mở rộng **Live Server** trong VS Code hoặc triển khai trực tiếp lên **Vercel / GitHub Pages / Netlify**.
3. Bạn có thể mở đồng thời 2 tab trình duyệt (1 tab Khách hàng, 1 tab Tài xế) để trải nghiệm luồng đặt và nhận cuốc xe thời gian thực.

---

### Cách 2: Biên dịch và chạy trọn gói Backend C++ (Full-stack DSA Server)

#### Yêu cầu môi trường:
- **Trình biên dịch C++**: GCC / Clang hỗ trợ tiêu chuẩn C++17 trở lên (khuyến nghị MinGW-w64 trên Windows).
- **CMake**: Phiên bản 3.16 trở lên.
- **Thư viện SQLite3**: Đã cài đặt trong hệ thống (`sqlite3` / `winsqlite3`).

#### Các bước thực hiện:

1. **Mở Terminal hoặc Command Prompt tại thư mục dự án**:
   ```bash
   mkdir build
   cd build
   ```

2. **Cấu hình dự án với CMake**:
   - Trên Linux / macOS:
     ```bash
     cmake ..
     ```
   - Trên Windows (sử dụng MinGW):
     ```cmd
     cmake -G "MinGW Makefiles" ..
     ```

3. **Biên dịch toàn bộ hệ thống**:
   ```bash
   cmake --build .
   ```

4. **Khởi động máy chủ định tuyến C++ Backend**:
   - Nhị phân máy chủ sẽ được xuất ra tại thư mục `build/bin/`:
     ```bash
     ./bin/ride_rtree_server
     ```
   - Máy chủ sẽ lắng nghe tại cổng `http://localhost:8080`, nạp đồ thị bản đồ và sẵn sàng xử lý các truy vấn R-Tree / Dijkstra.

---

## 🧪 Bộ kiểm thử tự động (Automated Test Suites)

Hệ thống đi kèm 6 bộ kiểm thử tự động toàn diện được định nghĩa trong `CMakeLists.txt` nhằm kiểm chứng tính chính xác của các cấu trúc dữ liệu và giải thuật:

| Tên Test Case | Mô tả kiểm thử | File nguồn |
| :--- | :--- | :--- |
| `RTreeTest` | Đánh giá độ chính xác của cây R-Tree và thuật toán $k$-NN | `tests/test_r_tree.cpp` |
| `RoadGraphDijkstraTest` | Kiểm tra tải đồ thị OSM và tính đường ngắn nhất bằng Dijkstra | `tests/test_road_graph.cpp` |
| `ApiRoutingTest` | Kiểm tra tính toán lộ trình và xuất định dạng Polyline qua API | `tests/test_api_routing.cpp` |
| `AuthSecurityTest` | Kiểm thử cơ chế băm mật khẩu, tạo token và phân quyền RBAC | `tests/test_auth.cpp` |
| `TripServiceTest` | Kiểm tra tính toàn vẹn của máy trạng thái vòng đời chuyến đi | `tests/test_trip.cpp` |
| `TripApiTest` | Kiểm tra định tuyến REST API và xử lý ngoại lệ cuốc xe | `tests/test_trip_api.cpp` |

Chạy toàn bộ test suites bằng lệnh:
```bash
ctest --output-on-failure
```

---

## 🔑 Tài khoản demo nghiệm thu

Hệ thống cung cấp sẵn các tài khoản thử nghiệm được nạp sẵn tiền và thiết lập quyền hạn tương ứng:

| Vai trò (Role) | Email đăng nhập | Mật khẩu | Chức năng kiểm thử chính |
| :--- | :--- | :--- | :--- |
| 🧑‍💼 **Khách hàng** | `customer@demo.com` | `123456` | Đặt xe, nạp/rút tiền ví NaviPay, quét QR, theo dõi chuyến |
| 🚗 **Đối tác Tài xế** | `driver@demo.com` | `123456` | Bật online, nhận cuốc xe, dẫn đường bản đồ, quản lý pin xe |
| 🛡️ **Quản trị viên** | `admin@demo.com` *(hoặc `admin`)* | `admin` *(hoặc `123456`)* | Bản đồ giám sát toàn thành phố, thống kê doanh thu, phát thông báo |

*(Lưu ý: Hệ thống cũng hỗ trợ đăng ký tài khoản mới trực tiếp tại trang `register.html` với cơ chế lưu trữ tự động).*

---

## 📜 Bản quyền & Đóng góp

Dự án được xây dựng phục vụ nghiên cứu và học thuật trong môn học **Cấu trúc Dữ liệu & Giải thuật (CarDSA)**. Toàn bộ mã nguồn được phát hành theo giấy phép [MIT License](LICENSE).

Mọi ý kiến đóng góp và đề xuất cải tiến xin vui lòng tạo **Issue** hoặc gửi **Pull Request** tại:
👉 [https://github.com/VuuNguyennnn3327/Real-time-car-calling-and-driver-coordination-system](https://github.com/VuuNguyennnn3327/Real-time-car-calling-and-driver-coordination-system)
