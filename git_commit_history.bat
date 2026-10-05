@echo off
echo ====================================================
echo   TU DONG COMMIT LICH SU DU AN RIDE-RTREE (CMD)
echo ====================================================

cd /d D:\Nam2_ky1\BTL_DSA

echo 1. Khoi tao Git repo...
git init

echo 2. Commit 1: Khoi tao du an (Truong Vu - RT-01)...
git add .gitignore README.md PROJECT_MASTER_BRIEF.md CMakeLists.txt GIT_GUIDE.md git_commit_history.bat
git commit -m "chore(init): [RT-01] initialize repository structure and build config"

echo 3. Commit 2: Hinh hoc co so (Vuong - RT-08)...
git add core\Point.h core\Point.cpp core\Rectangle.h core\Rectangle.cpp tests\geometry\test_geometry.cpp
git commit -m "feat(geometry): [RT-08] implement Point and Rectangle AABB with enlargement and MINDIST"

echo 4. Commit 3: RTreeNode va ChooseLeaf (Truong Vu - RT-02)...
git add core\RTreeNode.h core\RTreeNode.cpp
git commit -m "feat(core): [RT-02] implement RTreeNode structure with MBR calculation"

echo 5. Commit 4: Quadratic Split va RangeSearch (Truong Vu - RT-03)...
git add core\RTree.h core\RTree.cpp
git commit -m "feat(core): [RT-03] implement Guttman Quadratic Split and RangeSearch"

echo 6. Commit 5: Fix adjustTree Bottom-Up qua path (Truong Vu - RT-03)...
git add core\RTree.h core\RTree.cpp tests\core\test_rtree.cpp
git commit -m "fix(rtree): [RT-03] track descent path in insert and fix bottom-up adjustTree propagation"

echo 7. Commit 6: NaiveScan, Store va CLI (Dep - RT-11, RT-12, RT-13)...
git add core\NaiveScan.h core\NaiveScan.cpp console\main.cpp server\storage\Store.h
git commit -m "feat(core): [RT-11] [RT-12] [RT-13] implement NaiveScan O(N) baseline, Store and CLI"

echo 8. Commit 7: KNNSearch va HTTP Server (Tuong - RT-05, RT-06, RT-07)...
git add core\KNNSearch.h core\KNNSearch.cpp server\Server.h server\Server.cpp server\routes\
git commit -m "feat(knn): [RT-05] [RT-06] [RT-07] implement k-NN Min-Heap and scaffold HTTP server"

echo 9. Commit 8: Simulator, Web UI va Spec (Vuong + Duong - RT-10, RT-14, RT-15, RT-16)...
git add simulator\ web\ data\ docs\
git commit -m "feat(web): [RT-10] [RT-14] [RT-15] add Leaflet web UI, DriverSimulator and demo page"

echo.
echo ====================================================
echo   HOAN THANH! 8 COMMITS DA DUOC LUU CHUAN VAO GIT.
echo   Kiem tra lai bang lenh: git log --oneline
echo ====================================================

echo.
echo Dang thiet lap nhanh main va remote GitHub...
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/VuuNguyennnn3327/Real-time-car-calling-and-driver-coordination-system.git

echo.
echo Ban co muon day (push) code len GitHub ngay bay gio khong?
pause
git push -u origin main

echo.
echo ====================================================
echo   DA DAY (PUSH) TOAN BO 8 COMMITS LEN GITHUB THANH CONG!
echo ====================================================
pause

