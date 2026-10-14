#include "DispatchService.h"
#include <cmath>
#include <algorithm>

/**
 * @file DispatchService.cpp
 * @author Trường Vũ (Leader)
 * @brief Cài đặt DispatchService kết nối R-Tree, Store và API Routes.
 */

void DispatchService::registerDriver(const Driver& driver) {
    Store::getInstance().addDriver(driver);
}

void DispatchService::updateDriverLocation(const std::string& driverId, double lat, double lng) {
    Store::getInstance().updateDriverLocation(driverId, lat, lng);
}

const RTree& DispatchService::getSpatialIndex() const {
    return Store::getInstance().getRTree();
}

std::vector<DriverCandidate> DispatchService::findCandidatesForRide(double pickupLat, double pickupLng, size_t k) {
    std::vector<DriverCandidate> candidates;

    // 1. Gọi trực tiếp k-NN trên R-Tree trong Store
    Point queryPoint(pickupLng, pickupLat, "PICKUP");
    auto knnResults = KNNSearch::search(Store::getInstance().getRTree(), queryPoint, k * 2); // Tìm dư để trừ tài xế BUSY

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

CreatedRide DispatchService::createRide(double pickupLat, double pickupLng, double destLat, double destLng) {
    static int rideSeq = 1000;
    std::string rideId = "R" + std::to_string(++rideSeq);

    RideRequest req(rideId, pickupLat, pickupLng, destLat, destLng);
    Store::getInstance().addRide(req);

    CreatedRide ride;
    ride.id = rideId;
    ride.status = "PENDING";
    ride.pickupLat = pickupLat;
    ride.pickupLng = pickupLng;
    ride.destLat = destLat;
    ride.destLng = destLng;

    auto candidates = findCandidatesForRide(pickupLat, pickupLng, 5);
    for (const auto& cand : candidates) {
        ride.candidateDrivers.push_back({cand.driver.id, cand.driver.name, cand.distanceKm});
    }

    return ride;
}

std::vector<NearbyRideInfo> DispatchService::getNearbyPendingRides(double lat, double lng) {
    std::vector<NearbyRideInfo> result;
    auto allRides = Store::getInstance().getAllRides();

    for (const auto& r : allRides) {
        if (r.status == "PENDING") {
            double dLat = r.pickupLat - lat;
            double dLng = r.pickupLng - lng;
            double distKm = std::sqrt(dLat * dLat + dLng * dLng) * 111.0;
            result.push_back({r.id, r.pickupLat, r.pickupLng, r.destLat, r.destLng, r.status, distKm});
        }
    }

    // Sắp xếp ưu tiên cuốc xe gần nhất tới xa dần
    std::sort(result.begin(), result.end(), [](const NearbyRideInfo& a, const NearbyRideInfo& b) {
        return a.distanceKm < b.distanceKm;
    });

    return result;
}

bool DispatchService::acceptRide(const std::string& rideId, const std::string& driverId) {
    return Store::getInstance().acceptRide(rideId, driverId);
}

