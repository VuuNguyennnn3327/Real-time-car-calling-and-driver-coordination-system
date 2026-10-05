#include "Point.h"

/**
 * @file Point.cpp
 * @author Vương (Người phụ trách)
 * @brief Cài đặt các phương thức của cấu trúc Point.
 */

Point::Point(double x, double y, const std::string& id)
    : x(x), y(y), id(id) {}

double Point::distanceTo(const Point& other) const {
    double dx = x - other.x;
    double dy = y - other.y;
    return std::sqrt(dx * dx + dy * dy);
}

bool Point::operator==(const Point& other) const {
    const double EPSILON = 1e-7;
    return std::abs(x - other.x) < EPSILON &&
           std::abs(y - other.y) < EPSILON &&
           id == other.id;
}

void Point::print() const {
    std::cout << "Point[" << id << "]: (" << x << ", " << y << ")\n";
}
