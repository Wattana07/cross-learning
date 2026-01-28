@echo off
REM Script สำหรับ Commit และ Push การเปลี่ยนแปลง

echo.
echo ========================================
echo  Commit และ Push การเปลี่ยนแปลง
echo ========================================
echo.

REM ลบ lock file ถ้ามี
if exist ".git\index.lock" (
    echo ลบ lock file...
    del /F /Q ".git\index.lock"
)

echo [1/3] Adding files...
git add src/lib/auth.ts
git add DEPLOY_HMPM_LOGIN_FIX.md
git add FIX_VERCEL_LOGIN_ISSUE.md

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to add files
    echo.
    echo 💡 วิธีแก้ไข:
    echo    1. ปิด Cursor/IDE หรือ Git GUI ที่เปิดอยู่
    echo    2. รัน script นี้ใหม่
    pause
    exit /b 1
)

echo [2/3] Committing...
git commit -m "fix: ปรับปรุง error handling สำหรับ HMPM login และเพิ่มเอกสารแก้ไขปัญหา Vercel

- เพิ่ม error logging ที่ดีขึ้นใน auth.ts
- เพิ่มการตรวจสอบ VITE_SUPABASE_URL
- เพิ่มเอกสาร DEPLOY_HMPM_LOGIN_FIX.md
- เพิ่มเอกสาร FIX_VERCEL_LOGIN_ISSUE.md สำหรับแก้ไขปัญหา login ใน Vercel"

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to commit
    pause
    exit /b 1
)

echo [3/3] Pushing to GitHub...
git push origin main

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to push
    pause
    exit /b 1
)

echo.
echo ========================================
echo  ✅ Commit และ Push สำเร็จ!
echo ========================================
echo.
pause
