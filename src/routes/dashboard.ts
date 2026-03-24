import { Hono } from 'hono'
import { Bindings } from '../types'

const dashboard = new Hono<{ Bindings: Bindings }>()

// GET /api/dashboard - 대시보드 통계
dashboard.get('/', async (c) => {
  const today = new Date().toISOString().split('T')[0]

  const [
    clientStats,
    taskStats,
    overdueCount,
    recentActivities,
    upcomingTasks
  ] = await Promise.all([
    c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_clients,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_clients,
        SUM(CASE WHEN status = 'prospect' THEN 1 ELSE 0 END) as prospect_clients,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_clients
      FROM clients
    `).first(),
    c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as review_tasks,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_tasks,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_tasks
      FROM tasks
    `).first(),
    c.env.DB.prepare(`
      SELECT COUNT(*) as overdue_tasks FROM tasks 
      WHERE status NOT IN ('done', 'cancelled') AND due_date < ?
    `).bind(today).first(),
    c.env.DB.prepare(`
      SELECT a.*, c.name as client_name, m.name as member_name, m.avatar_color as member_color
      FROM activities a
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN members m ON a.member_id = m.id
      ORDER BY a.created_at DESC LIMIT 10
    `).all(),
    c.env.DB.prepare(`
      SELECT t.*, c.name as client_name, m.name as assignee_name, m.avatar_color as assignee_color
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN members m ON t.assignee_id = m.id
      WHERE t.status NOT IN ('done', 'cancelled') AND t.due_date IS NOT NULL
      ORDER BY t.due_date ASC LIMIT 5
    `).all()
  ])

  return c.json({
    ...(clientStats as any),
    ...(taskStats as any),
    overdue_tasks: (overdueCount as any)?.overdue_tasks || 0,
    recent_activities: recentActivities.results,
    upcoming_tasks: upcomingTasks.results
  })
})

// GET /api/dashboard/activity-chart - 활동 차트 데이터 (최근 30일)
dashboard.get('/activity-chart', async (c) => {
  const results = await c.env.DB.prepare(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count,
      type
    FROM activities
    WHERE created_at >= DATE('now', '-30 days')
    GROUP BY DATE(created_at), type
    ORDER BY date ASC
  `).all()

  return c.json(results.results)
})

// GET /api/dashboard/task-summary - 팀원별 업무 현황
dashboard.get('/task-summary', async (c) => {
  const results = await c.env.DB.prepare(`
    SELECT 
      m.id, m.name, m.avatar_color,
      COUNT(t.id) as total_tasks,
      SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) as todo,
      SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN t.status = 'review' THEN 1 ELSE 0 END) as review,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done
    FROM members m
    LEFT JOIN tasks t ON m.id = t.assignee_id
    WHERE m.is_active = 1
    GROUP BY m.id
    ORDER BY total_tasks DESC
  `).all()

  return c.json(results.results)
})

export default dashboard
