import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@server/db'
import { clientIp, rateLimit, rateLimitResponse } from '@server/rateLimit'
import { getJwtSecret, isJwtConfigured } from '@server/vercelAuth'

export const maxDuration = 30
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(`login:${clientIp(req)}`, 8, 60_000)
    if (!limited.ok) return rateLimitResponse(limited.retryAfter)

    const isProd =
      process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
    if (isProd && !isJwtConfigured()) {
      console.warn('[auth] login blocked: JWT_SECRET not configured')
      return NextResponse.json(
        {
          ok: false,
          error: 'إعدادات الأمان غير مكتملة على السيرفر (JWT_SECRET). تواصل مع المطوّر.',
        },
        { status: 503 }
      )
    }

    const bcrypt = (await import('bcryptjs')).default
    const jwt = (await import('jsonwebtoken')).default

    const body = (await req.json().catch(() => ({}))) as {
      email?: string
      username?: string
      password?: string
    }
    const loginId = (body.email || body.username || '').trim().toLowerCase()
    const { password } = body

    if (!loginId || !password) {
      return NextResponse.json(
        { ok: false, error: 'البريد أو اسم المستخدم وكلمة المرور مطلوبان' },
        { status: 400 }
      )
    }

    if (typeof password !== 'string' || password.length > 200) {
      return NextResponse.json({ ok: false, error: 'بيانات غير صالحة' }, { status: 400 })
    }

    const JWT_SECRET = getJwtSecret()
    const isHttps =
      req.headers.get('x-forwarded-proto') === 'https' ||
      req.nextUrl.protocol === 'https:'

    const sessionCookie = {
      name: 'dorgham_admin_session',
      value: '1',
      httpOnly: false,
      path: '/',
      maxAge: 7 * 24 * 3600,
      sameSite: 'lax' as const,
      secure: isHttps,
    }

    const adminUser = await prisma.adminUser.findFirst({
      where: {
        OR: [{ email: loginId }, { username: loginId }],
      },
    })

    if (adminUser) {
      if (adminUser.status === 'disabled') {
        return NextResponse.json(
          { ok: false, error: 'هذا الحساب معطّل. تواصل مع المدير الرئيسي.' },
          { status: 403 }
        )
      }

      const validPassword = await bcrypt.compare(password, adminUser.passwordHash)
      if (validPassword) {
        const token = jwt.sign(
          { email: adminUser.email, role: adminUser.role, userId: adminUser.id },
          JWT_SECRET,
          { expiresIn: '7d' }
        )

        const res = NextResponse.json({
          ok: true,
          token,
          user: {
            email: adminUser.email,
            role: adminUser.role,
            nameAr: adminUser.nameAr,
            nameEn: adminUser.nameEn,
          },
        })
        res.cookies.set(sessionCookie)
        return res
      }
    }

    const config = await prisma.siteConfig.findUnique({ where: { id: 1 } })
    if (!config) {
      return NextResponse.json(
        {
          ok: false,
          error: 'قاعدة البيانات غير مهيأة. شغّل: npm run db:seed',
        },
        { status: 503 }
      )
    }

    const validEmail = loginId === config.adminEmail.toLowerCase()
    const validPassword = await bcrypt.compare(password, config.adminPasswordHash)

    if (!validEmail || !validPassword) {
      return NextResponse.json({ ok: false, error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    }

    const token = jwt.sign(
      { email: config.adminEmail, role: 'super', userId: 'legacy-super' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const res = NextResponse.json({
      ok: true,
      token,
      user: {
        email: config.adminEmail,
        role: 'super',
        nameAr: 'المدير العام',
        nameEn: 'Super Admin',
      },
    })
    res.cookies.set(sessionCookie)
    return res
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'خطأ في السيرفر',
      },
      { status: 500 }
    )
  }
}
