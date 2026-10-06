#include "Server.h"
#include "routes/api_routes.h"
#include <iostream>

/**
 * @file Server.cpp
 * @author Tưởng (Người phụ trách - RT-06)
 */

Server::Server(const std::string& host, int port, const std::string& webRoot)
    : host(host), port(port), webRoot(webRoot) {}

void Server::setupRoutes() {
    // 1. Phục vụ các file web tĩnh (HTML, CSS, JS) trong thư mục ./web
    if (!svr.set_mount_point("/", webRoot)) {
        std::cerr << "[Server Warning] Khong tim thấy thu muc web root: " << webRoot << std::endl;
    }

    // 2. Cấu hình CORS để cho phép Web Browser gửi AJAX/Fetch Requests
    svr.set_pre_routing_handler([](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        if (req.method == "OPTIONS") {
            res.status = 200;
            return httplib::Server::HandlerResponse::Handled;
        }
        return httplib::Server::HandlerResponse::Unhandled;
    });

    // 3. Đăng ký hệ thống REST API Endpoints (Task RT-07)
    APIRoutes::registerRoutes(svr);
}

void Server::start() {
    setupRoutes();
    std::cout << "==================================================" << std::endl;
    std::cout << "  RIDE-RTREE C++ Web Server đang chạy tại:" << std::endl;
    std::cout << "  http://localhost:" << port << std::endl;
    std::cout << "  Thư mục Web Root: " << webRoot << std::endl;
    std::cout << "==================================================" << std::endl;
    
    svr.listen(host.c_str(), port);
}

void Server::stop() {
    svr.stop();
}

int main() {
    Server server("0.0.0.0", 8080, "./web");
    server.start();
    return 0;
}