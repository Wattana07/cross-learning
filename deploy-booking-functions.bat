@echo off
REM Batch Script สำหรับ Deploy Booking Edge Functions
REM รันสคริปต์นี้: deploy-booking-functions.bat

echo.
echo ========================================
echo  Deploy Booking Edge Functions
echo ========================================
echo.

echo [1/6] Deploying create-booking...
call npx supabase functions deploy create-booking
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to deploy create-booking
    pause
    exit /b 1
)
echo ✅ create-booking deployed
echo.

echo [2/6] Deploying update-booking...
call npx supabase functions deploy update-booking
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to deploy update-booking
    pause
    exit /b 1
)
echo ✅ update-booking deployed
echo.

echo [3/6] Deploying cancel-booking...
call npx supabase functions deploy cancel-booking
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to deploy cancel-booking
    pause
    exit /b 1
)
echo ✅ cancel-booking deployed
echo.

echo [4/6] Deploying notify-booking-approval...
call npx supabase functions deploy notify-booking-approval
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to deploy notify-booking-approval
    pause
    exit /b 1
)
echo ✅ notify-booking-approval deployed
echo.

echo [5/6] Deploying send-booking-reminders...
call npx supabase functions deploy send-booking-reminders
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to deploy send-booking-reminders
    pause
    exit /b 1
)
echo ✅ send-booking-reminders deployed
echo.

echo [6/6] Deploying booking-webhook...
call npx supabase functions deploy booking-webhook
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to deploy booking-webhook
    pause
    exit /b 1
)
echo ✅ booking-webhook deployed
echo.

echo ========================================
echo  ✅ All functions deployed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Check Supabase Dashboard ^> Edge Functions
echo 2. Test booking in the application
echo.
pause
