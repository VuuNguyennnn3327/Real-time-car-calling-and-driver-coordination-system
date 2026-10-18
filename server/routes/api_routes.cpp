#include "api_routes.h"
#include "storage/Store.h"
#include "services/DispatchService.h"
#include "config/DemoRegion.h"
#include "KNNSearch.h"
#include "nlohmann/json.hpp"
#include <cmath>
#include <iostream>
#include <stdexcept>
#include <string>

using json = nlohmann::json;

namespace {

double readRequiredNumber(const json& object, const char* key) {
    if (!object.is_object() || !object.contains(key) || !object[key].is_number()) {
        throw std::invalid_argument(std::string("Missing or invalid numeric field: ") + key);
    }

    const double value = object[key].get<double>();
    if (!std::isfinite(value)) {
        throw std::invalid_argument(std::string("Field must be finite: ") + key);
    }
    return value;
}

void sendBadRequest(httplib::Response& res, const std::string& message) {
    res.status = 400;
    res.set_content(json({{"error", message}}).dump(), "application/json");
}

double readQueryNumber(const std::string& raw, const char* key) {
    size_t parsed = 0;
    const double value = std::stod(raw, &parsed);
    if (parsed != raw.size() || !std::isfinite(value)) {
        throw std::invalid_argument(std::string("Invalid numeric query parameter: ") + key);
    }
    return value;
}

void validateCoordinateOrThrow(const char* label, double lat, double lng) {
    const std::string error = DemoRegion::coordinateError(label, lat, lng);
    if (!error.empty()) {
        throw std::invalid_argument(error);
    }
}

} // namespace

/**
 * @file api_routes.cpp
 * @author Tưởng (Người phụ trách - RT-07)
 * @brief Cài đặt logic xử lý REST API; giới hạn tọa độ demo dùng chung tại server/config/DemoRegion.h.
 */
void APIRoutes::registerRoutes(httplib::Server& svr) {

    // 1. GET /api/drivers - Lấy danh sách toàn bộ tài xế
    svr.Get("/api/drivers", [](const httplib::Request& req, httplib::Response& res) {
        auto drivers = Store::getInstance().getAllDrivers();
        json j = json::array();
        for (const auto& d : drivers) {
            j.push_back({
                {"id", d.id},
                {"name", d.name},
                {"lat", d.lat},
                {"lng", d.lng},
                {"status", d.status}
            });
        }
        res.set_content(j.dump(), "application/json");
    });

    // 2. POST /api/rides - Khách hàng tạo yêu cầu đặt xe.
    // Cả điểm đón và điểm đến phải nằm trong vùng demo đã cấu hình.
    svr.Post("/api/rides", [](const httplib::Request& req, httplib::Response& res) {
        try {
            const auto body = json::parse(req.body);
            if (!body.is_object() || !body.contains("pickup") ||
                !body["pickup"].is_object() || !body.contains("destination") ||
                !body["destination"].is_object()) {
                throw std::invalid_argument("Expected pickup and destination objects");
            }

            const double pickupLat = readRequiredNumber(body["pickup"], "lat");
            const double pickupLng = readRequiredNumber(body["pickup"], "lng");
            const double destLat = readRequiredNumber(body["destination"], "lat");
            const double destLng = readRequiredNumber(body["destination"], "lng");

            validateCoordinateOrThrow("pickup", pickupLat, pickupLng);
            validateCoordinateOrThrow("destination", destLat, destLng);

            const auto ride = DispatchService::getInstance().createRide(
                pickupLat, pickupLng, destLat, destLng);

            json responseJson = {
                {"id", ride.id},
                {"status", ride.status},
                {"pickup", {{"lat", ride.pickupLat}, {"lng", ride.pickupLng}}},
                {"destination", {{"lat", ride.destLat}, {"lng", ride.destLng}}},
                {"candidateDrivers", json::array()}
            };

            for (const auto& cand : ride.candidateDrivers) {
                responseJson["candidateDrivers"].push_back({
                    {"id", cand.id},
                    {"name", cand.name},
                    {"distanceKm", cand.distanceKm}
                });
            }
            res.set_content(responseJson.dump(), "application/json");
        } catch (const std::exception& e) {
            sendBadRequest(res, e.what());
        }
    });

    // 3. GET /api/rides/nearby - Vị trí truy vấn phải nằm trong vùng demo.
    svr.Get("/api/rides/nearby", [](const httplib::Request& req, httplib::Response& res) {
        try {
            if (!req.has_param("lat") || !req.has_param("lng")) {
                throw std::invalid_argument("Missing lat or lng parameter");
            }

            const double lat = readQueryNumber(req.get_param_value("lat"), "lat");
            const double lng = readQueryNumber(req.get_param_value("lng"), "lng");
            validateCoordinateOrThrow("query location", lat, lng);

            const auto nearbyRides = DispatchService::getInstance().getNearbyPendingRides(lat, lng);
            json j = json::array();
            for (const auto& r : nearbyRides) {
                j.push_back({
                    {"id", r.id},
                    {"pickup", {{"lat", r.pickupLat}, {"lng", r.pickupLng}}},
                    {"destination", {{"lat", r.destLat}, {"lng", r.destLng}}},
                    {"status", r.status},
                    {"distanceKm", r.distanceKm}
                });
            }
            res.set_content(j.dump(), "application/json");
        } catch (const std::exception& e) {
            sendBadRequest(res, e.what());
        }
    });

    // 4. POST /api/rides/{id}/accept - Tài xế nhận đơn
    svr.Post(R"(/api/rides/([^/]+)/accept)", [](const httplib::Request& req, httplib::Response& res) {
        std::string rideId = req.matches[1];
        try {
            auto body = json::parse(req.body);
            std::string driverId = body["driverId"];

            bool success = DispatchService::getInstance().acceptRide(rideId, driverId);
            if (success) {
                res.set_content(json({
                    {"success", true},
                    {"rideId", rideId},
                    {"status", "ACCEPTED"},
                    {"driverId", driverId}
                }).dump(), "application/json");
            } else {
                res.status = 400;
                res.set_content(json({
                    {"success", false},
                    {"message", "Ride already accepted or driver busy"}
                }).dump(), "application/json");
            }
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content(json({{"error", e.what()}}).dump(), "application/json");
        }
    });

    // 5. GET /api/admin/overview - Admin lấy tổng quan toàn bộ hệ thống
    svr.Get("/api/admin/overview", [](const httplib::Request& req, httplib::Response& res) {
        auto overview = Store::getInstance().getOverview();
        res.set_content(overview.dump(), "application/json");
    });

    // 6. POST /api/rtree/knn - Truy vấn k-NN chỉ trong vùng demo.
    svr.Post("/api/rtree/knn", [](const httplib::Request& req, httplib::Response& res) {
        try {
            const auto body = json::parse(req.body);
            const double lat = readRequiredNumber(body, "lat");
            const double lng = readRequiredNumber(body, "lng");
            validateCoordinateOrThrow("query location", lat, lng);

            size_t k = 3;

            if (body.contains("k")) {
                if (!body["k"].is_number_integer()) {
                    throw std::invalid_argument("k must be an integer between 1 and 50");
                }

                const auto rawK = body["k"].get<long long>();

                if (rawK < 1 || rawK > 50) {
                    throw std::invalid_argument("k must be between 1 and 50");
                }

                k = static_cast<size_t>(rawK);
            }

            const Point queryPt(lng, lat);
            const auto results = KNNSearch::search(Store::getInstance().getRTree(), queryPt, k);
            json resArray = json::array();
            for (const auto& item : results) {
                resArray.push_back({
                    {"id", item.point.id},
                    {"lat", item.point.y},
                    {"lng", item.point.x},
                    {"distance", item.distance}
                });
            }
            res.set_content(resArray.dump(), "application/json");
        } catch (const std::exception& e) {
            sendBadRequest(res, e.what());
        }
    });

    // 7. POST /api/rtree/range - MBR phải hợp lệ và nằm hoàn toàn trong vùng demo.
    svr.Post("/api/rtree/range", [](const httplib::Request& req, httplib::Response& res) {
        try {
            const auto body = json::parse(req.body);
            const double minLng = readRequiredNumber(body, "minLng");
            const double minLat = readRequiredNumber(body, "minLat");
            const double maxLng = readRequiredNumber(body, "maxLng");
            const double maxLat = readRequiredNumber(body, "maxLat");

            if (minLng > maxLng || minLat > maxLat) {
                throw std::invalid_argument("Invalid range: minimum coordinates must not exceed maximum coordinates");
            }
            validateCoordinateOrThrow("range minimum", minLat, minLng);
            validateCoordinateOrThrow("range maximum", maxLat, maxLng);

            const Rectangle rangeMbr(minLng, minLat, maxLng, maxLat);
            const auto points = Store::getInstance().getRTree().rangeSearch(rangeMbr);
            json resArray = json::array();
            for (const auto& pt : points) {
                resArray.push_back({
                    {"id", pt.id},
                    {"lat", pt.y},
                    {"lng", pt.x}
                });
            }
            res.set_content(resArray.dump(), "application/json");
        } catch (const std::exception& e) {
            sendBadRequest(res, e.what());
        }
    });

    // 8. GET /api/rtree/structure - Lấy MBR đa tầng trực quan hóa cây
    svr.Get("/api/rtree/structure", [](const httplib::Request& req, httplib::Response& res) {
        const json structure = Store::getInstance().getRTree().getTreeStructureJson();
        res.set_content(structure.dump(), "application/json");
    });
}
