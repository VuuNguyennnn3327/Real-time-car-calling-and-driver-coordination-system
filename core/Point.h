#ifndef POINT_H
#define POINT_H

#include <string>
#include <cmath>
#include <iostream>

/**
 * @file Point.h
 * @author Vương (Người phụ trách)
 * @brief Cấu trúc điểm 2D biểu diễn tọa độ không gian (Kinh độ, Vĩ độ) của tài xế/khách.
 *
 * HƯỚNG DẪN DÀNH CHO AI KHI THỰC HIỆN FILE NÀY:
 * - Quy ước tọa độ: x = Longitude (Kinh độ), y = Latitude (Vĩ độ).
 * - id: Định danh duy nhất của điểm (mã tài xế như "D001", mã khách, hoặc mã test "P1").
 * - Phương thức bắt buộc:
 *     - double distanceTo(const Point& other) const: Tính khoảng cách Euclid giữa 2 điểm.
 *     - bool operator==(const Point& other) const: So sánh bằng theo id và tọa độ x, y.
 */

struct Point {
    double x;           // Longitude (Kinh độ)
    double y;           // Latitude (Vĩ độ)
    std::string id;     // Định danh

    Point(double x = 0.0, double y = 0.0, const std::string& id = "");

    // Tính khoảng cách Euclid tới điểm khác
    double distanceTo(const Point& other) const;

    // So sánh bằng
    bool operator==(const Point& other) const;

    // In thông tin điểm
    void print() const;
};

#endif // POINT_H
