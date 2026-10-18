#ifndef RIDE_RTREE_DEMO_REGION_H
#define RIDE_RTREE_DEMO_REGION_H

#include <cmath>
#include <string>

namespace DemoRegion {

// Bounding box for the project's District 1 demo data.
// Coordinate convention throughout the project: x = longitude, y = latitude.
// Keep these values in one place so API endpoints share the same limits.
inline constexpr double MIN_LAT = 10.7500;
inline constexpr double MAX_LAT = 10.8000;
inline constexpr double MIN_LNG = 106.6750;
inline constexpr double MAX_LNG = 106.7250;

inline bool isValidGeoCoordinate(double lat, double lng) {
    return std::isfinite(lat) && std::isfinite(lng) &&
           lat >= -90.0 && lat <= 90.0 &&
           lng >= -180.0 && lng <= 180.0;
}

inline bool contains(double lat, double lng) {
    return isValidGeoCoordinate(lat, lng) &&
           lat >= MIN_LAT && lat <= MAX_LAT &&
           lng >= MIN_LNG && lng <= MAX_LNG;
}

inline std::string boundsDescription() {
    return "Allowed demo region: lat [" + std::to_string(MIN_LAT) + ", " +
           std::to_string(MAX_LAT) + "], lng [" + std::to_string(MIN_LNG) +
           ", " + std::to_string(MAX_LNG) + "]";
}

inline std::string coordinateError(const char* label, double lat, double lng) {
    if (!isValidGeoCoordinate(lat, lng)) {
        return std::string(label) +
               " must be finite geographic coordinates (lat -90..90, lng -180..180)";
    }
    if (!contains(lat, lng)) {
        return std::string(label) + " is outside the configured District 1 demo region. " +
               boundsDescription();
    }
    return {};
}

} // namespace DemoRegion

#endif // RIDE_RTREE_DEMO_REGION_H
