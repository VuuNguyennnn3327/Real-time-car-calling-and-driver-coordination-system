#ifndef STORE_H
#define STORE_H

#include "Point.h"
#include "RTree.h"
#if __has_include("nlohmann/json.hpp")
#include "nlohmann/json.hpp"
#define STORE_HAS_NLOHMANN_JSON 1
#elif __has_include(<nlohmann/json.hpp>)
#include <nlohmann/json.hpp>
#define STORE_HAS_NLOHMANN_JSON 1
#endif
#include <string>
#include <vector>
#include <unordered_map>
#include <mutex>

/**
 * @file Store.h
 * @author Đẹp (Người phụ trách)
 * @brief Quản lý dữ liệu tài xế và cuốc xe lưu trong RAM (Thread-safe).

struct Driver {
    std::string id;
    std::string name;
    double lat;
    double lng;
    std::string status; // AVAILABLE, BUSY, OFFLINE

    Driver(const std::string& id = "", const std::string& name = "", double lat = 0.0, double lng = 0.0, const std::string& status = "AVAILABLE")
        : id(id), name(name), lat(lat), lng(lng), status(status) {}
};

struct RideRequest {
    std::string id;
    double pickupLat;
    double pickupLng;
    double destLat;
    double destLng;
    std::string status; // PENDING, ACCEPTED, REJECTED, CANCELLED, STARTED, COMPLETED
    std::string assignedDriverId;

    RideRequest(const std::string& id = "", double pLat = 0.0, double pLng = 0.0, double dLat = 0.0, double dLng = 0.0)
        : id(id), pickupLat(pLat), pickupLng(pLng), destLat(dLat), destLng(dLng), status("PENDING"), assignedDriverId("") {}
};

class Store {
private:
    std::unordered_map<std::string, Driver> drivers;
    std::unordered_map<std::string, RideRequest> rides;
    RTree driverRTree;
    std::mutex mtx;

public:
    static Store& getInstance() {
        static Store instance;
        
        return instance;
    }

    RTree& getRTree() {
        
        return driverRTree;
    }

    const RTree& getRTree() const {
        
        return driverRTree;
    }

    void addDriver(const Driver& d) {
        std::lock_guard<std::mutex> lock(mtx);
        drivers[d.id] = d;
        driverRTree.insert(Point(d.lng, d.lat, d.id));
    }

    void updateDriverLocation(const std::string& id, double lat, double lng) {
        std::lock_guard<std::mutex> lock(mtx);
        if (drivers.find(id) != drivers.end()) {
            drivers[id].lat = lat;
            drivers[id].lng = lng;
            driverRTree.updatePosition(id, lng, lat);
        }
    }

    void updateDriverStatus(const std::string& id, const std::string& status) {
        std::lock_guard<std::mutex> lock(mtx);
        if (drivers.find(id) != drivers.end()) {
            drivers[id].status = status;
        }
    }

    std::vector<Driver> getAllDrivers() {
        std::lock_guard<std::mutex> lock(mtx);
        std::vector<Driver> result;
        result.reserve(drivers.size());
        for (const auto& pair : drivers) {
            result.push_back(pair.second);
        }
        
        return result;
    }

    void addRide(const RideRequest& r) {
        std::lock_guard<std::mutex> lock(mtx);
        rides[r.id] = r;
    }

    // =========================================================================
    // XỬ LÝ VÒNG ĐỜI CHUYẾN ĐI (RIDE LIFECYCLE)
    // =========================================================================

    // Tài xế chấp nhận cuốc xe
    bool acceptRide(const std::string& rideId, const std::string& driverId) {
        std::lock_guard<std::mutex> lock(mtx);
        if (rides.find(rideId) != rides.end() && rides[rideId].status == "PENDING") {
            rides[rideId].status = "ACCEPTED";
            rides[rideId].assignedDriverId = driverId;
            
            // Chuyển trạng thái tài xế sang bận
            if (drivers.find(driverId) != drivers.end()) {
                drivers[driverId].status = "BUSY";
            }
            
            return true;
        }
        
        return false;
    }

    // Tài xế từ chối cuốc xe
    bool rejectRide(const std::string& rideId) {
        std::lock_guard<std::mutex> lock(mtx);
        // Chỉ có thể từ chối khi đơn đang chờ (PENDING)
        if (rides.find(rideId) != rides.end() && rides[rideId].status == "PENDING") {
            rides[rideId].status = "REJECTED";
            
            return true;
        }
        
        return false;
    }

    // Khách hàng hủy cuốc xe
    bool cancelRide(const std::string& rideId) {
        std::lock_guard<std::mutex> lock(mtx);
        if (rides.find(rideId) != rides.end()) {
            std::string currentStatus = rides[rideId].status;
            
            // Không cho phép hủy nếu đã bắt đầu chạy hoặc đã hoàn thành
            if (currentStatus != "STARTED" && currentStatus != "COMPLETED" && currentStatus != "CANCELLED") {
                rides[rideId].status = "CANCELLED";
                
                // Giải phóng tài xế (nếu có) về lại trạng thái sẵn sàng
                std::string driverId = rides[rideId].assignedDriverId;
                if (!driverId.empty() && drivers.find(driverId) != drivers.end()) {
                    drivers[driverId].status = "AVAILABLE";
                }
                
                return true;
            }
        }
        
        return false;
    }

    // Tài xế bắt đầu chuyến đi
    bool startRide(const std::string& rideId) {
        std::lock_guard<std::mutex> lock(mtx);
        // Đơn phải được ACCEPTED mới có thể START
        if (rides.find(rideId) != rides.end() && rides[rideId].status == "ACCEPTED") {
            rides[rideId].status = "STARTED";
            
            return true;
        }
        
        return false;
    }

    // Tài xế hoàn thành chuyến đi
    bool completeRide(const std::string& rideId) {
        std::lock_guard<std::mutex> lock(mtx);
        // Đơn phải đang chạy (STARTED) mới có thể COMPLETE
        if (rides.find(rideId) != rides.end() && rides[rideId].status == "STARTED") {
            rides[rideId].status = "COMPLETED";
            
            // Giải phóng tài xế về lại trạng thái sẵn sàng
            std::string driverId = rides[rideId].assignedDriverId;
            if (!driverId.empty() && drivers.find(driverId) != drivers.end()) {
                drivers[driverId].status = "AVAILABLE";
            }
            
            return true;
        }
        
        return false;
    }

    // =========================================================================

    std::vector<RideRequest> getAllRides() {
        std::lock_guard<std::mutex> lock(mtx);
        std::vector<RideRequest> result;
        result.reserve(rides.size());
        for (const auto& pair : rides) {
            result.push_back(pair.second);
        }
        
        return result;
    }

#ifdef STORE_HAS_NLOHMANN_JSON
    nlohmann::json getOverview() {
        std::lock_guard<std::mutex> lock(mtx);
        nlohmann::json j;
        j["drivers"] = nlohmann::json::array();
        int totalAvailable = 0;
        int totalBusy = 0;

        for (const auto& pair : drivers) {
            const auto& d = pair.second;
            j["drivers"].push_back({
                {"id", d.id},
                {"name", d.name},
                {"lat", d.lat},
                {"lng", d.lng},
                {"status", d.status}
            });
            if (d.status == "AVAILABLE") totalAvailable++;
            else if (d.status == "BUSY") totalBusy++;
        }

        j["rides"] = nlohmann::json::array();
        for (const auto& pair : rides) {
            const auto& r = pair.second;
            j["rides"].push_back({
                {"id", r.id},
                {"pickup", {{"lat", r.pickupLat}, {"lng", r.pickupLng}}},
                {"destination", {{"lat", r.destLat}, {"lng", r.destLng}}},
                {"status", r.status},
                {"assignedDriverId", r.assignedDriverId}
            });
        }

        j["totalAvailable"] = totalAvailable;
        j["totalBusy"] = totalBusy;
        
        return j;
    }
#endif
};

#endif // STORE_H
