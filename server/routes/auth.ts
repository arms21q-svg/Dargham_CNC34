import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../db'
import { generateRandomPassword } from '../utils/adminUsers'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }

    if (!email || !password) {
      res.status(400).json({ ok: false, error: 'البريد وكلمة المرور مطلوبان' })
      return
    }

    const normalizedEmail = email.trim().toLowerCase()

    const adminUser = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    })

    if (adminUser) {
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

    const validEmail = normalizedEmail === config.adminEmail.toLowerCase()
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
