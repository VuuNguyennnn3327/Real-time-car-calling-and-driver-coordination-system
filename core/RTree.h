#ifndef RTREE_H
#define RTREE_H

#include "RTreeNode.h"
#include "Point.h"
#include "Rectangle.h"
#include <vector>
#include <memory>
#include <string>

/**
 * @file RTree.h
 * @author Trường Vũ (Leader - Người phụ trách)
 * @brief Lớp cây R-Tree hoàn chỉnh cài đặt thuật toán Antonin Guttman (1984).
 *
 * HƯỚNG DẪN DÀNH CHO AI KHI THỰC HIỆN FILE NÀY:
 * 1. Insertion (Chèn):
 *    - Duyệt từ gốc xuống lá, ghi lại TOÀN BỘ đường đi (path) để adjustTree có thể quay ngược lên.
 *    - Thêm entry vào lá. Nếu lá bị tràn (> MAX_ENTRIES), gọi splitNode.
 *    - adjustTree: Đi ngược từ cha của lá lên tới gốc:
 *        + Cập nhật lại MBR của entry trỏ tới child.
 *        + Gắn splitSibling vào parent (nếu có) và tiếp tục split nếu parent tràn.
 *        + Nếu gốc bị tách, tạo root mới làm cha của cả 2 nhánh (tăng chiều cao cây).
 * 2. Quadratic Split (Tách nút bậc hai - Guttman 1984):
 *    - pickSeeds: Duyệt mọi cặp (i, j), chọn cặp lãng phí diện tích lớn nhất:
 *      waste = combine(e_i, e_j).area() - e_i.area() - e_j.area().
 *    - pickNext: Lần lượt chọn phần tử có chênh lệch mở rộng lớn nhất giữa 2 nhóm để phân bổ vào nhóm tối ưu.
 * 3. Range Search (Tìm kiếm theo vùng):
 *    - Đệ quy: Nếu queryBox giao với mbr của entry:
 *      + Nếu là nút lá: thêm point vào kết quả nếu queryBox chứa point.
 *      + Nếu là nút nhánh: đệ quy xuống child. Nhánh không giao nhau bị cắt tỉa (Pruning) hoàn toàn.
 * 4. Delete & Reinsert (Cập nhật vị trí tài xế):
 *    - Tìm và xóa điểm cũ theo id hoặc tọa độ. Sau đó nạp điểm mới.
 */

class RTree {
private:
    std::shared_ptr<RTreeNode> root;
    size_t totalPoints;

    // Các hàm nội bộ của giải thuật Guttman 1984
    void splitNode(std::shared_ptr<RTreeNode> node, std::shared_ptr<RTreeNode>& newNode);
    void pickSeeds(const std::vector<RTreeEntry>& entries, size_t& seed1, size_t& seed2);
    void adjustTree(std::vector<std::shared_ptr<RTreeNode>>& path, std::shared_ptr<RTreeNode> splitSibling);

    // Đệ quy tìm kiếm theo vùng
    void rangeSearchInternal(std::shared_ptr<RTreeNode> node, const Rectangle& queryBox, std::vector<Point>& results) const;

    // Đệ quy xóa điểm
    bool deleteInternal(std::shared_ptr<RTreeNode> node, const std::string& pointId);

    // Đệ quy thu thập cấu trúc MBR các tầng phục vụ trực quan hóa (Demo)
    void getStructureInternal(std::shared_ptr<RTreeNode> node, int depth, std::vector<std::pair<int, Rectangle>>& boxes) const;

public:
    RTree();

    // 1. Chèn điểm mới vào cây (Insert)
    void insert(const Point& p);

    // 2. Tìm kiếm theo vùng chữ nhật (Range Search)
    std::vector<Point> rangeSearch(const Rectangle& queryBox) const;

    // 3. Xóa điểm theo id
    bool deletePoint(const std::string& pointId);

    // 4. Cập nhật vị trí điểm (Delete vị trí cũ + Insert vị trí mới)
    void updatePosition(const std::string& pointId, double newX, double newY);

    // 5. Lấy cấu trúc tất cả MBR theo tầng để vẽ demo
    std::vector<std::pair<int, Rectangle>> getStructure() const;

    // 6. Tiện ích
    size_t size() const { return totalPoints; }
    void clear();
    std::shared_ptr<RTreeNode> getRoot() const { return root; }
};

#endif // RTREE_H
