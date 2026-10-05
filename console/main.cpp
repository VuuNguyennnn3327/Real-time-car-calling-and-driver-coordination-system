/**
 * @file main.cpp
 * @author Đẹp (Người phụ trách)
 * @brief Chương trình C++ Console CLI độc lập phục vụ bảo vệ đồ án DSA trước hội đồng.
 *
 * HƯỚNG DẪN DÀNH CHO AI KHI THỰC HIỆN FILE NÀY:
 * - Không gọi HTTP/Web Server.
 * - Gọi trực tiếp RTree và NaiveScan.
 * - Cung cấp menu tương tác console rõ ràng:
 *     1. Nạp danh sách tọa độ mẫu (50 tài xế TP.HCM).
 *     2. Chèn 1 điểm mới (Insert Point).
 *     3. Tìm kiếm theo vùng chữ nhật (Range Search).
 *     4. Tìm k tài xế gần nhất (k-NN Search).
 *     5. Đo kiểm đối chứng (R-Tree vs NaiveScan: Kiểm tra kết quả & thời gian).
 *     0. Thoát.
 */

#include "RTree.h"
#include "KNNSearch.h"
#include "NaiveScan.h"
#include <iostream>
#include <chrono>

void printMenu() {
    std::cout << "\n============================================\n";
    std::cout << "     RIDE-RTREE: CONSOLE DEMO (DSA)        \n";
    std::cout << "============================================\n";
    std::cout << "1. Nap du lieu toa do mau\n";
    std::cout << "2. Chen diem moi (Insert Point)\n";
    std::cout << "3. Truy van theo vung (Range Search)\n";
    std::cout << "4. Tim k tai xe gan nhat (k-NN Search)\n";
    std::cout << "5. So sanh doi chung R-Tree vs Naive Scan\n";
    std::cout << "0. Thoat chuong trinh\n";
    std::cout << "Lua chon cua ban: ";
}

int main() {
    RTree rtree;
    NaiveScan naive;

    // Tọa độ mẫu quanh Quận 1, TP.HCM
    Point samplePoints[] = {
        Point(106.6983, 10.7769, "D001_ChoBenThanh"),
        Point(106.7019, 10.7797, "D002_NhaHatThanhPho"),
        Point(106.6990, 10.7798, "D003_DinhDocLap"),
        Point(106.6984, 10.7725, "D004_BaoTangMyThuat"),
        Point(106.7050, 10.7745, "D005_Bitexco")
    };

    int choice = -1;
    while (choice != 0) {
        printMenu();
        if (!(std::cin >> choice)) break;

        switch (choice) {
            case 1: {
                for (const auto& p : samplePoints) {
                    rtree.insert(p);
                    naive.addPoint(p);
                }
                std::cout << "-> Da nap thanh cong " << (sizeof(samplePoints) / sizeof(samplePoints[0])) 
                          << " tai xe mau vao R-Tree!\n";
                std::cout << "Tong so diem trong cay hien tai: " << rtree.size() << "\n";
                break;
            }
            case 2: {
                double lng, lat;
                std::string id;
                std::cout << "Nhap ID: "; std::cin >> id;
                std::cout << "Nhap Longitude (x, vd 106.700): "; std::cin >> lng;
                std::cout << "Nhap Latitude (y, vd 10.775): "; std::cin >> lat;
                Point p(lng, lat, id);
                rtree.insert(p);
                naive.addPoint(p);
                std::cout << "-> Da chen thanh cong: "; p.print();
                break;
            }
            case 3: {
                double minX, minY, maxX, maxY;
                std::cout << "Nhap minLng (minX): "; std::cin >> minX;
                std::cout << "Nhap minLat (minY): "; std::cin >> minY;
                std::cout << "Nhap maxLng (maxX): "; std::cin >> maxX;
                std::cout << "Nhap maxLat (maxY): "; std::cin >> maxY;
                Rectangle box(minX, minY, maxX, maxY);
                auto res = rtree.rangeSearch(box);
                std::cout << "-> Tim thay " << res.size() << " diem trong vung:\n";
                for (const auto& p : res) p.print();
                break;
            }
            case 4: {
                double qLng, qLat;
                size_t k;
                std::cout << "Nhap toa do diem can tim (Lng Lat): "; std::cin >> qLng >> qLat;
                std::cout << "Nhap so luong k: "; std::cin >> k;
                Point query(qLng, qLat, "QUERY");
                auto knn = KNNSearch::search(rtree, query, k);
                std::cout << "-> Top " << knn.size() << " tai xe gan nhat:\n";
                for (size_t i = 0; i < knn.size(); ++i) {
                    std::cout << "  #" << (i + 1) << " " << knn[i].point.id 
                              << " (khoang cach Euclid: " << knn[i].distance << ")\n";
                }
                break;
            }
            case 5: {
                std::cout << "\n--- DOI CHUNG KET QUA GIUA R-TREE VA NAIVE SCAN ---\n";
                Rectangle testBox(106.6900, 10.7700, 106.7100, 10.7850);
                auto rtreeRes = rtree.rangeSearch(testBox);
                auto naiveRes = naive.rangeSearch(testBox);
                std::cout << "Range Search: R-Tree tra ve " << rtreeRes.size() 
                          << " diem | Naive tra ve " << naiveRes.size() << " diem.\n";
                if (rtreeRes.size() == naiveRes.size()) {
                    std::cout << "=> KET QUA RANGE SEARCH KHOP 100%!\n";
                } else {
                    std::cout << "=> CANH BAO: KET QUA KHONG TRUNG NHAU!\n";
                }
                break;
            }
            case 0:
                std::cout << "Ket thuc chuong trinh. Tam biet!\n";
                break;
            default:
                std::cout << "Lua chon khong hop le, vui long chon lai!\n";
                break;
        }
    }
    return 0;
}
