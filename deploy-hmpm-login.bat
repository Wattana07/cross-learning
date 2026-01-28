@echo off
REM Batch Script สำหรับ Deploy HMPM Login Edge Function
REM รันสคริปต์นี้: deploy-hmpm-login.bat

echo.
echo ========================================
echo  Deploy HMPM Login Edge Function
echo ========================================
echo.

echo [1/1] Deploying hmpm-login...
call npx supabase functions deploy hmpm-login
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to deploy hmpm-login
    echo.
    echo 💡 วิธีแก้ไข:
    echo    1. ตรวจสอบว่า Supabase CLI ติดตั้งแล้ว: npm install -g supabase
    echo    2. ตรวจสอบว่า login แล้ว: supabase login
    echo    3. ตรวจสอบว่า link project แล้ว: supabase link
    pause
    exit /b 1
)
echo ✅ hmpm-login deployed
echo.

echo ========================================
echo  ✅ Function deployed successfully!
echo ========================================
echo.
echo 📝 ขั้นตอนต่อไป:
echo    1. ตั้งค่า Environment Variables ใน Supabase Dashboard:
echo       - HMPM_AUTH_USER = HappyMPM2Acitve@OMC?USER
echo       - HMPM_AUTH_PASS = HappyMPMAcitve@OMC?PASS
echo    2. ตรวจสอบใน Supabase Dashboard ^> Edge Functions ^> hmpm-login
echo    3. ทดสอบที่หน้า /test-hmpm-login
echo.
pause
