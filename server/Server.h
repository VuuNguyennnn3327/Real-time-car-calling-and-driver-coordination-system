#ifndef SERVER_H
#define SERVER_H

#include "httplib.h"
#include <string>
#include <thread>
#include <atomic>

/**
 * @file Server.h
 * @author Tưởng (Người phụ trách - RT-06 / RT-18)
 * @brief Quản lý C++ HTTP Web Server và luồng chạy nền DriverSimulator ở cổng 8080.
 */
class Server {
private:
    httplib::Server svr;
    std::string host;
    int port;
    std::string webRoot;

    // Quản lý luồng chạy nền cho DriverSimulator (RT-18)
    std::thread simThread;
    std::atomic<bool> simRunning{false};

public:
    Server(const std::string& host = "0.0.0.0", int port = 8080, const std::string& webRoot = "./web");
    ~Server();

    void setupRoutes();
    void start();
    void stop();
};

#endif // SERVER_H