import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@server/db'
import { generateRandomPassword } from '@server/utils/adminUsers'
import { readJsonBody, verifyBearerHeader } from '@server/vercelAuth'

export const maxDuration = 30
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const auth = verifyBearerHeader(req.headers.get('authorization'))
    if (!auth) {
      return NextResponse.json({ ok: false, error: 'غير مصرح أو انتهت الجلسة' }, { status: 401 })
    }

    const [users, config] = await Promise.all([
      prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.siteConfig.findUnique({ where: { id: 1 } }),
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
      nameAr?: string
      nameEn?: string
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
      const plainPassword = generateRandomPassword(12)
      const passwordHash = await bcrypt.hash(plainPassword, 10)
      await prisma.adminUser.update({
        where: { id: body.id },
        data: { passwordHash },
      })

      return NextResponse.json({
        ok: true,
        password: plainPassword,
        message: 'تم إنشاء كلمة مرور جديدة — احفظها الآن',
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
      return NextResponse.json({ ok: true, message: 'تم حذف الحساب' })
    }

    const normalizedEmail = body.email?.trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return NextResponse.json({ ok: false, error: 'البريد الإلكتروني غير صالح' }, { status: 400 })
    }

    const existing = await prisma.adminUser.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ ok: false, error: 'هذا البريد مستخدم مسبقاً' }, { status: 409 })
    }

    const config = await prisma.siteConfig.findUnique({ where: { id: 1 } })
    if (config && normalizedEmail === config.adminEmail.toLowerCase()) {
      return NextResponse.json(
        { ok: false, error: 'هذا البريد مخصص للمدير الرئيسي' },
        { status: 409 }
      )
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

    return NextResponse.json({
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
    console.error('admin-users POST error', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'فشل العملية' },
      { status: 500 }
    )
  }
}
