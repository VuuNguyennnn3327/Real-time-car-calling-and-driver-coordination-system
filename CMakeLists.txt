cmake_minimum_required(VERSION 3.16)
project(RIDE_RTREE VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Thư mục include chung
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/core
    ${CMAKE_CURRENT_SOURCE_DIR}/server
    ${CMAKE_CURRENT_SOURCE_DIR}/simulator
)

# 1. Thư viện lõi thuật toán Core R-Tree (core_lib)
add_library(core_lib
    core/Point.cpp
    core/Rectangle.cpp
    core/RTreeNode.cpp
    core/RTree.cpp
    core/KNNSearch.cpp
    core/NaiveScan.cpp
)

# 2. Chương trình C++ Console độc lập (console_app) - Phục vụ chấm điểm DSA trực tiếp
add_executable(console_app
    console/main.cpp
)
target_link_libraries(console_app PRIVATE core_lib)

# 3. Bộ giả lập tài xế (simulator_lib)
add_library(simulator_lib
    simulator/DriverSimulator.cpp
)
target_link_libraries(simulator_lib PRIVATE core_lib)

# 4. Ứng dụng Backend Web Server (server_app)
add_executable(server_app
    server/Server.cpp
    server/routes/api_routes.cpp
    server/services/DispatchService.cpp
)
target_link_libraries(server_app PRIVATE core_lib simulator_lib)
if(WIN32)
    target_link_libraries(server_app PRIVATE wsock32 ws2_32)
endif()

# 5. Bộ kiểm thử tự động (test_runner)
add_executable(test_runner
    tests/core/test_rtree.cpp
    tests/geometry/test_geometry.cpp
)
target_link_libraries(test_runner PRIVATE core_lib)
