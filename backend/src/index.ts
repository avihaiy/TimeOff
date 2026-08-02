import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// Allow CORS from any origin for simplicity
app.use('/*', cors())

app.get('/', (c) => c.text('Vacation Manager API is running!'))

// --- USERS ---
app.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM vacation_users').all()
  return c.json(results)
})

app.post('/users', async (c) => {
  const body = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO vacation_users (id, name, username, password, role, annual_quota) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(id, body.name, body.username, body.password, body.role, body.annualQuota || 14)
    .run()
    
  return c.json({ success: true, id })
})

app.put('/users/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  
  if (body.password) {
    await c.env.DB.prepare('UPDATE vacation_users SET password = ? WHERE id = ?')
      .bind(body.password, id)
      .run()
  } else {
    await c.env.DB.prepare(
      'UPDATE vacation_users SET name = ?, username = ?, annual_quota = ? WHERE id = ?'
    )
      .bind(body.name, body.username, body.annualQuota, id)
      .run()
  }
  
  return c.json({ success: true })
})

app.delete('/users/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM vacation_users WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// --- REQUESTS ---
app.get('/requests', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM vacation_requests').all()
  return c.json(results)
})

app.post('/requests', async (c) => {
  const body = await c.req.json()
  const id = crypto.randomUUID()
  
  await c.env.DB.prepare(
    'INSERT INTO vacation_requests (id, user_id, employee_name, employee_id, start_date, end_date, signature, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(
      id,
      body.userId || null,
      body.employeeName,
      body.employeeId,
      body.startDate,
      body.endDate,
      body.signature || null,
      body.status || 'pending'
    )
    .run()
    
  return c.json({ success: true, id })
})

app.put('/requests/:id/status', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  
  await c.env.DB.prepare('UPDATE vacation_requests SET status = ? WHERE id = ?')
    .bind(body.status, id)
    .run()
    
  return c.json({ success: true })
})

app.delete('/requests/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM vacation_requests WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// --- ANNOUNCEMENTS ---
app.get('/announcements', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM vacation_announcements ORDER BY created_at DESC').all()
  return c.json(results)
})

app.post('/announcements', async (c) => {
  const body = await c.req.json()
  const id = crypto.randomUUID()
  
  await c.env.DB.prepare(
    'INSERT INTO vacation_announcements (id, title, content) VALUES (?, ?, ?)'
  )
    .bind(id, body.title, body.content)
    .run()
    
  return c.json({ success: true, id })
})

app.delete('/announcements/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM vacation_announcements WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default app
