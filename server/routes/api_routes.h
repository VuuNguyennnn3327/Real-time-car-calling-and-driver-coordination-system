#ifndef API_ROUTES_H
#define API_ROUTES_H

/**
 * @file api_routes.h
 * @author Tưởng (Người phụ trách)
 * @brief Định nghĩa các hàm đăng ký định tuyến REST API cho Server.
 *
 * HƯỚNG DẪN DÀNH CHO AI KHI THỰC HIỆN FILE NÀY:
 * - Danh sách API bắt buộc theo Master Brief:
 *     1. GET  /api/drivers: Trả về danh sách tài xế từ Store.
 *     2. POST /api/drivers/:id/location: Cập nhật vị trí tài xế qua DispatchService.
 *     3. POST /api/rides: Tạo đơn đặt xe mới, gọi DispatchService tìm tài xế.
 *     4. GET  /api/rides/nearby: Lọc các đơn PENDING gần vị trí tài xế.
 *     5. POST /api/rides/:id/accept: Tài xế nhận đơn, đổi trạng thái.
 *     6. GET  /api/admin/overview: Lấy toàn bộ tài xế và đơn hàng cho Admin.
 *     7. POST /api/rtree/knn: Gọi trực tiếp k-NN R-Tree.
 *     8. POST /api/rtree/range: Gọi trực tiếp Range Search R-Tree.
 */

namespace httplib {
    class Server;
}

void registerApiRoutes(httplib::Server& svr);

#endif // API_ROUTES_H
