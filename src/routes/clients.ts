import { Hono } from 'hono'
import { Bindings } from '../types'

const clients = new Hono<{ Bindings: Bindings }>()

// GET /api/clients - 고객사 목록
clients.get('/', async (c) => {
  const { search, status, grade, page = '1', limit = '20' } = c.req.query()
  const offset = (parseInt(page) - 1) * parseInt(limit)

  let query = `
    SELECT c.*,
      COUNT(DISTINCT co.id) as contact_count,
      COUNT(DISTINCT t.id) as task_count
    FROM clients c
    LEFT JOIN contacts co ON c.id = co.client_id
    LEFT JOIN tasks t ON c.id = t.client_id AND t.status != 'cancelled'
    WHERE 1=1
  `
  const params: any[] = []

  if (search) {
    query += ` AND (c.name LIKE ? OR c.industry LIKE ? OR c.email LIKE ?)`
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (status) {
    query += ` AND c.status = ?`
    params.push(status)
  }
  if (grade) {
    query += ` AND c.grade = ?`
    params.push(grade)
  }

  query += ` GROUP BY c.id ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`
  params.push(parseInt(limit), offset)

  const countQuery = `SELECT COUNT(*) as total FROM clients WHERE 1=1${search ? ` AND (name LIKE ? OR industry LIKE ? OR email LIKE ?)` : ''}${status ? ` AND status = ?` : ''}${grade ? ` AND grade = ?` : ''}`
  const countParams: any[] = []
  if (search) countParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
  if (status) countParams.push(status)
  if (grade) countParams.push(grade)

  const [results, countResult] = await Promise.all([
    c.env.DB.prepare(query).bind(...params).all(),
    c.env.DB.prepare(countQuery).bind(...countParams).first()
  ])

  return c.json({
    data: results.results,
    total: (countResult as any)?.total || 0,
    page: parseInt(page),
    limit: parseInt(limit)
  })
})

// GET /api/clients/:id - 고객사 상세
clients.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const client = await c.env.DB.prepare(
    `SELECT * FROM clients WHERE id = ?`
  ).bind(id).first()

  if (!client) return c.json({ error: '고객사를 찾을 수 없습니다.' }, 404)

  const contacts = await c.env.DB.prepare(
    `SELECT * FROM contacts WHERE client_id = ? ORDER BY is_primary DESC, name ASC`
  ).bind(id).all()

  const recentTasks = await c.env.DB.prepare(
    `SELECT t.*, m.name as assignee_name, m.avatar_color as assignee_color 
     FROM tasks t 
     LEFT JOIN members m ON t.assignee_id = m.id
     WHERE t.client_id = ? ORDER BY t.updated_at DESC LIMIT 10`
  ).bind(id).all()

  const recentActivities = await c.env.DB.prepare(
    `SELECT a.*, m.name as member_name, m.avatar_color as member_color
     FROM activities a
     LEFT JOIN members m ON a.member_id = m.id
     WHERE a.client_id = ? ORDER BY a.created_at DESC LIMIT 20`
  ).bind(id).all()

  return c.json({
    client,
    contacts: contacts.results,
    tasks: recentTasks.results,
    activities: recentActivities.results
  })
})

// POST /api/clients - 고객사 생성
clients.post('/', async (c) => {
  const body = await c.req.json()
  const { name, industry, website, address, phone, email, status = 'active', grade = 'normal', notes } = body

  if (!name) return c.json({ error: '고객사명은 필수입니다.' }, 400)

  const result = await c.env.DB.prepare(
    `INSERT INTO clients (name, industry, website, address, phone, email, status, grade, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(name, industry || null, website || null, address || null, phone || null, email || null, status, grade, notes || null).run()

  const client = await c.env.DB.prepare(`SELECT * FROM clients WHERE id = ?`).bind(result.meta.last_row_id).first()
  return c.json(client, 201)
})

// PUT /api/clients/:id - 고객사 수정
clients.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  const { name, industry, website, address, phone, email, status, grade, notes } = body

  if (!name) return c.json({ error: '고객사명은 필수입니다.' }, 400)

  await c.env.DB.prepare(
    `UPDATE clients SET name=?, industry=?, website=?, address=?, phone=?, email=?, status=?, grade=?, notes=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=?`
  ).bind(name, industry || null, website || null, address || null, phone || null, email || null, status, grade, notes || null, id).run()

  const client = await c.env.DB.prepare(`SELECT * FROM clients WHERE id = ?`).bind(id).first()
  if (!client) return c.json({ error: '고객사를 찾을 수 없습니다.' }, 404)
  return c.json(client)
})

// DELETE /api/clients/:id - 고객사 삭제
clients.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  await c.env.DB.prepare(`DELETE FROM clients WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

export default clients
