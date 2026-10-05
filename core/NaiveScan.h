#ifndef NAIVESCAN_H
#define NAIVESCAN_H

#include "Point.h"
#include "Rectangle.h"
#include "KNNSearch.h"
#include <vector>

/**
 * @file NaiveScan.h
 * @author Đẹp (Người phụ trách)
 * @brief Cài đặt thuật toán đối chứng quét tuyến tính mảng O(N).
 *
 * HƯỚNG DẪN DÀNH CHO AI KHI THỰC HIỆN FILE NÀY:
 * - Nhiệm vụ: Duyệt mảng tuần tự for-loop thuần túy để tìm Range Search và k-NN.
 * - Mục đích:
 *     1. Dùng làm "trọng tài" đối chứng kết quả: Kết quả của RTree và NaiveScan PHẢI trùng khớp 100%.
 *     2. Dùng để đo kiểm tốc độ (Benchmark): Đo thời gian O(N) so với O(log N) của R-Tree.
 */

class NaiveScan {
private:
    std::vector<Point> points;

public:
    NaiveScan() = default;

    void addPoint(const Point& p);
    void clear();
    size_t size() const;

    // Quét tuần tự O(N) cho Range Query
    std::vector<Point> rangeSearch(const Rectangle& queryBox) const;

    // Quét tuần tự O(N log N) cho k-NN
    std::vector<KNNResult> knnSearch(const Point& queryPoint, size_t k) const;
};

#endif // NAIVESCAN_H
