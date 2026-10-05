@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo     CONG CU TU DONG LUU TIEN DO GIT (SAVE PROGRESS)
echo   (Tu dong ghi nhan dung tac gia - Author cua tung ban)
echo ====================================================

cd /d "%~dp0"

echo Cac file thay doi gan day:
git status -s
echo.

echo CHON THANH VIEN DANG LAM VIEC:
echo 1. Truong Vu (Lead)
echo 2. Tuong (KNNSearch / Server)
echo 3. Vuong (Hinh hoc / Simulator / Admin)
echo 4. Dep (NaiveScan / Store / CLI)
echo 5. Duong (Web UI / Polling / Slide)
set /p memberChoice="Nhap so tuong ung voi ban (1-5): "

if "%memberChoice%"=="1" (
    set AUTHOR=Truong Vu
    set EMAIL=truongvu@student.edu.vn
    set JIRA=RT-03
) else if "%memberChoice%"=="2" (
    set AUTHOR=Tuong
    set EMAIL=tuong@student.edu.vn
    set JIRA=RT-05
) else if "%memberChoice%"=="3" (
    set AUTHOR=Vuong
    set EMAIL=vuong@student.edu.vn
    set JIRA=RT-10
) else if "%memberChoice%"=="4" (
    set AUTHOR=Dep
    set EMAIL=dep@student.edu.vn
    set JIRA=RT-13
) else if "%memberChoice%"=="5" (
    set AUTHOR=Duong
    set EMAIL=duong@student.edu.vn
    set JIRA=RT-14
) else (
    set AUTHOR=ThanhVien
    set EMAIL=member@student.edu.vn
    set JIRA=RT-01
)

echo.
set /p desc="Nhap ngan gon viec ban vua lam (hoac an Enter de dung mac dinh): "
if "!desc!"=="" set desc=cap nhat ma nguon va tien do

git add .
:: Su dung co --author de ghi nhan chinh xac tac gia cua commit la thanh vien do
git commit --author="!AUTHOR! <!EMAIL!>" -m "feat: [!JIRA!] !desc! [!AUTHOR!]"

echo.
echo ====================================================
echo DA LUU COMMIT THANH CONG VOI TAC GIA: !AUTHOR!
echo ====================================================

echo.
set /p pushChoice="Ban co muon day (push) len GitHub ngay khong? (y/n): "
if /i "%pushChoice%"=="y" (
    git push origin main
    echo Da day len GitHub thanh cong!
)

pause
