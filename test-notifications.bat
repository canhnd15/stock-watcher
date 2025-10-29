@echo off
echo ========================================
echo Tracked Stock Notification Test Script
echo ========================================
echo.

echo [1/5] Checking if backend is running...
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:8899/api/stocks' -UseBasicParsing -TimeoutSec 3 | Out-Null; Write-Host '  ✓ Backend is running' -ForegroundColor Green } catch { Write-Host '  ✗ Backend is NOT running on port 8899' -ForegroundColor Red; Write-Host '  Please start the backend first' -ForegroundColor Yellow }"
echo.

echo [2/5] Fetching tracked stocks...
powershell -Command "$response = Invoke-WebRequest -Uri 'http://localhost:8899/api/stocks' -UseBasicParsing; $data = $response.Content | ConvertFrom-Json; if ($data.Count -eq 0) { Write-Host '  ⚠ No tracked stocks found' -ForegroundColor Yellow } else { Write-Host ('  ✓ Found ' + $data.Count + ' tracked stocks') -ForegroundColor Green; $data | ForEach-Object { Write-Host ('    - ' + $_.code + ' (active: ' + $_.active + ')') -ForegroundColor Cyan } }"
echo.

echo [3/5] Checking VN30 configuration...
powershell -Command "$response = Invoke-WebRequest -Uri 'http://localhost:8899/api/stocks/vn30' -UseBasicParsing; $data = $response.Content | ConvertFrom-Json; Write-Host ('  ✓ VN30 codes configured: ' + $data.Count) -ForegroundColor Green; Write-Host ('  Codes: ' + ($data -join ', ')) -ForegroundColor Cyan"
echo.

echo [4/5] Triggering notification check...
powershell -Command "$response = Invoke-WebRequest -Uri 'http://localhost:8899/api/signals/check-tracked' -Method POST -Headers @{'Content-Type'='application/json'} -UseBasicParsing; $data = $response.Content | ConvertFrom-Json; Write-Host ('  Status: ' + $data.status) -ForegroundColor Green; Write-Host ('  Message: ' + $data.message) -ForegroundColor Cyan"
echo.

echo [5/5] Opening test page...
echo   Please check the test page in your browser
echo   Follow the steps to test notifications
timeout /t 2 >nul
start "" "frontend\test-notifications.html"
echo.

echo ========================================
echo Test completed!
echo ========================================
echo.
echo Next steps:
echo 1. The test page should open automatically
echo 2. Grant notification permission when prompted
echo 3. Click through each test button
echo 4. Check browser console (F12) for logs
echo.
echo If you still don't see notifications:
echo - Open: NOTIFICATION_TROUBLESHOOTING.md
echo - Check Windows notification settings
echo - Check browser notification permissions
echo.
pause

