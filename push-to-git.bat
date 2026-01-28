@echo off
REM Script สำหรับ Commit และ Push ขึ้น GitHub (สำหรับ Vercel Auto-Deploy)

echo.
echo ========================================
echo  Push ขึ้น GitHub สำหรับ Vercel
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
- เพิ่ม request ID tracking สำหรับแต่ละ request
- เพิ่ม performance tracking (วัดเวลาของแต่ละขั้นตอน)
- เพิ่ม debug logging ใน frontend (auth.ts)
- เพิ่ม error details และ stack trace logging
- เพิ่มเอกสาร DEPLOY_HMPM_LOGIN_FIX.md และ FIX_VERCEL_LOGIN_ISSUE.md"

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
echo  ✅ Push สำเร็จ!
echo ========================================
echo.
echo 📝 Vercel จะ auto-deploy ให้อัตโนมัติ
echo    ตรวจสอบได้ที่: https://vercel.com/dashboard
echo.
pause
