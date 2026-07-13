import './loadEnv.js'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import { authRouter } from './routes/auth.js'
import { siteDataRouter } from './routes/siteData.js'
import { aiRouter } from './routes/ai.js'
import { adminUsersRouter } from './routes/adminUsers.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001
const isProd = process.env.NODE_ENV === 'production'

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173']

app.use(compression({ threshold: 1024 }))
app.use(
  cors({
    origin: isProd ? corsOrigins : true,
    credentials: true,
  })
)
app.use(express.json({ limit: '20mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'dorgham-cnc-api', env: isProd ? 'production' : 'development' })
})

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'dorgham-cnc-api', docs: '/api/health' })
})

app.use('/api/auth', authRouter)
app.use('/api/site-data', siteDataRouter)
app.use('/api/ai', aiRouter)
app.use('/api/admin-users', adminUsersRouter)

// توافق مع النظام القديم
app.post('/api/save-data', async (_req, res) => {
  res.status(410).json({
    ok: false,
    error: 'استخدم PUT /api/site-data مع تسجيل الدخول',
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`)
})
