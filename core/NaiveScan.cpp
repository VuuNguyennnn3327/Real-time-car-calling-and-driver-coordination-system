#include "NaiveScan.h"
#include <algorithm>

/**
 * @file NaiveScan.cpp
 * @author Đẹp (Người phụ trách)
 * @brief Cài đặt NaiveScan O(N).
 */

void NaiveScan::addPoint(const Point& p) {
    points.push_back(p);
}

void NaiveScan::clear() {
    points.clear();
}

size_t NaiveScan::size() const {
    return points.size();
}

std::vector<Point> NaiveScan::rangeSearch(const Rectangle& queryBox) const {
    std::vector<Point> results;
    for (const auto& p : points) {
        if (queryBox.contains(p)) {
            results.push_back(p);
        }
    }
    return results;
}

std::vector<KNNResult> NaiveScan::knnSearch(const Point& queryPoint, size_t k) const {
    std::vector<KNNResult> all;
    all.reserve(points.size());

    for (const auto& p : points) {
        all.emplace_back(p, queryPoint.distanceTo(p));
    }

    std::sort(all.begin(), all.end(), [](const KNNResult& a, const KNNResult& b) {
        return a.distance < b.distance;
    });

    if (k < all.size()) {
        all.resize(k);
    }
    return all;
}
