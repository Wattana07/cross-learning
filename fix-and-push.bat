@echo off
REM Script สำหรับลบ lock file และ push ขึ้น GitHub

echo.
echo ========================================
echo  Fix Git Lock และ Push ขึ้น GitHub
echo ========================================
echo.

REM ลบ lock file ถ้ามี
if exist ".git\index.lock" (
    echo [1/5] ลบ lock file...
    del /F /Q ".git\index.lock"
    timeout /t 1 /nobreak >nul
    echo ✅ ลบ lock file สำเร็จ
) else (
    echo [1/5] ไม่พบ lock file
)

echo.
echo [2/5] ตรวจสอบ git status...
git status

echo.
echo [3/5] Adding files...
git add push-to-git.bat push-to-git.ps1 git-push-debug.bat commit-and-push.bat commit-and-push.ps1

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to add files
    echo.
    echo 💡 วิธีแก้ไข:
    echo    1. ปิด Cursor/IDE หรือ Git GUI ที่เปิดอยู่
    echo    2. รัน script นี้ใหม่
    pause
    exit /b 1
)

echo.
echo [4/5] Committing...
git commit -m "chore: เพิ่ม scripts สำหรับ commit และ push

- เพิ่ม push-to-git.bat และ push-to-git.ps1
- เพิ่ม commit-and-push.bat และ commit-and-push.ps1
- เพิ่ม git-push-debug.bat
- เพิ่ม fix-and-push.bat"

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to commit
    pause
    exit /b 1
)

echo.
echo [5/5] Pushing to GitHub...
git push origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️  Push ล้มเหลว - อาจเป็นปัญหา network
    echo.
    echo 💡 วิธีแก้ไข:
    echo    1. ตรวจสอบ internet connection
    echo    2. ตรวจสอบ proxy/VPN settings
    echo    3. ลองรันอีกครั้ง: git push origin main
    pause
    exit /b 1
)

echo.
echo ========================================
echo  ✅ Push สำเร็จ!
echo ========================================
echo.
echo 📝 Vercel จะ auto-deploy ให้อัตโนมัติ
echo    ตรวจสอบได้ที่: https://vercel.com/dashboard
echo.
pause
