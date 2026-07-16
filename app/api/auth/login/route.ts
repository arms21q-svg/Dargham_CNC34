import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@server/db'
import { clientIp, rateLimit, rateLimitResponse } from '@server/rateLimit'
import { getJwtSecret } from '@server/vercelAuth'

export const maxDuration = 30
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(`login:${clientIp(req)}`, 8, 60_000)
    if (!limited.ok) return rateLimitResponse(limited.retryAfter)

    const bcrypt = (await import('bcryptjs')).default
    const jwt = (await import('jsonwebtoken')).default

    const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string }
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'البريد وكلمة المرور مطلوبان' }, { status: 400 })
    }

    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 200) {
      return NextResponse.json({ ok: false, error: 'بيانات غير صالحة' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const JWT_SECRET = getJwtSecret()

    const adminUser = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    })

    if (adminUser) {
      const validPassword = await bcrypt.compare(password, adminUser.passwordHash)
      if (validPassword) {
        const token = jwt.sign(
          { email: adminUser.email, role: adminUser.role, userId: adminUser.id },
          JWT_SECRET,
          { expiresIn: '7d' }
        )

        return NextResponse.json({
          ok: true,
          token,
          user: {
            email: adminUser.email,
            role: adminUser.role,
            nameAr: adminUser.nameAr,
            nameEn: adminUser.nameEn,
          },
        })
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

    const validEmail = normalizedEmail === config.adminEmail.toLowerCase()
    const validPassword = await bcrypt.compare(password, config.adminPasswordHash)

    if (!validEmail || !validPassword) {
      return NextResponse.json({ ok: false, error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    }

    const token = jwt.sign(
      { email: config.adminEmail, role: 'super', userId: 'legacy-super' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return NextResponse.json({
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
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'خطأ في السيرفر',
      },
      { status: 500 }
    )
  }
}
