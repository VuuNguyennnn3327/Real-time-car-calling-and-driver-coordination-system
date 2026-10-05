# TÀI LIỆU ĐẶC TẢ TỔNG QUAN DỰ ÁN: RIDE-RTREE
## HỆ THỐNG GỌI XE VÀ ĐIỀU PHỐI TÀI XẾ THEO THỜI GIAN THỰC DỰA TRÊN CÂY R-TREE
*(Real-Time Ride-Hailing & Driver Dispatch System based on R-Tree Spatial Indexing)*

- **Môn học:** Cấu trúc Dữ liệu & Giải thuật (DSA)
- **Quy mô:** Nhóm 5 sinh viên
- **Thành viên:** 
  1. **Trường Vũ** (Nhóm trưởng / Tech Lead)
  2. **Tưởng** (Lập trình viên Giải thuật nâng cao & Backend Server)
  3. **Vương** (Lập trình viên Hình học cơ sở, Simulator & Giao diện Admin)
  4. **Đẹp** (Lập trình viên Đối chứng, Console CLI, RAM Storage & Đo kiểm)
  5. **Dương** (Lập trình viên Giao diện Web, Polling, Báo cáo & Slide)

---

## 1. MÔ TẢ BỐI CẢNH VÀ MỤC TIÊU CỐT LÕI

### 1.1. Bài toán kỹ thuật
Trong các ứng dụng gọi xe (Grab, Be, Gojek), hệ thống liên tục nhận hàng nghìn yêu cầu: *"Tìm 3 tài xế đang rảnh gần điểm đón của khách hàng nhất"*.
- Nếu duyệt mảng tuyến tính $O(N)$, khi số lượng xe lên tới hàng chục nghìn, hệ thống sẽ nghẽn CPU và phản hồi chậm trễ.
- Cây tìm kiếm 1D (BST, AVL, B-Tree) bất lực trước dữ liệu không gian 2D (Kinh độ $x$, Vĩ độ $y$).
- **Giải pháp:** Cài đặt cấu trúc dữ liệu **R-Tree (Antonin Guttman 1984)** tự cân bằng với hộp bao **MBR (Minimum Bounding Rectangle)**, đưa độ phức tạp tìm kiếm từ $O(N)$ xuống tiệm cận $O(\log N)$.

### 1.2. Mục tiêu nghiệm thu của đồ án DSA
1. **Lõi C++ tự viết từ đầu (Core DSA):** Cài đặt Point, Rectangle/MBR, RTree (Insert, Quadratic Split, Range Search), k-NN Best-First Search (Min-Heap), Delete + Reinsert. Tuyệt đối không dùng thư viện ngoài thay thế R-Tree.
2. **Chứng minh tính đúng đắn (Correctness):** Thuật toán đối chứng Naive Scan $O(N)$ phải cho kết quả khớp 100% với R-Tree trên cùng tập dữ liệu.
3. **Chương trình Console C++ độc lập (`console/main.cpp`):** Chạy menu terminal độc lập để giảng viên chấm thuật toán trực tiếp mà không cần bật Web.
4. **Mô phỏng thực tế trực quan (Web App):** Bản đồ số Leaflet.js thể hiện luồng Khách đặt xe $\rightarrow$ R-Tree tìm tài xế $\rightarrow$ Tài xế nhận đơn $\rightarrow$ Admin giám sát.

---

## 2. QUY ƯỚC TỌA ĐỘ KHÔNG GIAN 2D (CỰC KỲ QUAN TRỌNG)

Để tránh nhầm lẫn giữa hệ trục tọa độ toán học Descartes $(x, y)$ và tọa độ bản đồ địa lý $(\text{lat}, \text{lng})$:
* **Quy ước trong C++ Core (`Point`, `Rectangle`):**
  * $x = \text{Longitude}$ (Kinh độ, trục ngang, ví dụ TP.HCM: $\approx 106.68 - 106.72$).
  * $y = \text{Latitude}$ (Vĩ độ, trục dọc, ví dụ TP.HCM: $\approx 10.75 - 10.80$).
  * Khởi tạo: `Point(lng, lat, id)` hoặc `Rectangle(minLng, minLat, maxLng, maxLat)`.
* **Quy ước trong Bản đồ Leaflet.js (`web/`):**
  * Leaflet sử dụng định dạng `[latitude, longitude]`: `L.latLng(lat, lng)`.
* **Quy ước trong JSON API:**
  * Luôn truyền rõ ràng tên trường: `{"lat": 10.7769, "lng": 106.7009}` để cả Backend và Frontend không bị đảo ngược trục.

---

## 3. HỆ THỐNG PHÂN LUỒNG FILE CHUẨN

```text
RIDE-RTREE/
├── CMakeLists.txt — Cấu hình biên dịch C++17 [Trường Vũ]
├── PROJECT_MASTER_BRIEF.md — Tài liệu đặc tả tổng quan thực tế dự án [Trường Vũ]
├── README.md — Hướng dẫn cài đặt và chạy hệ thống [Trường Vũ + Dương]
├── .gitignore — Loại trừ file rác, file tạm biên dịch [Trường Vũ]
│
├── core/ — [LÕI GIẢI THUẬT C++]
│   ├── Point.h / Point.cpp — Tọa độ 2D, khoảng cách Euclid [Vương]
│   ├── Rectangle.h / Rectangle.cpp — Hộp bao MBR, tính diện tích, MINDIST [Vương]
│   ├── RTreeNode.h / RTreeNode.cpp — Cấu trúc nút cây (Lá/Nhánh, MBR con) [Trường Vũ]
│   ├── RTree.h / RTree.cpp — Lõi R-Tree: Insert, Quadratic Split, Range [Trường Vũ]
│   ├── KNNSearch.h / KNNSearch.cpp — Thuật toán tìm k tài xế gần nhất Min-Heap [Tưởng]
│   └── NaiveScan.h / NaiveScan.cpp — Quét mảng O(N) làm đối chứng [Đẹp]
│
├── console/ — [CHƯƠNG TRÌNH CONSOLE ĐỘC LẬP CHẤM ĐIỂM]
│   └── main.cpp — Console C++ test Insert, Range, k-NN, in cây [Đẹp]
│
├── server/ — [BACKEND HTTP SERVER]
│   ├── Server.h / Server.cpp — Web server cổng 8080 (cpp-httplib) [Tưởng]
│   ├── routes/api_routes.h / .cpp — Định tuyến các REST API [Tưởng]
│   ├── services/DispatchService.h / .cpp — Dịch vụ điều phối cuốc xe gọi R-Tree [Trường Vũ]
│   └── storage/Store.h — Quản lý dữ liệu tài xế & đơn hàng trong RAM [Đẹp]
│
├── simulator/ — [GIẢ LẬP DI CHUYỂN]
│   └── DriverSimulator.h / .cpp — Giả lập xe di chuyển (Delete cũ -> Chèn mới) [Vương]
│
├── web/ — [GIAO DIỆN WEB LEAFLET.JS]
│   ├── index.html — Màn hình chọn vai trò (Khách/Tài xế/Admin) [Dương]
│   ├── customer.html — Khách click bản đồ chọn điểm, đặt xe [Dương]
│   ├── driver.html — Tài xế xem cuốc xe gần mình, nhận đơn [Dương]
│   ├── admin.html — Bản đồ tổng giám sát xe & cuốc xe [Vương]
│   ├── rtree-demo.html — Trang trực quan hóa các tầng khung MBR [Dương + Trường Vũ]
│   └── shared/app.js & style.css — Polling JS engine & CSS dùng chung [Dương]
│
├── data/ — [DỮ LIỆU GPS]
│   ├── sample/drivers.json — 20–50 tọa độ mẫu tài xế quanh Quận 1 [Vương]
│   └── benchmark/ — Bộ dữ liệu lớn (1.000 - 50.000 điểm) đo hiệu năng [Đẹp]
│
├── tests/ — [KIỂM THỬ ĐỐI CHỨNG]
│   ├── core/test_rtree.cpp — Test R-Tree khớp 100% với Naive Scan [Đẹp]
│   └── geometry/test_geometry.cpp — Unit test phép tính hình học MBR [Vương]
│
└── docs/ — [BÁO CÁO & SLIDE]
    └── 02-rtree/spec.md — Tóm tắt lý thuyết cây R-Tree và công thức Big-O [Dương + Trường Vũ]
```

---

## 4. CHI TIẾT HỢP ĐỒNG REST API (JSON CONTRACTS)

Cả Backend (Tưởng) và Frontend (Dương, Vương) tuân thủ 100% cấu trúc JSON sau:

### 4.1. Lấy danh sách tài xế
* **Request:** `GET /api/drivers`
* **Response (200 OK):**
```json
[
  { "id": "D001", "name": "Nguyễn Văn An", "lat": 10.7769, "lng": 106.7009, "status": "AVAILABLE" },
  { "id": "D002", "name": "Trần Minh Bình", "lat": 10.7782, "lng": 106.6995, "status": "BUSY" }
]
```

### 4.2. Khách hàng tạo yêu cầu đặt xe
* **Request:** `POST /api/rides`
```json
{
  "pickup": { "lat": 10.7750, "lng": 106.7010 },
  "destination": { "lat": 10.7820, "lng": 106.7080 }
}
```
* **Response (200 OK):**
```json
{
  "id": "R1001",
  "status": "PENDING",
  "pickup": { "lat": 10.7750, "lng": 106.7010 },
  "destination": { "lat": 10.7820, "lng": 106.7080 },
  "candidateDrivers": [
    { "id": "D001", "name": "Nguyễn Văn An", "distanceKm": 0.42 }
  ]
}
```

### 4.3. Tài xế lấy danh sách đơn chờ gần vị trí của mình
* **Request:** `GET /api/rides/nearby?lat=10.7769&lng=106.7009`
* **Response (200 OK):**
```json
[
  {
    "id": "R1001",
    "pickup": { "lat": 10.7750, "lng": 106.7010 },
    "destination": { "lat": 10.7820, "lng": 106.7080 },
    "status": "PENDING",
    "distanceKm": 0.25
  }
]
```

### 4.4. Tài xế nhận đơn
* **Request:** `POST /api/rides/R1001/accept`
```json
{ "driverId": "D001" }
```
* **Response (200 OK):**
```json
{ "success": true, "rideId": "R1001", "status": "ACCEPTED", "driverId": "D001" }
```

### 4.5. Admin lấy tổng quan toàn bộ hệ thống
* **Request:** `GET /api/admin/overview`
* **Response (200 OK):**
```json
{
  "drivers": [ ... ],
  "rides": [ ... ],
  "totalAvailable": 45,
  "totalBusy": 5
}
```

### 4.6. Trực quan hóa R-Tree & Truy vấn Demo
* **API k-NN:** `POST /api/rtree/knn`
  * Body: `{"lat": 10.7750, "lng": 106.7010, "k": 3}`
  * Trả về danh sách k điểm gần nhất kèm khoảng cách Euclid.
* **API Range Search:** `POST /api/rtree/range`
  * Body: `{"minLat": 10.770, "minLng": 106.695, "maxLat": 10.780, "maxLng": 106.705}`
  * Trả về danh sách các điểm nằm trong khung chữ nhật.
* **API Khung MBR đa tầng:** `GET /api/rtree/structure`
  * Trả về danh sách tất cả các hộp bao MBR của các nút trong cây để vẽ lên `rtree-demo.html`.

---

## 5. BẢNG PHÂN CÔNG NHIỆM VỤ (JIRA TASKS & STORY POINTS)

| Mã Task | Tên Task & Mô tả | Người phụ trách | Điểm (SP) | Sprint |
| :--- | :--- | :---: | :---: | :---: |
| **RT-01** | Thiết kế kiến trúc tổng thể, CMakeLists.txt, README.md, .gitignore | **Trường Vũ** | 3 SP | Sprint 1 |
| **RT-02** | Cài đặt cấu trúc RTreeNode & hàm ChooseLeaf (thu thập đường đi path từ gốc xuống lá) | **Trường Vũ** | 3 SP | Sprint 1 |
| **RT-03** | Cài đặt Quadratic Split (Guttman 1984), AdjustTree (Bottom-Up theo path), Delete | **Trường Vũ** | 5 SP | Sprint 1 |
| **RT-04** | Xây dựng DispatchService kết nối R-Tree với Store cuốc xe | **Trường Vũ** | 2 SP | Sprint 2 |
| **RT-05** | Cài đặt thuật toán k-NN Best-First Search sử dụng Min-Heap (KNNSearch) | **Tưởng** | 5 SP | Sprint 1 |
| **RT-06** | Xây dựng C++ Web Server với cpp-httplib phục vụ static files cổng 8080 | **Tưởng** | 4 SP | Sprint 2 |
| **RT-07** | Cài đặt hệ thống REST API Endpoints trong server/routes/ | **Tưởng** | 3 SP | Sprint 2 |
| **RT-08** | Cài đặt module Hình học 2D Point & Rectangle (MBR), kiểm tra AABB | **Vương** | 4 SP | Sprint 1 |
| **RT-09** | Thu thập và chuẩn hóa bộ dữ liệu tọa độ GPS mẫu TP.HCM (data/sample/) | **Vương** | 3 SP | Sprint 1 |
| **RT-10** | Cài đặt DriverSimulator mô phỏng xe dịch chuyển (Delete + Reinsert) | **Vương** | 4 SP | Sprint 2 |
| **RT-11** | Cài đặt thuật toán đối chứng NaiveScan O(N) | **Đẹp** | 3 SP | Sprint 1 |
| **RT-12** | Xây dựng chương trình C++ Console CLI độc lập (console/main.cpp) | **Đẹp** | 4 SP | Sprint 1 |
| **RT-13** | Xây dựng RAM Storage (Store.h), kiểm thử Correctness & Benchmark Suite | **Đẹp** | 4 SP | Sprint 2 |
| **RT-14** | Thiết kế giao diện Web 3 phân hệ (index.html, customer.html, driver.html) | **Dương** | 4 SP | Sprint 1 |
| **RT-15** | Xây dựng trang rtree-demo.html trực quan hóa các tầng MBR và lát cắt pruning | **Dương** | 4 SP | Sprint 2 |
| **RT-16** | Cài đặt Polling Realtime (app.js, style.css), soạn Báo cáo và Slide nhóm | **Dương** | 4 SP | Sprint 2 |

---

## 6. RANH GIỚI KỸ THUẬT (NHỮNG THỨ TUYỆT ĐỐI KHÔNG LÀM)

Để tránh lãng phí thời gian và đảm bảo 100% đúng trọng tâm đề tài DSA, nhóm tuân thủ nghiêm ngặt các quy tắc sau:
1. **Không làm Authentication bảo mật thật:** Không JWT, không mã hóa bcrypt, không session server. Chỉ cần màn hình `index.html` chọn vai trò và lưu mã ID tạm vào trình duyệt.
2. **Không làm WebSocket phức tạp:** Toàn bộ cơ chế cập nhật realtime dùng **Polling (`setInterval` gọi fetch 2-3s)**.
3. **Không làm các tính năng thương mại ngoài lề:** Không thanh toán (Payment/Ví điện tử), không chat, không đánh giá tài xế, không GPS thiết bị thật, không mã giảm giá.
4. **Không dùng thư viện R-Tree có sẵn:** R-Tree phải do nhóm tự viết bằng C++ thuần túy.
5. **Cả 3 giao diện đọc/ghi chung 1 server thật:** Không để mỗi trang web tự lưu mock data riêng rẽ ở bản nộp cuối.
