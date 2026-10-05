#include "KNNSearch.h"

/**
 * @file KNNSearch.cpp
 * @author Tưởng (Người phụ trách)
 * @brief Cài đặt k-NN Best-First Search trên R-Tree sử dụng Min-Heap (std::priority_queue).
 */

namespace {
    struct QueueElement {
        double distance;
        bool isPoint;
        Point point;
        std::shared_ptr<RTreeNode> node;

        // Cho priority_queue: min-heap -> khoảng cách nhỏ hơn có độ ưu tiên cao hơn (top() là min)
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

    // Đẩy root vào Min-Heap
    auto root = rtree.getRoot();
    minHeap.push({root->getBoundingBox().minDistance(queryPoint), false, Point(), root});

    while (!minHeap.empty() && results.size() < k) {
        QueueElement top = minHeap.top();
        minHeap.pop();

        if (top.isPoint) {
            results.emplace_back(top.point, top.distance);
        } else {
            auto node = top.node;
            if (!node) continue;

            if (node->isLeaf) {
                for (const auto& entry : node->entries) {
                    double dist = queryPoint.distanceTo(entry.point);
                    minHeap.push({dist, true, entry.point, nullptr});
                }
            } else {
                for (const auto& entry : node->entries) {
                    double dist = entry.mbr.minDistance(queryPoint);
                    minHeap.push({dist, false, Point(), entry.child});
                }
            }
        }
    }

    return results;
}
