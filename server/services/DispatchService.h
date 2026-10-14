#ifndef DISPATCHSERVICE_H
#define DISPATCHSERVICE_H

#include "RTree.h"
#include "KNNSearch.h"
#include "Store.h"
#include <vector>
#include <string>

/**
 * @file DispatchService.h
 * @author Trường Vũ (Leader - Người phụ trách)
 * @brief Dịch vụ điều phối cuốc xe, kết nối trực tiếp cây R-Tree với Store nghiệp vụ.
 *
 * HƯỚNG DẪN DÀNH CHO AI KHI THỰC HIỆN FILE NÀY:
 * - Nhiệm vụ:
 *     1. Quản lý 1 đối tượng RTree đại diện cho vị trí hiện tại của các tài xế.
 *     2. Hàm findCandidatesForRide(pickupLat, pickupLng, k):
 *        - Gọi KNNSearch::search trên R-Tree để tìm k tài xế gần nhất.
 *        - Kiểm tra Store: chỉ chọn các tài xế đang AVAILABLE.
 *        - Trả về danh sách tài xế hợp lệ kèm khoảng cách.
 *     3. Hàm updateDriverLocation(driverId, lat, lng):
 *        - Cập nhật trong Store.
 *        - Xóa vị trí cũ trong R-Tree và nạp vị trí mới (Delete + Reinsert).
 */

struct DriverCandidate {
    Driver driver;
    double distanceKm;
};

struct CandidateDriverInfo {
    std::string id;
    std::string name;
    double distanceKm;
};

struct CreatedRide {
    std::string id;
    std::string status;
    double pickupLat;
    double pickupLng;
    double destLat;
    double destLng;
    std::vector<CandidateDriverInfo> candidateDrivers;
};

struct NearbyRideInfo {
    std::string id;
    double pickupLat;
    double pickupLng;
    double destLat;
    double destLng;
    std::string status;
    double distanceKm;
};

class DispatchService {
public:
    static DispatchService& getInstance() {
        static DispatchService instance;
        return instance;
    }

    // Đăng ký vị trí ban đầu của tài xế vào R-Tree
    void registerDriver(const Driver& driver);

    // Cập nhật vị trí tài xế (Delete vị trí cũ -> Insert vị trí mới vào R-Tree)
    void updateDriverLocation(const std::string& driverId, double lat, double lng);

    // Tìm các tài xế rảnh gần điểm đón của khách nhất (k-NN)
    std::vector<DriverCandidate> findCandidatesForRide(double pickupLat, double pickupLng, size_t k = 5);

    // Tạo cuốc xe mới và tìm ứng viên tài xế (dùng cho POST /api/rides)
    CreatedRide createRide(double pickupLat, double pickupLng, double destLat, double destLng);

    // Lấy danh sách cuốc xe PENDING gần vị trí tài xế (dùng cho GET /api/rides/nearby)
    std::vector<NearbyRideInfo> getNearbyPendingRides(double lat, double lng);

    // Tài xế nhận cuốc xe (dùng cho POST /api/rides/:id/accept)
    bool acceptRide(const std::string& rideId, const std::string& driverId);

    // Lấy tham chiếu đến cây R-Tree phục vụ truy vấn Range/Demo trực tiếp
    const RTree& getSpatialIndex() const;
};

#endif // DISPATCHSERVICE_H
