/**
 * @file test_rtree.cpp
 * @author Đẹp (Người phụ trách)
 * @brief Kiểm thử đối chứng tính đúng đắn: R-Tree khớp 100% với Naive Scan.
 */

#include "RTree.h"
#include "KNNSearch.h"
#include "NaiveScan.h"
#include <iostream>
#include <cassert>
#include <random>
#include <algorithm>

void testCorrectness() {
    RTree rtree;
    NaiveScan naive;

    // Sinh ngẫu nhiên 200 điểm tọa độ trong miền [0, 100]
    std::mt19937 rng(42);
    std::uniform_real_distribution<double> dist(0.0, 100.0);

    for (int i = 0; i < 200; ++i) {
        Point p(dist(rng), dist(rng), "P" + std::to_string(i));
        rtree.insert(p);
        naive.addPoint(p);
    }
    assert(rtree.size() == 200);
    std::cout << "[PASS] Insert 200 points: rtree.size() == " << rtree.size() << "\n";

    // 1. Kiểm thử Range Search toàn không gian [0, 100] x [0, 100]
    Rectangle fullSpace(0.0, 0.0, 100.0, 100.0);
    auto allRTree = rtree.rangeSearch(fullSpace);
    assert(allRTree.size() == 200);
    std::cout << "[PASS] Full space Range Search: 200/200 points recovered!\n";

    // 2. Kiểm thử Range Search vùng con [20, 50] x [20, 50]
    Rectangle queryBox(20.0, 20.0, 50.0, 50.0);
    auto rtreeRange = rtree.rangeSearch(queryBox);
    auto naiveRange = naive.rangeSearch(queryBox);
    assert(rtreeRange.size() == naiveRange.size());

    // Sắp xếp để kiểm tra từng phần tử khớp 100%
    std::sort(rtreeRange.begin(), rtreeRange.end(), [](const Point& a, const Point& b) { return a.id < b.id; });
    std::sort(naiveRange.begin(), naiveRange.end(), [](const Point& a, const Point& b) { return a.id < b.id; });
    for (size_t i = 0; i < rtreeRange.size(); ++i) {
        assert(rtreeRange[i].id == naiveRange[i].id);
    }
    std::cout << "[PASS] Sub-region Range Search: " << rtreeRange.size() << " points 100% matched with NaiveScan!\n";

    // 3. Kiểm thử k-NN Search
    Point queryPoint(40.0, 40.0);
    auto rtreeKNN = KNNSearch::search(rtree, queryPoint, 5);
    auto naiveKNN = naive.knnSearch(queryPoint, 5);
    assert(rtreeKNN.size() == naiveKNN.size());
    for (size_t i = 0; i < rtreeKNN.size(); ++i) {
        assert(rtreeKNN[i].point.id == naiveKNN[i].point.id);
        assert(std::abs(rtreeKNN[i].distance - naiveKNN[i].distance) < 1e-6);
    }
    std::cout << "[PASS] k-NN Search: 5 nearest neighbors perfectly matched!\n";

    // 4. Kiểm thử Xóa điểm & Cập nhật vị trí (Delete + Reinsert)
    assert(rtree.deletePoint("P0") == true);
    assert(rtree.size() == 199);
    auto afterDelete = rtree.rangeSearch(fullSpace);
    assert(afterDelete.size() == 199);
    std::cout << "[PASS] Delete point: P0 successfully removed, tree size is 199!\n";

    rtree.updatePosition("P0", 50.0, 50.0);
    assert(rtree.size() == 200);
    std::cout << "[PASS] Update point position: P0 re-inserted successfully!\n";
}

int main() {
    std::cout << "=== RUNNING RTREE CORRECTNESS TESTS ===\n";
    testCorrectness();
    std::cout << "\n============================================\n";
    std::cout << "All R-Tree tests passed successfully (100%)!\n";
    std::cout << "============================================\n";
    return 0;
}
