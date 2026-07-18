import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../db'
import { requireAuth, requireSuperAdmin, type AuthRequest } from '../middleware/auth'
import {
  allocateUniqueUsername,
  ensureAdminUsernames,
  generateRandomPassword,
  normalizeUsername,
  serializeAdminUser,
  usernameFromEmail,
  writeAdminAuditLog,
} from '../utils/adminUsers'

const router = Router()

router.get('/', requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    await ensureAdminUsernames()
    const [users, config, auditLogs] = await Promise.all([
      prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.siteConfig.findUnique({ where: { id: 1 } }),
      prisma.adminAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
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
      users: users.map(serializeAdminUser),
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actorEmail: log.actorEmail,
        actorRole: log.actorRole,
        targetUserId: log.targetUserId,
        targetEmail: log.targetEmail,
        details: log.details,
        createdAt: log.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('List admin users error:', error)
    res.status(500).json({ ok: false, error: 'فشل تحميل الحسابات' })
  }
})

router.post('/', requireAuth, requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const { email, nameAr = '', nameEn = '', username, password, jobTitle } = req.body as {
      email?: string
      nameAr?: string
      nameEn?: string
      username?: string
      password?: string
      jobTitle?: string
    }

    const normalizedEmail = email?.trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      res.status(400).json({ ok: false, error: 'البريد الإلكتروني غير صالح' })
      return
    }

    const name = nameAr.trim()
    if (!name) {
      res.status(400).json({ ok: false, error: 'الاسم مطلوب' })
      return
    }

    const title = jobTitle?.trim() || 'مسؤول لوحة التحكم'
    const preferredUsername = normalizeUsername(username || usernameFromEmail(normalizedEmail))

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

    const customPassword = password?.trim()
    if (customPassword && customPassword.length < 8) {
      res.status(400).json({ ok: false, error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
      return
    }

    const plainPassword = customPassword || generateRandomPassword(12)
    const passwordHash = await bcrypt.hash(plainPassword, 10)
    const uniqueUsername = await allocateUniqueUsername(preferredUsername)

    const user = await prisma.adminUser.create({
      data: {
        email: normalizedEmail,
        username: uniqueUsername,
        passwordHash,
        nameAr: name,
        nameEn: nameEn.trim() || name,
        role: 'admin',
        jobTitle: title,
        status: 'active',
      },
    })

    await writeAdminAuditLog({
      action: 'user.create',
      actorEmail: req.user?.email ?? '',
      actorRole: req.user?.role ?? '',
      targetUserId: user.id,
      targetEmail: user.email,
      details: `إنشاء موظف — ${title} — ${user.username}`,
    })

    res.json({
      ok: true,
      user: serializeAdminUser(user),
      password: plainPassword,
      message: 'تم إنشاء الحساب — احفظ كلمة المرور الآن، لن تُعرض مرة أخرى',
    })
  } catch (error) {
    console.error('Create admin user error:', error)
    res.status(500).json({ ok: false, error: 'فشل إنشاء الحساب' })
  }
})

router.post('/:id/reset-password', requireAuth, requireSuperAdmin, async (req: AuthRequest, res) => {
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

    const customPassword =
      typeof req.body?.password === 'string' ? req.body.password.trim() : ''
    if (customPassword && customPassword.length < 8) {
      res.status(400).json({ ok: false, error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
      return
    }

    const plainPassword = customPassword || generateRandomPassword(12)
    const passwordHash = await bcrypt.hash(plainPassword, 10)

    const updated = await prisma.adminUser.update({
      where: { id },
      data: { passwordHash },
    })

    await writeAdminAuditLog({
      action: customPassword ? 'user.set_password' : 'user.reset_password',
      actorEmail: req.user?.email ?? '',
      actorRole: req.user?.role ?? '',
      targetUserId: user.id,
      targetEmail: user.email,
      details: customPassword
        ? 'تم تعيين كلمة مرور جديدة يدوياً'
        : 'تم إنشاء كلمة مرور عشوائية جديدة',
    })

    res.json({
      ok: true,
      password: plainPassword,
      user: serializeAdminUser(updated),
      message: 'تم إنشاء كلمة مرور جديدة — احفظها الآن',
    })
  } catch (error) {
    console.error('Reset admin password error:', error)
    res.status(500).json({ ok: false, error: 'فشل إعادة تعيين كلمة المرور' })
  }
})

router.delete('/:id', requireAuth, requireSuperAdmin, async (req: AuthRequest, res) => {
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
    await writeAdminAuditLog({
      action: 'user.delete',
      actorEmail: req.user?.email ?? '',
      actorRole: req.user?.role ?? '',
      targetUserId: user.id,
      targetEmail: user.email,
      details: 'حذف حساب مسؤول',
    })
    res.json({ ok: true, message: 'تم حذف الحساب' })
  } catch (error) {
    console.error('Delete admin user error:', error)
    res.status(500).json({ ok: false, error: 'فشل حذف الحساب' })
  }
})

export { router as adminUsersRouter }
