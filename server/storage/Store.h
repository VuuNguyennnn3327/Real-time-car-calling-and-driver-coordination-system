#ifndef STORE_H
#define STORE_H

#include "Point.h"
#include <string>
#include <vector>
#include <unordered_map>
#include <mutex>

/**
 * @file Store.h
 * @author Đẹp (Người phụ trách)
 * @brief Quản lý dữ liệu tài xế và cuốc xe lưu trong RAM (Thread-safe).
 *
 * HƯỚNG DẪN DÀNH CHO AI KHI THỰC HIỆN FILE NÀY:
 * - Driver Model:
 *     - id (std::string), name (std::string), lat (double), lng (double), status ("AVAILABLE", "BUSY", "OFFLINE").
 * - Ride Request Model:
 *     - id (std::string), pickupLat (double), pickupLng (double), destLat (double), destLng (double),
 *     - status ("PENDING", "ACCEPTED", "COMPLETED"), assignedDriverId (std::string).
 * - Phương thức:
 *     - Lưu trữ dùng std::unordered_map<std::string, Driver> và std::unordered_map<std::string, RideRequest>.
 *     - Sử dụng std::mutex để đảm bảo thread-safe khi server đa luồng gọi.
 */

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
    std::string status; // PENDING, ACCEPTED, COMPLETED
    std::string assignedDriverId;

    RideRequest(const std::string& id = "", double pLat = 0.0, double pLng = 0.0, double dLat = 0.0, double dLng = 0.0)
        : id(id), pickupLat(pLat), pickupLng(pLng), destLat(dLat), destLng(dLng), status("PENDING"), assignedDriverId("") {}
};

class Store {
private:
    std::unordered_map<std::string, Driver> drivers;
    std::unordered_map<std::string, RideRequest> rides;
    std::mutex mtx;

public:
    static Store& getInstance() {
        static Store instance;
        return instance;
    }

    void addDriver(const Driver& d) {
        std::lock_guard<std::mutex> lock(mtx);
        drivers[d.id] = d;
    }

    void updateDriverLocation(const std::string& id, double lat, double lng) {
        std::lock_guard<std::mutex> lock(mtx);
        if (drivers.find(id) != drivers.end()) {
            drivers[id].lat = lat;
            drivers[id].lng = lng;
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

    bool acceptRide(const std::string& rideId, const std::string& driverId) {
        std::lock_guard<std::mutex> lock(mtx);
        if (rides.find(rideId) != rides.end() && rides[rideId].status == "PENDING") {
            rides[rideId].status = "ACCEPTED";
            rides[rideId].assignedDriverId = driverId;
            if (drivers.find(driverId) != drivers.end()) {
                drivers[driverId].status = "BUSY";
            }
            return true;
        }
        return false;
    }

    std::vector<RideRequest> getAllRides() {
        std::lock_guard<std::mutex> lock(mtx);
        std::vector<RideRequest> result;
        result.reserve(rides.size());
        for (const auto& pair : rides) {
            result.push_back(pair.second);
        }
        return result;
    }
};

#endif // STORE_H
