#ifndef API_ROUTES_H
#define API_ROUTES_H

#include "httplib.h"

/**
 * @file api_routes.h
 * @author Tưởng (Người phụ trách - RT-07)
 * @brief Đăng ký 8 REST API Endpoints theo đúng hợp đồng JSON Contract dự án.
 */
class APIRoutes {
public:
    static void registerRoutes(httplib::Server& svr);
};

#endif // API_ROUTES_H
```[cite: 1]

---

### 📄 2. Mã nguồn file `server/routes/api_routes.cpp`

```cpp
#include "api_routes.h"
#include "storage/Store.h"
#include "services/DispatchService.h"
#include "KNNSearch.h"
#include "nlohmann/json.hpp"
#include <iostream>

using json = nlohmann::json;

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

    // 2. POST /api/rides - Khách hàng tạo yêu cầu đặt xe
    svr.Post("/api/rides", [](const httplib::Request& req, httplib::Response& res) {
        try {
            auto body = json::parse(req.body);
            double pickupLat = body["pickup"]["lat"];
            double pickupLng = body["pickup"]["lng"];
            double destLat = body["destination"]["lat"];
            double destLng = body["destination"]["lng"];

            auto ride = DispatchService::getInstance().createRide(pickupLat, pickupLng, destLat, destLng);
            
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
            res.status = 400;
            res.set_content(json({{"error", e.what()}}).dump(), "application/json");
        }
    });

    // 3. GET /api/rides/nearby - Tài xế lấy danh sách đơn chờ gần vị trí của mình
    svr.Get("/api/rides/nearby", [](const httplib::Request& req, httplib::Response& res) {
        if (!req.has_param("lat") || !req.has_param("lng")) {
            res.status = 400;
            res.set_content(json({{"error", "Missing lat or lng parameter"}}).dump(), "application/json");
            return;
        }

        double lat = std::stod(req.get_param_value("lat"));
        double lng = std::stod(req.get_param_value("lng"));

        auto nearbyRides = DispatchService::getInstance().getNearbyPendingRides(lat, lng);
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
                res.set_content(json({{"success", false}, {"message", "Ride already accepted or driver busy"}}).dump(), "application/json");
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

    // 6. POST /api/rtree/knn - Trực quan hóa k-NN Search
    svr.Post("/api/rtree/knn", [](const httplib::Request& req, httplib::Response& res) {
        try {
            auto body = json::parse(req.body);
            double lat = body["lat"];
            double lng = body["lng"];
            size_t k = body.value("k", 3);

            Point queryPt(lng, lat);
            auto results = KNNSearch::search(Store::getInstance().getRTree(), queryPt, k);

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
            res.status = 400;
            res.set_content(json({{"error", e.what()}}).dump(), "application/json");
        }
    });

    // 7. POST /api/rtree/range - Range Search theo MBR
    svr.Post("/api/rtree/range", [](const httplib::Request& req, httplib::Response& res) {
        try {
            auto body = json::parse(req.body);
            Rectangle rangeMbr(body["minLng"], body["minLat"], body["maxLng"], body["maxLat"]);

            auto points = Store::getInstance().getRTree().rangeSearch(rangeMbr);
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
            res.status = 400;
            res.set_content(json({{"error", e.what()}}).dump(), "application/json");
        }
    });

    // 8. GET /api/rtree/structure - Lấy MBR đa tầng trực quan hóa cây
    svr.Get("/api/rtree/structure", [](const httplib::Request& req, httplib::Response& res) {
        json structure = Store::getInstance().getRTree().getTreeStructureJson();
        res.set_content(structure.dump(), "application/json");
    });
}
```[cite: 1]

---

### 🚀 Quy trình biên dịch, kiểm thử và push code:

1. **Đồng bộ code mới nhất từ GitHub về máy:**
   ```bash
   git pull origin main
   ```[cite: 1, 2]

2. **Cập nhật nội dung 2 file:**
   Mở và dán đoạn mã trên vào `server/routes/api_routes.h` và `server/routes/api_routes.cpp` trong VS Code[cite: 1, 5].

3. **Biên dịch và chạy thử Web Server:**
   ```bash
   cd build
   cmake --build .
   .\server_app.exe
   ```[cite: 1, 7]
   *(Mở trình duyệt truy cập `http://localhost:8080` để test tương tác giữa `customer.html`, `driver.html`, `admin.html` và `rtree-demo.html`)*[cite: 1, 7].

4. **Tạo Commit và Push hoàn thành Task RT-07:**
   ```bash
   git add server/routes/api_routes.h server/routes/api_routes.cpp
   git commit --author="Tuong <6651071092@st.utc2.edu.vn>" -m "feat(server): [RT-07] connect REST API endpoints with DispatchService and R-Tree core"
   git push origin main
   ```[cite: 1, 6, 9]