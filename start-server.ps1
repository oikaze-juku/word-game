# 英単語暗記ゲーム - サーバー起動スクリプト

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "英単語暗記ゲーム - ローカルサーバー起動" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# カレントディレクトリをスクリプトの場所に変更
Set-Location $PSScriptRoot

Write-Host "サーバーを起動しています..." -ForegroundColor Yellow
Write-Host ""

# IPアドレスを取得
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*'} | Select-Object -First 1).IPAddress

if ($ipAddress) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "サーバーが起動しました！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "スマートフォンのブラウザで以下のURLを開いてください:" -ForegroundColor White
    Write-Host ""
    Write-Host "  http://$ipAddress:8000/index.html" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "または、PCのブラウザで:" -ForegroundColor White
    Write-Host ""
    Write-Host "  http://localhost:8000/index.html" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "サーバーを停止するには Ctrl+C を押してください" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "警告: ローカルIPアドレスが見つかりませんでした" -ForegroundColor Red
    Write-Host "PCのブラウザでは以下のURLでアクセスできます:" -ForegroundColor White
    Write-Host ""
    Write-Host "  http://localhost:8000/index.html" -ForegroundColor Yellow
    Write-Host ""
}

# Pythonサーバーを起動
python -m http.server 8000
