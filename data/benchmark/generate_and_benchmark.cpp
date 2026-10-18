/**
 * @file generate_and_benchmark.cpp
 * @author Đẹp (Người phụ trách)
 * @brief Mã nguồn tự động sinh dữ liệu thực tế và đo lường hiệu năng (Benchmark)
 *        giữa cấu trúc R-Tree và Naive Scan O(N).
 */

#include <iostream>
#include <vector>
#include <chrono>
#include <random>
#include <fstream>
#include <iomanip>
#include "../../core/RTree.h"
#include "../../core/NaiveScan.h"
#include "../../core/Rectangle.h"
#include "../../core/Point.h"

using namespace std;
using namespace chrono;

/**
 * @brief Hàm sinh dữ liệu JSON và thực thi đo lường thời gian
 * @param numPoints Số lượng điểm dữ liệu cần sinh (1000, 10000, 50000)
 * @param filename Tên file JSON xuất ra để làm bộ dữ liệu thực tế (Dataset)
 */
void generateAndBenchmark(int numPoints, const string& filename) {
    cout << "==================================================\n";
    cout << " BENCHMARK: " << numPoints << " DIEM\n";
    cout << "==================================================\n";

    vector<RecordItem> naiveData;
    RTree rtree;

    // Khởi tạo bộ sinh số ngẫu nhiên với seed cố định (42) để kết quả luôn nhất quán[cite: 3]
    mt19937 rng(42);
    
    // Giới hạn tọa độ ngẫu nhiên để mô phỏng khu vực trung tâm TP.HCM
    uniform_real_distribution<double> distLng(106.6000, 10.8000);
    uniform_real_distribution<double> distLat(10.7000, 10.9000);

    // Mở luồng ghi file để tạo tệp JSON
    ofstream outFile(filename);
    outFile << "[\n";

    // Tiến hành sinh điểm ngẫu nhiên và nạp vào cấu trúc dữ liệu
    for (int i = 1; i <= numPoints; ++i) {
        double x = distLng(rng);
        double y = distLat(rng);
        Rectangle mbr(x, y, x, y);

        // Chèn tọa độ vào R-Tree (Đánh chỉ mục không gian)
        rtree.insert(mbr, i);
        
        // Chèn tọa độ vào mảng tuyến tính (Dùng cho Naive Scan đối chứng)
        naiveData.push_back({i, mbr});

        // Ghi nội dung tọa độ dưới định dạng JSON
        outFile << "  {\"id\": " << i << ", \"lng\": " << x << ", \"lat\": " << y << "}";
        
        // Cú pháp JSON yêu cầu có dấu phẩy giữa các phần tử (trừ phần tử cuối)
        if (i < numPoints) {
            outFile << ",";
        }
        
        outFile << "\n";
    }
    
    outFile << "]\n";
    outFile.close();

    cout << "[INFO] Da sinh file du lieu: " << filename << "\n";

    // Định nghĩa một vùng Bounding Box mô phỏng để test Range Search
    Rectangle queryBox(106.6500, 10.7500, 106.7000, 10.8000);

    // ==============================================================
    // 1. ĐO THỜI GIAN NAIVE SCAN O(N)
    // ==============================================================
    auto startNaive = high_resolution_clock::now(); 
    auto naiveResult = NaiveScan::rangeSearch(naiveData, queryBox);
    auto endNaive = high_resolution_clock::now(); 
    
    auto durationNaive = duration_cast<microseconds>(endNaive - startNaive).count();

    // ==============================================================
    // 2. ĐO THỜI GIAN R-TREE O(log N)
    // ==============================================================
    auto startRTree = high_resolution_clock::now(); 
    auto rtreeResult = rtree.search(queryBox);
    auto endRTree = high_resolution_clock::now(); 
    
    auto durationRTree = duration_cast<microseconds>(endRTree - startRTree).count();

    // ==============================================================
    // 3. IN BÁO CÁO KẾT QUẢ SO SÁNH HIỆU NĂNG
    // ==============================================================
    cout << "--------------------------------------------------\n";
    cout << "Ket qua tim thay (Range Search): " << rtreeResult.size() << " diem.\n";
    cout << "Thoi gian Naive Scan : " << durationNaive << " micro giay\n";
    cout << "Thoi gian R-Tree     : " << durationRTree << " micro giay\n";

    // Đảm bảo không xảy ra lỗi chia cho 0 
    if (durationRTree > 0) {
        double speedup = static_cast<double>(durationNaive) / durationRTree;
        cout << "=> R-Tree nhanh hon Naive Scan: " << fixed << setprecision(2) << speedup << " lan\n";
    }
    
    cout << "==================================================\n\n";
    
    return;
}

int main() {
    // Kịch bản 1: Tập 1.000 điểm (Tải nhẹ)[cite: 5]
    generateAndBenchmark(1000, "drivers_1k.json");
    
    // Kịch bản 2: Tập 10.000 điểm (Tải trung bình, kỳ vọng R-Tree < 0.5ms)[cite: 5]
    generateAndBenchmark(10000, "drivers_10k.json");
    
    // Kịch bản 3: Tập 50.000 điểm (Stress test, kỳ vọng R-Tree nhanh hơn 100-200x)[cite: 5]
    generateAndBenchmark(50000, "drivers_50k.json");

    return 0;
}
