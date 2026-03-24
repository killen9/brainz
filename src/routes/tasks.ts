import { Hono } from 'hono'
import { Bindings } from '../types'

const tasks = new Hono<{ Bindings: Bindings }>()

// GET /api/tasks - 업무 목록
tasks.get('/', async (c) => {
  const { client_id, assignee_id, status, priority, search, page = '1', limit = '20' } = c.req.query()
  const offset = (parseInt(page) - 1) * parseInt(limit)

  let query = `
    SELECT t.*, 
      c.name as client_name,
      m.name as assignee_name,
      m.avatar_color as assignee_color,
      cr.name as creator_name
    FROM tasks t
    LEFT JOIN clients c ON t.client_id = c.id
    LEFT JOIN members m ON t.assignee_id = m.id
    LEFT JOIN members cr ON t.created_by = cr.id
    WHERE 1=1
  `
  const params: any[] = []

  if (client_id) { query += ` AND t.client_id = ?`; params.push(parseInt(client_id)) }
  if (assignee_id) { query += ` AND t.assignee_id = ?`; params.push(parseInt(assignee_id)) }
  if (status) { query += ` AND t.status = ?`; params.push(status) }
  if (priority) { query += ` AND t.priority = ?`; params.push(priority) }
  if (search) {
    query += ` AND (t.title LIKE ? OR t.description LIKE ?)`
    params.push(`%${search}%`, `%${search}%`)
  }

  query += ` ORDER BY 
    CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
    t.due_date ASC NULLS LAST,
    t.updated_at DESC
    LIMIT ? OFFSET ?`
  params.push(parseInt(limit), offset)

  const results = await c.env.DB.prepare(query).bind(...params).all()

  const countQuery = `SELECT COUNT(*) as total FROM tasks WHERE 1=1${client_id ? ` AND client_id = ?` : ''}${assignee_id ? ` AND assignee_id = ?` : ''}${status ? ` AND status = ?` : ''}${priority ? ` AND priority = ?` : ''}${search ? ` AND (title LIKE ? OR description LIKE ?)` : ''}`
  const countParams: any[] = []
  if (client_id) countParams.push(parseInt(client_id))
  if (assignee_id) countParams.push(parseInt(assignee_id))
  if (status) countParams.push(status)
  if (priority) countParams.push(priority)
  if (search) countParams.push(`%${search}%`, `%${search}%`)

  const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first()

  return c.json({
    data: results.results,
    total: (countResult as any)?.total || 0,
    page: parseInt(page),
    limit: parseInt(limit)
  })
})

// GET /api/tasks/:id - 업무 상세
tasks.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const task = await c.env.DB.prepare(
    `SELECT t.*, c.name as client_name, m.name as assignee_name, m.avatar_color as assignee_color, cr.name as creator_name
     FROM tasks t
     LEFT JOIN clients c ON t.client_id = c.id
     LEFT JOIN members m ON t.assignee_id = m.id
     LEFT JOIN members cr ON t.created_by = cr.id
     WHERE t.id = ?`
  ).bind(id).first()

  if (!task) return c.json({ error: '업무를 찾을 수 없습니다.' }, 404)

  const activities = await c.env.DB.prepare(
    `SELECT a.*, m.name as member_name, m.avatar_color as member_color
     FROM activities a
     LEFT JOIN members m ON a.member_id = m.id
     WHERE a.task_id = ? ORDER BY a.created_at DESC`
  ).bind(id).all()

  return c.json({ task, activities: activities.results })
})

// POST /api/tasks - 업무 생성
tasks.post('/', async (c) => {
  const body = await c.req.json()
  const { title, description, client_id, assignee_id, status = 'todo', priority = 'medium', category, due_date, created_by } = body

  if (!title) return c.json({ error: '업무명은 필수입니다.' }, 400)

  const result = await c.env.DB.prepare(
    `INSERT INTO tasks (title, description, client_id, assignee_id, status, priority, category, due_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(title, description || null, client_id || null, assignee_id || null, status, priority, category || null, due_date || null, created_by || null).run()

  const task = await c.env.DB.prepare(
    `SELECT t.*, c.name as client_name, m.name as assignee_name, m.avatar_color as assignee_color
     FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN members m ON t.assignee_id = m.id
     WHERE t.id = ?`
  ).bind(result.meta.last_row_id).first()
  return c.json(task, 201)
})

// PUT /api/tasks/:id - 업무 수정
tasks.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  const { title, description, client_id, assignee_id, status, priority, category, due_date } = body

  if (!title) return c.json({ error: '업무명은 필수입니다.' }, 400)

  const completedAt = status === 'done' ? 'CURRENT_TIMESTAMP' : null
  
  await c.env.DB.prepare(
    `UPDATE tasks SET title=?, description=?, client_id=?, assignee_id=?, status=?, priority=?, category=?, due_date=?,
     completed_at=${status === 'done' ? 'CURRENT_TIMESTAMP' : 'NULL'}, updated_at=CURRENT_TIMESTAMP
     WHERE id=?`
  ).bind(title, description || null, client_id || null, assignee_id || null, status, priority, category || null, due_date || null, id).run()

  const task = await c.env.DB.prepare(
    `SELECT t.*, c.name as client_name, m.name as assignee_name, m.avatar_color as assignee_color
     FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN members m ON t.assignee_id = m.id
     WHERE t.id = ?`
  ).bind(id).first()
  if (!task) return c.json({ error: '업무를 찾을 수 없습니다.' }, 404)
  return c.json(task)
})

// PATCH /api/tasks/:id/status - 업무 상태 변경
tasks.patch('/:id/status', async (c) => {
  const id = parseInt(c.req.param('id'))
  const { status } = await c.req.json()

  await c.env.DB.prepare(
    `UPDATE tasks SET status=?, ${status === 'done' ? 'completed_at=CURRENT_TIMESTAMP,' : ''} updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).bind(status, id).run()

  // 활동 이력 자동 기록
  const task = await c.env.DB.prepare(`SELECT * FROM tasks WHERE id = ?`).bind(id).first() as any
  if (task) {
    await c.env.DB.prepare(
      `INSERT INTO activities (client_id, task_id, type, title, content) VALUES (?, ?, 'task_update', ?, ?)`
    ).bind(task.client_id || null, id, `업무 상태 변경: ${title}`, `상태가 "${status}"(으)로 변경되었습니다.`).run()
  }

  return c.json({ success: true, status })
})

// DELETE /api/tasks/:id - 업무 삭제
tasks.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  await c.env.DB.prepare(`DELETE FROM tasks WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

export default tasks
