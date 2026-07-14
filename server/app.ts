import './loadEnv.js'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import { authRouter } from './routes/auth'
import { siteDataRouter } from './routes/siteData'
import { aiRouter } from './routes/ai'
import { adminUsersRouter } from './routes/adminUsers'

const app = express()
const isProd = process.env.NODE_ENV === 'production'

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : []

app.use(compression({ threshold: 1024 }))
app.use(
  cors({
    // Same-origin on Vercel works; when unset allow all (needed for admin publish)
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  })
)
app.use(express.json({ limit: '20mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'dorgham-cnc-api',
    env: isProd ? 'production' : 'development',
    ai: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    },
  })
})

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'dorgham-cnc-api', docs: '/api/health' })
})

app.use('/api/auth', authRouter)
app.use('/api/site-data', siteDataRouter)
app.use('/api/ai', aiRouter)
app.use('/api/admin-users', adminUsersRouter)

// Legacy path — point admins to authenticated API (Vercel has no PHP)
app.post('/api/save-data', (_req, res) => {
  res.status(410).json({
    ok: false,
    error: 'استخدم PUT /api/site-data بعد تسجيل الدخول',
  })
})

app.post('/api/save-data.php', (_req, res) => {
  res.status(410).json({
    ok: false,
    error: 'الاستضافة على Vercel لا تدعم PHP — سجّل الدخول عبر الـ API ثم انشر',
  })
})

export default app
