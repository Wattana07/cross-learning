@echo off
REM Script สำหรับ Commit และ Push ไฟล์ทั้งหมดล่าสุด

echo.
echo ========================================
echo  Push ไฟล์ทั้งหมดล่าสุดขึ้น GitHub
echo ========================================
echo.

REM ลบ lock file ถ้ามี
if exist ".git\index.lock" (
    echo [0/4] ลบ lock file...
    del /F /Q ".git\index.lock"
    timeout /t 1 /nobreak >nul
    echo ✅ ลบ lock file สำเร็จ
) else (
    echo [0/4] ไม่พบ lock file
)

echo.
echo [1/4] Adding all files...
git add .

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
echo [2/4] Committing...
git commit -m "fix: แก้ไขปัญหา 401 Unauthorized และเพิ่ม error handling

- เพิ่ม logging ใน Edge Function เพื่อดู headers
- เพิ่ม logging ใน frontend เพื่อดู Supabase config
- เพิ่ม error handling สำหรับ 401 Unauthorized
- เพิ่มเอกสาร FIX_401_UNAUTHORIZED.md
- ปรับปรุง debug logging ใน hmpm-login Edge Function"

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to commit
    pause
    exit /b 1
)

echo.
echo [3/4] Pushing to GitHub...
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
