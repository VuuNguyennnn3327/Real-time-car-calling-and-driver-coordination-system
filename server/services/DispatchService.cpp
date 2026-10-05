#include "DispatchService.h"

/**
 * @file DispatchService.cpp
 * @author Trường Vũ (Leader)
 * @brief Cài đặt DispatchService.
 */

void DispatchService::registerDriver(const Driver& driver) {
    Store::getInstance().addDriver(driver);
    // Lưu x = lng, y = lat vào R-Tree
    driverSpatialIndex.insert(Point(driver.lng, driver.lat, driver.id));
}

void DispatchService::updateDriverLocation(const std::string& driverId, double lat, double lng) {
    Store::getInstance().updateDriverLocation(driverId, lat, lng);
    // Cập nhật R-Tree: Delete old position -> Insert new position
    driverSpatialIndex.updatePosition(driverId, lng, lat);
}

std::vector<DriverCandidate> DispatchService::findCandidatesForRide(double pickupLat, double pickupLng, size_t k) {
    std::vector<DriverCandidate> candidates;

    // 1. Gọi trực tiếp k-NN trên R-Tree
    Point queryPoint(pickupLng, pickupLat, "PICKUP");
    auto knnResults = KNNSearch::search(driverSpatialIndex, queryPoint, k * 2); // Tìm dư để trừ tài xế BUSY

    // 2. Lọc tài xế AVAILABLE từ Store
    auto allDrivers = Store::getInstance().getAllDrivers();
    std::unordered_map<std::string, Driver> driverMap;
    for (const auto& d : allDrivers) driverMap[d.id] = d;

    for (const auto& res : knnResults) {
        if (driverMap.find(res.point.id) != driverMap.end()) {
            const auto& driver = driverMap[res.point.id];
            if (driver.status == "AVAILABLE") {
                // Đổi khoảng cách độ sang ước tính km (~111 km/độ)
                double distKm = res.distance * 111.0;
                candidates.push_back({driver, distKm});
                if (candidates.size() >= k) break;
            }
        }
    }

    return candidates;
}
