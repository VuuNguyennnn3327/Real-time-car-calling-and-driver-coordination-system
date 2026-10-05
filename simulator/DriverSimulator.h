#ifndef DRIVERSIMULATOR_H
#define DRIVERSIMULATOR_H

#include <string>
#include <vector>

/**
 * @file DriverSimulator.h
 * @author Vương (Người phụ trách)
 * @brief Bộ giả lập di chuyển của các tài xế quanh trung tâm TP.HCM.
 *
 * HƯỚNG DẪN DÀNH CHO AI KHI THỰC HIỆN FILE NÀY:
 * - Nhiệm vụ:
 *     1. Khởi tạo 30 - 50 tài xế rải rác quanh Quận 1, Quận 3, Bình Thạnh:
 *        Lat: 10.760 - 10.790, Lng: 106.680 - 10.710.
 *     2. Hàm step():
 *        - Mỗi chu kỳ, cộng/trừ ngẫu nhiên một khoảng nhỏ delta ([-0.0003, +0.0003]).
 *        - Gọi DispatchService::getInstance().updateDriverLocation(d.id, d.lat, d.lng).
 *        - Thao tác này kích hoạt: Delete vị trí cũ trong R-Tree -> Insert vị trí mới vào R-Tree.
 */

struct SimDriver {
    std::string id;
    std::string name;
    double lat;
    double lng;
    std::string status;
};

class DriverSimulator {
private:
    std::vector<SimDriver> drivers;
    bool running;

public:
    DriverSimulator();

    // Khởi tạo danh sách tài xế mẫu ban đầu
    void initializeSampleDrivers(int count = 50);

    // Thực hiện 1 bước dịch chuyển ngẫu nhiên
    void step();

    // Lấy danh sách tài xế giả lập hiện tại
    const std::vector<SimDriver>& getDrivers() const { return drivers; }
};

#endif // DRIVERSIMULATOR_H
