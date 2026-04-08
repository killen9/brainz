#!/bin/bash
# ============================================
# 사내 CRM - 인콜 고객사 관리 시스템 시작 스크립트
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================"
echo "  사내 CRM - 인콜 고객사 관리 시스템"
echo "======================================"
echo ""

# Python 확인
if ! command -v python3 &> /dev/null; then
    echo "[오류] Python3가 설치되어 있지 않습니다."
    echo "       https://www.python.org 에서 설치 후 다시 시도하세요."
    exit 1
fi

# 의존성 설치
echo "[1/3] 필요 패키지 확인 중..."
pip3 install flask flask-cors openpyxl -q

echo "[2/3] 데이터베이스 초기화 중..."
echo "[3/3] 서버 시작 중..."
echo ""
echo "  ✅ 서버 주소: http://localhost:5000"
echo "  ✅ 브라우저에서 위 주소를 열어주세요"
echo ""
echo "  종료하려면 Ctrl+C를 누르세요"
echo "======================================"

# 브라우저 자동 실행 (OS별)
(sleep 2 && (
    if command -v xdg-open &>/dev/null; then
        xdg-open http://localhost:5000
    elif command -v open &>/dev/null; then
        open http://localhost:5000
    elif command -v start &>/dev/null; then
        start http://localhost:5000
    fi
)) &

python3 app.py
