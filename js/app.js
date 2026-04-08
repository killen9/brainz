/* ============================================================
   사내 CRM - 인콜 고객사 관리  /  app.js
   ============================================================ */
'use strict';

const API = '';   // 같은 origin
let currentPage = 'dashboard';
let clientCurrentPage = 1;
let clientTotalPages = 1;
let allClients = [];
let allHistories = [];
let allSchedules = [];
let currentDetailClientId = null;
let calYear, calMonth;
let scheduleView = 'list';
let pendingImportFile = null;

// ─────────────────────────────────────────
// 초기화
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date();
  calYear  = today.getFullYear();
  calMonth = today.getMonth();

  setupNav();
  setupSearch();
  setupDropdown();
  setupSidebarToggle();
  loadDashboard();

  // 날짜 필터 기본값 (향후 3개월)
  const d1 = document.getElementById('schedFrom');
  const d2 = document.getElementById('schedTo');
  if (d1) d1.value = formatDate(today);
  if (d2) {
    const end = new Date(); end.setMonth(end.getMonth() + 3);
    d2.value = formatDate(end);
  }
});

// ─────────────────────────────────────────
// 네비게이션
// ─────────────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  const titles = {
    dashboard: '대시보드', clients: '고객사 관리',
    history: '이력 관리', schedule: '일정 관리', import: '엑셀 Import'
  };
  document.getElementById('headerTitle').textContent = titles[page] || '';

  const actionBtn = document.getElementById('headerActionBtn');
  if (page === 'clients') {
    actionBtn.style.display = 'flex';
    actionBtn.onclick = () => showClientModal();
  } else if (page === 'schedule') {
    actionBtn.style.display = 'flex';
    actionBtn.innerHTML = '<i class="fas fa-plus"></i> 일정 등록';
    actionBtn.onclick = () => showScheduleModal();
  } else {
    actionBtn.style.display = 'none';
  }

  switch(page) {
    case 'dashboard': loadDashboard();   break;
    case 'clients':   loadClients();     break;
    case 'history':   loadHistories();   break;
    case 'schedule':  loadSchedules();   break;
  }
}

function setupSidebarToggle() {
  const btn = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const main = document.querySelector('.main-content');
  btn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('expanded');
  });
}

// ─────────────────────────────────────────
// 검색
// ─────────────────────────────────────────
function setupSearch() {
  let timer;
  const inp = document.getElementById('clientSearch');
  if (inp) {
    inp.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { clientCurrentPage = 1; loadClients(); }, 350);
    });
  }
}

// ─────────────────────────────────────────
// 드롭다운
// ─────────────────────────────────────────
function setupDropdown() {
  const exportBtn = document.getElementById('exportBtn');
  const exportMenu = document.getElementById('exportMenu');
  if (exportBtn && exportMenu) {
    exportBtn.addEventListener('click', e => {
      e.stopPropagation();
      exportBtn.closest('.dropdown').classList.toggle('open');
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
    });
  }
}

// ─────────────────────────────────────────
// API 헬퍼
// ─────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '오류가 발생했습니다');
    return data;
  } catch(e) {
    showToast(e.message, 'error');
    throw e;
  }
}

async function apiGet(path) {
  const res = await fetch(API + path);
  return await res.json();
}

// ─────────────────────────────────────────
// 대시보드
// ─────────────────────────────────────────
async function loadDashboard() {
  try {
    const d = await apiGet('/api/dashboard');

    // 통계 카드
    const statConfigs = [
      { label: '전체 고객사', val: d.total_clients, icon: 'fa-building', color: '#EFF6FF', iconColor: '#1E40AF' },
      { label: '이번달 신규', val: d.new_this_month, icon: 'fa-user-plus', color: '#F0FDF4', iconColor: '#059669' },
      { label: '상담중', val: d.status_stats['상담중'] || 0, icon: 'fa-comments', color: '#FEF3C7', iconColor: '#D97706' },
      { label: '견적 진행', val: d.status_stats['견적'] || 0, icon: 'fa-file-invoice', color: '#FFF7ED', iconColor: '#C2410C' },
      { label: '계약 완료', val: d.status_stats['계약완료'] || 0, icon: 'fa-handshake', color: '#D1FAE5', iconColor: '#059669' },
      { label: '보류', val: d.status_stats['보류'] || 0, icon: 'fa-pause-circle', color: '#FEE2E2', iconColor: '#DC2626' },
    ];
    const statsRow = document.getElementById('statsRow');
    statsRow.innerHTML = statConfigs.map(s => `
      <div class="stat-card">
        <div class="stat-icon" style="background:${s.color}">
          <i class="fas ${s.icon}" style="color:${s.iconColor}"></i>
        </div>
        <div class="stat-body">
          <p>${s.val}</p>
          <span>${s.label}</span>
        </div>
      </div>`).join('');

    // 진행중 고객사
    const inProgressBody = document.getElementById('inProgressBody');
    document.getElementById('inProgressCount').textContent = d.in_progress_clients.length;
    if (d.in_progress_clients.length === 0) {
      inProgressBody.innerHTML = `<tr><td colspan="7" class="empty-state">진행중인 고객사가 없습니다</td></tr>`;
    } else {
      inProgressBody.innerHTML = d.in_progress_clients.map(c => `
        <tr>
          <td>${c.final_client ? `<span class="text-muted">${escHtml(c.final_client)} /</span> ` : ''}
              <strong>${escHtml(c.inquiry_company)}</strong></td>
          <td>${escHtml(c.inquiry_contact || '-')}</td>
          <td><span class="status-badge status-${c.contract_status}">${c.contract_status}</span></td>
          <td>${escHtml(c.manager || '-')}</td>
          <td>${c.last_contact ? fmtDateShort(c.last_contact) : '-'}</td>
          <td><span class="badge badge-info">${c.history_count}건</span></td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="showClientDetail(${c.id})">
              <i class="fas fa-eye"></i>
            </button>
          </td>
        </tr>`).join('');
    }

    // 향후 일정
    const upcomingDiv = document.getElementById('upcomingSchedules');
    if (d.upcoming_schedules.length === 0) {
      upcomingDiv.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-times"></i><p>예정된 일정이 없습니다</p></div>`;
    } else {
      upcomingDiv.innerHTML = `<div class="schedule-list">${
        d.upcoming_schedules.map(s => {
          const dt = new Date(s.start_dt);
          return `
          <div class="schedule-item" onclick="navigateTo('schedule')">
            <div class="sched-date">
              <div class="day">${dt.getDate()}</div>
              <div class="month">${dt.getMonth()+1}월</div>
            </div>
            <div class="sched-body">
              <div class="title">${escHtml(s.title)}</div>
              <div class="sub">
                ${s.inquiry_company ? `<i class="fas fa-building" style="color:#94a3b8"></i> ${escHtml(s.inquiry_company)} · ` : ''}
                <i class="fas fa-user" style="color:#94a3b8"></i> ${escHtml(s.manager || '-')}
              </div>
            </div>
            <div class="sched-meta">
              <span class="badge badge-info">${s.type}</span><br>
              <small>${fmtTime(s.start_dt)}</small>
            </div>
          </div>`;
        }).join('')
      }</div>`;
    }

    // 최근 이력
    const recentDiv = document.getElementById('recentHistories');
    const typeColors = { '통화':'#EFF6FF', '이메일':'#F0FDF4', '방문':'#FFF7ED', '미팅':'#FAF5FF', '기타':'#F3F4F6' };
    const typeIconColors = { '통화':'#1D4ED8', '이메일':'#166534', '방문':'#C2410C', '미팅':'#6D28D9', '기타':'#6B7280' };
    const typeIcons = { '통화':'fa-phone', '이메일':'fa-envelope', '방문':'fa-map-marker-alt', '미팅':'fa-users', '기타':'fa-file' };
    recentDiv.innerHTML = d.recent_histories.map(h => `
      <div class="history-item">
        <div class="hist-icon" style="background:${typeColors[h.type]||'#f3f4f6'}">
          <i class="fas ${typeIcons[h.type]||'fa-file'}" style="color:${typeIconColors[h.type]||'#6b7280'}"></i>
        </div>
        <div class="hist-body">
          <div class="title">${escHtml(h.title)}</div>
          <div class="company">${escHtml(h.inquiry_company || '')}</div>
        </div>
        <div class="hist-meta">${fmtDateShort(h.created_at)}</div>
      </div>`).join('') || `<div class="empty-state"><i class="fas fa-history"></i><p>이력 없음</p></div>`;

    // 상태 차트
    const statusChartDiv = document.getElementById('statusChart');
    const statuses = ['잠재','상담중','견적','계약완료','보류','종결'];
    const statusClrs = {
      '잠재':'#3B82F6','상담중':'#F59E0B','견적':'#F97316',
      '계약완료':'#10B981','보류':'#EF4444','종결':'#9CA3AF'
    };
    const total = d.total_clients || 1;
    statusChartDiv.innerHTML = `<div class="status-chart">${
      statuses.map(s => {
        const cnt = d.status_stats[s] || 0;
        const pct = Math.round(cnt / total * 100);
        return `
        <div class="status-bar-item">
          <div class="status-bar-label">${s}</div>
          <div class="status-bar-track">
            <div class="status-bar-fill" style="width:${pct}%;background:${statusClrs[s]}"></div>
          </div>
          <div class="status-bar-count">${cnt}</div>
        </div>`;
      }).join('')
    }</div>`;

  } catch(e) { console.error('Dashboard error:', e); }
}

// ─────────────────────────────────────────
// 고객사 관리
// ─────────────────────────────────────────
async function loadClients() {
  const search  = document.getElementById('clientSearch')?.value || '';
  const status  = document.getElementById('filterStatus')?.value || '';
  const manager = document.getElementById('filterManager')?.value || '';
  const perPage = 20;

  const params = new URLSearchParams({
    search, status, manager,
    page: clientCurrentPage, per_page: perPage
  });

  try {
    const d = await apiGet(`/api/clients?${params}`);
    allClients = d.data;
    clientTotalPages = Math.ceil(d.total / perPage);

    document.getElementById('clientTotal').textContent = `총 ${d.total}건`;

    const tbody = document.getElementById('clientBody');
    if (d.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11">
        <div class="empty-state"><i class="fas fa-building"></i><p>등록된 고객사가 없습니다</p></div>
      </td></tr>`;
    } else {
      tbody.innerHTML = d.data.map(c => {
        let ci = {};
        try { ci = JSON.parse(c.contract_info || '{}'); } catch(e) {}
        return `
        <tr>
          <td><input type="checkbox" class="row-check" data-id="${c.id}"></td>
          <td>${escHtml(c.final_client || '-')}</td>
          <td>
            <a href="#" onclick="showClientDetail(${c.id});return false" class="text-primary" style="font-weight:600">
              ${escHtml(c.inquiry_company)}
            </a>
            ${c.inquiry_contact ? `<br><small class="text-muted">${escHtml(c.inquiry_contact)}</small>` : ''}
          </td>
          <td>${escHtml(c.inquiry_contact || '-')}</td>
          <td><span class="text-muted">${escHtml(c.industry || '-')}</span></td>
          <td><span class="status-badge status-${c.contract_status}">${c.contract_status}</span></td>
          <td>${escHtml(c.inflow_route || '-')}</td>
          <td>
            ${c.callback_phone ? `<a href="tel:${c.callback_phone}">${escHtml(c.callback_phone)}</a>` : '-'}
            ${c.callback_email ? `<br><small class="text-muted">${escHtml(c.callback_email)}</small>` : ''}
          </td>
          <td>${escHtml(c.manager || '-')}</td>
          <td><small class="text-muted">${fmtDateShort(c.created_at)}</small></td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn btn-sm btn-outline" onclick="showClientDetail(${c.id})" title="상세">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-sm btn-outline" onclick="showClientModal(${c.id})" title="수정">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-outline" onclick="deleteClient(${c.id})" title="삭제" style="color:#dc2626">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>`;
      }).join('');
    }

    renderPagination();
    loadManagerFilter();
  } catch(e) { console.error('loadClients error:', e); }
}

function renderPagination() {
  const wrap = document.getElementById('clientPagination');
  if (!wrap) return;
  let html = '';
  html += `<button class="page-btn" onclick="changePage(${clientCurrentPage-1})" ${clientCurrentPage<=1?'disabled':''}>
    <i class="fas fa-chevron-left"></i></button>`;
  const range = 2;
  for (let i = 1; i <= clientTotalPages; i++) {
    if (i === 1 || i === clientTotalPages || (i >= clientCurrentPage - range && i <= clientCurrentPage + range)) {
      html += `<button class="page-btn ${i===clientCurrentPage?'active':''}" onclick="changePage(${i})">${i}</button>`;
    } else if (i === clientCurrentPage - range - 1 || i === clientCurrentPage + range + 1) {
      html += `<span style="padding:0 4px;color:#94a3b8">…</span>`;
    }
  }
  html += `<button class="page-btn" onclick="changePage(${clientCurrentPage+1})" ${clientCurrentPage>=clientTotalPages?'disabled':''}>
    <i class="fas fa-chevron-right"></i></button>`;
  wrap.innerHTML = html;
}

function changePage(p) {
  if (p < 1 || p > clientTotalPages) return;
  clientCurrentPage = p;
  loadClients();
}

async function loadManagerFilter() {
  try {
    const managers = await apiGet('/api/managers');
    const sel = document.getElementById('filterManager');
    const schedSel = document.getElementById('schedManager');
    const current = sel?.value;
    if (sel) {
      sel.innerHTML = '<option value="">전체 담당자</option>' +
        managers.map(m => `<option value="${escHtml(m)}" ${m===current?'selected':''}>${escHtml(m)}</option>`).join('');
    }
    if (schedSel) {
      schedSel.innerHTML = '<option value="">전체 담당자</option>' +
        managers.map(m => `<option value="${escHtml(m)}">${escHtml(m)}</option>`).join('');
    }
  } catch(e) {}
}

function toggleSelectAll() {
  const all = document.getElementById('selectAll').checked;
  document.querySelectorAll('.row-check').forEach(c => c.checked = all);
}

// 고객사 등록/수정 모달
async function showClientModal(id) {
  clearForm('client');
  document.getElementById('clientModalTitle').innerHTML =
    `<i class="fas fa-${id ? 'edit' : 'building'}"></i> 고객사 ${id ? '수정' : '등록'}`;

  if (id) {
    try {
      const c = await apiGet(`/api/clients/${id}`);
      document.getElementById('clientId').value = c.id;
      document.getElementById('fFinalClient').value = c.final_client || '';
      document.getElementById('fInquiryCompany').value = c.inquiry_company || '';
      document.getElementById('fInquiryContact').value = c.inquiry_contact || '';
      document.getElementById('fIndustry').value = c.industry || '';
      document.getElementById('fContractStatus').value = c.contract_status || '잠재';
      document.getElementById('fInflowRoute').value = c.inflow_route || '';
      document.getElementById('fCallbackPhone').value = c.callback_phone || '';
      document.getElementById('fCallbackEmail').value = c.callback_email || '';
      document.getElementById('fManager').value = c.manager || '';
      document.getElementById('fMemo').value = c.memo || '';
      let ci = {};
      try { ci = JSON.parse(c.contract_info || '{}'); } catch(e) {}
      document.getElementById('fContractAmount').value = ci.amount || '';
      document.getElementById('fContractPeriod').value = ci.period || '';
    } catch(e) { return; }
  }
  openModal('clientModal');
}

async function saveClient() {
  const id = document.getElementById('clientId').value;
  const data = {
    final_client:    document.getElementById('fFinalClient').value.trim(),
    inquiry_company: document.getElementById('fInquiryCompany').value.trim(),
    inquiry_contact: document.getElementById('fInquiryContact').value.trim(),
    industry:        document.getElementById('fIndustry').value.trim(),
    contract_status: document.getElementById('fContractStatus').value,
    inflow_route:    document.getElementById('fInflowRoute').value,
    callback_phone:  document.getElementById('fCallbackPhone').value.trim(),
    callback_email:  document.getElementById('fCallbackEmail').value.trim(),
    manager:         document.getElementById('fManager').value.trim(),
    contract_info: {
      amount: document.getElementById('fContractAmount').value.trim(),
      period: document.getElementById('fContractPeriod').value.trim()
    },
    memo: document.getElementById('fMemo').value.trim()
  };
  if (!data.inquiry_company) { showToast('인콜 문의 회사를 입력하세요', 'error'); return; }
  try {
    if (id) { await api('PUT', `/api/clients/${id}`, data); showToast('수정되었습니다'); }
    else     { await api('POST', '/api/clients', data); showToast('등록되었습니다', 'success'); }
    closeModal('clientModal');
    loadClients();
    if (currentPage === 'dashboard') loadDashboard();
  } catch(e) {}
}

async function deleteClient(id) {
  if (!confirm('이 고객사를 삭제하면 관련 이력도 모두 삭제됩니다.\n계속하시겠습니까?')) return;
  try {
    await api('DELETE', `/api/clients/${id}`);
    showToast('삭제되었습니다');
    loadClients();
  } catch(e) {}
}

// 고객사 상세 모달
async function showClientDetail(id) {
  currentDetailClientId = id;
  try {
    const c = await apiGet(`/api/clients/${id}`);
    let ci = {};
    try { ci = JSON.parse(c.contract_info || '{}'); } catch(e) {}

    document.getElementById('detailModalTitle').innerHTML =
      `<i class="fas fa-building"></i> ${escHtml(c.inquiry_company)}`;

    const fields = [
      { label: '최종 고객사', val: c.final_client || '-' },
      { label: '인콜 문의 회사', val: c.inquiry_company || '-' },
      { label: '문의 담당자', val: c.inquiry_contact || '-' },
      { label: '업종', val: c.industry || '-' },
      { label: '계약 상태', val: `<span class="status-badge status-${c.contract_status}">${c.contract_status}</span>` },
      { label: '유입 경로', val: c.inflow_route || '-' },
      { label: '회신 연락처', val: c.callback_phone ? `<a href="tel:${c.callback_phone}">${escHtml(c.callback_phone)}</a>` : '-' },
      { label: '회신 이메일', val: c.callback_email ? `<a href="mailto:${c.callback_email}">${escHtml(c.callback_email)}</a>` : '-' },
      { label: '사내 담당자', val: c.manager || '-' },
      { label: '계약 금액', val: ci.amount || '-' },
      { label: '계약 기간', val: ci.period || '-' },
      { label: '메모', val: c.memo || '-' },
    ];
    document.getElementById('detailInfo').innerHTML = fields.map(f => `
      <div class="detail-field">
        <label>${f.label}</label>
        <p>${f.val}</p>
      </div>`).join('');

    openModal('clientDetailModal');
    switchTab('history');
    loadDetailHistories(id);
    loadDetailSchedules(id);
  } catch(e) {}
}

async function loadDetailHistories(id) {
  try {
    const rows = await apiGet(`/api/clients/${id}/histories`);
    document.getElementById('historyCount').textContent = rows.length;
    const div = document.getElementById('detailHistories');
    if (rows.length === 0) {
      div.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><p>등록된 이력이 없습니다</p></div>`;
      return;
    }
    const typeIcons = { '통화':'fa-phone', '이메일':'fa-envelope', '방문':'fa-map-marker-alt', '미팅':'fa-users', '기타':'fa-file' };
    div.innerHTML = rows.map(h => `
      <div class="history-card">
        <div class="history-card-header">
          <div class="left">
            <span class="status-badge type-${h.type}">
              <i class="fas ${typeIcons[h.type]||'fa-file'}"></i> ${h.type}
            </span>
            <strong>${escHtml(h.title)}</strong>
          </div>
          <div class="right">
            <small class="text-muted">${fmtDateFull(h.created_at)}</small>
            <button class="btn btn-sm btn-outline" onclick="editHistory(${h.id})"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-outline" onclick="deleteHistory(${h.id},${id})" style="color:#dc2626"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        ${h.content ? `<div class="content">${escHtml(h.content)}</div>` : ''}
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          ${h.contact ? `<small class="text-muted"><i class="fas fa-user"></i> ${escHtml(h.contact)}</small>` : ''}
          ${h.result  ? `<span class="result-tag"><i class="fas fa-check"></i> ${escHtml(h.result)}</span>` : ''}
          ${h.created_by ? `<small class="text-muted">작성: ${escHtml(h.created_by)}</small>` : ''}
        </div>
      </div>`).join('');
  } catch(e) {}
}

async function loadDetailSchedules(id) {
  try {
    const rows = await apiGet(`/api/schedules?client_id=${id}`);
    const div = document.getElementById('detailSchedules');
    if (!rows || rows.length === 0) {
      div.innerHTML = `<div class="empty-state"><i class="fas fa-calendar"></i><p>등록된 일정이 없습니다</p></div>`;
      return;
    }
    div.innerHTML = rows.map(s => `
      <div class="history-card">
        <div class="history-card-header">
          <div class="left">
            <span class="status-badge type-${s.type}">${s.type}</span>
            <strong>${escHtml(s.title)}</strong>
          </div>
          <div class="right">
            <span class="status-badge status-${s.status}">${s.status}</span>
            <button class="btn btn-sm btn-outline" onclick="editSchedule(${s.id})"><i class="fas fa-edit"></i></button>
          </div>
        </div>
        <div class="content">
          <i class="fas fa-clock text-muted"></i> ${fmtDateFull(s.start_dt)}
          ${s.end_dt ? ` ~ ${fmtDateFull(s.end_dt)}` : ''}
          ${s.manager ? ` · 담당: ${escHtml(s.manager)}` : ''}
        </div>
        ${s.description ? `<small class="text-muted">${escHtml(s.description)}</small>` : ''}
      </div>`).join('');
  } catch(e) {}
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  document.querySelector(`.tab-btn[onclick*="${tab}"]`)?.classList.add('active');
}

// ─────────────────────────────────────────
// 이력 관리
// ─────────────────────────────────────────
async function loadHistories() {
  try {
    allHistories = await apiGet('/api/histories');
    renderHistories(allHistories);
    populateClientSelects();
  } catch(e) {}
}

function renderHistories(rows) {
  const typeIcons = { '통화':'fa-phone', '이메일':'fa-envelope', '방문':'fa-map-marker-alt', '미팅':'fa-users', '기타':'fa-file' };
  const tbody = document.getElementById('historyBody');
  if (!tbody) return;
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">이력이 없습니다</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(h => `
    <tr>
      <td>${escHtml(h.inquiry_company||'-')}</td>
      <td><span class="status-badge type-${h.type}">
        <i class="fas ${typeIcons[h.type]||'fa-file'}"></i> ${h.type}
      </span></td>
      <td><strong>${escHtml(h.title)}</strong></td>
      <td><small>${escHtml(h.content||'-')}</small></td>
      <td>${escHtml(h.contact||'-')}</td>
      <td>${escHtml(h.result||'-')}</td>
      <td>${escHtml(h.created_by||'-')}</td>
      <td><small class="text-muted">${fmtDateFull(h.created_at)}</small></td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-outline" onclick="editHistory(${h.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-outline" onclick="deleteHistory(${h.id})" style="color:#dc2626"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function filterHistories() {
  const q = document.getElementById('historySearch')?.value.toLowerCase() || '';
  if (!q) { renderHistories(allHistories); return; }
  const filtered = allHistories.filter(h =>
    (h.inquiry_company||'').toLowerCase().includes(q) ||
    (h.title||'').toLowerCase().includes(q) ||
    (h.content||'').toLowerCase().includes(q)
  );
  renderHistories(filtered);
}

async function showHistoryModal(clientId) {
  clearForm('history');
  document.getElementById('historyModalTitle').innerHTML = `<i class="fas fa-history"></i> 이력 등록`;
  await populateClientSelects();
  if (clientId) {
    document.getElementById('hClientId').value = clientId;
    document.getElementById('hClientSelect').value = clientId;
  }
  openModal('historyModal');
}

async function editHistory(id) {
  try {
    const rows = allHistories.length ? allHistories : await apiGet('/api/histories');
    const h = rows.find(r => r.id === id);
    if (!h) { showToast('이력을 찾을 수 없습니다', 'error'); return; }
    clearForm('history');
    document.getElementById('historyModalTitle').innerHTML = `<i class="fas fa-edit"></i> 이력 수정`;
    document.getElementById('hId').value = h.id;
    await populateClientSelects();
    document.getElementById('hClientSelect').value = h.client_id;
    document.getElementById('hType').value = h.type;
    document.getElementById('hTitle').value = h.title;
    document.getElementById('hContent').value = h.content || '';
    document.getElementById('hContact').value = h.contact || '';
    document.getElementById('hResult').value = h.result || '';
    document.getElementById('hCreatedBy').value = h.created_by || '';
    openModal('historyModal');
  } catch(e) {}
}

async function saveHistory() {
  const id = document.getElementById('hId').value;
  const clientId = document.getElementById('hClientSelect').value;
  const data = {
    client_id:  parseInt(clientId),
    type:       document.getElementById('hType').value,
    title:      document.getElementById('hTitle').value.trim(),
    content:    document.getElementById('hContent').value.trim(),
    contact:    document.getElementById('hContact').value.trim(),
    result:     document.getElementById('hResult').value.trim(),
    created_by: document.getElementById('hCreatedBy').value.trim()
  };
  if (!data.title) { showToast('제목을 입력하세요', 'error'); return; }
  if (!data.client_id) { showToast('고객사를 선택하세요', 'error'); return; }
  try {
    if (id) { await api('PUT', `/api/histories/${id}`, data); showToast('수정되었습니다'); }
    else     { await api('POST', '/api/histories', data); showToast('등록되었습니다', 'success'); }
    closeModal('historyModal');
    if (currentPage === 'history') loadHistories();
    if (currentDetailClientId) {
      loadDetailHistories(currentDetailClientId);
    }
  } catch(e) {}
}

async function deleteHistory(id, clientId) {
  if (!confirm('이 이력을 삭제하시겠습니까?')) return;
  try {
    await api('DELETE', `/api/histories/${id}`);
    showToast('삭제되었습니다');
    if (currentPage === 'history') loadHistories();
    if (clientId || currentDetailClientId) {
      loadDetailHistories(clientId || currentDetailClientId);
    }
  } catch(e) {}
}

// ─────────────────────────────────────────
// 일정 관리
// ─────────────────────────────────────────
async function loadSchedules() {
  const status  = document.getElementById('schedStatus')?.value || '';
  const manager = document.getElementById('schedManager')?.value || '';
  const from    = document.getElementById('schedFrom')?.value || '';
  const to      = document.getElementById('schedTo')?.value || '';

  const params = new URLSearchParams({ status, manager, from, to });
  try {
    allSchedules = await apiGet(`/api/schedules?${params}`);
    renderScheduleList(allSchedules);
    if (scheduleView === 'calendar') renderCalendar();
    loadManagerFilter();
  } catch(e) {}
}

function renderScheduleList(rows) {
  const tbody = document.getElementById('scheduleBody');
  if (!tbody) return;
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">일정이 없습니다</td></tr>`;
    return;
  }
  const statusColor = { '예정':'badge-info', '완료':'badge-success', '취소':'badge-secondary' };
  tbody.innerHTML = rows.map(s => `
    <tr>
      <td>${s.inquiry_company ? `<strong>${escHtml(s.inquiry_company)}</strong>` : '<span class="text-muted">-</span>'}</td>
      <td><strong>${escHtml(s.title)}</strong>
        ${s.description ? `<br><small class="text-muted">${escHtml(s.description)}</small>` : ''}
      </td>
      <td><span class="status-badge type-${s.type}">${s.type}</span></td>
      <td>${fmtDateFull(s.start_dt)}</td>
      <td>${s.end_dt ? fmtDateFull(s.end_dt) : '-'}</td>
      <td><span class="badge ${statusColor[s.status]||'badge-secondary'}">${s.status}</span></td>
      <td>${escHtml(s.manager || '-')}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-outline" onclick="editSchedule(${s.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-outline" onclick="deleteSchedule(${s.id})" style="color:#dc2626"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function toggleScheduleView(view) {
  scheduleView = view;
  document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
  document.getElementById('calViewBtn').classList.toggle('active', view === 'calendar');
  document.getElementById('scheduleListView').style.display = view === 'list' ? '' : 'none';
  document.getElementById('scheduleCalView').style.display  = view === 'calendar' ? '' : 'none';
  if (view === 'calendar') renderCalendar();
}

function changeMonth(delta) {
  calMonth += delta;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

function renderCalendar() {
  const title = document.getElementById('calTitle');
  const grid  = document.getElementById('calendarGrid');
  if (!title || !grid) return;

  title.textContent = `${calYear}년 ${calMonth+1}월`;
  const today = new Date();
  const first = new Date(calYear, calMonth, 1);
  const last  = new Date(calYear, calMonth+1, 0);
  const startDow = first.getDay();

  const typeColors = {
    '미팅':'#EDE9FE','통화':'#DBEAFE','방문':'#FEF3C7','제안':'#FCE7F3','기타':'#F3F4F6'
  };

  let html = ['일','월','화','수','목','금','토'].map(d =>
    `<div class="cal-day-header">${d}</div>`).join('');

  // 빈 셀
  for (let i = 0; i < startDow; i++) html += `<div class="cal-cell other-month"></div>`;

  for (let d = 1; d <= last.getDate(); d++) {
    const isToday = today.getFullYear()===calYear && today.getMonth()===calMonth && today.getDate()===d;
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayScheds = allSchedules.filter(s => s.start_dt && s.start_dt.startsWith(dateStr));

    html += `<div class="cal-cell ${isToday?'today':''}">
      <div class="cal-cell-num">${d}</div>
      ${dayScheds.map(s => `
        <div class="cal-event" style="background:${typeColors[s.type]||'#f3f4f6'}"
             onclick="editSchedule(${s.id})" title="${escHtml(s.title)}">
          ${escHtml(s.title.substring(0,12))}
        </div>`).join('')}
    </div>`;
  }

  // 나머지 빈 셀
  const remaining = (7 - (startDow + last.getDate()) % 7) % 7;
  for (let i = 0; i < remaining; i++) html += `<div class="cal-cell other-month"></div>`;

  grid.innerHTML = html;
}

async function showScheduleModal(clientId) {
  clearForm('schedule');
  document.getElementById('scheduleModalTitle').innerHTML = `<i class="fas fa-calendar-plus"></i> 일정 등록`;
  await populateClientSelects();
  if (clientId) document.getElementById('sClientSelect').value = clientId;
  // 기본 시작 시간 현재로
  const now = new Date();
  now.setMinutes(0,0,0);
  document.getElementById('sStartDt').value = toLocalDatetime(now);
  const end = new Date(now); end.setHours(end.getHours()+1);
  document.getElementById('sEndDt').value = toLocalDatetime(end);
  openModal('scheduleModal');
}

async function editSchedule(id) {
  try {
    const rows = allSchedules.length ? allSchedules : await apiGet('/api/schedules');
    const s = rows.find(r => r.id === id);
    if (!s) return;
    clearForm('schedule');
    document.getElementById('scheduleModalTitle').innerHTML = `<i class="fas fa-edit"></i> 일정 수정`;
    document.getElementById('sId').value = s.id;
    await populateClientSelects();
    if (s.client_id) document.getElementById('sClientSelect').value = s.client_id;
    document.getElementById('sTitle').value = s.title;
    document.getElementById('sType').value = s.type;
    document.getElementById('sStatus').value = s.status;
    document.getElementById('sStartDt').value = s.start_dt ? s.start_dt.slice(0,16) : '';
    document.getElementById('sEndDt').value   = s.end_dt   ? s.end_dt.slice(0,16)   : '';
    document.getElementById('sManager').value = s.manager || '';
    document.getElementById('sDescription').value = s.description || '';
    openModal('scheduleModal');
  } catch(e) {}
}

async function saveSchedule() {
  const id = document.getElementById('sId').value;
  const clientId = document.getElementById('sClientSelect').value;
  const data = {
    client_id:   clientId ? parseInt(clientId) : null,
    title:       document.getElementById('sTitle').value.trim(),
    description: document.getElementById('sDescription').value.trim(),
    start_dt:    document.getElementById('sStartDt').value,
    end_dt:      document.getElementById('sEndDt').value,
    type:        document.getElementById('sType').value,
    status:      document.getElementById('sStatus').value,
    manager:     document.getElementById('sManager').value.trim()
  };
  if (!data.title)    { showToast('제목을 입력하세요', 'error'); return; }
  if (!data.start_dt) { showToast('시작 일시를 입력하세요', 'error'); return; }
  try {
    if (id) { await api('PUT', `/api/schedules/${id}`, data); showToast('수정되었습니다'); }
    else     { await api('POST', '/api/schedules', data); showToast('등록되었습니다', 'success'); }
    closeModal('scheduleModal');
    if (currentPage === 'schedule') loadSchedules();
    if (currentDetailClientId) loadDetailSchedules(currentDetailClientId);
    if (currentPage === 'dashboard') loadDashboard();
  } catch(e) {}
}

async function deleteSchedule(id) {
  if (!confirm('이 일정을 삭제하시겠습니까?')) return;
  try {
    await api('DELETE', `/api/schedules/${id}`);
    showToast('삭제되었습니다');
    loadSchedules();
  } catch(e) {}
}

// ─────────────────────────────────────────
// 고객사 셀렉트 populate
// ─────────────────────────────────────────
async function populateClientSelects() {
  try {
    const res = await apiGet('/api/clients?per_page=500');
    const options = `<option value="">고객사 없음 (내부 일정)</option>` +
      res.data.map(c => `<option value="${c.id}">${escHtml(c.inquiry_company)}${c.final_client?' ('+escHtml(c.final_client)+')':''}</option>`).join('');

    const hSel = document.getElementById('hClientSelect');
    if (hSel) {
      const hOpts = res.data.map(c => `<option value="${c.id}">${escHtml(c.inquiry_company)}</option>`).join('');
      hSel.innerHTML = `<option value="">-- 고객사 선택 --</option>${hOpts}`;
    }
    const sSel = document.getElementById('sClientSelect');
    if (sSel) sSel.innerHTML = options;
  } catch(e) {}
}

// ─────────────────────────────────────────
// 엑셀 Export
// ─────────────────────────────────────────
function exportExcel(includeHistory) {
  window.location.href = `/api/export/clients?include_history=${includeHistory}`;
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
}

function downloadTemplate() {
  window.location.href = '/api/export/template';
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
}

// ─────────────────────────────────────────
// 엑셀 Import
// ─────────────────────────────────────────
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadArea').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processImportFile(file);
}

function previewImport(e) {
  const file = e.target.files[0];
  if (file) processImportFile(file);
}

function processImportFile(file) {
  if (!file.name.match(/\.xlsx?$/i)) {
    showToast('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다', 'error');
    return;
  }
  pendingImportFile = file;
  const preview = document.getElementById('importPreview');
  const result  = document.getElementById('importResult');
  result.className = 'import-result';
  result.innerHTML = `<i class="fas fa-file-excel"></i> <strong>${escHtml(file.name)}</strong> (${(file.size/1024).toFixed(1)}KB) 준비됨<br>아래 버튼을 클릭하여 등록을 시작하세요.`;
  preview.style.display = 'block';
}

async function confirmImport() {
  if (!pendingImportFile) return;
  const formData = new FormData();
  formData.append('file', pendingImportFile);
  try {
    const res = await fetch('/api/import/clients', { method: 'POST', body: formData });
    const d = await res.json();
    const resultDiv = document.getElementById('importResult');
    if (d.errors && d.errors.length > 0) {
      resultDiv.className = 'import-result error';
      resultDiv.innerHTML = `<strong>${d.message}</strong><br>오류: ${d.errors.join(', ')}`;
    } else {
      resultDiv.className = 'import-result success';
      resultDiv.innerHTML = `<i class="fas fa-check-circle"></i> <strong>${d.message}</strong>`;
      showToast(`${d.success}건 등록 완료`, 'success');
    }
    pendingImportFile = null;
    document.getElementById('excelFile').value = '';
  } catch(e) {
    showToast('파일 처리 중 오류가 발생했습니다', 'error');
  }
}

// ─────────────────────────────────────────
// 모달 유틸
// ─────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

function clearForm(type) {
  if (type === 'client') {
    ['clientId','fFinalClient','fInquiryCompany','fInquiryContact','fIndustry',
     'fCallbackPhone','fCallbackEmail','fManager','fContractAmount','fContractPeriod','fMemo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const st = document.getElementById('fContractStatus');
    if (st) st.value = '잠재';
    const ir = document.getElementById('fInflowRoute');
    if (ir) ir.value = '';
  } else if (type === 'history') {
    ['hId','hClientId','hTitle','hContent','hContact','hResult','hCreatedBy'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const ht = document.getElementById('hType');
    if (ht) ht.value = '통화';
  } else if (type === 'schedule') {
    ['sId','sTitle','sDescription','sStartDt','sEndDt','sManager'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const st = document.getElementById('sType');
    if (st) st.value = '미팅';
    const ss = document.getElementById('sStatus');
    if (ss) ss.value = '예정';
  }
}

// ─────────────────────────────────────────
// 토스트
// ─────────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type ? 'toast-'+type : ''} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ─────────────────────────────────────────
// 날짜/유틸
// ─────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtDateShort(str) {
  if (!str) return '-';
  return str.slice(0,10);
}

function fmtDateFull(str) {
  if (!str) return '-';
  const s = str.replace('T',' ');
  return s.slice(0,16);
}

function fmtTime(str) {
  if (!str) return '';
  return str.includes('T') ? str.slice(11,16) : str.slice(11,16);
}

function toLocalDatetime(d) {
  return `${formatDate(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
