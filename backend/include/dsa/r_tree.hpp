#ifndef GORIDE_DSA_R_TREE_HPP
#define GORIDE_DSA_R_TREE_HPP

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <limits>
#include <memory>
#include <queue>
#include <string>
#include <utility>
#include <vector>

namespace goride {
namespace dsa {

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

/**
 * Minimum Bounding Rectangle (MBR) for 2D WGS84 GPS Coordinates
 */
struct MBR {
    double min_lat{0.0};
    double min_lon{0.0};
    double max_lat{0.0};
    double max_lon{0.0};

    MBR()
        : min_lat(std::numeric_limits<double>::infinity()),
          min_lon(std::numeric_limits<double>::infinity()),
          max_lat(-std::numeric_limits<double>::infinity()),
          max_lon(-std::numeric_limits<double>::infinity()) {}

    MBR(double lat, double lon)
        : min_lat(lat), min_lon(lon), max_lat(lat), max_lon(lon) {}

    MBR(double min_lat, double min_lon, double max_lat, double max_lon)
        : min_lat(min_lat), min_lon(min_lon), max_lat(max_lat), max_lon(max_lon) {}

    bool is_empty() const {
        return min_lat > max_lat || min_lon > max_lon;
    }

    void expand(double lat, double lon) {
        if (is_empty()) {
            min_lat = max_lat = lat;
            min_lon = max_lon = lon;
        } else {
            min_lat = std::min(min_lat, lat);
            min_lon = std::min(min_lon, lon);
            max_lat = std::max(max_lat, lat);
            max_lon = std::max(max_lon, lon);
        }
    }

    void expand(const MBR& other) {
        if (other.is_empty()) return;
        if (is_empty()) {
            *this = other;
        } else {
            min_lat = std::min(min_lat, other.min_lat);
            min_lon = std::min(min_lon, other.min_lon);
            max_lat = std::max(max_lat, other.max_lat);
            max_lon = std::max(max_lon, other.max_lon);
        }
    }

    double area() const {
        if (is_empty()) return 0.0;
        return (max_lat - min_lat) * (max_lon - min_lon);
    }

    // Minimum distance from query coordinate (lat, lon) to MBR boundary in meters (admissible lower bound)
    double min_dist_meters(double q_lat, double q_lon) const {
        if (is_empty()) return std::numeric_limits<double>::infinity();

        double d_lat = 0.0;
        if (q_lat < min_lat) d_lat = min_lat - q_lat;
        else if (q_lat > max_lat) d_lat = q_lat - max_lat;

        double d_lon = 0.0;
        if (q_lon < min_lon) d_lon = min_lon - q_lon;
        else if (q_lon > max_lon) d_lon = q_lon - max_lon;

        // Degree to meter projection (~111.195 km per degree lat)
        double lat_m = d_lat * 111195.0;
        double lon_m = d_lon * 111195.0 * std::cos(q_lat * M_PI / 180.0);
        return std::sqrt(lat_m * lat_m + lon_m * lon_m);
    }
};

/**
 * Spatial item stored in R-Tree leaf nodes
 */
template <typename T>
struct RTreeEntry {
    double lat{0.0};
    double lon{0.0};
    T data;

    RTreeEntry() = default;
    RTreeEntry(double lat, double lon, const T& data)
        : lat(lat), lon(lon), data(data) {}
};

/**
 * Result structure for k-NN queries
 */
template <typename T>
struct KNNResult {
    T data;
    double lat{0.0};
    double lon{0.0};
    double distance_meters{0.0};
    double distance_m{0.0};

    KNNResult() = default;
    KNNResult(const T& data, double lat, double lon, double dist)
        : data(data), lat(lat), lon(lon), distance_meters(dist), distance_m(dist) {}
};

/**
 * Standard R-Tree Spatial Index for Multi-dimensional GPS Location Indexing & k-NN Candidate Retrieval
 */
template <typename T, size_t MAX_CAPACITY = 8, size_t MIN_CAPACITY = 3>
class RTree {
private:
    struct Node {
        bool is_leaf{true};
        MBR mbr;
        std::vector<RTreeEntry<T>> entries;      // For leaf nodes
        std::vector<std::shared_ptr<Node>> children; // For internal nodes

        Node(bool leaf = true) : is_leaf(leaf) {}

        void recalculate_mbr() {
            mbr = MBR();
            if (is_leaf) {
                for (const auto& e : entries) {
                    mbr.expand(e.lat, e.lon);
                }
            } else {
                for (const auto& c : children) {
                    mbr.expand(c->mbr);
                }
            }
        }
    };

    std::shared_ptr<Node> root_;
    size_t size_{0};

    static double haversine_m(double lat1, double lon1, double lat2, double lon2) {
        constexpr double R = 6371000.0;
        double dlat = (lat2 - lat1) * M_PI / 180.0;
        double dlon = (lon2 - lon1) * M_PI / 180.0;
        double a = std::sin(dlat / 2.0) * std::sin(dlat / 2.0) +
                   std::cos(lat1 * M_PI / 180.0) * std::cos(lat2 * M_PI / 180.0) *
                   std::sin(dlon / 2.0) * std::sin(dlon / 2.0);
        double c = 2.0 * std::atan2(std::sqrt(a), std::sqrt(1.0 - a));
        return R * c;
    }

    // Choose leaf node to insert an entry while recording traversal path
    void choose_leaf_path(std::shared_ptr<Node> node, double lat, double lon,
                          std::vector<std::shared_ptr<Node>>& path) {
        path.push_back(node);
        if (node->is_leaf) return;

        std::shared_ptr<Node> best_child = node->children.front();
        double min_enlargement = std::numeric_limits<double>::infinity();
        double min_area = std::numeric_limits<double>::infinity();

        for (const auto& child : node->children) {
            MBR enlarged = child->mbr;
            enlarged.expand(lat, lon);
            double enlargement = enlarged.area() - child->mbr.area();
            double area = child->mbr.area();
            if (enlargement < min_enlargement || (enlargement == min_enlargement && area < min_area)) {
                min_enlargement = enlargement;
                min_area = area;
                best_child = child;
            }
        }

        choose_leaf_path(best_child, lat, lon, path);
    }

    // Split an overflown node into two nodes using Linear/Axis-sort heuristic
    std::pair<std::shared_ptr<Node>, std::shared_ptr<Node>> split_node(std::shared_ptr<Node> node) {
        auto node1 = std::make_shared<Node>(node->is_leaf);
        auto node2 = std::make_shared<Node>(node->is_leaf);

        if (node->is_leaf) {
            double min_lat = std::numeric_limits<double>::infinity();
            double max_lat = -std::numeric_limits<double>::infinity();
            double min_lon = std::numeric_limits<double>::infinity();
            double max_lon = -std::numeric_limits<double>::infinity();
            for (const auto& e : node->entries) {
                min_lat = std::min(min_lat, e.lat);
                max_lat = std::max(max_lat, e.lat);
                min_lon = std::min(min_lon, e.lon);
                max_lon = std::max(max_lon, e.lon);
            }
            if ((max_lat - min_lat) >= (max_lon - min_lon)) {
                std::sort(node->entries.begin(), node->entries.end(),
                          [](const auto& a, const auto& b) { return a.lat < b.lat; });
            } else {
                std::sort(node->entries.begin(), node->entries.end(),
                          [](const auto& a, const auto& b) { return a.lon < b.lon; });
            }

            size_t mid = node->entries.size() / 2;
            for (size_t i = 0; i < mid; ++i) {
                node1->entries.push_back(node->entries[i]);
            }
            for (size_t i = mid; i < node->entries.size(); ++i) {
                node2->entries.push_back(node->entries[i]);
            }
        } else {
            double min_lat = std::numeric_limits<double>::infinity();
            double max_lat = -std::numeric_limits<double>::infinity();
            double min_lon = std::numeric_limits<double>::infinity();
            double max_lon = -std::numeric_limits<double>::infinity();
            for (const auto& c : node->children) {
                min_lat = std::min(min_lat, c->mbr.min_lat);
                max_lat = std::max(max_lat, c->mbr.max_lat);
                min_lon = std::min(min_lon, c->mbr.min_lon);
                max_lon = std::max(max_lon, c->mbr.max_lon);
            }
            if ((max_lat - min_lat) >= (max_lon - min_lon)) {
                std::sort(node->children.begin(), node->children.end(),
                          [](const auto& a, const auto& b) {
                              return (a->mbr.min_lat + a->mbr.max_lat) < (b->mbr.min_lat + b->mbr.max_lat);
                          });
            } else {
                std::sort(node->children.begin(), node->children.end(),
                          [](const auto& a, const auto& b) {
                              return (a->mbr.min_lon + a->mbr.max_lon) < (b->mbr.min_lon + b->mbr.max_lon);
                          });
            }

            size_t mid = node->children.size() / 2;
            for (size_t i = 0; i < mid; ++i) {
                node1->children.push_back(node->children[i]);
            }
            for (size_t i = mid; i < node->children.size(); ++i) {
                node2->children.push_back(node->children[i]);
            }
        }

        node1->recalculate_mbr();
        node2->recalculate_mbr();
        return {node1, node2};
    }

public:
    RTree() : root_(std::make_shared<Node>(true)) {}

    void clear() {
        root_ = std::make_shared<Node>(true);
        size_ = 0;
    }

    size_t size() const { return size_; }
    bool empty() const { return size_ == 0; }

    /**
     * Insert a spatial entry (lat, lon, data) into R-Tree
     */
    void insert(double lat, double lon, const T& data) {
        RTreeEntry<T> entry(lat, lon, data);

        if (root_->is_leaf && root_->entries.size() < MAX_CAPACITY) {
            root_->entries.push_back(entry);
            root_->recalculate_mbr();
            ++size_;
            return;
        }

        std::vector<std::shared_ptr<Node>> path;
        choose_leaf_path(root_, lat, lon, path);
        auto target_leaf = path.back();
        path.pop_back();

        target_leaf->entries.push_back(entry);
        target_leaf->recalculate_mbr();
        ++size_;

        if (target_leaf->entries.size() <= MAX_CAPACITY) {
            // No overflow, propagate MBR updates upwards
            for (auto rit = path.rbegin(); rit != path.rend(); ++rit) {
                (*rit)->recalculate_mbr();
            }
            return;
        }

        // Leaf overflowed, propagate split up ancestor hierarchy
        std::shared_ptr<Node> current = target_leaf;
        while (true) {
            auto [n1, n2] = split_node(current);

            if (path.empty()) {
                // Root overflowed: create new root pointing to n1 and n2
                auto new_root = std::make_shared<Node>(false);
                new_root->children.push_back(n1);
                new_root->children.push_back(n2);
                new_root->recalculate_mbr();
                root_ = new_root;
                break;
            }

            auto parent = path.back();
            path.pop_back();

            // Replace 'current' with n1, and add n2 to parent->children
            auto it = std::find(parent->children.begin(), parent->children.end(), current);
            if (it != parent->children.end()) {
                *it = n1;
                parent->children.push_back(n2);
            } else {
                parent->children.push_back(n1);
                parent->children.push_back(n2);
            }
            parent->recalculate_mbr();

            if (parent->children.size() <= MAX_CAPACITY) {
                // Parent did not overflow, update remaining ancestors
                for (auto rit = path.rbegin(); rit != path.rend(); ++rit) {
                    (*rit)->recalculate_mbr();
                }
                break;
            }

            // Parent overflowed, propagate split to grandparent
            current = parent;
        }
    }

    /**
     * Branch-and-bound k-Nearest Neighbors (k-NN) search
     * Finds up to k closest entries within max_distance_m from (q_lat, q_lon)
     */
    std::vector<KNNResult<T>> search_knn(double q_lat, double q_lon, size_t k = 5,
                                         double max_distance_m = 50000.0) const {
        std::vector<KNNResult<T>> results;
        if (empty() || k == 0) return results;

        // Min-heap for branch-and-bound traversal: pair<min_dist_meters, node_ptr>
        using QueueItem = std::pair<double, std::shared_ptr<Node>>;
        auto cmp = [](const QueueItem& a, const QueueItem& b) {
            return a.first > b.first; // Smaller distance has higher priority
        };
        std::priority_queue<QueueItem, std::vector<QueueItem>, decltype(cmp)> pq(cmp);

        // Max-heap for collecting best k candidate objects: pair<dist_meters, KNNResult>
        using CandItem = std::pair<double, KNNResult<T>>;
        auto cand_cmp = [](const CandItem& a, const CandItem& b) {
            return a.first < b.first; // Larger distance on top for easy pruning of worst
        };
        std::priority_queue<CandItem, std::vector<CandItem>, decltype(cand_cmp)> best_k(cand_cmp);

        pq.push({root_->mbr.min_dist_meters(q_lat, q_lon), root_});

        while (!pq.empty()) {
            auto [dist_bound, current_node] = pq.top();
            pq.pop();

            // Pruning condition: if the minimum possible distance to this subtree
            // is greater than our k-th best distance, prune entire subtree!
            if (best_k.size() >= k && dist_bound > best_k.top().first) {
                continue;
            }

            if (current_node->is_leaf) {
                for (const auto& entry : current_node->entries) {
                    double dist = haversine_m(q_lat, q_lon, entry.lat, entry.lon);
                    if (dist > max_distance_m) continue;

                    KNNResult<T> res(entry.data, entry.lat, entry.lon, dist);

                    if (best_k.size() < k) {
                        best_k.push({dist, res});
                    } else if (dist < best_k.top().first) {
                        best_k.pop();
                        best_k.push({dist, res});
                    }
                }
            } else {
                for (const auto& child : current_node->children) {
                    double child_dist_bound = child->mbr.min_dist_meters(q_lat, q_lon);
                    if (best_k.size() >= k && child_dist_bound > best_k.top().first) {
                        continue; // Prune child node
                    }
                    if (child_dist_bound <= max_distance_m) {
                        pq.push({child_dist_bound, child});
                    }
                }
            }
        }

        // Extract and sort results in ascending distance order
        while (!best_k.empty()) {
            results.push_back(best_k.top().second);
            best_k.pop();
        }
        std::reverse(results.begin(), results.end());

        return results;
    }
};

} // namespace dsa
} // namespace goride

#endif // GORIDE_DSA_R_TREE_HPP
