import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@server/db'
import {
  configFromSiteData,
  managerFromSiteData,
  productFromSiteData,
  toSiteData,
} from '@server/mappers'
import { verifyBearerHeader } from '@server/vercelAuth'
import type { SiteData } from '@/types/siteData'

export const maxDuration = 30
export const runtime = 'nodejs'

const MAX_BODY_CHARS = 3_500_000

async function fetchSiteData() {
  const [config, products, managers] = await Promise.all([
    prisma.siteConfig.findUnique({ where: { id: 1 } }),
    prisma.product.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.manager.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])
  if (!config) return null
  return toSiteData(config, products, managers)
}

async function parseBody(req: NextRequest): Promise<SiteData> {
  const text = await req.text()
  if (!text) throw new Error('جسم الطلب فارغ')
  if (text.length > MAX_BODY_CHARS) {
    throw new Error(
      'حجم البيانات كبير جداً. استخدم روابط صور بدلاً من رفع صور كبيرة داخل الصفحة'
    )
  }
  return JSON.parse(text) as SiteData
}

function assertSiteData(body: SiteData) {
  if (!body?.home || !body?.contact || !body?.settings) {
    throw new Error('بيانات غير مكتملة (home/contact/settings)')
  }
  if (!Array.isArray(body.products)) body.products = []
  if (!Array.isArray(body.managers)) body.managers = []

  if (!body.settings.adminEmail?.trim()) {
    throw new Error('بريد المدير مطلوب')
  }

  for (const [i, p] of body.products.entries()) {
    if (!p?.id) throw new Error(`منتج #${i + 1} بدون معرّف`)
    if (!p.title?.ar && !p.title?.en) throw new Error(`منتج #${i + 1} بدون عنوان`)
    if (typeof p.image === 'string' && p.image.startsWith('data:') && p.image.length > 900_000) {
      throw new Error(`صورة المنتج "${p.title?.ar || p.id}" كبيرة جداً. ارفعها كرابط URL`)
    }
  }
}

function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'فشل حفظ البيانات'

  const prismaError = error as Error & { code?: string }
  if (prismaError.code === 'P2028') {
    return 'انتهت مهلة المعاملة مع قاعدة البيانات — أعد المحاولة'
  }
  if (prismaError.code === 'P2034') {
    return 'تعارض في قاعدة البيانات — أعد المحاولة'
  }
  if (prismaError.message.includes('prepared statement') || prismaError.message.includes('pgbouncer')) {
    return 'فشل الاتصال بقاعدة البيانات (PgBouncer) — أعد المحاولة'
  }
  return prismaError.message || 'فشل حفظ البيانات'
}

export async function GET() {
  try {
    const data = await fetchSiteData()
    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'لا توجد بيانات. شغّل: npm run db:seed' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { ok: true, data },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    console.error('site-data GET error', error)
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!verifyBearerHeader(req.headers.get('authorization'))) {
      return NextResponse.json({ ok: false, error: 'غير مصرح أو انتهت الجلسة' }, { status: 401 })
    }

    const body = await parseBody(req)
    assertSiteData(body)

    const existing = await prisma.siteConfig.findUnique({ where: { id: 1 } })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'قاعدة البيانات غير مهيأة' }, { status: 404 })
    }

    const bcrypt = (await import('bcryptjs')).default
    let passwordHash = existing.adminPasswordHash
    const nextPassword = body.settings.adminPassword?.trim()
    if (nextPassword) {
      passwordHash = await bcrypt.hash(nextPassword, 10)
    }

    const configData = configFromSiteData(body, passwordHash)
    const products = body.products.map((p, i) => productFromSiteData(p, i))
    const managers = body.managers.map((m, i) => managerFromSiteData(m, i))

    try {
      await prisma.siteConfig.update({
        where: { id: 1 },
        data: {
          ...configData,
          floatLinks: configData.floatLinks as Prisma.InputJsonValue,
        },
      })
      await prisma.product.deleteMany()
      if (products.length > 0) {
        await prisma.product.createMany({ data: products })
      }
      await prisma.manager.deleteMany()
      if (managers.length > 0) {
        await prisma.manager.createMany({ data: managers })
      }
    } catch (dbError) {
      console.error('site-data DB write failed', dbError)
      throw dbError
    }

    try {
      const { syncSuperAdminFromConfig } = await import('@server/utils/adminUsers')
      await syncSuperAdminFromConfig(body.settings.adminEmail, nextPassword || undefined)
    } catch (syncErr) {
      console.error('super admin sync skipped', syncErr)
    }

    const data = await fetchSiteData()
    return NextResponse.json({ ok: true, message: 'تم النشر على قاعدة البيانات', data })
  } catch (error) {
    console.error('site-data PUT error', error)
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 500 })
  }
}
