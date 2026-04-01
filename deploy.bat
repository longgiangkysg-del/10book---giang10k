@echo off
echo ========================================
echo   10kBook - Deploy to Google Cloud Run
echo ========================================
echo.

cd /d %~dp0

echo [1/2] Building and uploading...
gcloud run deploy tenk-book --source . --region asia-southeast1 --platform managed --allow-unauthenticated --port 8080 --quiet

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   Deploy thanh cong!
    echo   URL: https://tenk-book-523626190544.asia-southeast1.run.app
    echo ========================================
) else (
    echo.
    echo   Deploy that bai! Kiem tra lai gcloud config.
)

echo.
pause
