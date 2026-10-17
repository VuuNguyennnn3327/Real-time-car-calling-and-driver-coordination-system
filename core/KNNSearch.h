#ifndef KNNSEARCH_H
#define KNNSEARCH_H

#include "RTree.h"
#include <vector>
#include <queue>
#include <memory>

/**
 * @file KNNSearch.h
 * @author Tưởng (Người phụ trách - RT-05)
 * @brief Cấu trúc kết quả k-NN và lớp thuật toán k-NN Best-First Search sử dụng Min-Heap.
 */
struct KNNResult {
    Point point;
    double distance;

    KNNResult(const Point& point = Point(), double distance = 0.0)
        : point(point), distance(distance) {}
};

class KNNSearch {
public:
    /**
     * @brief Tìm k điểm dữ liệu/tài xế gần nhất với queryPoint trên cây R-Tree
     * @param rtree Tham chiếu cây R-Tree
     * @param queryPoint Điểm truy vấn (x = Longitude, y = Latitude)
     * @param k Số lượng điểm gần nhất cần lấy
     * @return Danh sách các KNNResult sắp xếp tăng dần theo khoảng cách
     */
    static std::vector<KNNResult> search(const RTree& rtree, const Point& queryPoint, size_t k);
};

#endif // KNNSEARCH_H