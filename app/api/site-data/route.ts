import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@server/db'
import {
  configFromSiteData,
  managerFromSiteData,
  productFromSiteData,
  toSiteData,
} from '@server/mappers'
import { scheduleProductImageReindex } from '@server/imageIndex'
import { verifyBearerHeader } from '@server/vercelAuth'
import type { SiteData } from '@/types/siteData'

export const maxDuration = 30
export const runtime = 'nodejs'

const MAX_BODY_CHARS = 3_500_000

function sanitizePublicSiteData(data: SiteData): SiteData {
  return {
    ...data,
    settings: {
      ...data.settings,
      adminEmail: '',
      adminPassword: '',
    },
  }
}

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
      { ok: true, data: sanitizePublicSiteData(data) },
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
    const auth = verifyBearerHeader(req.headers.get('authorization'))
    if (!auth) {
      return NextResponse.json({ ok: false, error: 'غير مصرح أو انتهت الجلسة' }, { status: 401 })
    }

    const body = await parseBody(req)
    assertSiteData(body)

    const existing = await prisma.siteConfig.findUnique({ where: { id: 1 } })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'قاعدة البيانات غير مهيأة' }, { status: 404 })
    }

    const isSuper = auth.role === 'super'
    const bcrypt = (await import('bcryptjs')).default

    // Only super-admin may change login credentials via site-data publish
    let adminEmail = existing.adminEmail
    let passwordHash = existing.adminPasswordHash
    let nextPassword: string | undefined

    if (isSuper) {
      const requestedEmail = body.settings.adminEmail?.trim().toLowerCase()
      if (requestedEmail) adminEmail = requestedEmail
      nextPassword = body.settings.adminPassword?.trim() || undefined
      if (nextPassword) {
        passwordHash = await bcrypt.hash(nextPassword, 10)
      }
    }

    body.settings.adminEmail = adminEmail
    body.settings.adminPassword = ''

    const configData = configFromSiteData(body, passwordHash)

    const previousProducts = await prisma.product.findMany({
      select: {
        id: true,
        image: true,
        imageHash: true,
        imageVector: true,
        indexedAt: true,
      },
    })
    const prevById = new Map(previousProducts.map((p) => [p.id, p]))

    const products = body.products.map((p, i) => {
      const base = productFromSiteData(p, i)
      const prev = prevById.get(base.id)
      if (
        prev &&
        prev.image === base.image &&
        prev.imageHash &&
        prev.imageVector &&
        prev.indexedAt
      ) {
        return {
          ...base,
          imageHash: prev.imageHash,
          imageVector: prev.imageVector as Prisma.InputJsonValue,
          indexedAt: prev.indexedAt,
        }
      }
      return base
    })
    const managers = body.managers.map((m, i) => managerFromSiteData(m, i))
    const needsReindex = products.filter((p) => !('imageHash' in p && p.imageHash)).map((p) => p.id)

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

    if (isSuper) {
      try {
        const { syncSuperAdminFromConfig } = await import('@server/utils/adminUsers')
        await syncSuperAdminFromConfig(adminEmail, nextPassword)
      } catch (syncErr) {
        console.error('super admin sync skipped', syncErr)
      }
    }

    // Reindex only products missing visual features (unchanged images keep vectors)
    scheduleProductImageReindex(needsReindex.length ? needsReindex : undefined)

    const data = await fetchSiteData()
    return NextResponse.json({
      ok: true,
      message: 'تم النشر على قاعدة البيانات',
      data: data ? sanitizePublicSiteData(data) : data,
    })
  } catch (error) {
    console.error('site-data PUT error', error)
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 500 })
  }
}
