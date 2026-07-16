import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@server/db'
import {
  allocateUniqueUsername,
  ensureAdminUsernames,
  generateRandomPassword,
  isValidUsername,
  normalizeUsername,
  serializeAdminUser,
  writeAdminAuditLog,
} from '@server/utils/adminUsers'
import { readJsonBody, verifyBearerHeader } from '@server/vercelAuth'

export const maxDuration = 30
export const runtime = 'nodejs'

function roleLabel(role: string) {
  return role === 'super' ? 'مدير رئيسي' : 'مسؤول'
}

export async function GET(req: NextRequest) {
  try {
    const auth = verifyBearerHeader(req.headers.get('authorization'))
    if (!auth) {
      return NextResponse.json({ ok: false, error: 'غير مصرح أو انتهت الجلسة' }, { status: 401 })
    }

    await ensureAdminUsernames()

    const [users, config, auditLogs] = await Promise.all([
      prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.siteConfig.findUnique({ where: { id: 1 } }),
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
    ])

    return NextResponse.json({
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
    console.error('admin-users GET error', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'فشل العملية' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyBearerHeader(req.headers.get('authorization'))
    if (!auth) {
      return NextResponse.json({ ok: false, error: 'غير مصرح أو انتهت الجلسة' }, { status: 401 })
    }

    if (auth.role !== 'super') {
      return NextResponse.json(
        { ok: false, error: 'هذا الإجراء للمدير الرئيسي فقط' },
        { status: 403 }
      )
    }

    const body = await readJsonBody<{
      email?: string
      username?: string
      nameAr?: string
      nameEn?: string
      role?: string
      status?: string
      password?: string
      action?: string
      id?: string
    }>(req)

    if (body.action === 'reset-password' && body.id) {
      const user = await prisma.adminUser.findUnique({ where: { id: body.id } })
      if (!user) {
        return NextResponse.json({ ok: false, error: 'الحساب غير موجود' }, { status: 404 })
      }
      if (user.role === 'super') {
        return NextResponse.json(
          {
            ok: false,
            error: 'لا يمكن إعادة تعيين كلمة مرور المدير الرئيسي من هنا',
          },
          { status: 403 }
        )
      }

      const bcrypt = (await import('bcryptjs')).default
      const customPassword = body.password?.trim()
      const plainPassword =
        customPassword && customPassword.length >= 8
          ? customPassword
          : generateRandomPassword(12)

      if (customPassword && customPassword.length < 8) {
        return NextResponse.json(
          { ok: false, error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
          { status: 400 }
        )
      }

      const passwordHash = await bcrypt.hash(plainPassword, 10)
      const updated = await prisma.adminUser.update({
        where: { id: body.id },
        data: { passwordHash },
      })

      const action = customPassword ? 'user.set_password' : 'user.reset_password'
      await writeAdminAuditLog({
        action,
        actorEmail: auth.email,
        actorRole: auth.role,
        targetUserId: user.id,
        targetEmail: user.email,
        details: customPassword
          ? 'تم تعيين كلمة مرور جديدة يدوياً'
          : 'تم إنشاء كلمة مرور عشوائية جديدة',
      })

      return NextResponse.json({
        ok: true,
        password: plainPassword,
        user: serializeAdminUser(updated),
        message: 'تم إنشاء كلمة مرور جديدة — احفظها الآن، لن تُعرض مرة أخرى',
      })
    }

    if (body.action === 'set-status' && body.id) {
      const user = await prisma.adminUser.findUnique({ where: { id: body.id } })
      if (!user) {
        return NextResponse.json({ ok: false, error: 'الحساب غير موجود' }, { status: 404 })
      }
      if (user.role === 'super') {
        return NextResponse.json(
          { ok: false, error: 'لا يمكن تعطيل المدير الرئيسي' },
          { status: 403 }
        )
      }

      const nextStatus = body.status === 'disabled' ? 'disabled' : 'active'
      const updated = await prisma.adminUser.update({
        where: { id: body.id },
        data: { status: nextStatus },
      })

      await writeAdminAuditLog({
        action: 'user.status_change',
        actorEmail: auth.email,
        actorRole: auth.role,
        targetUserId: user.id,
        targetEmail: user.email,
        details: nextStatus === 'disabled' ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب',
      })

      return NextResponse.json({
        ok: true,
        user: serializeAdminUser(updated),
        message: nextStatus === 'disabled' ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب',
      })
    }

    if (body.action === 'delete' && body.id) {
      const user = await prisma.adminUser.findUnique({ where: { id: body.id } })
      if (!user) {
        return NextResponse.json({ ok: false, error: 'الحساب غير موجود' }, { status: 404 })
      }
      if (user.role === 'super') {
        return NextResponse.json(
          { ok: false, error: 'لا يمكن حذف المدير الرئيسي' },
          { status: 403 }
        )
      }
      await prisma.adminUser.delete({ where: { id: body.id } })
      await writeAdminAuditLog({
        action: 'user.delete',
        actorEmail: auth.email,
        actorRole: auth.role,
        targetUserId: user.id,
        targetEmail: user.email,
        details: `حذف حساب ${roleLabel(user.role)}`,
      })
      return NextResponse.json({ ok: true, message: 'تم حذف الحساب' })
    }

    const normalizedEmail = body.email?.trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return NextResponse.json({ ok: false, error: 'البريد الإلكتروني غير صالح' }, { status: 400 })
    }

    const nameAr = body.nameAr?.trim() || ''
    if (!nameAr) {
      return NextResponse.json({ ok: false, error: 'الاسم مطلوب' }, { status: 400 })
    }

    const preferredUsername = normalizeUsername(body.username || '')
    if (!preferredUsername || !isValidUsername(preferredUsername)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'اسم المستخدم غير صالح (3–32 حرفاً: a-z و0-9 و . _ -)',
        },
        { status: 400 }
      )
    }

    const existingEmail = await prisma.adminUser.findUnique({ where: { email: normalizedEmail } })
    if (existingEmail) {
      return NextResponse.json({ ok: false, error: 'هذا البريد مستخدم مسبقاً' }, { status: 409 })
    }

    const existingUsername = await prisma.adminUser.findUnique({
      where: { username: preferredUsername },
    })
    if (existingUsername) {
      return NextResponse.json({ ok: false, error: 'اسم المستخدم مستخدم مسبقاً' }, { status: 409 })
    }

    const config = await prisma.siteConfig.findUnique({ where: { id: 1 } })
    if (config && normalizedEmail === config.adminEmail.toLowerCase()) {
      return NextResponse.json(
        { ok: false, error: 'هذا البريد مخصص للمدير الرئيسي' },
        { status: 409 }
      )
    }

    const role = body.role === 'super' ? 'admin' : 'admin'
    const bcrypt = (await import('bcryptjs')).default
    const plainPassword = generateRandomPassword(12)
    const passwordHash = await bcrypt.hash(plainPassword, 10)
    const username = await allocateUniqueUsername(preferredUsername)

    const user = await prisma.adminUser.create({
      data: {
        email: normalizedEmail,
        username,
        passwordHash,
        nameAr,
        nameEn: body.nameEn?.trim() || nameAr,
        role,
        status: 'active',
      },
    })

    await writeAdminAuditLog({
      action: 'user.create',
      actorEmail: auth.email,
      actorRole: auth.role,
      targetUserId: user.id,
      targetEmail: user.email,
      details: `إنشاء حساب ${roleLabel(user.role)} — ${user.username}`,
    })

    return NextResponse.json({
      ok: true,
      user: serializeAdminUser(user),
      password: plainPassword,
      message: 'تم إنشاء الحساب — احفظ البيانات الآن، لن تُعرض كلمة المرور مرة أخرى',
    })
  } catch (error) {
    console.error('admin-users POST error', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'فشل العملية' },
      { status: 500 }
    )
  }
}
