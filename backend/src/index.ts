import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt, sign } from 'hono/jwt'
import bcrypt from 'bcryptjs'

type Bindings = {
  DB: D1Database
  JWT_SECRET?: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors())

app.get('/', (c) => c.text('Vacation Manager API is running securely!'))

// --- AUTHENTICATION ---
app.post('/login', async (c) => {
  const { username, password } = await c.req.json()
  const dbUser = await c.env.DB.prepare('SELECT * FROM vacation_users WHERE username = ?').bind(username).first()
  
  if (!dbUser) {
    return c.json({ error: 'User not found' }, 401)
  }

  let valid = false;
  
  // Check if password is a bcrypt hash
  if (typeof dbUser.password === 'string' && dbUser.password.startsWith('$2')) {
    valid = await bcrypt.compare(password, dbUser.password);
  } else {
    // Plain text migration path
    valid = dbUser.password === password;
    if (valid) {
      // Automatically upgrade password to hash
      const hashed = await bcrypt.hash(password, 10);
      await c.env.DB.prepare('UPDATE vacation_users SET password = ? WHERE id = ?')
        .bind(hashed, dbUser.id)
        .run();
    }
  }

  if (!valid) {
    return c.json({ error: 'Invalid password' }, 401)
  }

  const payload = {
    id: dbUser.id,
    username: dbUser.username,
    role: dbUser.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 // 30 days expiration
  }
  
  const secret = c.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod'
  const token = await sign(payload, secret)
  
  // Remove password before sending to frontend
  const { password: _, ...userWithoutPassword } = dbUser as any;
  
  return c.json({ token, user: userWithoutPassword })
})

// Custom middleware to optionally check auth, but we will protect all mutating routes
const authMiddleware = (c: any, next: any) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod',
  });
  return jwtMiddleware(c, next);
}

// --- USERS ---
app.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, name, username, role, annual_quota, email FROM vacation_users').all()
  return c.json(results)
})

// Protected Routes (Require Token) - Applied explicitly to mutating endpoints


app.post('/users', authMiddleware, async (c) => {
  const body = await c.req.json()
  const id = crypto.randomUUID()
  const hashed = await bcrypt.hash(body.password, 10);
  
  await c.env.DB.prepare(
    'INSERT INTO vacation_users (id, name, username, password, role, annual_quota, email) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(id, body.name, body.username, hashed, body.role, body.annualQuota || 14, body.email || null)
    .run()
    
  return c.json({ success: true, id })
})

app.put('/users/:id', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  
  if (body.password) {
    const hashed = await bcrypt.hash(body.password, 10);
    await c.env.DB.prepare('UPDATE vacation_users SET password = ? WHERE id = ?')
      .bind(hashed, id)
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

app.delete('/users/:id', authMiddleware, async (c) => {
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
  const emailBody = `
התקבלה בקשת חופשה חדשה במערכת!

שם העובד: ${body.employeeName}
תעודת זהות: ${body.employeeId}
מתאריך: ${body.startDate}
עד תאריך: ${body.endDate}

לצפייה בבקשה ואישורה, יש להיכנס למערכת:
https://time-off-git-main-avihaidj0-2837s-projects.vercel.app/login
  `.trim()
  
  await sendEmail(ADMIN_EMAIL, `בקשת חופשה חדשה: ${body.employeeName}`, emailBody)

  // Send confirmation to employee
  if (body.employeeEmail) {
    const employeeBody = `
שלום ${body.employeeName},

בקשת החופשה שלך לתאריכים ${body.startDate} - ${body.endDate} הוגשה בהצלחה.
אנו נעדכן אותך במייל ברגע שהמנהל יאשר או ידחה את הבקשה.

בברכה,
מערכת ניהול חופשות - המועצה הדתית עכו
    `.trim()
    await sendEmail(body.employeeEmail, `הגשת בקשת חופשה - ממתין לאישור מנהל`, employeeBody)
  }
  
  return c.json({ success: true, id })
})

app.put('/requests/:id/status', authMiddleware, async (c) => {
  const id = c.req.param('id')
  const { status } = await c.req.json()
  
  await c.env.DB.prepare('UPDATE vacation_requests SET status = ? WHERE id = ?')
    .bind(status, id)
    .run()

  // Fetch request info for email
  const req = await c.env.DB.prepare('SELECT * FROM vacation_requests WHERE id = ?').bind(id).first()
  if (req && req.employee_email) {
    const statusText = status === 'approved' ? 'אושרה' : 'נדחתה';
    const emailBody = `
שלום ${req.employee_name},

בקשת החופשה שלך לתאריכים ${req.start_date} - ${req.end_date} ${statusText} על ידי המנהל.

בברכה,
מערכת ניהול חופשות - המועצה הדתית עכו
    `.trim()
    await sendEmail(req.employee_email as string, `עדכון סטטוס בקשת חופשה: ${statusText}`, emailBody)
  }
    
  return c.json({ success: true })
})

app.delete('/requests/:id', authMiddleware, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM vacation_requests WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// --- ANNOUNCEMENTS ---
app.get('/announcements', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM vacation_announcements ORDER BY created_at DESC').all()
    return c.json(results)
  } catch (e) {
    try {
      await c.env.DB.prepare('CREATE TABLE vacation_announcements (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)').run();
    } catch(e2) {}
    return c.json([])
  }
})

app.post('/announcements', authMiddleware, async (c) => {
  const body = await c.req.json()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  
  await c.env.DB.prepare(
    'INSERT INTO vacation_announcements (id, title, content, created_at) VALUES (?, ?, ?, ?)'
  )
    .bind(id, body.title, body.content, now)
    .run()
    
  return c.json({ success: true, id })
})

app.delete('/announcements/:id', authMiddleware, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM vacation_announcements WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default app
