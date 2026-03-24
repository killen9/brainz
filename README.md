# TeamCRM - 고객사 & 업무 관리

## 프로젝트 개요
팀에서 사용하는 고객사 이력 관리 및 업무 관리 시스템입니다.

- **목표**: 고객사 정보, 담당자 연락처, 업무 현황, 활동 이력을 통합 관리
- **기술 스택**: Hono + TypeScript + Cloudflare Pages + D1 SQLite + TailwindCSS

## 주요 기능

### 대시보드
- 전체 통계 카드 (고객사, 업무, 완료, 지연 현황)
- 최근 활동 이력 피드
- 마감 예정 업무 목록
- 팀원별 업무 현황 진행 바

### 고객사 관리
- 고객사 목록 (검색, 상태/등급 필터)
- 고객사 상세 페이지 (정보, 담당자, 업무, 활동 이력 탭)
- 상태: 활성 / 잠재 / 비활성
- 등급: VIP / 프리미엄 / 일반

### 담당자(연락처) 관리
- 고객사별 담당자 관리
- 주 담당자 지정
- 직위/부서/연락처 정보

### 활동 이력 관리
- 유형: 전화, 이메일, 미팅, 방문, 제안, 계약, 메모
- 결과 및 다음 액션 기록
- 타임라인 형식의 이력 표시

### 업무 관리
- 업무 목록 (테이블 형식)
- 칸반 보드 (할일 / 진행중 / 검토 / 완료)
- 우선순위: 높음 / 보통 / 낮음
- 상태별 인라인 변경 가능

### 팀원 관리
- 팀원 등록/수정/삭제
- 역할: 관리자 / 매니저 / 팀원
- 담당 업무 현황 표시
- 아바타 색상 커스터마이징

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/dashboard` | 대시보드 통계 |
| GET/POST | `/api/clients` | 고객사 목록/추가 |
| GET/PUT/DELETE | `/api/clients/:id` | 고객사 상세/수정/삭제 |
| GET/POST | `/api/contacts` | 담당자 목록/추가 |
| PUT/DELETE | `/api/contacts/:id` | 담당자 수정/삭제 |
| GET/POST | `/api/tasks` | 업무 목록/추가 |
| GET/PUT/DELETE | `/api/tasks/:id` | 업무 상세/수정/삭제 |
| PATCH | `/api/tasks/:id/status` | 업무 상태 변경 |
| GET/POST | `/api/activities` | 활동 이력 목록/추가 |
| DELETE | `/api/activities/:id` | 활동 이력 삭제 |
| GET/POST | `/api/members` | 팀원 목록/추가 |
| PUT/DELETE | `/api/members/:id` | 팀원 수정/비활성화 |

## 데이터 구조

### 테이블
- `clients` - 고객사 (이름, 업종, 상태, 등급, 연락처)
- `contacts` - 담당자 (이름, 직위, 부서, 연락처, 주담당 여부)
- `members` - 팀원 (이름, 이메일, 역할, 부서)
- `tasks` - 업무 (제목, 설명, 상태, 우선순위, 마감일, 담당자)
- `activities` - 활동 이력 (유형, 제목, 내용, 결과, 다음 액션)

## 개발 환경 설정

```bash
# 의존성 설치
npm install

# DB 마이그레이션 (로컬)
npm run db:migrate:local

# 샘플 데이터 삽입
npm run db:seed

# 빌드
npm run build

# 개발 서버 시작 (PM2)
pm2 start ecosystem.config.cjs
```

## 배포 (Cloudflare Pages)

```bash
# Cloudflare API 토큰 설정 후
npx wrangler d1 create webapp-production
# wrangler.jsonc에 database_id 입력 후
npm run db:migrate:prod
npm run deploy
```

## 샘플 데이터
초기 실행 시 다음 샘플 데이터가 포함됩니다:
- 고객사 5개 (삼성전자, 현대자동차, LG화학, 네이버, 카카오)
- 팀원 5명
- 담당자 6명
- 업무 7건
- 활동 이력 6건

## 개발 상태
- ✅ 대시보드
- ✅ 고객사 CRUD
- ✅ 담당자 관리
- ✅ 활동 이력 관리
- ✅ 업무 관리 (리스트 + 칸반)
- ✅ 팀원 관리
- ⬜ 사용자 인증 (로그인/권한)
- ⬜ 파일 첨부 (R2 연동)
- ⬜ 이메일 알림
- ⬜ 데이터 내보내기 (Excel/CSV)
- ⬜ 캘린더 뷰
