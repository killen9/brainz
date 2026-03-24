import { Hono } from 'hono'
import { Bindings } from '../types'

const contacts = new Hono<{ Bindings: Bindings }>()

// GET /api/contacts - 연락처 목록
contacts.get('/', async (c) => {
  const { client_id, search } = c.req.query()

  let query = `
    SELECT co.*, c.name as client_name 
    FROM contacts co
    LEFT JOIN clients c ON co.client_id = c.id
    WHERE 1=1
  `
  const params: any[] = []

  if (client_id) {
    query += ` AND co.client_id = ?`
    params.push(parseInt(client_id))
  }
  if (search) {
    query += ` AND (co.name LIKE ? OR co.email LIKE ? OR co.position LIKE ?)`
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  query += ` ORDER BY co.is_primary DESC, co.name ASC`

  const results = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(results.results)
})

// POST /api/contacts - 연락처 생성
contacts.post('/', async (c) => {
  const body = await c.req.json()
  const { client_id, name, position, department, phone, mobile, email, is_primary = 0, notes } = body

  if (!client_id || !name) return c.json({ error: '고객사 ID와 이름은 필수입니다.' }, 400)

  if (is_primary) {
    await c.env.DB.prepare(`UPDATE contacts SET is_primary = 0 WHERE client_id = ?`).bind(client_id).run()
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO contacts (client_id, name, position, department, phone, mobile, email, is_primary, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(client_id, name, position || null, department || null, phone || null, mobile || null, email || null, is_primary ? 1 : 0, notes || null).run()

  const contact = await c.env.DB.prepare(`SELECT co.*, c.name as client_name FROM contacts co LEFT JOIN clients c ON co.client_id = c.id WHERE co.id = ?`).bind(result.meta.last_row_id).first()
  return c.json(contact, 201)
})

// PUT /api/contacts/:id - 연락처 수정
contacts.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  const { client_id, name, position, department, phone, mobile, email, is_primary = 0, notes } = body

  if (!name) return c.json({ error: '이름은 필수입니다.' }, 400)

  if (is_primary && client_id) {
    await c.env.DB.prepare(`UPDATE contacts SET is_primary = 0 WHERE client_id = ? AND id != ?`).bind(client_id, id).run()
  }

  await c.env.DB.prepare(
    `UPDATE contacts SET name=?, position=?, department=?, phone=?, mobile=?, email=?, is_primary=?, notes=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=?`
  ).bind(name, position || null, department || null, phone || null, mobile || null, email || null, is_primary ? 1 : 0, notes || null, id).run()

  const contact = await c.env.DB.prepare(`SELECT co.*, c.name as client_name FROM contacts co LEFT JOIN clients c ON co.client_id = c.id WHERE co.id = ?`).bind(id).first()
  if (!contact) return c.json({ error: '연락처를 찾을 수 없습니다.' }, 404)
  return c.json(contact)
})

// DELETE /api/contacts/:id - 연락처 삭제
contacts.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  await c.env.DB.prepare(`DELETE FROM contacts WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

export default contacts
