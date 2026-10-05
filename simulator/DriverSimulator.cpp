#include "DriverSimulator.h"
#include "DispatchService.h"
#include <random>

/**
 * @file DriverSimulator.cpp
 * @author Vương (Người phụ trách)
 * @brief Cài đặt DriverSimulator.
 */

DriverSimulator::DriverSimulator() : running(false) {
    initializeSampleDrivers(50);
}

void DriverSimulator::initializeSampleDrivers(int count) {
    drivers.clear();
    // Tọa độ trung tâm Quận 1: 10.7769 N, 106.7009 E
    double baseLat = 10.7769;
    double baseLng = 106.7009;

    std::mt19937 rng(42); // Seed cố định để dễ test
    std::uniform_real_distribution<double> distOffset(-0.015, 0.015);

    for (int i = 1; i <= count; ++i) {
        std::string id = (i < 10 ? "D00" : "D0") + std::to_string(i);
        std::string name = "Tai xe " + std::to_string(i);
        double lat = baseLat + distOffset(rng);
        double lng = baseLng + distOffset(rng);

        SimDriver d{id, name, lat, lng, "AVAILABLE"};
        drivers.push_back(d);

        // Đăng ký vào DispatchService & R-Tree
        DispatchService::getInstance().registerDriver({id, name, lat, lng, "AVAILABLE"});
    }
}

void DriverSimulator::step() {
    static std::mt19937 rng(1337);
    static std::uniform_real_distribution<double> stepDelta(-0.0003, 0.0003);

    for (auto& d : drivers) {
        // Chỉ dịch chuyển tài xế AVAILABLE hoặc BUSY
        if (d.status != "OFFLINE") {
            d.lat += stepDelta(rng);
            d.lng += stepDelta(rng);

            // Cập nhật lên R-Tree thông qua DispatchService (Delete + Reinsert)
            DispatchService::getInstance().updateDriverLocation(d.id, d.lat, d.lng);
        }
    }
}
