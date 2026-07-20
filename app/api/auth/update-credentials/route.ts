import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@server/db'
import { clientIp, rateLimit, rateLimitResponse } from '@server/rateLimit'
import { isJwtConfigured, verifyBearerHeader } from '@server/vercelAuth'
import { syncSuperAdminFromConfig } from '@server/utils/adminUsers'

export const maxDuration = 30
export const runtime = 'nodejs'

/** Super-admin only: update login email/password immediately (not via site-data draft). */
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(`cred:${clientIp(req)}`, 10, 60_000)
    if (!limited.ok) return rateLimitResponse(limited.retryAfter)

    const isProd =
      process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
    if (isProd && !isJwtConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'إعدادات الأمان غير مكتملة على السيرفر' },
        { status: 503 }
      )
    }

    const auth = verifyBearerHeader(req.headers.get('authorization'))
    if (!auth) {
      return NextResponse.json({ ok: false, error: 'غير مصرح أو انتهت الجلسة' }, { status: 401 })
    }
    if (auth.role !== 'super') {
      return NextResponse.json(
        { ok: false, error: 'تعديل بيانات الدخول متاح للمدير الرئيسي فقط' },
        { status: 403 }
      )
    }

    const body = (await req.json().catch(() => ({}))) as {
      email?: string
      password?: string
    }

    const email = (body.email || '').trim().toLowerCase()
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !email.includes('@') || email.length > 190) {
      return NextResponse.json({ ok: false, error: 'أدخل بريداً إلكترونياً صالحاً' }, { status: 400 })
    }

    if (password && (password.length < 8 || password.length > 200)) {
      return NextResponse.json(
        { ok: false, error: 'كلمة المرور يجب أن تكون بين 8 و 200 حرفاً' },
        { status: 400 }
      )
    }

    const existing = await prisma.siteConfig.findUnique({ where: { id: 1 } })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'قاعدة البيانات غير مهيأة' }, { status: 404 })
    }

    const bcrypt = (await import('bcryptjs')).default
    const data: { adminEmail: string; adminPasswordHash?: string } = { adminEmail: email }

    if (password) {
      data.adminPasswordHash = await bcrypt.hash(password, 10)
    }

    await prisma.siteConfig.update({
      where: { id: 1 },
      data,
    })

    await syncSuperAdminFromConfig(email, password || undefined)

    return NextResponse.json({
      ok: true,
      message: password
        ? 'تم تحديث البريد وكلمة المرور. سجّل الدخول مجدداً بالبيانات الجديدة.'
        : 'تم تحديث البريد. سجّل الدخول مجدداً إن لزم.',
      email,
    })
  } catch (error) {
    console.error('update-credentials error', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'فشل تحديث بيانات الدخول',
      },
      { status: 500 }
    )
  }
}
