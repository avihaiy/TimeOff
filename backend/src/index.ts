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
    'INSERT INTO vacation_users (id, name, username, password, role, annual_quota, email) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(id, body.name, body.username, body.password, body.role, body.annualQuota || 14, body.email || null)
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
      'UPDATE vacation_users SET name = ?, username = ?, annual_quota = ?, role = ?, email = ? WHERE id = ?'
    )
      .bind(body.name, body.username, body.annualQuota, body.role, body.email || null, id)
      .run()
  }
  
  return c.json({ success: true })
})

app.delete('/users/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM vacation_users WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// --- EMAIL HELPER ---
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbylBtZF7Vr1gyKmo_vuau8PWbgruyEwh0roIMmHzB_DEuaeiksTRHa7zXQtphMO7MPf/exec'
const ADMIN_EMAIL = 'mdakko.vacations@gmail.com'

async function sendEmail(to: string, subject: string, body: string) {
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body })
    })
  } catch (e) {
    console.error('Failed to send email:', e)
  }
}

// --- REQUESTS ---
app.get('/requests', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM vacation_requests').all()
  return c.json(results)
})

app.post('/requests', async (c) => {
  const body = await c.req.json()
  const id = crypto.randomUUID()
  
  await c.env.DB.prepare(
    'INSERT INTO vacation_requests (id, user_id, employee_name, employee_id, start_date, end_date, signature, status, employee_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(
      id,
      body.userId || null,
      body.employeeName,
      body.employeeId,
      body.startDate,
      body.endDate,
      body.signature || null,
      body.status || 'pending',
      body.employeeEmail || null
    )
    .run()
    
  // Send email to admin
  const htmlBody = `
    <div dir="rtl" style="font-family: Arial, sans-serif;">
      <h2>בקשת חופשה חדשה ממתינה לאישור 🏖️</h2>
      <p><strong>שם העובד:</strong> ${body.employeeName}</p>
      <p><strong>תאריך התחלה:</strong> ${body.startDate}</p>
      <p><strong>תאריך סיום:</strong> ${body.endDate}</p>
      <p>היכנס למערכת כדי לאשר או לדחות את הבקשה.</p>
    </div>
  `
  // Send email to default admin
  await sendEmail(ADMIN_EMAIL, 'בקשת חופשה חדשה - מועצה דתית', htmlBody)
  
  // Send email to any other admins that have an email configured
  const { results: admins } = await c.env.DB.prepare('SELECT email FROM vacation_users WHERE role = "admin" AND email IS NOT NULL').all()
  for (const admin of admins) {
    if (admin.email && admin.email !== ADMIN_EMAIL) {
      await sendEmail(admin.email as string, 'בקשת חופשה חדשה - מועצה דתית', htmlBody)
    }
  }
    
  return c.json({ success: true, id })
})

app.put('/requests/:id/status', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  
  await c.env.DB.prepare('UPDATE vacation_requests SET status = ? WHERE id = ?')
    .bind(body.status, id)
    .run()
    
  // Send email to employee if email exists
  const reqInfo = await c.env.DB.prepare('SELECT * FROM vacation_requests WHERE id = ?').bind(id).first()
  if (reqInfo && reqInfo.employee_email) {
    const statusHebrew = body.status === 'approved' ? 'אושרה' : 'נדחתה';
    const emailBody = `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>עדכון סטטוס בקשת חופשה 📅</h2>
        <p>שלום ${reqInfo.employee_name},</p>
        <p>בקשת החופשה שלך לתאריכים ${reqInfo.start_date} עד ${reqInfo.end_date} <strong>${statusHebrew}</strong>.</p>
        <p>בברכה,</p>
        <p>המועצה הדתית</p>
      </div>
    `
    await sendEmail(reqInfo.employee_email as string, `עדכון בקשת חופשה - ${statusHebrew}`, emailBody)
  }
    
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
