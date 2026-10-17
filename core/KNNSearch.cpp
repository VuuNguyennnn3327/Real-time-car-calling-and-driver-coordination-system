#include "KNNSearch.h"

/**
 * @file KNNSearch.cpp
 * @author Tưởng (Người phụ trách - RT-05)
 * @brief Cài đặt thuật toán Roussopoulos (1995) Best-First Search với std::priority_queue (Min-Heap).
 */
namespace {
    struct QueueElement {
        double distance;
        bool isPoint;
        Point point;
        std::shared_ptr<RTreeNode> node;

        // Định nghĩa toán tử '>' để std::priority_queue sắp xếp phần tử có khoảng cách nhỏ nhất lên đỉnh
        bool operator>(const QueueElement& other) const {
            return distance > other.distance;
        }
    };
}

std::vector<KNNResult> KNNSearch::search(const RTree& rtree, const Point& queryPoint, size_t k) {
    std::vector<KNNResult> results;
    if (k == 0 || rtree.size() == 0 || !rtree.getRoot()) {
        return results;
    }

    std::priority_queue<QueueElement, std::vector<QueueElement>, std::greater<QueueElement>> minHeap;

    // Đẩy nút Root của R-Tree vào Min-Heap với khoảng cách MINDIST
    auto root = rtree.getRoot();
    minHeap.push({root->getBoundingBox().minDistance(queryPoint), false, Point(), root});

    // Vòng lặp duyệt Best-First Search
    while (!minHeap.empty() && results.size() < k) {
        QueueElement top = minHeap.top();
        minHeap.pop();

        if (top.isPoint) {
            // Lấy ra một điểm thực tế -> Đây là điểm gần nhất tiếp theo
            results.emplace_back(top.point, top.distance);
        } else {
            auto node = top.node;
            if (!node) continue;

            if (node->isLeaf) {
                // Nút lá: Duyệt các entry chứa điểm, tính khoảng cách Euclid và đẩy vào Min-Heap
                for (const auto& entry : node->entries) {
                    double dist = queryPoint.distanceTo(entry.point);
                    minHeap.push({dist, true, entry.point, nullptr});
                }
            } else {
                // Nút nhánh: Duyệt các entry con, tính MINDIST từ MBR tới queryPoint và đẩy vào Min-Heap
                for (const auto& entry : node->entries) {
                    double dist = entry.mbr.minDistance(queryPoint);
                    minHeap.push({dist, false, Point(), entry.child});
                }
            }
        }
    }

    return results;
}