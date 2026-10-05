#include "RTreeNode.h"

/**
 * @file RTreeNode.cpp
 * @author Trường Vũ (Leader)
 * @brief Cài đặt RTreeEntry và RTreeNode.
 */

RTreeEntry::RTreeEntry(const Rectangle& mbr, const Point& point)
    : mbr(mbr), point(point), child(nullptr) {}

RTreeEntry::RTreeEntry(const Rectangle& mbr, std::shared_ptr<RTreeNode> child)
    : mbr(mbr), point(), child(child) {}

RTreeNode::RTreeNode(bool isLeaf)
    : isLeaf(isLeaf) {
    entries.reserve(MAX_ENTRIES + 1);
}

Rectangle RTreeNode::getBoundingBox() const {
    if (entries.empty()) {
        return Rectangle();
    }
    Rectangle result = entries[0].mbr;
    for (size_t i = 1; i < entries.size(); ++i) {
        result = result.combine(entries[i].mbr);
    }
    return result;
}

bool RTreeNode::isOverfull() const {
    return entries.size() > MAX_ENTRIES;
}

bool RTreeNode::isUnderfull() const {
    return entries.size() < MIN_ENTRIES;
}
