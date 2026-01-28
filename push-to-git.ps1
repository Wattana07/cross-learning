# PowerShell Script สำหรับ Commit และ Push ขึ้น GitHub (สำหรับ Vercel Auto-Deploy)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Push ขึ้น GitHub สำหรับ Vercel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ลบ lock file ถ้ามี
if (Test-Path ".git\index.lock") {
    Write-Host "ลบ lock file..." -ForegroundColor Yellow
    Remove-Item ".git\index.lock" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

Write-Host "[1/4] Adding files..." -ForegroundColor Yellow
git add src/lib/auth.ts
git add supabase/functions/hmpm-login/index.ts
git add commit-and-push.bat
git add commit-and-push.ps1
git add DEPLOY_HMPM_LOGIN_FIX.md
git add FIX_VERCEL_LOGIN_ISSUE.md

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to add files" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 วิธีแก้ไข:" -ForegroundColor Yellow
    Write-Host "   1. ปิด Cursor/IDE หรือ Git GUI ที่เปิดอยู่" -ForegroundColor White
    Write-Host "   2. รัน script นี้ใหม่" -ForegroundColor White
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[2/4] Committing..." -ForegroundColor Yellow
git commit -m "feat: เพิ่มระบบ debug ขั้นสูงสำหรับ HMPM login

- เพิ่ม detailed logging ใน Edge Function hmpm-login
- เพิ่ม request ID tracking สำหรับแต่ละ request
- เพิ่ม performance tracking (วัดเวลาของแต่ละขั้นตอน)
- เพิ่ม debug logging ใน frontend (auth.ts)
- เพิ่ม error details และ stack trace logging
- เพิ่มเอกสาร DEPLOY_HMPM_LOGIN_FIX.md และ FIX_VERCEL_LOGIN_ISSUE.md"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to commit" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[3/4] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " ✅ Push สำเร็จ!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Vercel จะ auto-deploy ให้อัตโนมัติ" -ForegroundColor Cyan
Write-Host "   ตรวจสอบได้ที่: https://vercel.com/dashboard" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"
