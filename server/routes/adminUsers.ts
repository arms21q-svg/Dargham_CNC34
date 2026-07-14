import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../db'
import { requireAuth, requireSuperAdmin, type AuthRequest } from '../middleware/auth'
import { generateRandomPassword } from '../utils/adminUsers'

const router = Router()

router.get('/', requireAuth, async (_req, res) => {
  try {
    const [users, config] = await Promise.all([
      prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.siteConfig.findUnique({ where: { id: 1 } }),
    ])

    res.json({
      ok: true,
      superAdmin: config
        ? {
            email: config.adminEmail,
            role: 'super',
            nameAr: 'المدير العام',
            nameEn: 'Super Admin',
          }
        : null,
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        nameAr: user.nameAr,
        nameEn: user.nameEn,
        createdAt: user.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('List admin users error:', error)
    res.status(500).json({ ok: false, error: 'فشل تحميل الحسابات' })
  }
})

router.post('/', requireAuth, requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const { email, nameAr = '', nameEn = '' } = req.body as {
      email?: string
      nameAr?: string
      nameEn?: string
    }

    const normalizedEmail = email?.trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      res.status(400).json({ ok: false, error: 'البريد الإلكتروني غير صالح' })
      return
    }

    const existing = await prisma.adminUser.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      res.status(409).json({ ok: false, error: 'هذا البريد مستخدم مسبقاً' })
      return
    }

    const config = await prisma.siteConfig.findUnique({ where: { id: 1 } })
    if (config && normalizedEmail === config.adminEmail.toLowerCase()) {
      res.status(409).json({ ok: false, error: 'هذا البريد مخصص للمدير الرئيسي' })
      return
    }

    const plainPassword = generateRandomPassword(12)
    const passwordHash = await bcrypt.hash(plainPassword, 10)

    const user = await prisma.adminUser.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        nameAr: nameAr.trim() || 'مسؤول',
        nameEn: nameEn.trim() || 'Admin',
        role: 'admin',
      },
    })

    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        nameAr: user.nameAr,
        nameEn: user.nameEn,
        createdAt: user.createdAt.toISOString(),
      },
      password: plainPassword,
      message: 'تم إنشاء الحساب — احفظ كلمة المرور الآن، لن تُعرض مرة أخرى',
    })
  } catch (error) {
    console.error('Create admin user error:', error)
    res.status(500).json({ ok: false, error: 'فشل إنشاء الحساب' })
  }
})

router.post('/:id/reset-password', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const user = await prisma.adminUser.findUnique({ where: { id } })

    if (!user) {
      res.status(404).json({ ok: false, error: 'الحساب غير موجود' })
      return
    }

    if (user.role === 'super') {
      res.status(403).json({ ok: false, error: 'لا يمكن إعادة تعيين كلمة مرور المدير الرئيسي من هنا' })
      return
    }

    const plainPassword = generateRandomPassword(12)
    const passwordHash = await bcrypt.hash(plainPassword, 10)

    await prisma.adminUser.update({
      where: { id },
      data: { passwordHash },
    })

    res.json({
      ok: true,
      password: plainPassword,
      message: 'تم إنشاء كلمة مرور جديدة — احفظها الآن',
    })
  } catch (error) {
    console.error('Reset admin password error:', error)
    res.status(500).json({ ok: false, error: 'فشل إعادة تعيين كلمة المرور' })
  }
})

router.delete('/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const user = await prisma.adminUser.findUnique({ where: { id } })

    if (!user) {
      res.status(404).json({ ok: false, error: 'الحساب غير موجود' })
      return
    }

    if (user.role === 'super') {
      res.status(403).json({ ok: false, error: 'لا يمكن حذف المدير الرئيسي' })
      return
    }

    await prisma.adminUser.delete({ where: { id } })
    res.json({ ok: true, message: 'تم حذف الحساب' })
  } catch (error) {
    console.error('Delete admin user error:', error)
    res.status(500).json({ ok: false, error: 'فشل حذف الحساب' })
  }
})

export { router as adminUsersRouter }
