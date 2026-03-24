// ===== 전역 상태 =====
const state = {
  currentPage: 'dashboard',
  clients: [],
  members: [],
  tasks: [],
  activities: [],
  currentClientId: null,
  taskFilters: { status: '', priority: '', assignee_id: '', search: '' },
  clientFilters: { status: '', grade: '', search: '' },
  activityFilters: { client_id: '', type: '' }
}

// ===== API 헬퍼 =====
const api = {
  async get(url) {
    const res = await axios.get(url)
    return res.data
  },
  async post(url, data) {
    const res = await axios.post(url, data)
    return res.data
  },
  async put(url, data) {
    const res = await axios.put(url, data)
    return res.data
  },
  async patch(url, data) {
    const res = await axios.patch(url, data)
    return res.data
  },
  async delete(url) {
    const res = await axios.delete(url)
    return res.data
  }
}

// ===== 유틸리티 =====
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast')
  const content = document.getElementById('toast-content')
  const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-indigo-500', warning: 'bg-amber-500' }
  const icons = { success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', info: 'fas fa-info-circle', warning: 'fas fa-exclamation-triangle' }
  content.className = `px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium flex items-center gap-2 ${colors[type]}`
  content.innerHTML = `<i class="${icons[type]}"></i>${msg}`
  toast.classList.remove('hidden')
  setTimeout(() => toast.classList.add('hidden'), 3000)
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${formatDate(dateStr)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff/60000), hrs = Math.floor(diff/3600000), days = Math.floor(diff/86400000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  if (hrs < 24) return `${hrs}시간 전`
  if (days < 7) return `${days}일 전`
  return formatDate(dateStr)
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date() 
}

function getStatusBadge(status) {
  const map = { active: '활성', inactive: '비활성', prospect: '잠재', todo: '할일', in_progress: '진행중', review: '검토', done: '완료', cancelled: '취소' }
  return `<span class="status-badge badge-${status}">${map[status] || status}</span>`
}

function getGradeBadge(grade) {
  const map = { vip: 'VIP', premium: '프리미엄', normal: '일반' }
  return `<span class="status-badge badge-${grade}">${map[grade] || grade}</span>`
}

function getPriorityBadge(priority) {
  const map = { high: '높음', medium: '보통', low: '낮음' }
  const icon = priority === 'high' ? '↑' : priority === 'medium' ? '→' : '↓'
  return `<span class="priority-badge prio-${priority}">${icon} ${map[priority] || priority}</span>`
}

function getActivityTypeBadge(type) {
  const map = { call: '📞 전화', email: '📧 이메일', meeting: '🤝 미팅', visit: '🏢 방문', proposal: '📄 제안', contract: '✍️ 계약', note: '📝 메모', task_update: '🔄 업무변경' }
  return `<span class="status-badge tag-${type} text-xs">${map[type] || type}</span>`
}

function getAvatar(name, color, size = 32) {
  const initials = name ? name.slice(0,1) : '?'
  return `<div class="avatar" style="background-color:${color || '#4F46E5'};width:${size}px;height:${size}px;font-size:${size*0.4}px">${initials}</div>`
}

function openModal() { document.getElementById('modal-overlay').classList.add('open') }
function closeModal() { document.getElementById('modal-overlay').classList.remove('open') }

// ===== 네비게이션 =====
function navigateTo(page, params = {}) {
  // 이전 페이지 비활성화
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.sidebar-item').forEach(btn => btn.classList.remove('active'))

  // 새 페이지 활성화
  const pageEl = document.getElementById(`page-${page}`)
  if (!pageEl) return
  pageEl.classList.add('active')
  
  const activeBtn = document.querySelector(`[data-page="${page}"]`)
  if (activeBtn) activeBtn.classList.add('active')

  state.currentPage = page
  
  const titles = { dashboard: '대시보드', clients: '고객사 목록', contacts: '연락처', activities: '활동 이력', tasks: '업무 목록', kanban: '칸반 보드', members: '팀원 관리', 'client-detail': '고객사 상세' }
  document.getElementById('pageTitle').textContent = titles[page] || page

  // 페이지별 데이터 로드
  if (page === 'dashboard') loadDashboard()
  else if (page === 'clients') loadClients()
  else if (page === 'contacts') loadContacts()
  else if (page === 'activities') loadActivities()
  else if (page === 'tasks') loadTasks()
  else if (page === 'kanban') loadKanban()
  else if (page === 'members') loadMembers()
  else if (page === 'client-detail' && params.id) loadClientDetail(params.id)
}

// ===== 대시보드 =====
async function loadDashboard() {
  const el = document.getElementById('dashboard-content')
  el.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin text-3xl text-indigo-400"></i></div>'
  try {
    const [stats, taskSummary] = await Promise.all([
      api.get('/api/dashboard'),
      api.get('/api/dashboard/task-summary')
    ])
    renderDashboard(stats, taskSummary)
  } catch(e) {
    el.innerHTML = '<div class="loading text-red-400">데이터 로드 실패</div>'
  }
}

function renderDashboard(stats, taskSummary) {
  const el = document.getElementById('dashboard-content')
  const overdueClass = stats.overdue_tasks > 0 ? 'text-red-600' : 'text-green-600'
  
  el.innerHTML = `
    <!-- 통계 카드 -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 card-hover cursor-pointer" onclick="navigateTo('clients')">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
            <i class="fas fa-building text-indigo-600"></i>
          </div>
          <span class="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">+${stats.prospect_clients || 0} 잠재</span>
        </div>
        <div class="text-2xl font-bold text-gray-900">${stats.total_clients || 0}</div>
        <div class="text-sm text-gray-500 mt-1">전체 고객사</div>
        <div class="text-xs text-gray-400 mt-1">활성: ${stats.active_clients || 0}개</div>
      </div>
      <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 card-hover cursor-pointer" onclick="navigateTo('tasks')">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <i class="fas fa-tasks text-blue-600"></i>
          </div>
          <span class="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">${stats.in_progress_tasks || 0} 진행</span>
        </div>
        <div class="text-2xl font-bold text-gray-900">${stats.total_tasks || 0}</div>
        <div class="text-sm text-gray-500 mt-1">전체 업무</div>
        <div class="text-xs text-gray-400 mt-1">할일: ${stats.todo_tasks || 0}개</div>
      </div>
      <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 card-hover cursor-pointer" onclick="navigateTo('tasks', {status:'done'})">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <i class="fas fa-check-circle text-green-600"></i>
          </div>
          <span class="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">완료됨</span>
        </div>
        <div class="text-2xl font-bold text-gray-900">${stats.done_tasks || 0}</div>
        <div class="text-sm text-gray-500 mt-1">완료 업무</div>
        <div class="text-xs text-gray-400 mt-1">검토: ${stats.review_tasks || 0}개</div>
      </div>
      <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 card-hover">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
            <i class="fas fa-exclamation-triangle text-red-500"></i>
          </div>
          <span class="text-xs ${overdueClass} bg-red-50 px-2 py-1 rounded-full">${stats.overdue_tasks > 0 ? '주의' : '정상'}</span>
        </div>
        <div class="text-2xl font-bold ${overdueClass}">${stats.overdue_tasks || 0}</div>
        <div class="text-sm text-gray-500 mt-1">지연 업무</div>
        <div class="text-xs text-gray-400 mt-1">기한 초과</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 최근 활동 -->
      <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 class="font-semibold text-gray-900">최근 활동 이력</h2>
          <button class="text-sm text-indigo-600 hover:text-indigo-700" onclick="navigateTo('activities')">전체보기 →</button>
        </div>
        <div class="divide-y divide-gray-50">
          ${(stats.recent_activities || []).map(a => `
            <div class="p-4 hover:bg-gray-50 cursor-pointer" onclick="navigateTo('activities')">
              <div class="flex items-start gap-3">
                <div class="mt-0.5">${getActivityTypeBadge(a.type)}</div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm text-gray-900 truncate">${a.title}</div>
                  <div class="flex items-center gap-2 mt-1">
                    ${a.client_name ? `<span class="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">${a.client_name}</span>` : ''}
                    ${a.member_name ? `<div class="flex items-center gap-1">${getAvatar(a.member_name, a.member_color, 18)}<span class="text-xs text-gray-500">${a.member_name}</span></div>` : ''}
                    <span class="text-xs text-gray-400 ml-auto">${timeAgo(a.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          `).join('') || '<div class="p-8 text-center text-gray-400 text-sm">활동 이력이 없습니다</div>'}
        </div>
      </div>

      <!-- 오른쪽 컬럼 -->
      <div class="space-y-6">
        <!-- 다가오는 마감 -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 class="font-semibold text-gray-900">마감 예정 업무</h2>
            <button class="text-sm text-indigo-600 hover:text-indigo-700" onclick="navigateTo('tasks')">전체보기 →</button>
          </div>
          <div class="divide-y divide-gray-50">
            ${(stats.upcoming_tasks || []).map(t => `
              <div class="p-4 hover:bg-gray-50 cursor-pointer" onclick="navigateTo('tasks')">
                <div class="flex items-center gap-2 mb-1">
                  ${getPriorityBadge(t.priority)}
                  <span class="text-sm font-medium text-gray-900 truncate flex-1">${t.title}</span>
                </div>
                <div class="flex items-center gap-2">
                  ${t.client_name ? `<span class="text-xs text-gray-500">${t.client_name}</span>` : ''}
                  ${t.due_date ? `<span class="text-xs ml-auto ${isOverdue(t.due_date) ? 'text-red-500 font-semibold' : 'text-gray-400'}">${isOverdue(t.due_date) ? '⚠️ ' : ''}${formatDate(t.due_date)}</span>` : ''}
                </div>
              </div>
            `).join('') || '<div class="p-6 text-center text-gray-400 text-sm">예정된 업무 없음</div>'}
          </div>
        </div>

        <!-- 팀원별 업무 현황 -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="p-5 border-b border-gray-100">
            <h2 class="font-semibold text-gray-900">팀원별 업무 현황</h2>
          </div>
          <div class="p-4 space-y-3">
            ${taskSummary.map(m => {
              const total = m.todo + m.in_progress + m.review + m.done || 1
              const pct = Math.round((m.done / total) * 100)
              return `
                <div>
                  <div class="flex items-center gap-2 mb-1.5">
                    ${getAvatar(m.name, m.avatar_color, 24)}
                    <span class="text-sm font-medium text-gray-700 flex-1">${m.name}</span>
                    <span class="text-xs text-gray-500">${m.in_progress || 0}진행 / ${m.todo || 0}할일</span>
                  </div>
                  <div class="w-full bg-gray-100 rounded-full h-1.5">
                    <div class="bg-indigo-500 rounded-full h-1.5" style="width:${pct}%"></div>
                  </div>
                </div>
              `
            }).join('') || '<div class="text-center text-gray-400 text-sm py-4">팀원 없음</div>'}
          </div>
        </div>
      </div>
    </div>
  `
}

// ===== 고객사 =====
async function loadClients() {
  const el = document.getElementById('clients-content')
  const params = new URLSearchParams()
  if (state.clientFilters.search) params.set('search', state.clientFilters.search)
  if (state.clientFilters.status) params.set('status', state.clientFilters.status)
  if (state.clientFilters.grade) params.set('grade', state.clientFilters.grade)
  
  try {
    const data = await api.get(`/api/clients?${params}`)
    state.clients = data.data || []
    renderClients(data)
  } catch(e) {
    el.innerHTML = '<div class="loading text-red-400">데이터 로드 실패</div>'
  }
}

function renderClients(data) {
  const el = document.getElementById('clients-content')
  el.innerHTML = `
    <!-- 헤더 -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input type="text" id="client-search" placeholder="고객사 검색..." value="${state.clientFilters.search}"
            class="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 w-56"
            onkeydown="if(event.key==='Enter'){state.clientFilters.search=this.value;loadClients()}">
        </div>
        <select class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400" 
          onchange="state.clientFilters.status=this.value;loadClients()">
          <option value="">전체 상태</option>
          <option value="active" ${state.clientFilters.status==='active'?'selected':''}>활성</option>
          <option value="prospect" ${state.clientFilters.status==='prospect'?'selected':''}>잠재</option>
          <option value="inactive" ${state.clientFilters.status==='inactive'?'selected':''}>비활성</option>
        </select>
        <select class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400"
          onchange="state.clientFilters.grade=this.value;loadClients()">
          <option value="">전체 등급</option>
          <option value="vip" ${state.clientFilters.grade==='vip'?'selected':''}>VIP</option>
          <option value="premium" ${state.clientFilters.grade==='premium'?'selected':''}>프리미엄</option>
          <option value="normal" ${state.clientFilters.grade==='normal'?'selected':''}>일반</option>
        </select>
        <span class="text-sm text-gray-500">총 ${data.total}개</span>
      </div>
      <button onclick="showClientModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
        <i class="fas fa-plus"></i>고객사 추가
      </button>
    </div>

    <!-- 테이블 -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-100">
            <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">고객사명</th>
            <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">업종</th>
            <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">연락처</th>
            <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">상태/등급</th>
            <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">담당자</th>
            <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">업무</th>
            <th class="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">관리</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          ${data.data.map(c => `
            <tr class="table-row-hover" onclick="navigateTo('client-detail',{id:${c.id}})">
              <td class="px-5 py-4">
                <div class="font-semibold text-gray-900">${c.name}</div>
                ${c.email ? `<div class="text-xs text-gray-400 mt-0.5">${c.email}</div>` : ''}
              </td>
              <td class="px-5 py-4 text-sm text-gray-600 hidden md:table-cell">${c.industry || '-'}</td>
              <td class="px-5 py-4 text-sm text-gray-600 hidden lg:table-cell">${c.phone || '-'}</td>
              <td class="px-5 py-4">
                <div class="flex flex-col gap-1">
                  ${getStatusBadge(c.status)}
                  ${getGradeBadge(c.grade)}
                </div>
              </td>
              <td class="px-5 py-4 text-sm text-gray-600 hidden md:table-cell">
                <span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">${c.contact_count || 0}명</span>
              </td>
              <td class="px-5 py-4 text-sm text-gray-600 hidden lg:table-cell">
                <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">${c.task_count || 0}건</span>
              </td>
              <td class="px-5 py-4 text-right" onclick="event.stopPropagation()">
                <button onclick="showClientModal(${c.id})" class="text-gray-400 hover:text-indigo-600 p-1.5 rounded hover:bg-indigo-50 transition-colors">
                  <i class="fas fa-edit text-sm"></i>
                </button>
                <button onclick="deleteClient(${c.id},'${c.name}')" class="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors ml-1">
                  <i class="fas fa-trash text-sm"></i>
                </button>
              </td>
            </tr>
          `).join('') || `<tr><td colspan="7" class="px-5 py-12 text-center text-gray-400">고객사가 없습니다. 추가해 보세요!</td></tr>`}
        </tbody>
      </table>
    </div>
  `
}

async function showClientModal(id = null) {
  let client = null
  if (id) {
    try { client = await api.get(`/api/clients/${id}`); client = client.client } catch(e) {}
  }
  const title = client ? '고객사 수정' : '고객사 추가'
  document.getElementById('modal-content').innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-semibold">${title}</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-lg"></i></button>
      </div>
      <form onsubmit="saveClient(event,${id})">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">고객사명 <span class="text-red-500">*</span></label>
            <input name="name" type="text" required value="${client?.name || ''}"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">업종</label>
              <input name="industry" type="text" value="${client?.industry || ''}"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">웹사이트</label>
              <input name="website" type="url" value="${client?.website || ''}"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
              <input name="phone" type="text" value="${client?.phone || ''}"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input name="email" type="email" value="${client?.email || ''}"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">주소</label>
            <input name="address" type="text" value="${client?.address || ''}"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">상태</label>
              <select name="status" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
                <option value="active" ${client?.status==='active'?'selected':''}>활성</option>
                <option value="prospect" ${client?.status==='prospect'?'selected':''}>잠재</option>
                <option value="inactive" ${client?.status==='inactive'?'selected':''}>비활성</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">등급</label>
              <select name="grade" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
                <option value="normal" ${client?.grade==='normal'?'selected':''}>일반</option>
                <option value="premium" ${client?.grade==='premium'?'selected':''}>프리미엄</option>
                <option value="vip" ${client?.grade==='vip'?'selected':''}>VIP</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">메모</label>
            <textarea name="notes" rows="3"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 resize-none">${client?.notes || ''}</textarea>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
          <button type="submit" class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">저장</button>
        </div>
      </form>
    </div>
  `
  openModal()
}

async function saveClient(event, id) {
  event.preventDefault()
  const form = event.target
  const data = Object.fromEntries(new FormData(form))
  try {
    if (id) await api.put(`/api/clients/${id}`, data)
    else await api.post('/api/clients', data)
    closeModal()
    showToast(id ? '고객사 정보가 수정되었습니다.' : '고객사가 추가되었습니다.')
    loadClients()
  } catch(e) {
    showToast(e.response?.data?.error || '저장에 실패했습니다.', 'error')
  }
}

async function deleteClient(id, name) {
  if (!confirm(`"${name}" 고객사를 삭제하시겠습니까?\n관련 연락처, 업무, 활동 이력도 함께 삭제됩니다.`)) return
  try {
    await api.delete(`/api/clients/${id}`)
    showToast('고객사가 삭제되었습니다.', 'warning')
    loadClients()
  } catch(e) {
    showToast('삭제에 실패했습니다.', 'error')
  }
}

// ===== 고객사 상세 =====
async function loadClientDetail(id) {
  state.currentClientId = id
  const el = document.getElementById('client-detail-content')
  el.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin text-3xl text-indigo-400"></i></div>'
  try {
    const data = await api.get(`/api/clients/${id}`)
    renderClientDetail(data)
  } catch(e) {
    el.innerHTML = '<div class="loading text-red-400">데이터 로드 실패</div>'
  }
}

function renderClientDetail(data) {
  const el = document.getElementById('client-detail-content')
  const c = data.client
  el.innerHTML = `
    <!-- 뒤로가기 -->
    <button onclick="navigateTo('clients')" class="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-5 text-sm">
      <i class="fas fa-arrow-left"></i>고객사 목록으로
    </button>

    <!-- 고객사 헤더 -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-2xl font-bold">
            ${c.name.slice(0,1)}
          </div>
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-xl font-bold text-gray-900">${c.name}</h1>
              ${getStatusBadge(c.status)} ${getGradeBadge(c.grade)}
            </div>
            ${c.industry ? `<div class="text-sm text-gray-500 mt-1">${c.industry}</div>` : ''}
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="showClientModal(${c.id})" class="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
            <i class="fas fa-edit text-gray-500"></i>수정
          </button>
          <button onclick="showActivityModal(${c.id})" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-2">
            <i class="fas fa-plus"></i>활동 기록
          </button>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
        <div>
          <div class="text-xs text-gray-400 mb-1">전화번호</div>
          <div class="text-sm font-medium text-gray-700">${c.phone || '-'}</div>
        </div>
        <div>
          <div class="text-xs text-gray-400 mb-1">이메일</div>
          <div class="text-sm font-medium text-gray-700 truncate">${c.email || '-'}</div>
        </div>
        <div>
          <div class="text-xs text-gray-400 mb-1">웹사이트</div>
          <div class="text-sm font-medium text-indigo-600 truncate">${c.website ? `<a href="${c.website}" target="_blank">${c.website}</a>` : '-'}</div>
        </div>
        <div>
          <div class="text-xs text-gray-400 mb-1">주소</div>
          <div class="text-sm font-medium text-gray-700">${c.address || '-'}</div>
        </div>
      </div>
      ${c.notes ? `<div class="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600"><i class="fas fa-sticky-note text-gray-400 mr-2"></i>${c.notes}</div>` : ''}
    </div>

    <!-- 탭 -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100">
      <div class="border-b border-gray-100 flex">
        <button class="tab-btn active px-5 py-3 text-sm font-medium text-gray-600 hover:text-indigo-600" data-tab="cd-contacts" onclick="switchTab('cd',this,'contacts')">
          담당자 <span class="ml-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full">${data.contacts.length}</span>
        </button>
        <button class="tab-btn px-5 py-3 text-sm font-medium text-gray-600 hover:text-indigo-600" data-tab="cd-tasks" onclick="switchTab('cd',this,'tasks')">
          업무 <span class="ml-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full">${data.tasks.length}</span>
        </button>
        <button class="tab-btn px-5 py-3 text-sm font-medium text-gray-600 hover:text-indigo-600" data-tab="cd-activities" onclick="switchTab('cd',this,'activities')">
          활동 이력 <span class="ml-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full">${data.activities.length}</span>
        </button>
      </div>
      
      <!-- 담당자 탭 -->
      <div id="cd-contacts" class="tab-content active p-5">
        <div class="flex justify-end mb-4">
          <button onclick="showContactModal(${c.id})" class="px-3 py-1.5 border border-indigo-200 text-indigo-600 rounded-lg text-sm hover:bg-indigo-50 flex items-center gap-2">
            <i class="fas fa-plus text-xs"></i>담당자 추가
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${data.contacts.map(ct => `
            <div class="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 transition-colors">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                    ${ct.name.slice(0,1)}
                  </div>
                  <div>
                    <div class="font-semibold text-gray-900">${ct.name}${ct.is_primary ? ' <span class="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">주담당</span>' : ''}</div>
                    <div class="text-xs text-gray-500">${ct.position || ''} ${ct.department ? `· ${ct.department}` : ''}</div>
                  </div>
                </div>
                <div class="flex gap-1">
                  <button onclick="showContactModal(${c.id},${ct.id})" class="text-gray-400 hover:text-indigo-600 p-1"><i class="fas fa-edit text-xs"></i></button>
                  <button onclick="deleteContact(${ct.id})" class="text-gray-400 hover:text-red-500 p-1"><i class="fas fa-trash text-xs"></i></button>
                </div>
              </div>
              <div class="mt-3 space-y-1 text-sm text-gray-600">
                ${ct.phone ? `<div><i class="fas fa-phone text-gray-400 w-4"></i> ${ct.phone}</div>` : ''}
                ${ct.mobile ? `<div><i class="fas fa-mobile-alt text-gray-400 w-4"></i> ${ct.mobile}</div>` : ''}
                ${ct.email ? `<div><i class="fas fa-envelope text-gray-400 w-4"></i> ${ct.email}</div>` : ''}
              </div>
            </div>
          `).join('') || '<div class="text-center text-gray-400 py-8">담당자가 없습니다</div>'}
        </div>
      </div>
      
      <!-- 업무 탭 -->
      <div id="cd-tasks" class="tab-content p-5">
        <div class="flex justify-end mb-4">
          <button onclick="showTaskModal(null,${c.id})" class="px-3 py-1.5 border border-indigo-200 text-indigo-600 rounded-lg text-sm hover:bg-indigo-50 flex items-center gap-2">
            <i class="fas fa-plus text-xs"></i>업무 추가
          </button>
        </div>
        <div class="space-y-3">
          ${data.tasks.map(t => `
            <div class="flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:border-indigo-200 transition-colors">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  ${getPriorityBadge(t.priority)}
                  <span class="font-medium text-gray-900 text-sm truncate">${t.title}</span>
                </div>
                <div class="flex items-center gap-3 text-xs text-gray-500">
                  ${getStatusBadge(t.status)}
                  ${t.assignee_name ? `<div class="flex items-center gap-1">${getAvatar(t.assignee_name, t.assignee_color, 16)}<span>${t.assignee_name}</span></div>` : ''}
                  ${t.due_date ? `<span class="${isOverdue(t.due_date) && t.status !== 'done' ? 'text-red-500' : ''}">${formatDate(t.due_date)}</span>` : ''}
                </div>
              </div>
              <button onclick="showTaskModal(${t.id})" class="text-gray-400 hover:text-indigo-600 p-1.5"><i class="fas fa-edit text-sm"></i></button>
            </div>
          `).join('') || '<div class="text-center text-gray-400 py-8">업무가 없습니다</div>'}
        </div>
      </div>
      
      <!-- 활동 이력 탭 -->
      <div id="cd-activities" class="tab-content p-5">
        <div class="flex justify-end mb-4">
          <button onclick="showActivityModal(${c.id})" class="px-3 py-1.5 border border-indigo-200 text-indigo-600 rounded-lg text-sm hover:bg-indigo-50 flex items-center gap-2">
            <i class="fas fa-plus text-xs"></i>활동 기록
          </button>
        </div>
        <div class="relative">
          <div class="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100"></div>
          <div class="space-y-4">
            ${data.activities.map(a => `
              <div class="relative flex gap-4 pl-10">
                <div class="absolute left-3.5 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white shadow-sm mt-1.5"></div>
                <div class="flex-1 bg-gray-50 rounded-xl p-4">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      ${getActivityTypeBadge(a.type)}
                      <span class="font-medium text-sm text-gray-900 ml-2">${a.title}</span>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      ${a.member_name ? `<div class="flex items-center gap-1">${getAvatar(a.member_name, a.member_color, 20)}<span class="text-xs text-gray-500">${a.member_name}</span></div>` : ''}
                      <span class="text-xs text-gray-400">${timeAgo(a.created_at)}</span>
                      <button onclick="deleteActivity(${a.id}, ${c.id})" class="text-gray-300 hover:text-red-400"><i class="fas fa-times text-xs"></i></button>
                    </div>
                  </div>
                  ${a.content ? `<div class="text-sm text-gray-600 mt-2">${a.content}</div>` : ''}
                  ${a.outcome ? `<div class="text-sm text-green-700 bg-green-50 rounded p-2 mt-2"><i class="fas fa-check-circle mr-1"></i>${a.outcome}</div>` : ''}
                  ${a.next_action ? `<div class="text-sm text-blue-700 bg-blue-50 rounded p-2 mt-2"><i class="fas fa-arrow-right mr-1"></i>다음 액션: ${a.next_action}${a.next_action_date ? ` (${formatDate(a.next_action_date)})` : ''}</div>` : ''}
                </div>
              </div>
            `).join('') || '<div class="text-center text-gray-400 py-8">활동 이력이 없습니다</div>'}
          </div>
        </div>
      </div>
    </div>
  `
}

function switchTab(prefix, btn, tabName) {
  const container = btn.closest('.bg-white')
  container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  container.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'))
  btn.classList.add('active')
  document.getElementById(`${prefix}-${tabName}`).classList.add('active')
}

// ===== 연락처 =====
async function loadContacts() {
  const el = document.getElementById('contacts-content')
  try {
    const contacts = await api.get('/api/contacts')
    renderContacts(contacts)
  } catch(e) {
    el.innerHTML = '<div class="loading text-red-400">데이터 로드 실패</div>'
  }
}

function renderContacts(contacts) {
  const el = document.getElementById('contacts-content')
  el.innerHTML = `
    <div class="flex items-center justify-between mb-5">
      <div class="text-sm text-gray-500">총 ${contacts.length}명</div>
      <button onclick="showContactModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
        <i class="fas fa-plus"></i>연락처 추가
      </button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${contacts.map(ct => `
        <div class="bg-white border border-gray-100 rounded-xl p-5 card-hover shadow-sm">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-lg">${ct.name.slice(0,1)}</div>
              <div>
                <div class="font-semibold text-gray-900">${ct.name}</div>
                <div class="text-xs text-gray-500">${ct.position || ''} ${ct.department ? '· '+ct.department : ''}</div>
              </div>
            </div>
            <div class="flex gap-1">
              <button onclick="showContactModal(${ct.client_id},${ct.id})" class="text-gray-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded"><i class="fas fa-edit text-xs"></i></button>
              <button onclick="deleteContact(${ct.id})" class="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded"><i class="fas fa-trash text-xs"></i></button>
            </div>
          </div>
          ${ct.client_name ? `<div class="mb-3"><span class="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full"><i class="fas fa-building mr-1 text-xs"></i>${ct.client_name}</span>${ct.is_primary ? ' <span class="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">주담당</span>' : ''}</div>` : ''}
          <div class="space-y-1.5 text-sm text-gray-600">
            ${ct.phone ? `<div class="flex items-center gap-2"><i class="fas fa-phone text-gray-400 w-4"></i>${ct.phone}</div>` : ''}
            ${ct.mobile ? `<div class="flex items-center gap-2"><i class="fas fa-mobile-alt text-gray-400 w-4"></i>${ct.mobile}</div>` : ''}
            ${ct.email ? `<div class="flex items-center gap-2 truncate"><i class="fas fa-envelope text-gray-400 w-4"></i><span class="truncate">${ct.email}</span></div>` : ''}
          </div>
        </div>
      `).join('') || '<div class="col-span-3 text-center text-gray-400 py-12">연락처가 없습니다</div>'}
    </div>
  `
}

async function showContactModal(clientId = null, id = null) {
  const clients = state.clients.length ? state.clients : (await api.get('/api/clients?limit=100')).data
  let contact = null
  if (id) {
    try { const contacts = await api.get(`/api/contacts?client_id=${clientId}`); contact = contacts.find(c => c.id === id) } catch(e) {}
  }
  document.getElementById('modal-content').innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-semibold">${contact ? '담당자 수정' : '담당자 추가'}</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-lg"></i></button>
      </div>
      <form onsubmit="saveContact(event,${id},${clientId})">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">고객사 <span class="text-red-500">*</span></label>
            <select name="client_id" required class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
              <option value="">선택하세요</option>
              ${clients.map(c => `<option value="${c.id}" ${(contact?.client_id || clientId) == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">이름 <span class="text-red-500">*</span></label>
              <input name="name" type="text" required value="${contact?.name || ''}"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">직위</label>
              <input name="position" type="text" value="${contact?.position || ''}"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">부서</label>
              <input name="department" type="text" value="${contact?.department || ''}"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input name="email" type="email" value="${contact?.email || ''}"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
              <input name="phone" type="text" value="${contact?.phone || ''}"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">휴대폰</label>
              <input name="mobile" type="text" value="${contact?.mobile || ''}"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" name="is_primary" id="is_primary" value="1" ${contact?.is_primary ? 'checked' : ''}
              class="w-4 h-4 text-indigo-600 rounded border-gray-300">
            <label for="is_primary" class="text-sm text-gray-700">주 담당자로 설정</label>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
          <button type="submit" class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">저장</button>
        </div>
      </form>
    </div>
  `
  openModal()
}

async function saveContact(event, id, clientId) {
  event.preventDefault()
  const form = event.target
  const fd = new FormData(form)
  const data = Object.fromEntries(fd)
  data.is_primary = fd.has('is_primary') ? 1 : 0
  try {
    if (id) await api.put(`/api/contacts/${id}`, data)
    else await api.post('/api/contacts', data)
    closeModal()
    showToast(id ? '담당자 정보가 수정되었습니다.' : '담당자가 추가되었습니다.')
    if (state.currentPage === 'client-detail') loadClientDetail(state.currentClientId)
    else loadContacts()
  } catch(e) {
    showToast(e.response?.data?.error || '저장에 실패했습니다.', 'error')
  }
}

async function deleteContact(id) {
  if (!confirm('담당자를 삭제하시겠습니까?')) return
  try {
    await api.delete(`/api/contacts/${id}`)
    showToast('담당자가 삭제되었습니다.', 'warning')
    if (state.currentPage === 'client-detail') loadClientDetail(state.currentClientId)
    else loadContacts()
  } catch(e) {
    showToast('삭제에 실패했습니다.', 'error')
  }
}

// ===== 업무 =====
async function loadTasks() {
  const el = document.getElementById('tasks-content')
  const params = new URLSearchParams()
  Object.entries(state.taskFilters).forEach(([k,v]) => { if(v) params.set(k,v) })
  try {
    const data = await api.get(`/api/tasks?${params}`)
    const members = await api.get('/api/members')
    state.members = members
    renderTasks(data)
  } catch(e) {
    el.innerHTML = '<div class="loading text-red-400">데이터 로드 실패</div>'
  }
}

function renderTasks(data) {
  const el = document.getElementById('tasks-content')
  el.innerHTML = `
    <!-- 필터 -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input type="text" placeholder="업무 검색..." value="${state.taskFilters.search}"
            class="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 w-48"
            onkeydown="if(event.key==='Enter'){state.taskFilters.search=this.value;loadTasks()}">
        </div>
        <select class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400" onchange="state.taskFilters.status=this.value;loadTasks()">
          <option value="">전체 상태</option>
          <option value="todo" ${state.taskFilters.status==='todo'?'selected':''}>할일</option>
          <option value="in_progress" ${state.taskFilters.status==='in_progress'?'selected':''}>진행중</option>
          <option value="review" ${state.taskFilters.status==='review'?'selected':''}>검토</option>
          <option value="done" ${state.taskFilters.status==='done'?'selected':''}>완료</option>
        </select>
        <select class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400" onchange="state.taskFilters.priority=this.value;loadTasks()">
          <option value="">전체 우선순위</option>
          <option value="high" ${state.taskFilters.priority==='high'?'selected':''}>높음</option>
          <option value="medium" ${state.taskFilters.priority==='medium'?'selected':''}>보통</option>
          <option value="low" ${state.taskFilters.priority==='low'?'selected':''}>낮음</option>
        </select>
        <select class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400" onchange="state.taskFilters.assignee_id=this.value;loadTasks()">
          <option value="">전체 담당자</option>
          ${state.members.map(m => `<option value="${m.id}" ${state.taskFilters.assignee_id==m.id?'selected':''}>${m.name}</option>`).join('')}
        </select>
        <span class="text-sm text-gray-500">총 ${data.total}건</span>
      </div>
      <div class="flex gap-2">
        <button onclick="navigateTo('kanban')" class="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
          <i class="fas fa-columns text-gray-500"></i>칸반 보기
        </button>
        <button onclick="showTaskModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
          <i class="fas fa-plus"></i>업무 추가
        </button>
      </div>
    </div>

    <!-- 테이블 -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-100">
            <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">업무</th>
            <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">고객사</th>
            <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
            <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">우선순위</th>
            <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">담당자</th>
            <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">마감일</th>
            <th class="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">관리</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          ${data.data.map(t => `
            <tr class="table-row-hover" onclick="showTaskModal(${t.id})">
              <td class="px-5 py-4">
                <div class="font-medium text-gray-900">${t.title}</div>
                ${t.category ? `<span class="text-xs text-gray-400">${t.category}</span>` : ''}
              </td>
              <td class="px-5 py-4 text-sm text-gray-600 hidden md:table-cell">
                ${t.client_name ? `<span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs">${t.client_name}</span>` : '<span class="text-gray-400">-</span>'}
              </td>
              <td class="px-5 py-4">${getStatusBadge(t.status)}</td>
              <td class="px-5 py-4 hidden sm:table-cell">${getPriorityBadge(t.priority)}</td>
              <td class="px-5 py-4 hidden lg:table-cell">
                ${t.assignee_name ? `<div class="flex items-center gap-2">${getAvatar(t.assignee_name, t.assignee_color, 24)}<span class="text-sm text-gray-700">${t.assignee_name}</span></div>` : '<span class="text-gray-400 text-sm">미배정</span>'}
              </td>
              <td class="px-5 py-4 hidden lg:table-cell">
                <span class="${t.due_date && isOverdue(t.due_date) && t.status !== 'done' ? 'text-red-500 font-semibold' : 'text-sm text-gray-600'}">
                  ${t.due_date ? (isOverdue(t.due_date) && t.status !== 'done' ? '⚠️ ' : '') + formatDate(t.due_date) : '-'}
                </span>
              </td>
              <td class="px-5 py-4 text-right" onclick="event.stopPropagation()">
                <select class="text-xs border border-gray-200 rounded px-2 py-1 focus:border-indigo-400"
                  onchange="updateTaskStatus(${t.id}, this.value, this)">
                  <option value="todo" ${t.status==='todo'?'selected':''}>할일</option>
                  <option value="in_progress" ${t.status==='in_progress'?'selected':''}>진행중</option>
                  <option value="review" ${t.status==='review'?'selected':''}>검토</option>
                  <option value="done" ${t.status==='done'?'selected':''}>완료</option>
                  <option value="cancelled" ${t.status==='cancelled'?'selected':''}>취소</option>
                </select>
                <button onclick="deleteTask(${t.id})" class="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded ml-1 transition-colors">
                  <i class="fas fa-trash text-xs"></i>
                </button>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="7" class="px-5 py-12 text-center text-gray-400">업무가 없습니다.</td></tr>'}
        </tbody>
      </table>
    </div>
  `
}

async function showTaskModal(id = null, defaultClientId = null) {
  const [clientsData, members] = await Promise.all([
    api.get('/api/clients?limit=100'),
    api.get('/api/members')
  ])
  let task = null
  if (id) {
    try { const data = await api.get(`/api/tasks/${id}`); task = data.task } catch(e) {}
  }
  document.getElementById('modal-content').innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-semibold">${task ? '업무 수정' : '업무 추가'}</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-lg"></i></button>
      </div>
      <form onsubmit="saveTask(event,${id})">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">업무명 <span class="text-red-500">*</span></label>
            <input name="title" type="text" required value="${task?.title || ''}"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea name="description" rows="3"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 resize-none">${task?.description || ''}</textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">고객사</label>
              <select name="client_id" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
                <option value="">없음</option>
                ${clientsData.data.map(c => `<option value="${c.id}" ${(task?.client_id || defaultClientId) == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">담당자</label>
              <select name="assignee_id" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
                <option value="">미배정</option>
                ${members.map(m => `<option value="${m.id}" ${task?.assignee_id == m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">상태</label>
              <select name="status" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
                <option value="todo" ${task?.status==='todo'||!task?'selected':''}>할일</option>
                <option value="in_progress" ${task?.status==='in_progress'?'selected':''}>진행중</option>
                <option value="review" ${task?.status==='review'?'selected':''}>검토</option>
                <option value="done" ${task?.status==='done'?'selected':''}>완료</option>
                <option value="cancelled" ${task?.status==='cancelled'?'selected':''}>취소</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">우선순위</label>
              <select name="priority" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
                <option value="high" ${task?.priority==='high'?'selected':''}>높음</option>
                <option value="medium" ${task?.priority==='medium'||!task?'selected':''}>보통</option>
                <option value="low" ${task?.priority==='low'?'selected':''}>낮음</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
              <input name="category" type="text" value="${task?.category || ''}" placeholder="예: 영업, 기술, 계약"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">마감일</label>
              <input name="due_date" type="date" value="${task?.due_date || ''}"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
          <button type="submit" class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">저장</button>
        </div>
      </form>
    </div>
  `
  openModal()
}

async function saveTask(event, id) {
  event.preventDefault()
  const form = event.target
  const data = Object.fromEntries(new FormData(form))
  if (!data.client_id) delete data.client_id
  if (!data.assignee_id) delete data.assignee_id
  if (!data.due_date) delete data.due_date
  try {
    if (id) await api.put(`/api/tasks/${id}`, data)
    else await api.post('/api/tasks', { ...data, created_by: 1 })
    closeModal()
    showToast(id ? '업무가 수정되었습니다.' : '업무가 추가되었습니다.')
    if (state.currentPage === 'tasks') loadTasks()
    else if (state.currentPage === 'kanban') loadKanban()
    else if (state.currentPage === 'client-detail') loadClientDetail(state.currentClientId)
  } catch(e) {
    showToast(e.response?.data?.error || '저장에 실패했습니다.', 'error')
  }
}

async function updateTaskStatus(id, status, el) {
  try {
    await api.patch(`/api/tasks/${id}/status`, { status })
    showToast('상태가 변경되었습니다.')
    if (state.currentPage === 'tasks') loadTasks()
    else if (state.currentPage === 'kanban') loadKanban()
  } catch(e) {
    showToast('상태 변경에 실패했습니다.', 'error')
  }
}

async function deleteTask(id) {
  if (!confirm('업무를 삭제하시겠습니까?')) return
  try {
    await api.delete(`/api/tasks/${id}`)
    showToast('업무가 삭제되었습니다.', 'warning')
    if (state.currentPage === 'tasks') loadTasks()
    else if (state.currentPage === 'kanban') loadKanban()
  } catch(e) {
    showToast('삭제에 실패했습니다.', 'error')
  }
}

// ===== 칸반 보드 =====
async function loadKanban() {
  const el = document.getElementById('kanban-content')
  try {
    const data = await api.get('/api/tasks?limit=100')
    renderKanban(data.data)
  } catch(e) {
    el.innerHTML = '<div class="loading text-red-400">데이터 로드 실패</div>'
  }
}

function renderKanban(tasks) {
  const el = document.getElementById('kanban-content')
  const cols = [
    { key: 'todo', label: '할일', icon: 'fas fa-circle', color: 'text-gray-400', bg: 'bg-gray-50' },
    { key: 'in_progress', label: '진행중', icon: 'fas fa-play-circle', color: 'text-blue-500', bg: 'bg-blue-50' },
    { key: 'review', label: '검토', icon: 'fas fa-eye', color: 'text-amber-500', bg: 'bg-amber-50' },
    { key: 'done', label: '완료', icon: 'fas fa-check-circle', color: 'text-green-500', bg: 'bg-green-50' }
  ]

  el.innerHTML = `
    <div class="flex items-center justify-between mb-5">
      <div class="text-sm text-gray-500">총 ${tasks.length}건의 업무</div>
      <button onclick="showTaskModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
        <i class="fas fa-plus"></i>업무 추가
      </button>
    </div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 items-start">
      ${cols.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key)
        return `
          <div class="bg-gray-50 rounded-xl kanban-col p-3">
            <div class="flex items-center justify-between mb-3 px-1">
              <div class="flex items-center gap-2">
                <i class="${col.icon} ${col.color} text-sm"></i>
                <span class="font-semibold text-sm text-gray-700">${col.label}</span>
                <span class="text-xs ${col.bg} px-2 py-0.5 rounded-full font-semibold ${col.color}">${colTasks.length}</span>
              </div>
            </div>
            <div class="space-y-2">
              ${colTasks.map(t => `
                <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer card-hover" onclick="showTaskModal(${t.id})">
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <span class="font-medium text-sm text-gray-900 leading-snug">${t.title}</span>
                    ${getPriorityBadge(t.priority)}
                  </div>
                  ${t.client_name ? `<div class="text-xs text-indigo-600 mb-2 flex items-center gap-1"><i class="fas fa-building text-xs"></i>${t.client_name}</div>` : ''}
                  <div class="flex items-center justify-between mt-2">
                    ${t.assignee_name ? `<div class="flex items-center gap-1">${getAvatar(t.assignee_name, t.assignee_color, 20)}<span class="text-xs text-gray-500">${t.assignee_name}</span></div>` : '<div></div>'}
                    ${t.due_date ? `<span class="text-xs ${isOverdue(t.due_date) && t.status !== 'done' ? 'text-red-500' : 'text-gray-400'}">${isOverdue(t.due_date) && t.status !== 'done' ? '⚠️ ' : ''}${formatDate(t.due_date)}</span>` : ''}
                  </div>
                </div>
              `).join('') || `<div class="text-center text-gray-400 text-xs py-8 border-2 border-dashed border-gray-200 rounded-xl">없음</div>`}
            </div>
          </div>
        `
      }).join('')}
    </div>
  `
}

// ===== 활동 이력 =====
async function loadActivities() {
  const el = document.getElementById('activities-content')
  const params = new URLSearchParams()
  if (state.activityFilters.client_id) params.set('client_id', state.activityFilters.client_id)
  if (state.activityFilters.type) params.set('type', state.activityFilters.type)
  try {
    const [data, clients] = await Promise.all([
      api.get(`/api/activities?${params}`),
      api.get('/api/clients?limit=100')
    ])
    renderActivities(data, clients.data)
  } catch(e) {
    el.innerHTML = '<div class="loading text-red-400">데이터 로드 실패</div>'
  }
}

function renderActivities(data, clients) {
  const el = document.getElementById('activities-content')
  el.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div class="flex flex-wrap items-center gap-3">
        <select class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400"
          onchange="state.activityFilters.client_id=this.value;loadActivities()">
          <option value="">전체 고객사</option>
          ${clients.map(c => `<option value="${c.id}" ${state.activityFilters.client_id==c.id?'selected':''}>${c.name}</option>`).join('')}
        </select>
        <select class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400"
          onchange="state.activityFilters.type=this.value;loadActivities()">
          <option value="">전체 유형</option>
          <option value="call">전화</option>
          <option value="email">이메일</option>
          <option value="meeting">미팅</option>
          <option value="visit">방문</option>
          <option value="proposal">제안</option>
          <option value="contract">계약</option>
          <option value="note">메모</option>
        </select>
        <span class="text-sm text-gray-500">총 ${data.total}건</span>
      </div>
      <button onclick="showActivityModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
        <i class="fas fa-plus"></i>활동 기록
      </button>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
      ${data.data.map(a => `
        <div class="p-5 hover:bg-gray-50 group">
          <div class="flex items-start gap-4">
            <div class="mt-0.5">${getActivityTypeBadge(a.type)}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <div class="font-semibold text-gray-900">${a.title}</div>
                <div class="flex items-center gap-3 shrink-0">
                  ${a.member_name ? `<div class="flex items-center gap-1.5">${getAvatar(a.member_name, a.member_color, 22)}<span class="text-sm text-gray-600">${a.member_name}</span></div>` : ''}
                  <span class="text-xs text-gray-400">${timeAgo(a.created_at)}</span>
                  <button onclick="deleteActivity(${a.id})" class="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-times text-sm"></i>
                  </button>
                </div>
              </div>
              ${a.client_name ? `<div class="mt-1"><span class="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full cursor-pointer hover:bg-indigo-100" onclick="navigateTo('client-detail',{id:${a.client_id}})">${a.client_name}</span></div>` : ''}
              ${a.content ? `<div class="text-sm text-gray-600 mt-2">${a.content}</div>` : ''}
              ${a.outcome ? `<div class="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-2 flex items-center gap-2"><i class="fas fa-check-circle"></i>${a.outcome}</div>` : ''}
              ${a.next_action ? `<div class="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mt-2 flex items-center gap-2"><i class="fas fa-arrow-right"></i>다음: ${a.next_action}${a.next_action_date ? ` (${formatDate(a.next_action_date)})` : ''}</div>` : ''}
            </div>
          </div>
        </div>
      `).join('') || '<div class="p-12 text-center text-gray-400">활동 이력이 없습니다.</div>'}
    </div>
  `
}

async function showActivityModal(clientId = null) {
  const [clientsData, members] = await Promise.all([
    api.get('/api/clients?limit=100'),
    api.get('/api/members')
  ])
  document.getElementById('modal-content').innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-semibold">활동 기록</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-lg"></i></button>
      </div>
      <form onsubmit="saveActivity(event)">
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">유형 <span class="text-red-500">*</span></label>
              <select name="type" required class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
                <option value="meeting">🤝 미팅</option>
                <option value="call">📞 전화</option>
                <option value="email">📧 이메일</option>
                <option value="visit">🏢 방문</option>
                <option value="proposal">📄 제안</option>
                <option value="contract">✍️ 계약</option>
                <option value="note">📝 메모</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">고객사</label>
              <select name="client_id" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
                <option value="">없음</option>
                ${clientsData.data.map(c => `<option value="${c.id}" ${clientId==c.id?'selected':''}>${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">제목 <span class="text-red-500">*</span></label>
            <input name="title" type="text" required placeholder="활동 제목을 입력하세요"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">내용</label>
            <textarea name="content" rows="3" placeholder="활동 내용을 입력하세요"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 resize-none"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">결과</label>
            <input name="outcome" type="text" placeholder="활동 결과를 입력하세요"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">다음 액션</label>
              <input name="next_action" type="text" placeholder="다음 할 일"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">다음 액션 날짜</label>
              <input name="next_action_date" type="date"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">담당자</label>
            <select name="member_id" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
              <option value="">없음</option>
              ${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
          <button type="submit" class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">저장</button>
        </div>
      </form>
    </div>
  `
  openModal()
}

async function saveActivity(event) {
  event.preventDefault()
  const form = event.target
  const data = Object.fromEntries(new FormData(form))
  if (!data.client_id) delete data.client_id
  if (!data.member_id) delete data.member_id
  if (!data.next_action_date) delete data.next_action_date
  try {
    await api.post('/api/activities', data)
    closeModal()
    showToast('활동이 기록되었습니다.')
    if (state.currentPage === 'activities') loadActivities()
    else if (state.currentPage === 'client-detail') loadClientDetail(state.currentClientId)
    else if (state.currentPage === 'dashboard') loadDashboard()
  } catch(e) {
    showToast(e.response?.data?.error || '저장에 실패했습니다.', 'error')
  }
}

async function deleteActivity(id, clientId = null) {
  if (!confirm('활동 이력을 삭제하시겠습니까?')) return
  try {
    await api.delete(`/api/activities/${id}`)
    showToast('삭제되었습니다.', 'warning')
    if (state.currentPage === 'activities') loadActivities()
    else if (state.currentPage === 'client-detail' && clientId) loadClientDetail(clientId)
    else if (state.currentPage === 'dashboard') loadDashboard()
  } catch(e) {
    showToast('삭제에 실패했습니다.', 'error')
  }
}

// ===== 팀원 관리 =====
async function loadMembers() {
  const el = document.getElementById('members-content')
  try {
    const members = await api.get('/api/members')
    state.members = members
    renderMembers(members)
  } catch(e) {
    el.innerHTML = '<div class="loading text-red-400">데이터 로드 실패</div>'
  }
}

function renderMembers(members) {
  const el = document.getElementById('members-content')
  const colors = ['#4F46E5', '#059669', '#DC2626', '#D97706', '#7C3AED', '#0891B2', '#DB2777', '#65A30D']
  el.innerHTML = `
    <div class="flex items-center justify-between mb-5">
      <div class="text-sm text-gray-500">총 ${members.length}명</div>
      <button onclick="showMemberModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
        <i class="fas fa-plus"></i>팀원 추가
      </button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${members.map(m => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 card-hover">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              ${getAvatar(m.name, m.avatar_color, 44)}
              <div>
                <div class="font-semibold text-gray-900">${m.name}</div>
                <div class="text-xs text-gray-500">${m.role === 'admin' ? '관리자' : m.role === 'manager' ? '매니저' : '팀원'} ${m.department ? '· '+m.department : ''}</div>
              </div>
            </div>
            <div class="flex gap-1">
              <button onclick="showMemberModal(${m.id})" class="text-gray-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded"><i class="fas fa-edit text-xs"></i></button>
              <button onclick="deleteMember(${m.id},'${m.name}')" class="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded"><i class="fas fa-trash text-xs"></i></button>
            </div>
          </div>
          <div class="space-y-1.5 text-sm text-gray-600">
            <div class="flex items-center gap-2"><i class="fas fa-envelope text-gray-400 w-4"></i>${m.email}</div>
            ${m.phone ? `<div class="flex items-center gap-2"><i class="fas fa-phone text-gray-400 w-4"></i>${m.phone}</div>` : ''}
          </div>
          <div class="mt-3 pt-3 border-t border-gray-100">
            <span class="text-xs text-gray-500">진행 업무: <strong class="text-indigo-600">${m.task_count || 0}건</strong></span>
          </div>
        </div>
      `).join('') || '<div class="col-span-3 text-center text-gray-400 py-12">팀원이 없습니다</div>'}
    </div>
  `
}

async function showMemberModal(id = null) {
  let member = null
  if (id) {
    try { const members = await api.get('/api/members'); member = members.find(m => m.id === id) } catch(e) {}
  }
  const colors = ['#4F46E5', '#059669', '#DC2626', '#D97706', '#7C3AED', '#0891B2', '#DB2777', '#65A30D', '#0F766E']
  document.getElementById('modal-content').innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-semibold">${member ? '팀원 수정' : '팀원 추가'}</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-lg"></i></button>
      </div>
      <form onsubmit="saveMember(event,${id})">
        <div class="space-y-4">
          <div class="flex gap-3 mb-4">
            ${colors.map(c => `
              <button type="button" class="w-8 h-8 rounded-full transition-transform hover:scale-110 ${member?.avatar_color === c ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}"
                style="background-color:${c}" onclick="selectColor(this,'${c}')"></button>
            `).join('')}
            <input type="hidden" name="avatar_color" id="avatar_color_input" value="${member?.avatar_color || '#4F46E5'}">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">이름 <span class="text-red-500">*</span></label>
              <input name="name" type="text" required value="${member?.name || ''}"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">이메일 <span class="text-red-500">*</span></label>
              <input name="email" type="email" required value="${member?.email || ''}"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">역할</label>
              <select name="role" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
                <option value="member" ${member?.role==='member'||!member?'selected':''}>팀원</option>
                <option value="manager" ${member?.role==='manager'?'selected':''}>매니저</option>
                <option value="admin" ${member?.role==='admin'?'selected':''}>관리자</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">부서</label>
              <input name="department" type="text" value="${member?.department || ''}"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
            <input name="phone" type="text" value="${member?.phone || ''}"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400">
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
          <button type="submit" class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">저장</button>
        </div>
      </form>
    </div>
  `
  openModal()
}

function selectColor(btn, color) {
  btn.closest('div').querySelectorAll('button[type="button"]').forEach(b => b.classList.remove('ring-2', 'ring-offset-2', 'ring-indigo-500'))
  btn.classList.add('ring-2', 'ring-offset-2', 'ring-indigo-500')
  document.getElementById('avatar_color_input').value = color
}

async function saveMember(event, id) {
  event.preventDefault()
  const data = Object.fromEntries(new FormData(event.target))
  try {
    if (id) await api.put(`/api/members/${id}`, data)
    else await api.post('/api/members', data)
    closeModal()
    showToast(id ? '팀원 정보가 수정되었습니다.' : '팀원이 추가되었습니다.')
    loadMembers()
  } catch(e) {
    showToast(e.response?.data?.error || '저장에 실패했습니다.', 'error')
  }
}

async function deleteMember(id, name) {
  if (!confirm(`"${name}"을 팀원 목록에서 제거하시겠습니까?`)) return
  try {
    await api.delete(`/api/members/${id}`)
    showToast('팀원이 제거되었습니다.', 'warning')
    loadMembers()
  } catch(e) {
    showToast('삭제에 실패했습니다.', 'error')
  }
}

// ===== 빠른 추가 =====
function showQuickAdd() {
  document.getElementById('modal-content').innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-semibold">빠른 추가</h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-lg"></i></button>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <button onclick="closeModal();showClientModal()" class="flex flex-col items-center gap-3 p-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all">
          <div class="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center"><i class="fas fa-building text-indigo-600 text-xl"></i></div>
          <span class="text-sm font-medium text-gray-700">고객사 추가</span>
        </button>
        <button onclick="closeModal();showTaskModal()" class="flex flex-col items-center gap-3 p-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all">
          <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><i class="fas fa-tasks text-blue-600 text-xl"></i></div>
          <span class="text-sm font-medium text-gray-700">업무 추가</span>
        </button>
        <button onclick="closeModal();showActivityModal()" class="flex flex-col items-center gap-3 p-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all">
          <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center"><i class="fas fa-history text-green-600 text-xl"></i></div>
          <span class="text-sm font-medium text-gray-700">활동 기록</span>
        </button>
        <button onclick="closeModal();showContactModal()" class="flex flex-col items-center gap-3 p-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all">
          <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center"><i class="fas fa-user-plus text-purple-600 text-xl"></i></div>
          <span class="text-sm font-medium text-gray-700">담당자 추가</span>
        </button>
      </div>
    </div>
  `
  openModal()
}

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
  // 사이드바 네비게이션
  document.querySelectorAll('.sidebar-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page))
  })
  
  // 빠른 추가 버튼
  document.getElementById('quickAddBtn').addEventListener('click', showQuickAdd)
  
  // 모바일 메뉴 토글
  document.getElementById('menuToggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar')
    sidebar.classList.toggle('collapsed')
  })

  // 기본 페이지 (대시보드)
  navigateTo('dashboard')
})
