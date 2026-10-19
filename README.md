# 🚗 Navigo - Hệ Thống Đặt Xe & Điều Phối Tài Xế Thời Gian Thực

> **"Dẫn lối chuẩn xác, đón rước tận nơi."**  
> *Đồ án môn học Cấu trúc Dữ liệu & Giải thuật (Data Structures & Algorithms - DSA)*

---

## 📌 Mục lục

1. [Giới thiệu tổng quan](#-giới-thiệu-tổng-quan)
2. [Cấu trúc Dữ liệu & Giải thuật (DSA Highlights)](#-cấu-trúc-dữ-liệu--giải-thuật-dsa-highlights)
3. [Kiến trúc & Công nghệ (Tech Stack)](#-kiến-trúc--công-nghệ-tech-stack)
4. [Các phân hệ chức năng](#-các-phân-hệ-chức-năng)
   - [Khách hàng (Customer Portal)](#1-phân-hệ-khách-hàng-customer-portal)
   - [Đối tác Tài xế (Driver Portal)](#2-phân-hệ-đối-tác-tài-xế-driver-portal)
   - [Trang Quản trị (Admin Portal)](#3-phân-hệ-quản-trị-viên-admin-portal)
   - [Xác thực & Hồ sơ cá nhân (Auth & Profile)](#4-xác-thực--hồ-sơ-cá-nhân-auth--profile)
5. [Cấu trúc mã nguồn dự án](#-cấu-trúc-mã-nguồn-dự-án)
6. [Hướng dẫn cài đặt & Khởi chạy](#-hướng-dẫn-cài-đặt--khởi-chạy)
7. [Tài khoản Demo trải nghiệm](#-tài-khoản-demo-trải-nghiệm)
8. [Quy trình kiểm thử luồng cuốc xe thực tế](#-quy-trình-kiểm-thử-luồng-cuốc-xe-thực-tế)

---

## 🌟 Giới thiệu tổng quan

**Navigo** là nền tảng gọi xe và điều phối chuyến đi trực tuyến đa phương thức, mô phỏng chân thực hệ thống vận hành thực tế của các ứng dụng gọi xe hàng đầu (Grab, Gojek, Be). 

Dự án được xây dựng với mục tiêu ứng dụng các **Cấu trúc Dữ liệu và Giải thuật kinh điển** vào giải quyết bài toán không gian thực tế:
- **Lập chỉ mục không gian (Spatial Indexing)**: Sử dụng **R-Tree / Spatial Grid** để tìm kiếm tức thì $k$ tài xế gần nhất trong phạm vi điểm đón khách với độ phức tạp tối ưu.
- **Tìm đường đi ngắn nhất (Shortest Path)**: Triển khai giải thuật **Dijkstra kết hợp Min-Heap** trên đồ thị mạng lưới đường bộ thực tế (OpenStreetMap - TP. Hồ Chí Minh).
- **Đồng bộ đám mây đa thiết bị (Realtime Cloud Sync)**: Tích hợp **Firebase Realtime Database** đảm bảo khách hàng đặt xe và tài xế nhận cuốc trên nhiều thiết bị khác nhau (PC, Điện thoại di động, Tablet) được cập nhật đồng thời mà không cần reload trang.

---

## 🧠 Cấu trúc Dữ liệu & Giải thuật (DSA Highlights)

```
       [ Khách hàng đặt xe ]
                 │
                 ▼
     ┌────────────────────────┐
     │      Spatial Index     │  <--- R-Tree / Spatial Grid (O(1) / O(log N))
     │   Tìm k tài xế gần nhất│       Khoanh vùng bán kính bằng công thức Haversine
     └───────────┬────────────┘
                 │
                 ▼
     ┌────────────────────────┐
     │      Road Graph        │  <--- Đồ thị có hướng (Directed Adjacency List)
     │   & Thuật toán Dijkstra│       Hàng đợi ưu tiên Min-Heap (O((V + E) log V))
     └───────────┬────────────┘
                 │
                 ▼
     ┌────────────────────────┐
     │  Vòng đời Chuyến xe    │  <--- Máy trạng thái hữu hạn (Finite State Machine)
     │ (State Machine Engine) │       REQUESTED ➔ ACCEPTED ➔ IN_PROGRESS ➔ COMPLETED
     └────────────────────────┘
```

### 1. Spatial Grid & R-Tree (Spatial Indexing)
- **Mục tiêu**: Lập chỉ mục tọa độ GPS (kinh độ, vĩ độ) của toàn bộ phương tiện đang trực tuyến.
- **Giải thuật**:
  - Không gian địa lý được phân chia thành lưới không gian hai chiều (*Spatial Grid*) và cấu trúc cây phân cấp (*R-Tree*).
  - Thuật toán tìm kiếm $k$ láng giềng gần nhất ($k$-Nearest Neighbors) kết hợp tính khoảng cách đại hình cầu **Haversine Formula**:
    $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\varphi}{2}\right) + \cos(\varphi_1)\cos(\varphi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
  - Giảm thiểu độ phức tạp tìm kiếm từ vét cạn $O(N)$ xuống $O(\log N)$ hoặc $O(1)$.

### 2. Thuật toán Dijkstra trên Đồ thị Mạng lưới Đường bộ
- **Mục tiêu**: Tính toán khoảng cách di chuyển thực tế theo mạng lưới giao thông đường bộ thay vì đường chim bay.
- **Giải thuật**:
  - Đồ thị có hướng biểu diễn qua danh sách kề (*Adjacency List*), trích xuất từ dữ liệu OpenStreetMap (OSM) của TP. Hồ Chí Minh.
  - Sử dụng hàng đợi ưu tiên (*Min-Heap Priority Queue*) để tối ưu thời gian tìm đường đi ngắn nhất: độ phức tạp đạt $O((V + E) \log V)$.
  - Tích hợp động cơ đa tầng: C++ Dijkstra nội bộ kết hợp OpenStreetMap OSRM Router đảm bảo phương tiện luôn bám sát mặt đường thực tế, không cắt xuyên qua tòa nhà hay sông ngòi.

### 3. Máy trạng thái Chuyến xe (Trip Finite State Machine)
- Quản lý nghiêm ngặt vòng đời của từng cuốc xe qua các trạng thái không thể đảo ngược:
  - `REQUESTED`: Khách phát yêu cầu tìm xe, radar phát sóng cuốc xe.
  - `OFFERED`: Điều phối cuốc xe đến tài xế phù hợp theo loại xe.
  - `ACCEPTED`: Tài xế chấp nhận, bắt đầu Stage 1 (Dẫn đường đến điểm đón).
  - `IN_PROGRESS`: Khách lên xe, bắt đầu Stage 2 (Dẫn đường đến điểm đến).
  - `COMPLETED`: Kết thúc chuyến xe, cộng cước vào ví tài xế và cập nhật KPI doanh thu.
  - `CANCELLED`: Hủy cuốc xe an toàn khi chưa bắt đầu hành trình.

---

## 💻 Kiến trúc & Công nghệ (Tech Stack)

| Tầng công nghệ | Công nghệ sử dụng | Mô tả chức năng |
|---|---|---|
| **Frontend UI/UX** | HTML5, CSS3 Modern, Vanilla JavaScript (ES6+) | Giao diện Responsive chuẩn Mobile-First & Desktop, không phụ thuộc framework cồng kềnh |
| **Bản đồ tương tác** | Leaflet.js, OpenStreetMap Tiles, Nominatim API | Hiển thị bản đồ nhiệt, marker phương tiện trực tiếp, vẽ polyline lộ trình, tìm kiếm địa chỉ |
| **Backend DSA Engine** | C++17, MinGW-w64 / GCC, CMake | Xây dựng lõi đồ thị đường bộ, thuật toán Dijkstra, Spatial Grid, socket HTTP REST API |
| **Lưu trữ dữ liệu** | SQLite3, LocalStorage / SessionStorage | Lưu trữ cấu trúc người dùng, lịch sử chuyến xe, blacklist người dùng đã xóa |
| **Đồng bộ thời gian thực** | Firebase Realtime Database SDK (REST Fallback) | Đồng bộ hai chiều tức thì trạng thái cuốc xe, vị trí GPS tài xế giữa các thiết bị |

---

## 📱 Các phân hệ chức năng

### 1. Phân hệ Khách hàng (`customer.html`)
- **Twin-Inputs Tìm kiếm Thông minh**:
  - Tự động gợi ý điểm đón & điểm đến tại TP.HCM và các khu vực lân cận (Bình Dương, Thủ Đức,...).
  - Ghim trung tâm bản đồ động, hỗ trợ định vị vị trí hiện tại chỉ với 1 chạm GPS.
- **Tùy chọn cuốc xe chuyên biệt**: Hỗ trợ ghi chú cuốc xe (*Chuyến đi yên lặng*, *Hành lý cồng kềnh*).
- **Phân hạng Phương tiện & Báo giá minh bạch**:
  - 🛵 **Navigo Bike**: Tiết kiệm, luồn lách nhanh nhẹn giờ cao điểm.
  - 🚗 **Navigo Car (4 chỗ)**: Êm ái, mát mẻ, tiện lợi cho công việc.
  - 🚘 **Navigo Plus**: Xe sang cao cấp, dịch vụ tài xế 5 sao.
  - 🚐 **Navigo XL (7 chỗ)**: Rộng rãi cho gia đình và nhóm bạn bè.
- **Theo dõi cuốc xe trực tiếp**:
  - Radar quét tìm tài xế lân cận.
  - Hiển thị thông tin tài xế (Tên, biển số, dòng xe, số điện thoại, đánh giá sao).
  - Mô phỏng lộ trình xe di chuyển từng chặng theo thời gian thực trên bản đồ.

### 2. Phân hệ Đối tác Tài xế (`driver.html`)
- **Bật / Tắt Trực tuyến (Online / Offline)**:
  - Tự động phát sóng tọa độ GPS lên đám mây khi mở ca làm việc.
  - Thu hồi trạng thái trực tuyến khi ngắt mạng hoặc đăng xuất.
- **Hộp thoại nhận cuốc nổi (Floating Offer Modal)**:
  - Hiển thị trực quan điểm đón, điểm trả, khoảng cách và cước phí nhận được.
  - Đếm ngược thời gian chấp nhận cuốc xe.
- **Điều hướng lộ trình 2 chặng (Two-Stage Route Navigation)**:
  - **Chặng 1 (Đến điểm đón)**: Vẽ đường từ vị trí hiện tại của tài xế đến điểm hẹn khách hàng.
  - **Chặng 2 (Chở khách đến đích)**: Sau khi bấm *"Đã đến & Đón khách"*, lộ trình tự động chuyển sang điểm đến của khách.
- **Quản lý Thu nhập & Cô lập Doanh thu**:
  - Hệ thống cô lập dữ liệu thu nhập theo từng tài xế riêng biệt (`driverId`).
  - Thống kê chi tiết: Số dư ví khả dụng, thu nhập hôm nay, thu nhập tuần này, lịch sử chuyến xe đã hoàn thành.

### 3. Phân hệ Quản trị viên (`admin.html`)
- **Dashboard Thống kê KPI Thời gian thực**:
  - **Tổng chuyến đi**: Số lượng chuyến xe đã thực hiện trong toàn hệ thống.
  - **Tài xế hoạt động**: Số lượng tài xế đã được phê duyệt và số lượng đang trực tuyến.
  - **Tổng Doanh thu Hệ thống**: Tự động tổng hợp và hiển thị tổng cước phí của tất cả các chuyến xe hoàn thành trên toàn bộ hệ thống.
  - **Khách hàng**: Đếm số lượng khách hàng thực tế sử dụng dịch vụ.
- **Bản đồ Giám sát Toàn thành phố**:
  - Hiển thị trực quan vị trí toàn bộ phương tiện đang trực tuyến trên bản đồ Leaflet.
  - Phân biệt icon phương tiện (xe máy, ô tô 4 chỗ, 7 chỗ, xe sang) và trạng thái hoạt động.
- **Quy trình Phê duyệt Tài xế (Approval Workflow)**:
  - Xem danh sách hồ sơ tài xế mới đăng ký (Họ tên, bằng lái, biển số, loại phương tiện).
  - Phê duyệt cấp quyền hoạt động hoặc từ chối hồ sơ chưa hợp lệ.
  - Tự động dọn dẹp các tài xế ảo, ghost accounts trên cơ sở dữ liệu.
- **Quản lý Khách hàng & Người dùng**:
  - Bảng người dùng tối ưu hóa đa nền tảng, thanh cuộn ngang mượt mà trên di động.
  - Khóa / Mở khóa tài khoản người dùng vi phạm.
  - Xóa vĩnh viễn tài khoản và làm sạch đồng thời trên SQLite, Firebase và bộ nhớ trình duyệt.

### 4. Xác thực & Hồ sơ cá nhân (`login.html`, `register.html`, `profile.html`)
- Hỗ trợ đăng nhập / đăng ký đầy đủ 3 vai trò: Khách hàng, Tài xế, Quản trị viên.
- Kiểm tra trùng lặp email và số điện thoại trước khi đăng ký.
- Cập nhật ảnh đại diện trực tiếp có nén ảnh thông minh trước khi lưu trữ.
- Phân hạng thành viên khách hàng tự động: *Khởi đầu*, *Navigo Silver*, *Navigo Gold*, *Navigo Platinum* dựa trên số cuốc xe hoàn thành.

---

## 📂 Cấu trúc mã nguồn dự án

```text
.
├── CMakeLists.txt              # Cấu hình biên dịch C++17 cho DSA core
├── backend/                    # Mã nguồn C++ Engine
│   ├── include/                # Header files (Graph, Dijkstra, SpatialGrid, Auth, Trip)
│   ├── src/                    # Source code triển khai thuật toán & socket HTTP
│   └── main.cpp                # File chạy chính của server C++
├── database/                   # Cơ sở dữ liệu SQLite
│   └── schema.sql              # Thiết kế bảng users, drivers, trips, driver_locations
├── data/                       # Dữ liệu mạng lưới giao thông
│   └── osm/processed/          # Dữ liệu tọa độ đường bộ TP. Hồ Chí Minh (JSON)
├── tests/                      # Bộ kiểm thử đơn vị C++ (Unit tests)
│   ├── test_road_graph.cpp     # Test đồ thị đường & thuật toán Dijkstra
│   ├── test_api_routing.cpp    # Test API tính toán lộ trình
│   └── test_trip.cpp           # Test vòng đời chuyến xe
├── .gitignore                  # Quy tắc bỏ qua file tạm, build artifacts & file AI
├── README.md                   # Tài liệu hướng dẫn dự án (File này)
└── frontend/                   # Ứng dụng Web Client tương tác
    ├── index.html              # Trang chủ ứng dụng (App Home chuẩn di động)
    ├── pages/                  # Các màn hình chính
    │   ├── customer.html       # Đặt xe khách hàng & theo dõi chuyến đi
    │   ├── driver.html         # Cổng làm việc & nhận cuốc tài xế
    │   ├── admin.html          # Trung tâm điều phối & quản trị hệ thống
    │   ├── login.html          # Đăng nhập hệ thống
    │   ├── register.html       # Đăng ký tài khoản khách hàng / tài xế
    │   ├── profile.html        # Hồ sơ cá nhân, ví điện tử & cài đặt
    │   └── dsa-demo.html       # Màn hình mô phỏng thuật toán DSA trực quan
    ├── css/                    # Hệ thống Style Design System
    │   ├── design-system.css   # Biến màu sắc, Typography, Spacing
    │   ├── layout.css          # Flexbox, Grid, Sidebar, Header
    │   ├── components.css      # Buttons, Badges, Modals, Cards, Forms
    │   └── responsive.css      # Tối ưu hóa giao diện đa nền tảng (Mobile/Tablet/PC)
    └── js/                     # Tầng xử lý Logic Javascript
        ├── core/
        │   ├── firebase-config.js  # Cấu hình kết nối Firebase Realtime Database
        │   ├── realtime.js         # Quản lý đồng bộ sự kiện đám mây thời gian thực
        │   ├── api.js              # REST Client giao tiếp C++ Backend
        │   ├── session.js          # Quản lý phiên xác thực Token & LocalStorage
        │   └── app.js              # Khởi tạo toàn cục, Geocoder & Toasts
        ├── customer/               # Điều phối giao diện khách hàng
        ├── driver/                 # Điều phối cổng tài xế & lộ trình 2 chặng
        └── admin/                  # Điều phối bảng quản trị & KPI hệ thống
```

---

## 🛠️ Hướng dẫn cài đặt & Khởi chạy

### Cách 1: Khởi chạy Giao diện Frontend (Khuyến nghị)
Hệ thống Frontend hoạt động độc lập và đã được tích hợp sẵn kết nối đám mây **Firebase Realtime Database**, tự động đồng bộ mọi dữ liệu giữa các thiết bị mà không bắt buộc phải biên dịch C++ backend.

1. **Sử dụng Live Server / Python HTTP Server**:
   ```bash
   # Mở Command Prompt hoặc PowerShell tại thư mục dự án:
   python -m http.server 8080
   ```
2. **Hoặc sử dụng Node.js**:
   ```bash
   npx serve .
   ```
3. Truy cập vào trình duyệt:
   - **Trang chủ**: `http://localhost:8080/frontend/index.html`
   - **Cổng Khách hàng**: `http://localhost:8080/frontend/pages/customer.html`
   - **Cổng Tài xế**: `http://localhost:8080/frontend/pages/driver.html`
   - **Trang Quản trị**: `http://localhost:8080/frontend/pages/admin.html`

---

### Cách 2: Biên dịch & Chạy C++ Backend Engine (Tùy chọn)
Nếu bạn muốn trải nghiệm thuật toán Dijkstra và Spatial Grid thuần C++:

#### Yêu cầu môi trường:
- Trình biên dịch C++ hỗ trợ C++17 trở lên (GCC 9+, MinGW-w64 trên Windows, hoặc Clang).
- CMake 3.16 trở lên.
- Thư viện SQLite3.

#### Các bước biên dịch:
```bash
# 1. Tạo thư mục build
mkdir build
cd build

# 2. Tạo cấu hình với CMake
cmake ..

# 3. Biên dịch chương trình
cmake --build . --config Release

# 4. Khởi chạy server backend
./bin/ride_rtree_server
```

Server sẽ lắng nghe tại `http://localhost:8080/api/health` và cung cấp các endpoint tìm đường `/api/route`.

---

## 👥 Tài khoản Demo trải nghiệm

Hệ thống đã chuẩn bị sẵn các tài khoản mẫu tương ứng với từng vai trò:

| Vai trò | Email đăng nhập | Mật khẩu | Chức năng chính |
|---|---|---|---|
| 👤 **Khách hàng** | `customer@demo.com` | `123456` | Đặt xe, chọn điểm đón/trả, theo dõi tài xế trên bản đồ |
| 🛵 **Tài xế** | `driver@demo.com` | `123456` | Bật trực tuyến, nhận cuốc xe, dẫn đường 2 chặng, xem thu nhập |
| 🛡️ **Quản trị viên** | `admin@demo.com` | `123456` | Quan sát bản đồ tổng thể, duyệt tài xế, xem KPI doanh thu |

> [!TIP]
> Bạn có thể bấm vào liên kết **"Đăng ký tài khoản mới"** tại trang [`login.html`](frontend/pages/login.html) để tạo tài khoản Khách hàng hoặc Tài xế hoàn toàn mới và thử nghiệm quy trình phê duyệt tài xế của Quản trị viên.

---

## 🧪 Quy trình kiểm thử luồng cuốc xe thực tế

Để kiểm tra toàn diện tính năng đồng bộ thời gian thực và tính doanh thu:

1. **Bước 1**: Mở trình duyệt thứ nhất ở chế độ ẩn danh vào [`admin.html`](frontend/pages/admin.html) để quan sát bản đồ trực tuyến và KPI tổng quan.
2. **Bước 2**: Mở tab trình duyệt thứ hai vào [`driver.html`](frontend/pages/driver.html) với tài khoản tài xế, bật công tắc **"Trực tuyến"**. Bạn sẽ thấy icon tài xế xuất hiện ngay lập tức trên bản đồ Admin.
3. **Bước 3**: Mở tab trình duyệt thứ ba (hoặc mở trên điện thoại) vào [`customer.html`](frontend/pages/customer.html) với tài khoản khách hàng, nhập điểm đón (*Chợ Bến Thành*) và điểm đến (*Landmark 81*), sau đó bấm **"Tìm chuyến xe"**.
4. **Bước 4**: Bên tab tài xế sẽ lập tức xuất hiện bảng thông báo nhận cuốc xe. Bấm **"Nhận cuốc xe"**.
5. **Bước 5**: Tài xế bấm **"Đã đến & Đón khách"** ➔ bấm **"Hoàn thành chuyến xe"**.
6. **Bước 6**: 
   - Tab tài xế: Cước phí được cộng chính xác vào số dư ví cá nhân của tài xế đó.
   - Tab Admin: Doanh thu tổng toàn hệ thống (`stat-revenue`) được tự động cập nhật cộng dồn cước phí cuốc xe vừa hoàn tất.

---

## 📜 Giấy phép & Tác giả
- **Đồ án**: Cấu trúc Dữ liệu & Giải thuật (Data Structures & Algorithms - DSA).
- **Phục vụ**: Học tập, nghiên cứu và phát triển phần mềm ứng dụng thuật toán không gian.
- **Bản quyền**: Dự án mã nguồn mở cho mục đích giáo dục.
