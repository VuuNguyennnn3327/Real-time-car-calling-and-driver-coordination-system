# HƯỚNG DẪN QUẢN LÝ GIT COMMIT DÀNH CHO NHÓM (RIDE-RTREE)

Tài liệu này chuẩn hóa quy trình Git Commit để đảm bảo **100% minh bạch đóng góp cá nhân** phục vụ chấm điểm đồ án DSA (Tiêu chí YC01 - Git History & YC02 - Jira Tracking).

---

## 1. QUY ƯỚC ĐẶT TÊN COMMIT (CONVENTIONAL COMMITS)

Mọi commit của các thành viên phải tuân theo cấu trúc:
```text
<type>(<scope>): [<Mã-Jira>] <Mô tả ngắn gọn bằng tiếng Anh hoặc tiếng Việt>
```

* **`<type>`:**
  * `feat`: Thêm tính năng / thuật toán mới (`feat(core)`, `feat(knn)`, `feat(web)`,...)
  * `fix`: Sửa lỗi thuật toán / logic (`fix(rtree)`, `fix(server)`,...)
  * `test`: Thêm hoặc sửa test case (`test(core)`, `test(geometry)`,...)
  * `docs`: Cập nhật tài liệu, README, báo cáo (`docs(brief)`, `docs(report)`,...)
  * `chore`: Cấu hình CMake, .gitignore, dọn dẹp file tạm (`chore(cmake)`,...)

* **`<scope>`:** `core`, `geometry`, `knn`, `server`, `simulator`, `web`, `test`.
* **`[<Mã-Jira>]`:** `[RT-01]` đến `[RT-16]` tương ứng theo bảng Jira Sprint.

---

## 2. DANH SÁCH CÁC COMMIT MẪU THEO TIẾN ĐỘ DỰ ÁN

Các thành viên có thể copy trực tiếp các lệnh commit bên dưới tương ứng với phần việc của mình:

### Nhánh 1: Khởi tạo & Cấu trúc (Trường Vũ)
```bash
git init
git add .gitignore README.md PROJECT_MASTER_BRIEF.md CMakeLists.txt
git commit -m "chore(init): [RT-01] initialize repository structure and build config"
```

### Nhánh 2: Hình học cơ sở (Vương)
```bash
git add core/Point.h core/Point.cpp core/Rectangle.h core/Rectangle.cpp tests/geometry/test_geometry.cpp
git commit -m "feat(geometry): [RT-08] implement Point and Rectangle AABB with enlargement and MINDIST"
```

### Nhánh 3: Cấu trúc R-Tree & Thuật toán lõi (Trường Vũ)
```bash
git add core/RTreeNode.h core/RTreeNode.cpp
git commit -m "feat(core): [RT-02] implement RTreeNode structure with MBR calculation"

git add core/RTree.h core/RTree.cpp
git commit -m "feat(core): [RT-03] implement Guttman Quadratic Split and RangeSearch"

# Commit quan trọng: Fix lỗi adjustTree ghi nhận path
git add core/RTree.h core/RTree.cpp tests/core/test_rtree.cpp
git commit -m "fix(rtree): [RT-03] track descent path in insert and fix bottom-up adjustTree propagation"
```

### Nhánh 4: Đối chứng & Console CLI (Đẹp)
```bash
git add core/NaiveScan.h core/NaiveScan.cpp
git commit -m "feat(core): [RT-11] implement NaiveScan O(N) baseline for correctness verification"

git add console/main.cpp
git commit -m "feat(console): [RT-12] implement standalone interactive CLI for DSA grading"

git add server/storage/Store.h
git commit -m "feat(storage): [RT-13] implement thread-safe RAM store for drivers and rides"
```

### Nhánh 5: Thuật toán k-NN & Web Server (Tưởng)
```bash
git add core/KNNSearch.h core/KNNSearch.cpp
git commit -m "feat(knn): [RT-05] implement k-NN Best-First Search with Min-Heap priority queue"

git add server/Server.h server/Server.cpp server/routes/
git commit -m "feat(server): [RT-06] [RT-07] scaffold HTTP server and REST API route handlers"
```

### Nhánh 6: Simulator & Dữ liệu mẫu (Vương)
```bash
git add simulator/DriverSimulator.h simulator/DriverSimulator.cpp data/sample/drivers.json
git commit -m "feat(simulator): [RT-09] [RT-10] implement driver movement drift with Delete+Reinsert"
```

### Nhánh 7: Giao diện Web & Báo cáo (Dương + Vương)
```bash
git add web/index.html web/customer.html web/driver.html web/shared/
git commit -m "feat(web): [RT-14] create role selector, customer booking, and driver acceptance pages"

git add web/admin.html
git commit -m "feat(web): [RT-10] add admin dashboard for fleet and ride monitoring"

git add web/rtree-demo.html
git commit -m "feat(web): [RT-15] build interactive R-Tree MBR layer and pruning visualizer"

git add docs/02-rtree/spec.md
git commit -m "docs(report): [RT-16] add R-Tree theoretical analysis, Big-O formulas and presentation draft"
```

---

## 3. HƯỚNG DẪN ĐẨY LÊN GITHUB (PUSH TO REMOTE)

Repository chính thức của nhóm:
`https://github.com/VuuNguyennnn3327/Real-time-car-calling-and-driver-coordination-system.git`

```bash
# 1. Đổi tên nhánh chính sang main
git branch -M main

# 2. Thêm remote repository
git remote add origin https://github.com/VuuNguyennnn3327/Real-time-car-calling-and-driver-coordination-system.git

# 3. Đẩy toàn bộ commit lên GitHub
git push -u origin main
```
