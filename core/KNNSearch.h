#ifndef KNNSEARCH_H
#define KNNSEARCH_H

#include "RTree.h"
#include <vector>
#include <queue>

/**
 * @file KNNSearch.h
 * @author Tưởng (Người phụ trách)
 * @brief Cài đặt thuật toán tìm k láng giềng gần nhất (k-NN) bằng Hàng đợi ưu tiên (Min-Heap).
 *
 * HƯỚNG DẪN DÀNH CHO AI KHI THỰC HIỆN FILE NÀY:
 * - Thuật toán: Best-First Search (Roussopoulos 1995).
 * - Cấu trúc phần tử trong Min-Heap (QueueElement):
 *     - double distance: Khoảng cách từ điểm truy vấn queryPoint đến phần tử.
 *     - bool isPoint: True nếu là điểm dữ liệu thực tế, False nếu là nút nhánh MBR.
 *     - Point point: Điểm dữ liệu (nếu isPoint == true).
 *     - std::shared_ptr<RTreeNode> node: Nút nhánh (nếu isPoint == false).
 *     - Toán tử so sánh: Khoảng cách nhỏ hơn có độ ưu tiên cao hơn (Min-Heap).
 * - Quy trình thực hiện:
 *     1. Đẩy root vào Min-Heap với distance = root->getBoundingBox().minDistance(queryPoint).
 *     2. Vòng lặp: Lấy phần tử có khoảng cách nhỏ nhất ra khỏi heap:
 *        - Nếu là Point: Đẩy vào danh sách kết quả. Khi đủ k phần tử -> DỪNG và trả về.
 *        - Nếu là Node:
 *          + Nếu là nút lá: duyệt các entry, đẩy từng entry.point vào heap với distance = queryPoint.distanceTo(entry.point).
 *          + Nếu là nút nhánh: duyệt các entry, đẩy từng entry.child vào heap với distance = entry.mbr.minDistance(queryPoint).
 */

struct KNNResult {
    Point point;
    double distance;

    KNNResult(const Point& point = Point(), double distance = 0.0)
        : point(point), distance(distance) {}
};

class KNNSearch {
public:
    // Tìm k điểm gần nhất từ điểm queryPoint trên cây rtree
    static std::vector<KNNResult> search(const RTree& rtree, const Point& queryPoint, size_t k);
};

#endif // KNNSEARCH_H
