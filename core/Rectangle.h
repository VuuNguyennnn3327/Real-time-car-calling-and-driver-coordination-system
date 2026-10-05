#ifndef RECTANGLE_H
#define RECTANGLE_H

#include "Point.h"
#include <algorithm>
#include <iostream>

/**
 * @file Rectangle.h
 * @author Vương (Người phụ trách)
 * @brief Định nghĩa hình chữ nhật bao tối thiểu (Minimum Bounding Rectangle - MBR).
 *
 * HƯỚNG DẪN DÀNH CHO AI KHI THỰC HIỆN FILE NÀY:
 * - Nhiệm vụ: Cài đặt hộp bao song song với các trục tọa độ AABB.
 * - Trường dữ liệu:
 *     - double minX, minY, maxX, maxY.
 * - Phương thức bắt buộc:
 *     - double area() const: Diện tích = (maxX - minX) * (maxY - minY).
 *     - bool intersects(const Rectangle& other) const: Kiểm tra 2 hình chữ nhật có giao nhau không.
 *     - bool contains(const Point& p) const: Kiểm tra MBR có chứa điểm p không.
 *     - bool contains(const Rectangle& other) const: Kiểm tra MBR có bao trọn MBR khác không.
 *     - Rectangle combine(const Rectangle& other) const: Tạo MBR nhỏ nhất bao trọn cả 2 hình chữ nhật.
 *     - double enlargementArea(const Rectangle& other) const: Tính diện tích tăng thêm nếu gộp other vào.
 *     - double minDistance(const Point& p) const: Khoảng cách ngắn nhất từ điểm p đến MBR (dùng cho k-NN Min-Heap).
 */

struct Rectangle {
    double minX;
    double minY;
    double maxX;
    double maxY;

    Rectangle(double minX = 0.0, double minY = 0.0, double maxX = 0.0, double maxY = 0.0);
    explicit Rectangle(const Point& p); // MBR suy biến thành 1 điểm

    // Diện tích
    double area() const;

    // Kiểm tra giao cắt
    bool intersects(const Rectangle& other) const;

    // Kiểm tra bao hàm điểm
    bool contains(const Point& p) const;

    // Kiểm tra bao hàm hình chữ nhật khác
    bool contains(const Rectangle& other) const;

    // Gộp 2 MBR thành MBR lớn nhất bao trùm cả hai
    Rectangle combine(const Rectangle& other) const;

    // Gộp thêm 1 điểm
    Rectangle combine(const Point& p) const;

    // Tính diện tích nở thêm (delta Area) nếu nạp thêm MBR khác
    double enlargementArea(const Rectangle& other) const;

    // Khoảng cách Euclid ngắn nhất từ điểm p tới hình chữ nhật (MINDIST)
    double minDistance(const Point& p) const;

    // So sánh bằng
    bool operator==(const Rectangle& other) const;

    void print() const;
};

#endif // RECTANGLE_H
