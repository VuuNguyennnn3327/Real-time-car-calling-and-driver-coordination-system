#ifndef SERVER_H
#define SERVER_H

/**
 * @file Server.h
 * @author Tưởng (Người phụ trách)
 * @brief Lớp quản lý vòng đời của Web Server C++.
 *
 * HƯỚNG DẪN DÀNH CHO AI KHI THỰC HIỆN FILE NÀY:
 * - Khởi tạo httplib::Server.
 * - Cấu hình svr.set_mount_point("/", "./web") để phục vụ static files trực tiếp từ thư mục web/.
 * - Đăng ký registerApiRoutes(svr).
 * - Lắng nghe tại cổng 8080 (hoặc cổng cấu hình).
 */

class Server {
private:
    int port;

public:
    explicit Server(int port = 8080);
    void start();
    void stop();
};

#endif // SERVER_H
