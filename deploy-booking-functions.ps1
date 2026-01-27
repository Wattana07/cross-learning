# PowerShell Script สำหรับ Deploy Booking Edge Functions
# รันสคริปต์นี้ใน PowerShell: .\deploy-booking-functions.ps1

Write-Host "🚀 เริ่ม Deploy Booking Edge Functions..." -ForegroundColor Cyan
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

# ฟังก์ชันสำหรับ deploy
function Deploy-Function {
    param(
        [string]$FunctionName
    )
    
    Write-Host "📦 กำลัง Deploy: $FunctionName..." -ForegroundColor Yellow
    
    if ($useNpx) {
        $result = npx supabase functions deploy $FunctionName 2>&1
    } else {
        $result = supabase functions deploy $FunctionName 2>&1
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deploy สำเร็จ: $FunctionName" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Deploy ล้มเหลว: $FunctionName" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        return $false
    }
    Write-Host ""
}

# รายการ Edge Functions ที่ต้อง deploy
$functions = @(
    "create-booking",
    "update-booking",
    "cancel-booking",
    "notify-booking-approval",
    "send-booking-reminders",
    "booking-webhook"
)

$successCount = 0
$failCount = 0

# Deploy แต่ละ function
foreach ($func in $functions) {
    if (Deploy-Function -FunctionName $func) {
        $successCount++
    } else {
        $failCount++
    }
    Start-Sleep -Seconds 1  # รอ 1 วินาทีระหว่างแต่ละ deploy
}

# สรุปผล
Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 สรุปผลการ Deploy" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ สำเร็จ: $successCount" -ForegroundColor Green
Write-Host "❌ ล้มเหลว: $failCount" -ForegroundColor Red
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "🎉 Deploy ทั้งหมดสำเร็จ!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 ขั้นตอนต่อไป:" -ForegroundColor Cyan
    Write-Host "   1. ตรวจสอบใน Supabase Dashboard > Edge Functions" -ForegroundColor White
    Write-Host "   2. ทดสอบการจองห้องในแอปพลิเคชัน" -ForegroundColor White
} else {
    Write-Host "⚠️  มีบาง functions ที่ deploy ไม่สำเร็จ" -ForegroundColor Yellow
    Write-Host "   ตรวจสอบ error messages ด้านบน" -ForegroundColor Yellow
}

Write-Host ""
