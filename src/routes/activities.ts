import { Hono } from 'hono'
import { Bindings } from '../types'

const activities = new Hono<{ Bindings: Bindings }>()

// GET /api/activities - 활동 이력 목록
activities.get('/', async (c) => {
  const { client_id, task_id, member_id, type, page = '1', limit = '30' } = c.req.query()
  const offset = (parseInt(page) - 1) * parseInt(limit)

  let query = `
    SELECT a.*,
      c.name as client_name,
      m.name as member_name,
      m.avatar_color as member_color,
      t.title as task_title
    FROM activities a
    LEFT JOIN clients c ON a.client_id = c.id
    LEFT JOIN members m ON a.member_id = m.id
    LEFT JOIN tasks t ON a.task_id = t.id
    WHERE 1=1
  `
  const params: any[] = []

  if (client_id) { query += ` AND a.client_id = ?`; params.push(parseInt(client_id)) }
  if (task_id) { query += ` AND a.task_id = ?`; params.push(parseInt(task_id)) }
  if (member_id) { query += ` AND a.member_id = ?`; params.push(parseInt(member_id)) }
  if (type) { query += ` AND a.type = ?`; params.push(type) }

  query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`
  params.push(parseInt(limit), offset)

  const results = await c.env.DB.prepare(query).bind(...params).all()

  const countParts: string[] = []
  const countParams: any[] = []
  if (client_id) { countParts.push(`client_id = ?`); countParams.push(parseInt(client_id)) }
  if (task_id) { countParts.push(`task_id = ?`); countParams.push(parseInt(task_id)) }
  if (member_id) { countParts.push(`member_id = ?`); countParams.push(parseInt(member_id)) }
  if (type) { countParts.push(`type = ?`); countParams.push(type) }
  const whereClause = countParts.length ? ` WHERE ${countParts.join(' AND ')}` : ''
  const countResult = await c.env.DB.prepare(`SELECT COUNT(*) as total FROM activities${whereClause}`).bind(...countParams).first()

  return c.json({
    data: results.results,
    total: (countResult as any)?.total || 0,
    page: parseInt(page),
    limit: parseInt(limit)
  })
})

// POST /api/activities - 활동 이력 생성
activities.post('/', async (c) => {
  const body = await c.req.json()
  const { client_id, task_id, member_id, type, title, content, outcome, next_action, next_action_date } = body

  if (!type || !title) return c.json({ error: '유형과 제목은 필수입니다.' }, 400)

  const result = await c.env.DB.prepare(
    `INSERT INTO activities (client_id, task_id, member_id, type, title, content, outcome, next_action, next_action_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    client_id || null, task_id || null, member_id || null,
    type, title, content || null, outcome || null, next_action || null, next_action_date || null
  ).run()

  const activity = await c.env.DB.prepare(
    `SELECT a.*, c.name as client_name, m.name as member_name, m.avatar_color as member_color, t.title as task_title
     FROM activities a
     LEFT JOIN clients c ON a.client_id = c.id
     LEFT JOIN members m ON a.member_id = m.id
     LEFT JOIN tasks t ON a.task_id = t.id
     WHERE a.id = ?`
  ).bind(result.meta.last_row_id).first()

  return c.json(activity, 201)
})

// DELETE /api/activities/:id - 활동 이력 삭제
activities.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  await c.env.DB.prepare(`DELETE FROM activities WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

export default activities
