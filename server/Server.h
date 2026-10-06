#ifndef SERVER_H
#define SERVER_H

#include "httplib.h"
#include <string>

/**
 * @file Server.h
 * @author Tưởng (Người phụ trách - RT-06)
 * @brief Lớp quản lý C++ Web Server chạy cổng 8080, phục vụ file tĩnh và REST API.
 */
class Server {
private:
    httplib::Server svr;
    std::string host;
    int port;
    std::string webRoot;

public:
    Server(const std::string& host = "0.0.0.0", int port = 8080, const std::string& webRoot = "./web");
    
    // Thiết lập cấu hình static files, CORS và đăng ký API routes
    void setupRoutes();
    
    // Khởi chạy Web Server
    void start();
    
    // Dừng Web Server
    void stop();
};

#endif // SERVER_H