import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { Bindings } from './types'
import clientsRoute from './routes/clients'
import contactsRoute from './routes/contacts'
import tasksRoute from './routes/tasks'
import activitiesRoute from './routes/activities'
import membersRoute from './routes/members'
import dashboardRoute from './routes/dashboard'

const app = new Hono<{ Bindings: Bindings }>()

// CORS 미들웨어
app.use('/api/*', cors())

// API 라우트
app.route('/api/dashboard', dashboardRoute)
app.route('/api/clients', clientsRoute)
app.route('/api/contacts', contactsRoute)
app.route('/api/tasks', tasksRoute)
app.route('/api/activities', activitiesRoute)
app.route('/api/members', membersRoute)

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './' }))

// SPA - 모든 경로를 index.html로
app.get('*', (c) => {
  return c.html(getHTML())
})

function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TeamCRM - 고객사 & 업무 관리</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              primary: { 50: '#EEF2FF', 100: '#E0E7FF', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA' },
            }
          }
        }
      }
    </script>
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; }
      .sidebar-item.active { background-color: #EEF2FF; color: #4F46E5; font-weight: 600; }
      .sidebar-item.active i { color: #4F46E5; }
      .page { display: none; }
      .page.active { display: block; }
      .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; }
      .modal-overlay.open { display: flex; }
      .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; }
      .priority-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
      .avatar { width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: white; }
      .card-hover { transition: all 0.2s; }
      .card-hover:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.12); transform: translateY(-1px); }
      .table-row-hover:hover { background-color: #F8FAFC; cursor: pointer; }
      .loading { display: flex; align-items: center; justify-content: center; padding: 60px; color: #94A3B8; }
      .badge-vip { background: #FEF3C7; color: #92400E; }
      .badge-premium { background: #EDE9FE; color: #5B21B6; }
      .badge-normal { background: #F1F5F9; color: #475569; }
      .badge-active { background: #D1FAE5; color: #065F46; }
      .badge-prospect { background: #DBEAFE; color: #1E40AF; }
      .badge-inactive { background: #F1F5F9; color: #94A3B8; }
      .badge-todo { background: #F1F5F9; color: #475569; }
      .badge-in_progress { background: #DBEAFE; color: #1E40AF; }
      .badge-review { background: #FEF3C7; color: #92400E; }
      .badge-done { background: #D1FAE5; color: #065F46; }
      .badge-cancelled { background: #FEE2E2; color: #991B1B; }
      .prio-high { background: #FEE2E2; color: #991B1B; }
      .prio-medium { background: #FEF3C7; color: #92400E; }
      .prio-low { background: #F1F5F9; color: #475569; }
      ::-webkit-scrollbar { width: 6px; } 
      ::-webkit-scrollbar-track { background: #f1f5f9; } 
      ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      .kanban-col { min-height: 400px; }
      .tag-call { background: #EDE9FE; color: #6D28D9; }
      .tag-email { background: #DBEAFE; color: #1D4ED8; }
      .tag-meeting { background: #D1FAE5; color: #065F46; }
      .tag-visit { background: #FEF3C7; color: #92400E; }
      .tag-proposal { background: #FCE7F3; color: #9D174D; }
      .tag-contract { background: #ECFDF5; color: #047857; }
      .tag-note { background: #F1F5F9; color: #475569; }
      .tag-task_update { background: #EFF6FF; color: #1E40AF; }
      .sidebar { transition: width 0.3s; }
      @media (max-width: 768px) {
        .sidebar { position: fixed; z-index: 900; height: 100vh; }
        .sidebar.collapsed { width: 0; overflow: hidden; }
      }
      input, select, textarea { outline: none; }
      input:focus, select:focus, textarea:focus { ring: 2px solid #6366F1; }
      .tab-btn.active { border-bottom: 2px solid #4F46E5; color: #4F46E5; font-weight: 600; }
      .tab-content { display: none; }
      .tab-content.active { display: block; }
      .drag-over { border: 2px dashed #6366F1; background: #EEF2FF; }
    </style>
</head>
<body class="bg-gray-50 text-gray-800">

<!-- 앱 컨테이너 -->
<div class="flex h-screen overflow-hidden">
  
  <!-- 사이드바 -->
  <aside id="sidebar" class="sidebar bg-white border-r border-gray-200 flex flex-col" style="width: 240px; flex-shrink: 0;">
    <!-- 로고 -->
    <div class="p-5 border-b border-gray-100">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <i class="fas fa-briefcase text-white text-sm"></i>
        </div>
        <div>
          <div class="font-bold text-gray-900 text-sm">TeamCRM</div>
          <div class="text-xs text-gray-400">고객사 & 업무 관리</div>
        </div>
      </div>
    </div>
    
    <!-- 네비게이션 -->
    <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
      <div class="text-xs font-semibold text-gray-400 uppercase px-2 py-1 mt-2 mb-1">메인</div>
      <button class="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition-colors" data-page="dashboard">
        <i class="fas fa-chart-line w-4 text-gray-400"></i>대시보드
      </button>
      
      <div class="text-xs font-semibold text-gray-400 uppercase px-2 py-1 mt-4 mb-1">고객 관리</div>
      <button class="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition-colors" data-page="clients">
        <i class="fas fa-building w-4 text-gray-400"></i>고객사 목록
      </button>
      <button class="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition-colors" data-page="contacts">
        <i class="fas fa-address-book w-4 text-gray-400"></i>연락처
      </button>
      <button class="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition-colors" data-page="activities">
        <i class="fas fa-history w-4 text-gray-400"></i>활동 이력
      </button>
      
      <div class="text-xs font-semibold text-gray-400 uppercase px-2 py-1 mt-4 mb-1">업무 관리</div>
      <button class="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition-colors" data-page="tasks">
        <i class="fas fa-tasks w-4 text-gray-400"></i>업무 목록
      </button>
      <button class="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition-colors" data-page="kanban">
        <i class="fas fa-columns w-4 text-gray-400"></i>칸반 보드
      </button>
      
      <div class="text-xs font-semibold text-gray-400 uppercase px-2 py-1 mt-4 mb-1">설정</div>
      <button class="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition-colors" data-page="members">
        <i class="fas fa-users w-4 text-gray-400"></i>팀원 관리
      </button>
    </nav>
    
    <!-- 하단 정보 -->
    <div class="p-4 border-t border-gray-100">
      <div class="text-xs text-gray-400 text-center">TeamCRM v1.0</div>
    </div>
  </aside>

  <!-- 메인 컨텐츠 -->
  <main class="flex-1 overflow-y-auto flex flex-col min-w-0">
    <!-- 상단 헤더 -->
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div class="flex items-center gap-4">
        <button id="menuToggle" class="text-gray-400 hover:text-gray-600 lg:hidden">
          <i class="fas fa-bars text-lg"></i>
        </button>
        <h1 id="pageTitle" class="text-lg font-semibold text-gray-900">대시보드</h1>
      </div>
      <div class="flex items-center gap-3">
        <button id="quickAddBtn" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
          <i class="fas fa-plus"></i><span>빠른 추가</span>
        </button>
        <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">K</div>
      </div>
    </header>
    
    <!-- 페이지 컨텐츠 -->
    <div class="flex-1 p-6">
      <!-- 대시보드 페이지 -->
      <div id="page-dashboard" class="page">
        <div id="dashboard-content">
          <div class="loading"><i class="fas fa-spinner fa-spin text-3xl"></i></div>
        </div>
      </div>
      
      <!-- 고객사 페이지 -->
      <div id="page-clients" class="page">
        <div id="clients-content">
          <div class="loading"><i class="fas fa-spinner fa-spin text-3xl"></i></div>
        </div>
      </div>
      
      <!-- 연락처 페이지 -->
      <div id="page-contacts" class="page">
        <div id="contacts-content">
          <div class="loading"><i class="fas fa-spinner fa-spin text-3xl"></i></div>
        </div>
      </div>
      
      <!-- 활동 이력 페이지 -->
      <div id="page-activities" class="page">
        <div id="activities-content">
          <div class="loading"><i class="fas fa-spinner fa-spin text-3xl"></i></div>
        </div>
      </div>
      
      <!-- 업무 목록 페이지 -->
      <div id="page-tasks" class="page">
        <div id="tasks-content">
          <div class="loading"><i class="fas fa-spinner fa-spin text-3xl"></i></div>
        </div>
      </div>
      
      <!-- 칸반 보드 페이지 -->
      <div id="page-kanban" class="page">
        <div id="kanban-content">
          <div class="loading"><i class="fas fa-spinner fa-spin text-3xl"></i></div>
        </div>
      </div>
      
      <!-- 팀원 관리 페이지 -->
      <div id="page-members" class="page">
        <div id="members-content">
          <div class="loading"><i class="fas fa-spinner fa-spin text-3xl"></i></div>
        </div>
      </div>
      
      <!-- 고객사 상세 페이지 -->
      <div id="page-client-detail" class="page">
        <div id="client-detail-content">
          <div class="loading"><i class="fas fa-spinner fa-spin text-3xl"></i></div>
        </div>
      </div>
    </div>
  </main>
</div>

<!-- 모달들 -->
<div id="modal-overlay" class="modal-overlay" onclick="closeModal()">
  <div id="modal-content" onclick="event.stopPropagation()" class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-screen overflow-y-auto">
  </div>
</div>

<!-- 토스트 -->
<div id="toast" class="fixed bottom-5 right-5 z-50 hidden">
  <div id="toast-content" class="px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium flex items-center gap-2"></div>
</div>

<script src="/static/app.js"></script>
</body>
</html>`
}

export default app
