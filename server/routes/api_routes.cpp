#include "api_routes.h"
#include "DispatchService.h"
#include "Store.h"
#include <iostream>

/**
 * @file api_routes.cpp
 * @author Tưởng (Người phụ trách)
 * @brief Cài đặt chi tiết các endpoint REST API.
 */

// Placeholder đăng ký route: khi nạp thư viện cpp-httplib, Tưởng sẽ hoàn thiện chi tiết
void registerApiRoutes(httplib::Server& /*svr*/) {
    std::cout << "[Routes] Da khoi tao danh sach REST API endpoints:\n";
    std::cout << "  - GET  /api/drivers\n";
    std::cout << "  - POST /api/drivers/:id/location\n";
    std::cout << "  - POST /api/rides\n";
    std::cout << "  - GET  /api/rides/nearby\n";
    std::cout << "  - POST /api/rides/:id/accept\n";
    std::cout << "  - GET  /api/admin/overview\n";
    std::cout << "  - POST /api/rtree/knn\n";
    std::cout << "  - POST /api/rtree/range\n";
}
