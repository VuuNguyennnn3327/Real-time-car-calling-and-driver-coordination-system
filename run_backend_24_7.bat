@echo off
chcp 65001 >nul
title GoRide C++ Backend Service - 24/24 Watchdog Supervisor
color 0A

echo =====================================================================
echo           GORIDE C++ REST BACKEND - AUTO RESTART 24/24
echo =====================================================================
echo  Hệ thống giám sát tự động khởi động lại nếu server bị crash hoặc tắt.
echo  Port: 8080 (REST API / Spatial Routing Engine)
echo  Nhấn Ctrl+C để dừng giám sát.
echo =====================================================================
echo.

set SCRIPT_DIR=%~dp0
set BINARY_PATH=%SCRIPT_DIR%build\bin\goride_server.exe

:LOOP
echo [%DATE% %TIME%] Đang kiểm tra tiến trình server C++...

if not exist "%BINARY_PATH%" (
    echo [CẢNH BÁO] Không tìm thấy "%BINARY_PATH%".
    echo Đang tìm kiếm trong thư mục build...
    for /r "%SCRIPT_DIR%build" %%f in (goride_server.exe) do set BINARY_PATH=%%f
)

if not exist "%BINARY_PATH%" (
    echo [LỖI] Chưa có file binary goride_server.exe.
    echo Vui lòng build dự án trước bằng lệnh:
    echo   cmake -B build
    echo   cmake --build build --config Release
    echo Tự động thử lại sau 10 giây...
    timeout /t 10 >nul
    goto LOOP
)

echo [OK] Khởi chạy máy chủ: "%BINARY_PATH%" trên cổng 8080...
"%BINARY_PATH%"

echo.
echo [CẢNH BÁO] Máy chủ goride_server vừa kết thúc hoặc gặp sự cố!
echo Tự động khởi động lại trong 3 giây...
timeout /t 3 >nul
goto LOOP
