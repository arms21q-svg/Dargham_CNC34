import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@server/db'
import { fetchSiteDataFresh, getCachedPublicCatalogData, getCachedSiteData } from '@server/cachedSiteData'
import { lightPublicSiteData } from '@server/lightSiteData'
import { scheduleProductImageReindex, ensureProductImageIndex } from '@server/imageIndex'
import { syncSiteDataToDb } from '@server/syncSiteData'
import { verifyBearerHeader } from '@server/vercelAuth'
import type { SiteData } from '@/types/siteData'

export const maxDuration = 60
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

/** Admin API may read login email; password is never exposed to the client. */
function sanitizeAdminSiteData(data: SiteData): SiteData {
  return {
    ...data,
    settings: {
      ...data.settings,
      adminPassword: '',
    },
  }
}

async function fetchSiteData(fresh = false, publicOnly = false) {
  if (fresh) return fetchSiteDataFresh()
  return publicOnly ? getCachedPublicCatalogData() : getCachedSiteData()
}

async function parseBody(req: NextRequest): Promise<SiteData> {
  const text = await req.text()
  if (!text) throw new Error('جسم الطلب فارغ')
  if (text.length > MAX_BODY_CHARS) {
    throw new Error(
      'حجم البيانات كبير جداً. قلّل عدد الصور أو استخدم صوراً أصغر قبل النشر'
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
      throw new Error(`صورة المنتج "${p.title?.ar || p.id}" كبيرة جداً بعد الضغط`)
    }
  }
}

function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'فشل حفظ البيانات'
  }

  const { code, message } = error as Error & { code?: string }

  if (code === 'P1001' || message.includes("Can't reach database server")) {
    return 'تعذر الاتصال بقاعدة البيانات — تحقق من DATABASE_URL أو حالة Supabase'
  }
  if (code === 'P2028') {
    return 'انتهت مهلة حفظ البيانات — انشر دفعات أصغر (20–30 عمل) أو استخدم صوراً أقل حجماً'
  }
  if (code === 'P2034') {
    return 'تعارض في قاعدة البيانات — أعد المحاولة'
  }
  if (message.includes('prepared statement') || message.includes('pgbouncer')) {
    return 'فشل الاتصال بقاعدة البيانات (PgBouncer) — أعد المحاولة'
  }

  return message || 'فشل حفظ البيانات'
}

export async function GET(req: NextRequest) {
  try {
    const isAdmin = Boolean(verifyBearerHeader(req.headers.get('authorization')))
    const fresh = req.nextUrl.searchParams.get('fresh') === '1'
    const data = await fetchSiteData(fresh, !isAdmin)

    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'لا توجد بيانات. شغّل: npm run db:seed' },
        { status: 404 }
      )
    }

    const payload = isAdmin ? sanitizeAdminSiteData(data) : lightPublicSiteData(sanitizePublicSiteData(data))

    return NextResponse.json(
      { ok: true, data: payload },
      {
        headers: {
          'Cache-Control': isAdmin
            ? 'no-store, no-cache, must-revalidate'
            : 'public, s-maxage=60, stale-while-revalidate=300',
          Vary: 'Authorization',
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

    // Login credentials change only via /api/auth/update-credentials — never from publish.
    const adminEmail = existing.adminEmail
    const passwordHash = existing.adminPasswordHash

    body.settings.adminEmail = adminEmail
    body.settings.adminPassword = ''
    body.updatedAt = Date.now()

    const sync = await syncSiteDataToDb(body, passwordHash)

    const inlineReindexLimit = 12
    if (sync.needsReindex.length > 0) {
      if (sync.needsReindex.length <= inlineReindexLimit && sync.changedProducts <= 20) {
        try {
          const indexResult = await ensureProductImageIndex({
            forceIds: sync.needsReindex,
            limit: inlineReindexLimit,
            deadline: Date.now() + 20_000,
          })
          console.info('[publish] image index', indexResult)
        } catch (indexErr) {
          console.warn('[publish] inline index failed — scheduling retry', indexErr)
          scheduleProductImageReindex(sync.needsReindex)
        }
      } else {
        scheduleProductImageReindex(sync.needsReindex)
      }
    } else if (sync.changedProducts <= 20) {
      void ensureProductImageIndex({ limit: 40, deadline: Date.now() + 15_000 }).catch(() => {})
    }

    try {
      const { revalidatePublishedSite } = await import('@server/revalidateSite')
      await revalidatePublishedSite()
    } catch (cacheErr) {
      console.warn('site cache revalidate skipped', cacheErr)
    }

    return NextResponse.json(
      {
        ok: true,
        message: 'تم النشر على قاعدة البيانات',
        data: sanitizePublicSiteData(body),
        meta: {
          changedProducts: sync.changedProducts,
          changedManagers: sync.changedManagers,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('site-data PUT error', error)
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 500 })
  }
}
