# RIDE-RTREE

> **Hệ Thống Gọi Xe & Điều Phối Tài Xế Theo Thời Gian Thực Dựa Trên Chỉ Mục Không Gian R-Tree**  
> Đồ án môn học: **Cấu trúc Dữ liệu & Giải thuật (DSA)**  
> 🔗 **GitHub Repository:** [VuuNguyennnn3327/Real-time-car-calling-and-driver-coordination-system](https://github.com/VuuNguyennnn3327/Real-time-car-calling-and-driver-coordination-system)

---

## 👥 Đội Ngũ Thực Hiện & Phân Công Trọng Tâm
* **Trường Vũ (Leader):** Kiến trúc hệ thống, `CMakeLists.txt`, Lõi `RTreeNode`, `RTree` (Insert, Quadratic Split, Range Search), `DispatchService`.
* **Tưởng:** Thuật toán `KNNSearch` (Min-Heap Best-First Search), Web Server C++ (`cpp-httplib`), REST API Routing (`server/routes/`).
* **Vương:** Hình học 2D (`Point`, `Rectangle`/MBR), `DriverSimulator`, Dữ liệu mẫu GPS TP.HCM, Giao diện Admin (`web/admin.html`).
* **Đẹp:** Thuật toán đối chứng `NaiveScan` $O(N)$, Console CLI độc lập (`console/main.cpp`), RAM Storage (`server/storage/Store.h`), Đo kiểm Benchmark.
* **Dương:** Giao diện Khách hàng & Tài xế (`index.html`, `customer.html`, `driver.html`), Demo trực quan hóa MBR (`rtree-demo.html`), Polling engine, Báo cáo & Slide.

---

## 📁 Cấu Trúc Dự Án
Chi tiết đặc tả kỹ thuật, hợp đồng API và kế hoạch Jira xem tại: [`PROJECT_MASTER_BRIEF.md`](./PROJECT_MASTER_BRIEF.md).

```text
RIDE-RTREE/
├── CMakeLists.txt          # Cấu hình biên dịch C++17 [Trường Vũ]
├── PROJECT_MASTER_BRIEF.md # Tài liệu đặc tả tổng quan thực tế dự án [Trường Vũ]
├── README.md               # Hướng dẫn cài đặt và chạy hệ thống [Trường Vũ + Dương]
├── core/                   # Lõi thuật toán C++: Point, Rectangle, RTree, KNN, NaiveScan
├── console/                # Ứng dụng C++ console chạy độc lập demo chấm điểm DSA [Đẹp]
├── server/                 # C++ HTTP REST API Server (cpp-httplib, nlohmann/json)
├── simulator/              # Bộ giả lập di chuyển của tài xế [Vương]
├── web/                    # Giao diện web Leaflet.js (Customer, Driver, Admin, R-Tree Demo)
├── data/                   # Dữ liệu GPS mẫu TP.HCM và tập benchmark
├── tests/                  # Kiểm thử đối chứng R-Tree == NaiveScan và test hình học
└── docs/                   # Báo cáo kỹ thuật và slide thuyết trình
```

---

## 🚀 Hướng Dẫn Biên Dịch & Chạy (Build Guide)
Yêu cầu môi trường: C++17 trở lên, CMake >= 3.16.

```bash
# 1. Tạo thư mục build và cấu hình
mkdir build
cd build
cmake ..

# 2. Biên dịch toàn bộ
cmake --build .
```

Các file thực thi sinh ra trong thư mục `build/`:
* `console_app`: Chạy menu console terminal độc lập phục vụ bảo vệ đồ án trước giảng viên.
* `server_app`: Chạy Backend Web Server tại cổng `8080` (Mở trình duyệt: `http://localhost:8080`).
* `test_runner`: Chạy toàn bộ test case đối chứng tự động (R-Tree vs Naive Scan).
