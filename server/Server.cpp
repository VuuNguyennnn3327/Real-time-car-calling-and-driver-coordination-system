#include "Server.h"
#include <iostream>

/**
 * @file Server.cpp
 * @author Tưởng (Người phụ trách)
 * @brief Cài đặt khởi chạy Web Server.
 */

Server::Server(int port) : port(port) {}

void Server::start() {
    std::cout << "====================================================\n";
    std::cout << "  RIDE-RTREE SERVER DANG KHOI CHAY TAI PORT " << port << "\n";
    std::cout << "  Mo trinh duyet: http://localhost:" << port << "\n";
    std::cout << "====================================================\n";
}

void Server::stop() {
    std::cout << "Server da dung.\n";
}

int main() {
    Server server(8080);
    server.start();
    return 0;
}
