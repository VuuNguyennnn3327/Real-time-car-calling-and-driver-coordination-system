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
├── CMakeLists.txt                         # [Trường Vũ] Cấu hình biên dịch C++17 (5 target build)
├── PROJECT_MASTER_BRIEF.md                # [Trường Vũ] Tài liệu đặc tả tổng quan, hợp đồng API, Jira
├── README.md                              # [Trường Vũ + Dương] Hướng dẫn cài đặt và chạy hệ thống
├── .gitignore                             # [Trường Vũ] Loại trừ file build rác, cache IDE
│
├── core/                                  # [LÕI THUẬT TOÁN DSA - C++ THUẦN]
│   ├── Point.h                            # [Vương] Khai báo struct tọa độ 2D (lng, lat)
│   ├── Point.cpp                          # [Vương] Cài đặt tính khoảng cách Euclid giữa 2 điểm
│   ├── Rectangle.h                        # [Vương] Khai báo hộp bao MBR (AABB)
│   ├── Rectangle.cpp                      # [Vương] Cài đặt diện tích, giao cắt, mở rộng, MINDIST
│   ├── RTreeNode.h                        # [Trường Vũ] Khai báo cấu trúc nút cây (M=4, m=2) & RTreeEntry
│   ├── RTreeNode.cpp                      # [Trường Vũ] Cài đặt bounding box, kiểm tra tràn/thiếu nút
│   ├── RTree.h                            # [Trường Vũ] Khai báo cây R-Tree (Guttman 1984)
│   ├── RTree.cpp                          # [Trường Vũ] Cài đặt Insert, Quadratic Split, adjustTree, Range Search, Delete
│   ├── KNNSearch.h                        # [Tưởng] Khai báo k-NN Best-First Search
│   ├── KNNSearch.cpp                      # [Tưởng] Cài đặt k-NN Min-Heap (priority_queue)
│   ├── NaiveScan.h                        # [Đẹp] Khai báo thuật toán quét mảng tuần tự O(N)
│   └── NaiveScan.cpp                      # [Đẹp] Cài đặt Naive Range & k-NN làm trọng tài đối chứng
│
├── console/                               # [CHƯƠNG TRÌNH CONSOLE TERMINAL ĐỘC LẬP]
│   └── main.cpp                           # [Đẹp] Menu terminal độc lập để báo cáo/chấm điểm trực tiếp
│
├── server/                                # [BACKEND HTTP REST API SERVER]
│   ├── Server.h                           # [Tưởng] Khai báo Web Server C++ (cpp-httplib)
│   ├── Server.cpp                         # [Tưởng] Cài đặt vòng đời server cổng 8080
│   ├── routes/                            # Định tuyến các API
│   │   ├── api_routes.h                   # [Tưởng] Khai báo danh sách REST API endpoints
│   │   └── api_routes.cpp                 # [Tưởng] Cài đặt logic xử lý request / response JSON
│   ├── services/                          # Dịch vụ nghiệp vụ
│   │   ├── DispatchService.h              # [Trường Vũ] Khai báo dịch vụ điều phối cuốc xe (Singleton)
│   │   └── DispatchService.cpp            # [Trường Vũ] Kết nối cây R-Tree với Store, lọc tài xế rảnh
│   └── storage/                           # Bộ nhớ tạm
│       └── Store.h                        # [Đẹp] Quản lý Driver & RideRequest trong RAM (Thread-safe)
│
├── simulator/                             # [BỘ GIẢ LẬP DI CHUYỂN TÀI XẾ]
│   ├── DriverSimulator.h                  # [Vương] Khai báo bộ giả lập xe di chuyển
│   └── DriverSimulator.cpp                # [Vương] Cài đặt cập nhật tọa độ ngẫu nhiên 50 xe (Delete + Insert)
│
├── web/                                   # [GIAO DIỆN WEB BẢN ĐỒ LEAFLET.JS]
│   ├── index.html                         # [Dương] Màn hình trang chủ chọn vai trò (Khách/Tài xế/Admin)
│   ├── customer.html                      # [Dương] Màn hình khách click bản đồ đặt xe
│   ├── driver.html                        # [Dương] Màn hình tài xế xem đơn chờ và nhận cuốc
│   ├── admin.html                         # [Vương] Màn hình Admin giám sát toàn bộ xe và trạng thái
│   ├── rtree-demo.html                    # [Dương + Trường Vũ] Trang trực quan hóa các tầng khung MBR
│   └── shared/                            # Thư mục tài nguyên dùng chung
│       ├── app.js                         # [Dương] Engine Polling định kỳ gọi fetch API
│       └── style.css                      # [Dương] Giao diện, bố cục CSS chung cho 5 trang web
│
├── data/                                  # [DỮ LIỆU GPS]
│   ├── sample/                            # Dữ liệu mẫu ban đầu
│   │   └── drivers.json                   # [Vương] Danh sách 20 tài xế mẫu với tọa độ thực tế Quận 1
│   └── benchmark/                         # Dữ liệu đo kiểm tải nặng
│       └── README.md                      # [Đẹp] Hướng dẫn đo benchmark quy mô 1.000 - 50.000 điểm
│
├── tests/                                 # [BỘ KIỂM THỬ TỰ ĐỘNG]
│   ├── core/                              # Kiểm thử giải thuật cây
│   │   └── test_rtree.cpp                 # [Đẹp] Test đối chứng kết quả R-Tree khớp 100% với NaiveScan
│   └── geometry/                          # Kiểm thử hình học
│       └── test_geometry.cpp              # [Vương] Unit test Point và Rectangle (diện tích, giao cắt)
│
└── docs/                                  # [TÀI LIỆU BÁO CÁO & SLIDE]
    └── 02-rtree/                          # Thuyết minh giải thuật
        └── spec.md                        # [Dương + Trường Vũ] Lý thuyết cấu trúc R-Tree & công thức Big-O
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
