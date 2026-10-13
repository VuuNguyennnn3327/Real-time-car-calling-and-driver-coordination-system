#include "../../core/Point.h"
#include "../../core/Rectangle.h"
#include <iostream>
#include <cassert>
#include <cmath>

void testPoint() {
    Point p1(0.0, 0.0, "P1");
    Point p2(3.0, 4.0, "P2");
    assert(std::abs(p1.distanceTo(p2) - 5.0) < 1e-6);
    assert(p1 == Point(0.0, 0.0, "P1"));
    assert(!(p1 == p2));
    std::cout << "[PASS] Point distanceTo, operator==\n";
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
    assert(r1.contains(Rectangle(2.0, 2.0, 8.0, 8.0)) == true);
    assert(r1.contains(r2) == false);

    Rectangle combined = r1.combine(r2);
    assert(combined == Rectangle(0.0, 0.0, 15.0, 15.0));
    assert(r1.combine(inside) == r1);
    assert(std::abs(r1.enlargementArea(r2) - 125.0) < 1e-6);
    assert(std::abs(r1.minDistance(Point(13.0, 14.0)) - 5.0) < 1e-6);
    assert(std::abs(r1.minDistance(inside)) < 1e-6);

    std::cout << "[PASS] Rectangle area, intersects, contains, combine, enlargementArea, minDistance\n";
}

int main() {
    std::cout << "=== RUNNING GEOMETRY TESTS ===\n";
    testPoint();
    testRectangle();
    std::cout << "All geometry tests passed successfully!\n";
    return 0;
}
