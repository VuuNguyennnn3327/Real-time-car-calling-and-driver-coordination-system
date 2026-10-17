#ifndef API_ROUTES_H
#define API_ROUTES_H

#include "httplib.h"

/**
 * @file api_routes.h
 * @author Tưởng (Người phụ trách - RT-07)
 * @brief Khai báo hàm đăng ký 8 REST API Endpoints chuẩn định dạng JSON Contract.
 */
class APIRoutes {
public:
    static void registerRoutes(httplib::Server& svr);
};

#endif // API_ROUTES_H