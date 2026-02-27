Write-Host "Sending Stage 2..."
node scripts/send-test-single.js 2
Write-Host "Waiting 60s..."
Start-Sleep -Seconds 60
Write-Host "Sending Stage 3..."
node scripts/send-test-single.js 3
Write-Host "Done."
