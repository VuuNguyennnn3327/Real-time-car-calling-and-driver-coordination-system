# BÁO CÁO LÝ THUYẾT & GIẢI THUẬT R-TREE
Người phụ trách: **Dương + Trường Vũ**

## 1. Cấu Trúc Cây R-Tree (Antonin Guttman 1984)
- Cây đa phân tự cân bằng (M-way tree), trong đó mỗi nút chứa từ $m = \lceil M/2 \rceil$ đến $M$ phần tử (ở đây chọn $M=4, m=2$).
- MBR (Minimum Bounding Rectangle) của nút cha luôn bao phủ toàn bộ MBR của các nút con.
- Chiều cao cây: $h \le \lceil \log_m N \rceil - 1$.
- Độ phức tạp tìm kiếm tiệm cận: $O(\log_M N)$.

## 2. Giải Thuật Tách Nút Quadratic Split
- **PickSeeds:** Duyệt mọi cặp $(i, j)$, tìm cặp lãng phí diện tích lớn nhất:
  $$\text{Waste}(i, j) = \text{Area}(\text{combine}(e_i, e_j)) - \text{Area}(e_i) - \text{Area}(e_j)$$
- **PickNext:** Chọn phần tử có độ chênh lệch mở rộng lớn nhất giữa hai nhóm và gán vào nhóm có chi phí $\Delta \text{Area}$ nhỏ hơn.

## 3. Giải Thuật Cập Nhật adjustTree (Path Bottom-Up)
- Thu thập đường đi `path` từ gốc xuống lá trong quá trình `insert`.
- Đi ngược từ cha của lá lên tới gốc:
  - Cập nhật MBR của entry trỏ tới nút con tương ứng.
  - Nếu nút con vừa tách, bổ sung nút mới `splitSibling` vào nút cha.
  - Nếu nút cha tràn, tiếp tục gọi `splitNode(parent, splitSibling)`.
  - Nếu gốc bị tách, tạo nút gốc mới làm cha của cả hai nhánh, tăng chiều cao cây lên 1.

## 4. Giải Thuật k-NN Best-First Search (Roussopoulos 1995)
- Sử dụng Min-Heap dựa trên hàm khoảng cách tối thiểu từ điểm truy vấn tới MBR: $\text{MINDIST}(P, R)$.
- Luôn duyệt nút/điểm có $\text{MINDIST}$ nhỏ nhất trước, cắt tỉa toàn bộ các nhánh có $\text{MINDIST}$ lớn hơn khoảng cách đến phần tử thứ $k$ hiện tại.
