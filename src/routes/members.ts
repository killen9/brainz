import { Hono } from 'hono'
import { Bindings } from '../types'

const members = new Hono<{ Bindings: Bindings }>()

// GET /api/members - 팀원 목록
members.get('/', async (c) => {
  const results = await c.env.DB.prepare(
    `SELECT m.*,
      COUNT(t.id) as task_count
     FROM members m
     LEFT JOIN tasks t ON m.id = t.assignee_id AND t.status NOT IN ('done', 'cancelled')
     WHERE m.is_active = 1
     GROUP BY m.id
     ORDER BY m.name ASC`
  ).all()
  return c.json(results.results)
})

// POST /api/members - 팀원 추가
members.post('/', async (c) => {
  const body = await c.req.json()
  const { name, email, role = 'member', department, phone, avatar_color = '#4F46E5' } = body

  if (!name || !email) return c.json({ error: '이름과 이메일은 필수입니다.' }, 400)

  const existing = await c.env.DB.prepare(`SELECT id FROM members WHERE email = ?`).bind(email).first()
  if (existing) return c.json({ error: '이미 등록된 이메일입니다.' }, 409)

  const result = await c.env.DB.prepare(
    `INSERT INTO members (name, email, role, department, phone, avatar_color) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(name, email, role, department || null, phone || null, avatar_color).run()

  const member = await c.env.DB.prepare(`SELECT * FROM members WHERE id = ?`).bind(result.meta.last_row_id).first()
  return c.json(member, 201)
})

// PUT /api/members/:id - 팀원 수정
members.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  const { name, email, role, department, phone, avatar_color } = body

  if (!name || !email) return c.json({ error: '이름과 이메일은 필수입니다.' }, 400)

  await c.env.DB.prepare(
    `UPDATE members SET name=?, email=?, role=?, department=?, phone=?, avatar_color=? WHERE id=?`
  ).bind(name, email, role, department || null, phone || null, avatar_color, id).run()

  const member = await c.env.DB.prepare(`SELECT * FROM members WHERE id = ?`).bind(id).first()
  if (!member) return c.json({ error: '팀원을 찾을 수 없습니다.' }, 404)
  return c.json(member)
})

// DELETE /api/members/:id - 팀원 비활성화
members.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  await c.env.DB.prepare(`UPDATE members SET is_active = 0 WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

export default members
