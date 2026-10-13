#ifndef POINT_H
#define POINT_H

#include <string>
#include <cmath>
#include <iostream>

/**
 * @file Point.h
 * @author Vương (Người phụ trách)
 * @brief Định nghĩa điểm tọa độ 2D đại diện cho tài xế hoặc điểm đón/trả khách.
 *
 * HƯỚNG DẪN DÀNH CHO AI KHI THỰC HIỆN FILE NÀY:
 * - Nhiệm vụ: Cài đặt cấu trúc Point biểu diễn tọa độ địa lý (x = lng/kinh độ, y = lat/vĩ độ).
 * - Trường dữ liệu:
 *     - double x: Kinh độ (longitude).
 *     - double y: Vĩ độ (latitude).
 *     - std::string id: Mã định danh (ví dụ "D001" cho tài xế, "R001" cho cuốc xe).
 * - Phương thức bắt buộc:
 *     - Constructor mặc định và Constructor có tham số.
 *     - double distanceTo(const Point& other) const: Tính khoảng cách Euclid giữa 2 điểm:
 *       sqrt((x - other.x)^2 + (y - other.y)^2).
 *     - bool operator==(const Point& other) const: So sánh bằng dựa trên x, y, id.
 */

struct Point {
    double x;        // Longitude (Kinh độ)
    double y;        // Latitude (Vĩ độ)
    std::string id;  // Mã đối tượng (ví dụ: "D001", "P_PICKUP")

    Point(double x = 0.0, double y = 0.0, const std::string& id = "");

    // Tính khoảng cách Euclid đến điểm khác
    double distanceTo(const Point& other) const;

    // So sánh bằng
    bool operator==(const Point& other) const;

    // In thông tin điểm
    void print() const;
};

#endif // POINT_H
