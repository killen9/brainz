# 사내 CRM - 인콜 고객사 관리 시스템

## 개요
사내로 들어오는 인콜(In-Call)에 대한 고객사 정보, 이력, 일정을 통합 관리하는 CRM 시스템입니다.

## 주요 기능

### 📊 대시보드
- 계약 상태별 고객사 통계 (잠재/상담중/견적/계약완료/보류/종결)
- 진행중인 고객사 (상담중, 견적) 목록
- 향후 30일 일정 미리보기
- 최근 이력 및 담당자별 현황

### 🏢 고객사 관리
- 고객사 등록/수정/삭제
- **고객사 정보**: 최종 고객사, 인콜 문의 회사, 담당자, 업종, 계약 상태, 유입 경로, 회신 연락처/이메일, 사내 담당자, 계약 정보
- 검색 및 필터 (상태별, 담당자별)
- 페이지네이션
- 고객사 상세 - 이력 및 일정 탭

### 📋 이력 관리
- 통화/이메일/방문/미팅/기타 이력 등록
- 고객사별, 전체 이력 조회
- 이력 검색 및 필터

### 📅 일정 관리
- 일정 등록/수정/삭제
- 목록 뷰 & 캘린더 뷰 전환
- 예정/완료/취소 상태 관리
- 담당자별, 기간별 필터

### 📂 엑셀 Import/Export
- **고객사 목록 내보내기**: 상태별 색상 구분, 정렬 포함
- **고객사+이력 포함 내보내기**: 시트 분리
- **엑셀 일괄 등록**: 드래그&드롭 업로드, 입력 양식 제공

## 설치 및 실행

### 요구사항
- Python 3.8 이상
- pip (Python 패키지 매니저)

### Windows 실행
```
start.bat 더블클릭
```

### Mac/Linux 실행
```bash
chmod +x start.sh
./start.sh
```

### 수동 실행
```bash
pip install flask flask-cors openpyxl
python app.py
# 브라우저에서 http://localhost:5000 접속
```

## 기술 스택
- **백엔드**: Python + Flask
- **데이터베이스**: SQLite (로컬 파일 `crm.db`)
- **프론트엔드**: Vanilla JS + HTML/CSS
- **엑셀 처리**: openpyxl

## 파일 구조
```
crm/
├── app.py          # Flask 서버 (API + DB)
├── crm.db          # SQLite 데이터베이스 (자동 생성)
├── index.html      # 메인 페이지
├── css/
│   └── style.css   # 스타일시트
├── js/
│   └── app.js      # 프론트엔드 로직
├── start.sh        # Linux/Mac 실행 스크립트
├── start.bat       # Windows 실행 스크립트
└── README.md
```

## Apache + WSGI 배포 (선택사항)
로컬이 아닌 서버 배포 시 Apache + mod_wsgi 사용:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```
