@echo off
chcp 65001 >nul
title GoRide Backend Server Terminator

echo [*] Đang dừng tiến trình ride_rtree_server.exe...
taskkill /IM ride_rtree_server.exe /F >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [✓] Đã dừng máy chủ GoRide C++ thành công.
) else (
    echo [i] Không có máy chủ nào đang chạy ngầm.
)
timeout /t 2 >nul
