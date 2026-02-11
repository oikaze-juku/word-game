@echo off
echo ========================================
echo 英単語暗記ゲーム - ローカルサーバー起動
echo ========================================
echo.
echo サーバーを起動しています...
echo.

cd /d "%~dp0"

python -m http.server 8000

pause
