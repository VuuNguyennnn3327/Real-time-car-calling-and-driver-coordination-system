#include "RTree.h"
#include <limits>
#include <algorithm>

/**
 * @file RTree.cpp
 * @author Trường Vũ (Leader)
 * @brief Cài đặt cấu trúc cây R-Tree và các giải thuật Guttman 1984 đã fix lỗi adjustTree.
 */

RTree::RTree()
    : root(std::make_shared<RTreeNode>(true)), totalPoints(0) {}

void RTree::insert(const Point& p) {
    RTreeEntry newEntry(Rectangle(p), p);

    // 1. Duyệt từ gốc xuống lá, ghi lại TOÀN BỘ đường đi (path)
    std::vector<std::shared_ptr<RTreeNode>> path;
    path.push_back(root);
    std::shared_ptr<RTreeNode> node = root;

    while (!node->isLeaf) {
        double minEnlargement = std::numeric_limits<double>::infinity();
        double minArea = std::numeric_limits<double>::infinity();
        size_t bestIdx = 0;
        Rectangle pointMbr(p);

        for (size_t i = 0; i < node->entries.size(); ++i) {
            double enlargement = node->entries[i].mbr.enlargementArea(pointMbr);
            double area = node->entries[i].mbr.area();
            if (enlargement < minEnlargement || (enlargement == minEnlargement && area < minArea)) {
                minEnlargement = enlargement;
                minArea = area;
                bestIdx = i;
            }
        }
        node = node->entries[bestIdx].child;
        path.push_back(node);
    }

    // 2. Thêm entry vào nút lá
    node->entries.push_back(newEntry);
    totalPoints++;

    // 3. Tách nút nếu bị tràn
    std::shared_ptr<RTreeNode> splitSibling = nullptr;
    if (node->isOverfull()) {
        splitNode(node, splitSibling);
    }

    // 4. Điều chỉnh MBR và lan truyền phân tách ngược lên gốc
    adjustTree(path, splitSibling);
}

void RTree::adjustTree(std::vector<std::shared_ptr<RTreeNode>>& path,
                       std::shared_ptr<RTreeNode> splitSibling) {
    // Đi ngược từ cha của lá lên tới gốc
    for (int i = (int)path.size() - 2; i >= 0; --i) {
        auto parent = path[i];
        auto child  = path[i + 1];

        // (a) Cập nhật lại MBR của entry trỏ tới child
        for (auto& entry : parent->entries) {
            if (entry.child == child) {
                entry.mbr = child->getBoundingBox();
                break;
            }
        }

        // (b) Nếu tầng dưới vừa tách, gắn nút mới vào parent rồi kiểm tra parent có tràn không
        if (splitSibling) {
            parent->entries.emplace_back(splitSibling->getBoundingBox(), splitSibling);
            splitSibling = nullptr;
            if (parent->isOverfull()) {
                splitNode(parent, splitSibling);
            }
        }
    }

    // Nếu đi hết path mà vẫn còn mảnh tách dư ra -> chính root bị tách, tăng chiều cao cây
    if (splitSibling) {
        auto newRoot = std::make_shared<RTreeNode>(false);
        newRoot->entries.emplace_back(root->getBoundingBox(), root);
        newRoot->entries.emplace_back(splitSibling->getBoundingBox(), splitSibling);
        root = newRoot;
    }
}

void RTree::splitNode(std::shared_ptr<RTreeNode> node, std::shared_ptr<RTreeNode>& newNode) {
    newNode = std::make_shared<RTreeNode>(node->isLeaf);
    std::vector<RTreeEntry> allEntries = node->entries;
    node->entries.clear();

    // 1. Chọn 2 hạt giống ban đầu (PickSeeds)
    size_t seed1 = 0, seed2 = 1;
    pickSeeds(allEntries, seed1, seed2);

    node->entries.push_back(allEntries[seed1]);
    newNode->entries.push_back(allEntries[seed2]);

    Rectangle mbr1 = allEntries[seed1].mbr;
    Rectangle mbr2 = allEntries[seed2].mbr;

    std::vector<bool> assigned(allEntries.size(), false);
    assigned[seed1] = true;
    assigned[seed2] = true;
    size_t assignedCount = 2;

    // 2. Phân bổ các phần tử còn lại (PickNext & Quadratic Distribution)
    while (assignedCount < allEntries.size()) {
        // Ràng buộc số lượng tối thiểu m = MIN_ENTRIES
        size_t remaining = allEntries.size() - assignedCount;
        if (node->entries.size() + remaining == RTreeNode::MIN_ENTRIES) {
            for (size_t i = 0; i < allEntries.size(); ++i) {
                if (!assigned[i]) {
                    node->entries.push_back(allEntries[i]);
                    assigned[i] = true;
                    assignedCount++;
                }
            }
            break;
        }
        if (newNode->entries.size() + remaining == RTreeNode::MIN_ENTRIES) {
            for (size_t i = 0; i < allEntries.size(); ++i) {
                if (!assigned[i]) {
                    newNode->entries.push_back(allEntries[i]);
                    assigned[i] = true;
                    assignedCount++;
                }
            }
            break;
        }

        // PickNext: Tìm phần tử có chênh lệch mở rộng lớn nhất giữa 2 nhóm
        double maxDiff = -1.0;
        size_t nextIdx = 0;
        int targetGroup = 1; // 1: node, 2: newNode

        for (size_t i = 0; i < allEntries.size(); ++i) {
            if (assigned[i]) continue;

            double d1 = mbr1.enlargementArea(allEntries[i].mbr);
            double d2 = mbr2.enlargementArea(allEntries[i].mbr);
            double diff = std::abs(d1 - d2);

            if (diff > maxDiff) {
                maxDiff = diff;
                nextIdx = i;
                if (d1 < d2) {
                    targetGroup = 1;
                } else if (d2 < d1) {
                    targetGroup = 2;
                } else {
                    // Tie-breaker: nhóm có diện tích nhỏ hơn
                    if (mbr1.area() < mbr2.area()) targetGroup = 1;
                    else if (mbr2.area() < mbr1.area()) targetGroup = 2;
                    else targetGroup = (node->entries.size() <= newNode->entries.size()) ? 1 : 2;
                }
            }
        }

        // Gán vào nhóm đã chọn
        if (targetGroup == 1) {
            node->entries.push_back(allEntries[nextIdx]);
            mbr1 = mbr1.combine(allEntries[nextIdx].mbr);
        } else {
            newNode->entries.push_back(allEntries[nextIdx]);
            mbr2 = mbr2.combine(allEntries[nextIdx].mbr);
        }
        assigned[nextIdx] = true;
        assignedCount++;
    }
}

void RTree::pickSeeds(const std::vector<RTreeEntry>& entries, size_t& seed1, size_t& seed2) {
    double maxWaste = -std::numeric_limits<double>::infinity();
    seed1 = 0;
    seed2 = 1;

    for (size_t i = 0; i < entries.size(); ++i) {
        for (size_t j = i + 1; j < entries.size(); ++j) {
            Rectangle combined = entries[i].mbr.combine(entries[j].mbr);
            double waste = combined.area() - entries[i].mbr.area() - entries[j].mbr.area();
            if (waste > maxWaste) {
                maxWaste = waste;
                seed1 = i;
                seed2 = j;
            }
        }
    }
}

std::vector<Point> RTree::rangeSearch(const Rectangle& queryBox) const {
    std::vector<Point> results;
    rangeSearchInternal(root, queryBox, results);
    return results;
}

void RTree::rangeSearchInternal(std::shared_ptr<RTreeNode> node, const Rectangle& queryBox, std::vector<Point>& results) const {
    if (!node) return;

    if (node->isLeaf) {
        for (const auto& entry : node->entries) {
            if (queryBox.contains(entry.point)) {
                results.push_back(entry.point);
            }
        }
    } else {
        for (const auto& entry : node->entries) {
            if (queryBox.intersects(entry.mbr)) {
                rangeSearchInternal(entry.child, queryBox, results);
            }
        }
    }
}

bool RTree::deletePoint(const std::string& pointId) {
    if (deleteInternal(root, pointId)) {
        totalPoints--;
        return true;
    }
    return false;
}

bool RTree::deleteInternal(std::shared_ptr<RTreeNode> node, const std::string& pointId) {
    if (!node) return false;

    if (node->isLeaf) {
        for (auto it = node->entries.begin(); it != node->entries.end(); ++it) {
            if (it->point.id == pointId) {
                node->entries.erase(it);
                return true;
            }
        }
        return false;
    }

    for (auto& entry : node->entries) {
        if (deleteInternal(entry.child, pointId)) {
            entry.mbr = entry.child->getBoundingBox();
            return true;
        }
    }
    return false;
}

void RTree::updatePosition(const std::string& pointId, double newX, double newY) {
    deletePoint(pointId);
    insert(Point(newX, newY, pointId));
}

std::vector<std::pair<int, Rectangle>> RTree::getStructure() const {
    std::vector<std::pair<int, Rectangle>> boxes;
    getStructureInternal(root, 0, boxes);
    return boxes;
}

void RTree::getStructureInternal(std::shared_ptr<RTreeNode> node, int depth, std::vector<std::pair<int, Rectangle>>& boxes) const {
    if (!node) return;

    boxes.emplace_back(depth, node->getBoundingBox());
    if (!node->isLeaf) {
        for (const auto& entry : node->entries) {
            getStructureInternal(entry.child, depth + 1, boxes);
        }
    }
}

void RTree::clear() {
    root = std::make_shared<RTreeNode>(true);
    totalPoints = 0;
}
