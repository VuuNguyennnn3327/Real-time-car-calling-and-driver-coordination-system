#include "Server.h"
#include "routes/api_routes.h"
#include "DriverSimulator.h"
#include <iostream>
#include <chrono>

/**
 * @file Server.cpp
 * @author Tưởng (Người phụ trách - RT-06 / RT-18)
 * @brief Cài đặt khởi chạy HTTP Web Server và Background Thread cập nhật vị trí xe định kỳ 1s.
 */

Server::Server(const std::string& host, int port, const std::string& webRoot)
    : host(host), port(port), webRoot(webRoot) {}

Server::~Server() {
    stop();
}

void Server::setupRoutes() {
    // 1. Phục vụ static files (HTML, CSS, JS) trong thư mục ./web
    if (!svr.set_mount_point("/", webRoot)) {
        std::cerr << "[Server Warning] Khong tim thay thu muc web root: " << webRoot << std::endl;
    }

    // 2. Cấu hình CORS Handler hỗ trợ AJAX / Fetch từ trình duyệt Web
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

    // 3. Đăng ký hệ thống REST API Endpoints (RT-07)
    APIRoutes::registerRoutes(svr);
}

void Server::start() {
    setupRoutes();

    // Khởi tạo luồng chạy nền cho DriverSimulator (RT-18)
    simRunning = true;
    simThread = std::thread([this]() {
        std::cout << "[Simulator] Background thread khoi chay thanh cong..." << std::endl;
        while (simRunning) {
            // Tự động di chuyển xe, thực hiện Delete vị trí cũ và Insert vị trí mới trên R-Tree + Store
            DriverSimulator::getInstance().step(1.0);
            
            // Tần suất cập nhật vị trí: 1 giây / lần
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
    });

    std::cout << "==================================================" << std::endl;
    std::cout << "  RIDE-RTREE C++ Web Server dang chay tai:" << std::endl;
    std::cout << "  http://localhost:" << port << std::endl;
    std::cout << "  DriverSimulator: RUNNING IN BACKGROUND (step = 1s)" << std::endl;
    std::cout << "==================================================" << std::endl;

    svr.listen(host.c_str(), port);
}

void Server::stop() {
    if (simRunning) {
        simRunning = false;
        if (simThread.joinable()) {
            simThread.join();
        }
        std::cout << "[Simulator] Background thread da dung an toan." << std::endl;
    }
    svr.stop();
}

int main() {
    Server server("0.0.0.0", 8080, "./web");
    server.start();
    return 0;
}