/**
 * @file test_geometry.cpp
 * @author Vương (Người phụ trách)
 * @brief Unit test kiểm tra các phép toán hình học của Point và Rectangle (MBR).
 */

#include "Point.h"
#include "Rectangle.h"
#include <iostream>
#include <cassert>
#include <cmath>

void testPoint() {
    Point p1(0.0, 0.0, "P1");
    Point p2(3.0, 4.0, "P2");
    assert(std::abs(p1.distanceTo(p2) - 5.0) < 1e-6);
    std::cout << "[PASS] Point distanceTo\n";
}

void testRectangle() {
    Rectangle r1(0.0, 0.0, 10.0, 10.0);
    assert(std::abs(r1.area() - 100.0) < 1e-6);

    Rectangle r2(5.0, 5.0, 15.0, 15.0);
    assert(r1.intersects(r2) == true);

    Rectangle r3(20.0, 20.0, 30.0, 30.0);
    assert(r1.intersects(r3) == false);

    Point inside(5.0, 5.0);
    Point outside(15.0, 5.0);
    assert(r1.contains(inside) == true);
    assert(r1.contains(outside) == false);

    std::cout << "[PASS] Rectangle area, intersects, contains\n";
}

int main() {
    std::cout << "=== RUNNING GEOMETRY TESTS ===\n";
    testPoint();
    testRectangle();
    std::cout << "All geometry tests passed successfully!\n";
    return 0;
}
