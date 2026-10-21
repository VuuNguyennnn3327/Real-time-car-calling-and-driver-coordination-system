#include <cassert>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>

#include "dsa/r_tree.hpp"

using namespace goride::dsa;

namespace {

int total_tests = 0;
int passed_tests = 0;

void record_test(const std::string& name, bool condition, const std::string& details = "") {
    ++total_tests;
    std::cout << "[TEST " << std::setw(2) << total_tests << "] " << name << ": ";
    if (condition) {
        ++passed_tests;
        std::cout << "PASS";
    } else {
        std::cout << "FAIL";
    }
    if (!details.empty()) {
        std::cout << " (" << details << ")";
    }
    std::cout << std::endl;
}

} // namespace

int main() {
    std::cout << "==========================================================" << std::endl;
    std::cout << "      GoRide DSA Unit Test: R-Tree Spatial Index & k-NN   " << std::endl;
    std::cout << "==========================================================" << std::endl;

    // Test 1: Empty RTree properties
    {
        RTree<std::string> rtree;
        record_test("Empty R-Tree size is 0", rtree.size() == 0);
        record_test("Empty R-Tree empty() returns true", rtree.empty());
        auto knn = rtree.search_knn(10.7769, 106.7009, 5);
        record_test("Empty R-Tree search_knn returns empty vector", knn.empty());
    }

    // Test 2: Single item insertion and exact query
    {
        RTree<std::string> rtree;
        // Bến Thành Market
        rtree.insert(10.7725, 106.6980, "driver_benthanh");
        record_test("Single insertion size is 1", rtree.size() == 1);
        record_test("Single insertion empty() is false", !rtree.empty());

        auto knn = rtree.search_knn(10.7725, 106.6980, 1);
        record_test("Single item 1-NN returns 1 result", knn.size() == 1);
        if (!knn.empty()) {
            record_test("Single item 1-NN matches inserted driver ID", knn[0].data == "driver_benthanh");
            record_test("Distance to exact point is near zero", knn[0].distance_meters < 1.0);
        }
    }

    // Test 3: Multiple points k-NN ranking
    {
        RTree<std::string> rtree;
        // Seed real locations in HCMC
        // Query center: Nhà thờ Đức Bà (10.7798, 106.6990)
        rtree.insert(10.7769, 106.7009, "driver_post_office"); // ~350m
        rtree.insert(10.7725, 106.6980, "driver_benthanh");    // ~850m
        rtree.insert(10.7951, 106.7219, "driver_landmark81");  // ~3000m
        rtree.insert(10.8185, 106.6588, "driver_airport");     // ~6000m
        rtree.insert(10.7297, 106.7222, "driver_q7");          // ~6500m

        record_test("Inserted 5 drivers, size is 5", rtree.size() == 5);

        // Query top 3 nearest to Đức Bà (10.7798, 106.6990)
        auto results = rtree.search_knn(10.7798, 106.6990, 3);
        record_test("k-NN(k=3) returns exactly 3 results", results.size() == 3);

        if (results.size() >= 3) {
            record_test("Nearest driver is post office", results[0].data == "driver_post_office");
            record_test("Second nearest driver is benthanh", results[1].data == "driver_benthanh");
            record_test("Third nearest driver is landmark81", results[2].data == "driver_landmark81");

            bool ascending = (results[0].distance_meters <= results[1].distance_meters) &&
                             (results[1].distance_meters <= results[2].distance_meters);
            record_test("k-NN results are strictly ordered in ascending distance", ascending);
        }
    }

    // Test 4: Distance threshold pruning (max_distance_m)
    {
        RTree<std::string> rtree;
        rtree.insert(10.7769, 106.7009, "driver_near");   // ~350m
        rtree.insert(10.8185, 106.6588, "driver_far");    // ~6000m

        // Radius limit of 1000m: only driver_near should qualify
        auto close_results = rtree.search_knn(10.7798, 106.6990, 5, 1000.0);
        record_test("search_knn with 1000m max_distance excludes driver beyond 1km", close_results.size() == 1);
        if (!close_results.empty()) {
            record_test("Qualifying driver is driver_near", close_results[0].data == "driver_near");
        }
    }

    // Test 5: Node split when capacity exceeded (> MAX_CAPACITY = 8)
    {
        RTree<std::string, 4, 2> small_rtree; // MAX_CAPACITY=4, MIN_CAPACITY=2
        for (int i = 0; i < 20; ++i) {
            double lat = 10.70 + (i * 0.01);
            double lon = 106.60 + (i * 0.01);
            small_rtree.insert(lat, lon, "driver_" + std::to_string(i));
        }

        record_test("Capacity split handled 20 elements cleanly", small_rtree.size() == 20);

        auto knn = small_rtree.search_knn(10.70, 106.60, 3);
        record_test("k-NN query on multi-level split R-Tree returns 3 results", knn.size() == 3);
        if (!knn.empty()) {
            record_test("Closest driver is driver_0", knn[0].data == "driver_0");
        }
    }

    // Test 6: Multi-cluster insertion with > 5 * MAX_CAPACITY elements across multiple clusters
    // Verifying zero data loss through multi-level hierarchical splits and 1-NN exact point retrieval
    {
        RTree<std::string, 8, 3> cluster_rtree;
        struct Point {
            double lat;
            double lon;
            std::string id;
        };
        std::vector<Point> test_points;

        // 4 geographic clusters across HCMC:
        // Cluster A: District 1 (~10.77, ~106.69)
        // Cluster B: District 7 (~10.73, ~106.72)
        // Cluster C: Airport / Tan Binh (~10.81, ~106.66)
        // Cluster D: Thu Duc (~10.85, ~106.76)
        struct ClusterCenter {
            double base_lat;
            double base_lon;
            std::string prefix;
        };
        std::vector<ClusterCenter> clusters = {
            {10.770, 106.690, "d1_"},
            {10.730, 106.720, "d7_"},
            {10.810, 106.660, "air_"},
            {10.850, 106.760, "td_"}
        };

        // 15 points per cluster * 4 clusters = 60 points total (> 5 * 8 = 40)
        for (const auto& c : clusters) {
            for (int i = 0; i < 15; ++i) {
                double p_lat = c.base_lat + (i * 0.002);
                double p_lon = c.base_lon + (i * 0.002);
                std::string pid = c.prefix + std::to_string(i);
                test_points.push_back({p_lat, p_lon, pid});
                cluster_rtree.insert(p_lat, p_lon, pid);
            }
        }

        record_test("Multi-cluster R-Tree size is exactly 60", cluster_rtree.size() == 60);

        // Verify that EVERY SINGLE point inserted can be retrieved by 1-NN with distance ~ 0
        bool all_points_retrieved = true;
        bool all_distances_zero = true;
        for (const auto& pt : test_points) {
            auto res = cluster_rtree.search_knn(pt.lat, pt.lon, 1);
            if (res.empty() || res[0].data != pt.id) {
                all_points_retrieved = false;
            }
            if (!res.empty() && res[0].distance_meters > 1.0) {
                all_distances_zero = false;
            }
        }

        record_test("All 60 points in multi-cluster hierarchy retrieved without loss (no dropped nodes)", all_points_retrieved);
        record_test("All 60 exact 1-NN queries return distance near zero (< 1.0m)", all_distances_zero);

        // Test k-NN query on cluster center
        auto knn_d1 = cluster_rtree.search_knn(10.770, 106.690, 5);
        record_test("k-NN(k=5) query at District 1 returns 5 results", knn_d1.size() == 5);
        if (!knn_d1.empty()) {
            record_test("Nearest to D1 center is d1_0", knn_d1[0].data == "d1_0");
            record_test("D1 center distance is near zero", knn_d1[0].distance_meters < 1.0);
        }
    }

    // Summary
    std::cout << "\n==========================================================" << std::endl;
    std::cout << "R-Tree Test Execution Summary: " << passed_tests << " / " << total_tests << " PASSED" << std::endl;
    std::cout << "==========================================================" << std::endl;

    return (passed_tests == total_tests) ? 0 : 1;
}
