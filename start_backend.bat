@echo off
chcp 65001 >nul
title GoRide Backend Server Runner

echo ============================================================
echo   🚗 GoRide - RIDE-RTREE C++17 Backend Server Launcher
echo ============================================================
echo.

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

set BINARY=""
if exist "build\bin\ride_rtree_server.exe" (
    set BINARY=build\bin\ride_rtree_server.exe
) else if exist "build\bin\Debug\ride_rtree_server.exe" (
    set BINARY=build\bin\Debug\ride_rtree_server.exe
) else if exist "build\bin\Release\ride_rtree_server.exe" (
    set BINARY=build\bin\Release\ride_rtree_server.exe
) else if exist "build\ride_rtree_server.exe" (
    set BINARY=build\ride_rtree_server.exe
)

if "%BINARY%"=="" (
    echo [!] Chưa tìm thấy file thực thi ride_rtree_server.exe trong thư mục build\
    echo.
    echo Vui lòng biên dịch backend bằng lệnh sau trong Terminal / PowerShell:
    echo     cmake -B build -G "MinGW Makefiles"
    echo     cmake --build build
    echo.
    echo Hoặc mở Visual Studio / CLion và bấm Build.
    echo ============================================================
    pause
    exit /b 1
)

echo [*] Tìm thấy binary: %BINARY%
echo [*] Kiểm tra tiến trình cũ đang chạy trên cổng 8080...
taskkill /IM ride_rtree_server.exe /F >nul 2>&1

echo [*] Khởi động GoRide C++17 REST API Server tại cổng 8080...
echo [*] Mở trình duyệt và truy cập: frontend\index.html
echo [*] Nhấn Ctrl+C để dừng server.
echo ============================================================
echo.

"%BINARY%" backend/data/map_hcm.osm backend/data/ride_rtree.db
