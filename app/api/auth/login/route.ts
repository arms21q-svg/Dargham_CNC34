import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@server/db'
import { clientIp, rateLimit, rateLimitResponse } from '@server/rateLimit'
import { getJwtSecret, isJwtConfigured } from '@server/vercelAuth'
import { ensureSuperAdminSeeded } from '@server/utils/adminUsers'

export const maxDuration = 30
export const runtime = 'nodejs'

function cleanLoginId(raw: unknown): string {
  return String(raw ?? '')
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .trim()
    .toLowerCase()
}

function cleanPassword(raw: unknown): string {
  return String(raw ?? '')
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .normalize('NFC')
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(`login:${clientIp(req)}`, 20, 60_000)
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

    const loginId = cleanLoginId(body.email || body.username)
    const password = cleanPassword(body.password)

    if (!loginId || !password) {
      return NextResponse.json(
        { ok: false, error: 'أدخل البريد الإلكتروني وكلمة المرور' },
        { status: 400 }
      )
    }

    if (password.length > 200) {
      return NextResponse.json(
        { ok: false, error: 'كلمة المرور طويلة جداً' },
        { status: 400 }
      )
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

    const issueToken = (payload: {
      email: string
      role: string
      userId: string
      nameAr?: string
      nameEn?: string
    }) => {
      const token = jwt.sign(
        { email: payload.email, role: payload.role, userId: payload.userId },
        JWT_SECRET,
        { expiresIn: '7d' }
      )
      const res = NextResponse.json({
        ok: true,
        token,
        user: {
          email: payload.email,
          role: payload.role,
          nameAr: payload.nameAr ?? 'المدير العام',
          nameEn: payload.nameEn ?? 'Super Admin',
        },
      })
      res.cookies.set(sessionCookie)
      return res
    }

    // 1) Prefer SiteConfig super credentials (source of truth after password resets)
    const config = await prisma.siteConfig.findUnique({ where: { id: 1 } })
    if (config) {
      const configEmail = cleanLoginId(config.adminEmail)
      if (loginId === configEmail) {
        const ok = await bcrypt.compare(password, config.adminPasswordHash)
        if (ok) {
          try {
            await ensureSuperAdminSeeded(configEmail, config.adminPasswordHash)
          } catch (syncErr) {
            console.warn('admin user sync on login skipped', syncErr)
          }
          return issueToken({
            email: config.adminEmail,
            role: 'super',
            userId: 'legacy-super',
          })
        }
        return NextResponse.json(
          { ok: false, error: 'البريد أو كلمة المرور غير صحيحة' },
          { status: 401 }
        )
      }
    }

    // 2) Other admin users (employees)
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
        return issueToken({
          email: adminUser.email,
          role: adminUser.role,
          userId: adminUser.id,
          nameAr: adminUser.nameAr,
          nameEn: adminUser.nameEn,
        })
      }
    }

    if (!config) {
      return NextResponse.json(
        {
          ok: false,
          error: 'قاعدة البيانات غير مهيأة. تواصل مع المطوّر.',
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { ok: false, error: 'البريد أو كلمة المرور غير صحيحة' },
      { status: 401 }
    )
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
