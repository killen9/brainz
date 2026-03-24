-- 샘플 팀원 데이터
INSERT INTO members (name, email, role, department, phone, avatar_color) VALUES
  ('김민준', 'minjun.kim@company.com', 'admin', '영업팀', '010-1234-5678', '#4F46E5'),
  ('이서연', 'seoyeon.lee@company.com', 'manager', '영업팀', '010-2345-6789', '#059669'),
  ('박도현', 'dohyun.park@company.com', 'member', '기술팀', '010-3456-7890', '#DC2626'),
  ('최지우', 'jiwoo.choi@company.com', 'member', '기획팀', '010-4567-8901', '#D97706'),
  ('정수아', 'sua.jung@company.com', 'member', '영업팀', '010-5678-9012', '#7C3AED');

-- 샘플 고객사 데이터
INSERT INTO clients (name, industry, website, address, phone, email, status, grade, notes) VALUES
  ('삼성전자', 'IT/전자', 'https://samsung.com', '경기도 수원시 영통구', '031-200-1234', 'biz@samsung.com', 'active', 'vip', 'VIP 고객사, 연간 계약'),
  ('현대자동차', '자동차', 'https://hyundai.com', '서울시 서초구 헌릉로', '02-3464-1234', 'biz@hyundai.com', 'active', 'premium', '프리미엄 파트너'),
  ('LG화학', '화학/소재', 'https://lgchem.com', '서울시 영등포구', '02-3773-1234', 'contact@lgchem.com', 'active', 'normal', '신규 계약 검토 중'),
  ('네이버', 'IT/인터넷', 'https://naver.com', '경기도 성남시 분당구', '1588-3820', 'biz@naver.com', 'prospect', 'normal', '미팅 진행 중'),
  ('카카오', 'IT/인터넷', 'https://kakao.com', '제주시 첨단로', '1577-3321', 'biz@kakao.com', 'prospect', 'normal', '제안서 준비 중');

-- 샘플 담당자 데이터
INSERT INTO contacts (client_id, name, position, department, phone, mobile, email, is_primary) VALUES
  (1, '이재원', '부장', '구매팀', '031-200-1111', '010-1111-2222', 'jaewon.lee@samsung.com', 1),
  (1, '박수진', '차장', '기술팀', '031-200-2222', '010-2222-3333', 'sujin.park@samsung.com', 0),
  (2, '김태현', '이사', '전략기획팀', '02-3464-1111', '010-3333-4444', 'taehyun.kim@hyundai.com', 1),
  (3, '최유진', '과장', '구매팀', '02-3773-1111', '010-4444-5555', 'yujin.choi@lgchem.com', 1),
  (4, '정민호', '팀장', 'B2B팀', '031-888-1111', '010-5555-6666', 'minho.jung@naver.com', 1),
  (5, '한지수', '대리', '파트너십팀', '064-777-1111', '010-6666-7777', 'jisu.han@kakao.com', 1);

-- 샘플 업무 데이터
INSERT INTO tasks (title, description, client_id, assignee_id, status, priority, category, due_date, created_by) VALUES
  ('삼성전자 Q2 제안서 작성', '2분기 솔루션 제안서 준비 및 발표 준비', 1, 2, 'in_progress', 'high', '영업', '2026-04-15', 1),
  ('현대자동차 계약 갱신 협의', '연간 유지보수 계약 갱신 미팅 준비', 2, 2, 'todo', 'high', '계약', '2026-04-10', 1),
  ('LG화학 기술 지원', '신규 시스템 도입 관련 기술 지원', 3, 3, 'in_progress', 'medium', '기술', '2026-04-20', 1),
  ('네이버 첫 미팅 준비', '신규 고객사 첫 미팅 자료 준비', 4, 4, 'todo', 'medium', '영업', '2026-04-05', 1),
  ('카카오 제안서 검토', '파트너십 제안서 내부 검토', 5, 5, 'review', 'medium', '영업', '2026-03-30', 2),
  ('월간 보고서 작성', '3월 영업 실적 보고서 작성', NULL, 1, 'todo', 'low', '내부', '2026-03-31', 1),
  ('삼성전자 현장 방문', '신규 라인 투어 및 요구사항 수집', 1, 2, 'done', 'high', '영업', '2026-03-20', 1);

-- 샘플 활동 이력 데이터
INSERT INTO activities (client_id, task_id, member_id, type, title, content, outcome, next_action, next_action_date) VALUES
  (1, 1, 2, 'meeting', '삼성전자 킥오프 미팅', '2분기 제안 방향 논의', '주요 요구사항 파악 완료', '제안서 초안 작성', '2026-04-01'),
  (1, 7, 2, 'visit', '삼성전자 현장 방문', '신규 생산 라인 현장 투어', '추가 자동화 솔루션 필요성 확인', '솔루션 제안서 준비', '2026-04-10'),
  (2, 2, 2, 'call', '현대자동차 계약 갱신 전화', '계약 갱신 일정 협의', '4월 10일 미팅 확정', '미팅 준비', '2026-04-08'),
  (3, 3, 3, 'email', 'LG화학 기술 문의 답변', '신규 시스템 관련 기술 사양 문의 답변 발송', '추가 기술 미팅 요청', '기술 미팅 일정 잡기', '2026-04-05'),
  (4, 4, 4, 'meeting', '네이버 담당자 첫 통화', '사업 방향 및 니즈 파악', '긍정적 반응, 미팅 요청', '미팅 자료 준비', '2026-04-04'),
  (5, 5, 5, 'proposal', '카카오 파트너십 제안', '파트너십 제안서 이메일 발송', '내부 검토 후 회신 예정', '회신 대기', '2026-04-07');
