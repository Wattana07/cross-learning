# PowerShell Script สำหรับ Commit และ Push การเปลี่ยนแปลง

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Commit และ Push การเปลี่ยนแปลง" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ลบ lock file ถ้ามี
if (Test-Path ".git\index.lock") {
    Write-Host "ลบ lock file..." -ForegroundColor Yellow
    Remove-Item ".git\index.lock" -Force -ErrorAction SilentlyContinue
}

Write-Host "[1/3] Adding files..." -ForegroundColor Yellow
git add src/lib/auth.ts
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

Write-Host "[2/3] Committing..." -ForegroundColor Yellow
git commit -m "fix: ปรับปรุง error handling สำหรับ HMPM login และเพิ่มเอกสารแก้ไขปัญหา Vercel

- เพิ่ม error logging ที่ดีขึ้นใน auth.ts
- เพิ่มการตรวจสอบ VITE_SUPABASE_URL
- เพิ่มเอกสาร DEPLOY_HMPM_LOGIN_FIX.md
- เพิ่มเอกสาร FIX_VERCEL_LOGIN_ISSUE.md สำหรับแก้ไขปัญหา login ใน Vercel"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to commit" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[3/3] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " ✅ Commit และ Push สำเร็จ!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"
