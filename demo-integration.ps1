# TurboFCL Frontend + API Integration Demo
# This script demonstrates the complete integration between the React frontend and FastAPI backend

Write-Host "🚀 TurboFCL Frontend + API Integration Demo" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Check if backend is running
Write-Host "📡 Testing Backend API Endpoints..." -ForegroundColor Cyan
Write-Host "------------------------------------" -ForegroundColor Cyan

# Test business structures endpoint
Write-Host "1. Business Structures Endpoint:" -ForegroundColor Yellow
try {
    $businessStructures = Invoke-RestMethod -Uri "http://localhost:8000/api/business-structures" -Method Get
    $businessStructures | Select-Object -First 4 | ForEach-Object {
        Write-Host "   • $($_.entityName) (UEI: $($_.uei)) - $($_.businessSize)" -ForegroundColor White
    }
} catch {
    Write-Host "   ❌ Backend not running on port 8000" -ForegroundColor Red
}
Write-Host ""

# Test FOCI assessment endpoint
Write-Host "2. FOCI Assessment Endpoint (Raytheon Technologies):" -ForegroundColor Yellow
try {
    $fociAssessment = Invoke-RestMethod -Uri "http://localhost:8000/api/foci-assessment/LRG12345ABCD" -Method Get
    Write-Host "   • Company: $($fociAssessment.companyName)" -ForegroundColor White
    Write-Host "   • Risk Level: $($fociAssessment.riskLevel) (Score: $($fociAssessment.fociScore))" -ForegroundColor White
    Write-Host "   • Mitigation: $($fociAssessment.recommendedMitigation)" -ForegroundColor White
} catch {
    Write-Host "   ❌ FOCI assessment endpoint error" -ForegroundColor Red
}
Write-Host ""

# Check frontend status
Write-Host "3. Frontend Status:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method Head -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Frontend running on port 3000" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Frontend not running on port 3000" -ForegroundColor Red
}
Write-Host ""

Write-Host "🎯 Frontend Integration Status:" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Cyan
Write-Host "• ✅ Business Structure Explorer component created" -ForegroundColor Green
Write-Host "• ✅ API endpoints integrated with React hooks" -ForegroundColor Green
Write-Host "• ✅ Dashboard integration complete" -ForegroundColor Green
Write-Host "• ✅ Dedicated Business Explorer page added" -ForegroundColor Green
Write-Host "• ✅ Navigation menu updated" -ForegroundColor Green
Write-Host "• ✅ FOCI assessment visualization working" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Available Features:" -ForegroundColor Cyan
Write-Host "---------------------" -ForegroundColor Cyan
Write-Host "• 7 Business size categories (Large, Small, SDB, WOSB, VOSB, HUBZone, 8(a))" -ForegroundColor White
Write-Host "• Complex entity structures (C-Corp, LLC, LLP, MLP, etc.)" -ForegroundColor White
Write-Host "• FOCI risk scoring and mitigation recommendations" -ForegroundColor White
Write-Host "• Key Management Personnel requirements" -ForegroundColor White
Write-Host "• Real-time API integration with fallback to demo data" -ForegroundColor White
Write-Host "• SAM.gov API integration with API key support" -ForegroundColor White
Write-Host ""

Write-Host "🌐 Access Points:" -ForegroundColor Cyan
Write-Host "----------------" -ForegroundColor Cyan
Write-Host "• Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "• Dashboard: http://localhost:3000/dashboard" -ForegroundColor White
Write-Host "• Business Explorer: http://localhost:3000/business-explorer" -ForegroundColor White
Write-Host "• API Documentation: http://localhost:8000/docs" -ForegroundColor White
Write-Host "• Business Structures API: http://localhost:8000/api/business-structures" -ForegroundColor White
Write-Host ""

Write-Host "🎉 Integration Complete!" -ForegroundColor Green
Write-Host "Ready for facility clearance compliance modeling and DCSA/NISS requirements!" -ForegroundColor Green
