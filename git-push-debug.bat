@echo off
REM Script สำหรับ Commit และ Push การเปลี่ยนแปลง (พร้อมลบ lock file)

echo.
echo ========================================
echo  Commit และ Push การเปลี่ยนแปลง
echo ========================================
echo.

REM ลบ lock file ถ้ามี
if exist ".git\index.lock" (
    echo ลบ lock file...
    del /F /Q ".git\index.lock"
    timeout /t 1 /nobreak >nul
)

echo [1/4] Adding files...
git add src/lib/auth.ts
git add supabase/functions/hmpm-login/index.ts
git add commit-and-push.bat
git add commit-and-push.ps1
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

echo [2/4] Committing...
git commit -m "feat: เพิ่มระบบ debug ขั้นสูงสำหรับ HMPM login

- เพิ่ม detailed logging ใน Edge Function hmpm-login
  - Request ID tracking
  - Step-by-step logging พร้อม timestamp
  - Performance metrics (duration tracking)
  - Error details พร้อม stack trace
  - Environment variables check
  - API call logging (request/response)
  - Database operation logging

- เพิ่ม debug logging ใน frontend (auth.ts)
  - Debug info logging
  - Step tracking
  - Performance metrics
  - Error details

- เพิ่มเอกสารแก้ไขปัญหา:
  - DEPLOY_HMPM_LOGIN_FIX.md
  - FIX_VERCEL_LOGIN_ISSUE.md

- เพิ่ม helper scripts:
  - commit-and-push.bat
  - commit-and-push.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to commit
    pause
    exit /b 1
)

echo [3/4] Pushing to GitHub...
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
echo 📝 Vercel จะ auto-deploy ให้อัตโนมัติ
echo    ตรวจสอบได้ที่: https://vercel.com/dashboard
echo.
pause
