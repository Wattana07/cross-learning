# PowerShell Script สำหรับ Deploy HMPM Login Edge Function
# รันสคริปต์นี้ใน PowerShell: .\deploy-hmpm-login.ps1

Write-Host "🚀 เริ่ม Deploy HMPM Login Edge Function..." -ForegroundColor Cyan
Write-Host ""

# ตรวจสอบว่า Supabase CLI ติดตั้งแล้วหรือยัง
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseInstalled) {
    Write-Host "⚠️  Supabase CLI ไม่พบ กำลังใช้ npx..." -ForegroundColor Yellow
    $useNpx = $true
} else {
    Write-Host "✅ พบ Supabase CLI" -ForegroundColor Green
    $useNpx = $false
}

Write-Host "📦 กำลัง Deploy: hmpm-login..." -ForegroundColor Yellow

if ($useNpx) {
    $result = npx supabase functions deploy hmpm-login 2>&1
} else {
    $result = supabase functions deploy hmpm-login 2>&1
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deploy สำเร็จ: hmpm-login" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 ขั้นตอนต่อไป:" -ForegroundColor Cyan
    Write-Host "   1. ตั้งค่า Environment Variables ใน Supabase Dashboard:" -ForegroundColor White
    Write-Host "      - HMPM_AUTH_USER = HappyMPM2Acitve@OMC?USER" -ForegroundColor White
    Write-Host "      - HMPM_AUTH_PASS = HappyMPMAcitve@OMC?PASS" -ForegroundColor White
    Write-Host "   2. ตรวจสอบใน Supabase Dashboard > Edge Functions > hmpm-login" -ForegroundColor White
    Write-Host "   3. ทดสอบที่หน้า /test-hmpm-login" -ForegroundColor White
} else {
    Write-Host "❌ Deploy ล้มเหลว: hmpm-login" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 วิธีแก้ไข:" -ForegroundColor Yellow
    Write-Host "   1. ตรวจสอบว่า Supabase CLI ติดตั้งแล้ว: npm install -g supabase" -ForegroundColor White
    Write-Host "   2. ตรวจสอบว่า login แล้ว: supabase login" -ForegroundColor White
    Write-Host "   3. ตรวจสอบว่า link project แล้ว: supabase link" -ForegroundColor White
}

Write-Host ""
