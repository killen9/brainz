@echo off
chcp 65001 > nul
echo ======================================
echo   사내 CRM - 인콜 고객사 관리 시스템
echo ======================================
echo.
echo [1/3] 필요 패키지 설치 중...
pip install flask flask-cors openpyxl -q
echo.
echo [2/3] 서버 시작 준비...
echo [3/3] 서버를 시작합니다...
echo.
echo   서버 주소: http://localhost:5000
echo   브라우저에서 위 주소를 열어주세요
echo.
echo   종료하려면 이 창을 닫으세요
echo ======================================

timeout /t 2 /nobreak > nul
start "" "http://localhost:5000"
python app.py
pause
