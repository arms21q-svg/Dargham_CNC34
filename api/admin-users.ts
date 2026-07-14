import type { VercelRequest, VercelResponse } from '@vercel/node'
import '../server/loadEnv.js'
import { prisma } from '../server/db.js'
import { generateRandomPassword } from '../server/utils/adminUsers.js'
import { parseJsonBody, verifyBearer } from '../server/vercelAuth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = verifyBearer(req)
    if (!auth) {
      res.status(401).json({ ok: false, error: 'غير مصرح أو انتهت الجلسة' })
      return
    }

    if (req.method === 'GET') {
      const [users, config] = await Promise.all([
        prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.siteConfig.findUnique({ where: { id: 1 } }),
      ])

      res.status(200).json({
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
      return
    }

    if (req.method === 'POST') {
      if (auth.role !== 'super') {
        res.status(403).json({ ok: false, error: 'هذا الإجراء للمدير الرئيسي فقط' })
        return
      }

      const body = parseJsonBody<{
        email?: string
        nameAr?: string
        nameEn?: string
        action?: string
        id?: string
      }>(req)

      // Nested actions without dynamic Vercel routes
      if (body.action === 'reset-password' && body.id) {
        const user = await prisma.adminUser.findUnique({ where: { id: body.id } })
        if (!user) {
          res.status(404).json({ ok: false, error: 'الحساب غير موجود' })
          return
        }
        if (user.role === 'super') {
          res.status(403).json({
            ok: false,
            error: 'لا يمكن إعادة تعيين كلمة مرور المدير الرئيسي من هنا',
          })
          return
        }

        const bcrypt = (await import('bcryptjs')).default
        const plainPassword = generateRandomPassword(12)
        const passwordHash = await bcrypt.hash(plainPassword, 10)
        await prisma.adminUser.update({
          where: { id: body.id },
          data: { passwordHash },
        })

        res.status(200).json({
          ok: true,
          password: plainPassword,
          message: 'تم إنشاء كلمة مرور جديدة — احفظها الآن',
        })
        return
      }

      if (body.action === 'delete' && body.id) {
        const user = await prisma.adminUser.findUnique({ where: { id: body.id } })
        if (!user) {
          res.status(404).json({ ok: false, error: 'الحساب غير موجود' })
          return
        }
        if (user.role === 'super') {
          res.status(403).json({ ok: false, error: 'لا يمكن حذف المدير الرئيسي' })
          return
        }
        await prisma.adminUser.delete({ where: { id: body.id } })
        res.status(200).json({ ok: true, message: 'تم حذف الحساب' })
        return
      }

      const normalizedEmail = body.email?.trim().toLowerCase()
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

      const bcrypt = (await import('bcryptjs')).default
      const plainPassword = generateRandomPassword(12)
      const passwordHash = await bcrypt.hash(plainPassword, 10)

      const user = await prisma.adminUser.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          nameAr: body.nameAr?.trim() || 'مسؤول',
          nameEn: body.nameEn?.trim() || 'Admin',
          role: 'admin',
        },
      })

      res.status(200).json({
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
      return
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('admin-users error', error)
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'فشل العملية',
    })
  }
}
