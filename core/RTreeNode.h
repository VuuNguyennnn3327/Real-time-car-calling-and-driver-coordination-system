#ifndef RTREENODE_H
#define RTREENODE_H

#include "Rectangle.h"
#include "Point.h"
#include <vector>
#include <memory>

/**
 * @file RTreeNode.h
 * @author Trường Vũ (Leader - Người phụ trách)
 * @brief Định nghĩa nút cây R-Tree (RTreeNode) và phần tử bên trong nút (RTreeEntry).
 *
 * HƯỚNG DẪN DÀNH CHO AI KHI THỰC HIỆN FILE NÀY:
 * - Hằng số dung lượng cây:
 *     - MAX_ENTRIES (M): Số lượng phần tử tối đa trong 1 nút (M = 4 để demo split trực quan).
 *     - MIN_ENTRIES (m): Số lượng phần tử tối thiểu trong 1 nút (m = ceil(M / 2) = 2).
 * - Cấu trúc RTreeEntry:
 *     - Rectangle mbr: Khung chữ nhật bao quanh phần tử.
 *     - Point point: Điểm dữ liệu (chỉ dùng nếu nút là nút lá).
 *     - std::shared_ptr<RTreeNode> child: Con trỏ tới nút con (chỉ dùng nếu là nút nhánh trong).
 * - Cấu trúc RTreeNode:
 *     - bool isLeaf: True nếu là nút lá, False nếu là nút nhánh trong.
 *     - std::vector<RTreeEntry> entries: Danh sách các phần tử trong nút.
 *     - Rectangle getBoundingBox() const: Tính MBR bao phủ tất cả entries của nút.
 *     - bool isOverfull() const: Kiểm tra entries.size() > MAX_ENTRIES.
 *     - bool isUnderfull() const: Kiểm tra entries.size() < MIN_ENTRIES.
 */

struct RTreeNode;

struct RTreeEntry {
    Rectangle mbr;
    Point point;                               // Dùng cho nút lá (Leaf)
    std::shared_ptr<RTreeNode> child = nullptr;// Dùng cho nút nhánh (Internal)

    RTreeEntry() = default;
    RTreeEntry(const Rectangle& mbr, const Point& point);
    RTreeEntry(const Rectangle& mbr, std::shared_ptr<RTreeNode> child);
};

struct RTreeNode : public std::enable_shared_from_this<RTreeNode> {
    static constexpr size_t MAX_ENTRIES = 4; // M
    static constexpr size_t MIN_ENTRIES = 2; // m = ceil(M / 2)

    bool isLeaf;
    std::vector<RTreeEntry> entries;

    explicit RTreeNode(bool isLeaf = true);

    Rectangle getBoundingBox() const;
    bool isOverfull() const;
    bool isUnderfull() const;
};

#endif // RTREENODE_H
