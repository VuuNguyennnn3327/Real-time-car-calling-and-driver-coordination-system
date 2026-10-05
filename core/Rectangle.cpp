#include "Rectangle.h"
#include <cmath>

/**
 * @file Rectangle.cpp
 * @author Vương (Người phụ trách)
 * @brief Cài đặt các phép toán hình học trên MBR.
 */

Rectangle::Rectangle(double minX, double minY, double maxX, double maxY)
    : minX(minX), minY(minY), maxX(maxX), maxY(maxY) {}

Rectangle::Rectangle(const Point& p)
    : minX(p.x), minY(p.y), maxX(p.x), maxY(p.y) {}

double Rectangle::area() const {
    double width = maxX - minX;
    double height = maxY - minY;
    return (width > 0 && height > 0) ? (width * height) : 0.0;
}

bool Rectangle::intersects(const Rectangle& other) const {
    return !(minX > other.maxX || maxX < other.minX ||
             minY > other.maxY || maxY < other.minY);
}

bool Rectangle::contains(const Point& p) const {
    return (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
}

bool Rectangle::contains(const Rectangle& other) const {
    return (other.minX >= minX && other.maxX <= maxX &&
            other.minY >= minY && other.maxY <= maxY);
}

Rectangle Rectangle::combine(const Rectangle& other) const {
    return Rectangle(
        std::min(minX, other.minX),
        std::min(minY, other.minY),
        std::max(maxX, other.maxX),
        std::max(maxY, other.maxY)
    );
}

Rectangle Rectangle::combine(const Point& p) const {
    return combine(Rectangle(p));
}

double Rectangle::enlargementArea(const Rectangle& other) const {
    return combine(other).area() - area();
}

double Rectangle::minDistance(const Point& p) const {
    // Khoảng cách ngắn nhất từ điểm p đến MBR (MINDIST)
    double dx = 0.0;
    if (p.x < minX) dx = minX - p.x;
    else if (p.x > maxX) dx = p.x - maxX;

    double dy = 0.0;
    if (p.y < minY) dy = minY - p.y;
    else if (p.y > maxY) dy = p.y - maxY;

    return std::sqrt(dx * dx + dy * dy);
}

bool Rectangle::operator==(const Rectangle& other) const {
    const double EPSILON = 1e-7;
    return std::abs(minX - other.minX) < EPSILON &&
           std::abs(minY - other.minY) < EPSILON &&
           std::abs(maxX - other.maxX) < EPSILON &&
           std::abs(maxY - other.maxY) < EPSILON;
}

void Rectangle::print() const {
    std::cout << "Rectangle: [" << minX << ", " << minY << "] -> [" << maxX << ", " << maxY << "]\n";
}
