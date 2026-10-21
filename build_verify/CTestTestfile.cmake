# CMake generated Testfile for 
# Source directory: C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main
# Build directory: C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/build_verify
# 
# This file includes the relevant testing commands required for 
# testing this directory and lists subdirectories to be tested as well.
add_test(RoadGraphDijkstraTest "C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/build_verify/bin/test_road_graph.exe" "C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/data/osm/processed/hcmc_roads.json")
set_tests_properties(RoadGraphDijkstraTest PROPERTIES  _BACKTRACE_TRIPLES "C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/CMakeLists.txt;94;add_test;C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/CMakeLists.txt;0;")
add_test(ApiRoutingTest "C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/build_verify/bin/test_api_routing.exe" "C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/data/osm/processed/hcmc_roads.json")
set_tests_properties(ApiRoutingTest PROPERTIES  _BACKTRACE_TRIPLES "C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/CMakeLists.txt;95;add_test;C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/CMakeLists.txt;0;")
add_test(AuthSecurityTest "C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/build_verify/bin/test_auth.exe")
set_tests_properties(AuthSecurityTest PROPERTIES  _BACKTRACE_TRIPLES "C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/CMakeLists.txt;96;add_test;C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/CMakeLists.txt;0;")
add_test(TripServiceTest "C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/build_verify/bin/test_trip.exe")
set_tests_properties(TripServiceTest PROPERTIES  _BACKTRACE_TRIPLES "C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/CMakeLists.txt;97;add_test;C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/CMakeLists.txt;0;")
add_test(TripApiTest "C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/build_verify/bin/test_trip_api.exe")
set_tests_properties(TripApiTest PROPERTIES  _BACKTRACE_TRIPLES "C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/CMakeLists.txt;98;add_test;C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/CMakeLists.txt;0;")
add_test(RTreeTest "C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/build_verify/bin/test_r_tree.exe")
set_tests_properties(RTreeTest PROPERTIES  _BACKTRACE_TRIPLES "C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/CMakeLists.txt;99;add_test;C:/Users/HP/Downloads/Test-DSA-main/Test-DSA-main/CMakeLists.txt;0;")
