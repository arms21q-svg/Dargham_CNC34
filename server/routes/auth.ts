import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../db'
import { rateLimit } from '../rateLimit'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

function expressClientIp(req: { headers: Record<string, unknown>; ip?: string }): string {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0]?.trim() || 'unknown'
  if (Array.isArray(xf) && xf[0]) return String(xf[0]).split(',')[0]?.trim() || 'unknown'
  return req.ip || 'unknown'
}

router.post('/login', async (req, res) => {
  try {
    const limited = rateLimit(`express-login:${expressClientIp(req)}`, 8, 60_000)
    if (!limited.ok) {
      res.setHeader('Retry-After', String(limited.retryAfter))
      res.status(429).json({ ok: false, error: 'Too many requests. Please try again later.' })
      return
    }

    const body = req.body as { email?: string; username?: string; password?: string }
    const loginId = (body.email || body.username || '').trim().toLowerCase()
    const { password } = body

    if (!loginId || !password) {
      res.status(400).json({ ok: false, error: 'البريد أو اسم المستخدم وكلمة المرور مطلوبان' })
      return
    }

    const adminUser = await prisma.adminUser.findFirst({
      where: {
        OR: [{ email: loginId }, { username: loginId }],
      },
    })

    if (adminUser) {
      if (adminUser.status === 'disabled') {
        res.status(403).json({
          ok: false,
          error: 'هذا الحساب معطّل. تواصل مع المدير الرئيسي.',
        })
        return
      }

      const validPassword = await bcrypt.compare(password, adminUser.passwordHash)
      if (!validPassword) {
        res.status(401).json({ ok: false, error: 'بيانات الدخول غير صحيحة' })
        return
      }

      const token = jwt.sign(
        { email: adminUser.email, role: adminUser.role, userId: adminUser.id },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      res.json({
        ok: true,
        token,
        user: {
          email: adminUser.email,
          role: adminUser.role,
          nameAr: adminUser.nameAr,
          nameEn: adminUser.nameEn,
        },
      })
      return
    }

    const config = await prisma.siteConfig.findUnique({ where: { id: 1 } })
    if (!config) {
      res.status(503).json({ ok: false, error: 'قاعدة البيانات غير مهيأة. شغّل: npm run db:seed' })
      return
    }

    const validEmail = loginId === config.adminEmail.toLowerCase()
    const validPassword = await bcrypt.compare(password, config.adminPasswordHash)

    if (!validEmail || !validPassword) {
      res.status(401).json({ ok: false, error: 'بيانات الدخول غير صحيحة' })
      return
    }

    const token = jwt.sign(
      { email: config.adminEmail, role: 'super', userId: 'legacy-super' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      ok: true,
      token,
      user: {
        email: config.adminEmail,
        role: 'super',
        nameAr: 'المدير العام',
        nameEn: 'Super Admin',
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ ok: false, error: 'خطأ في السيرفر' })
  }
})

export { router as authRouter, JWT_SECRET }
