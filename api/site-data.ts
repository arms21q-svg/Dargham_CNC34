import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Prisma } from '@prisma/client'
import '../server/loadEnv.js'
import { prisma } from '../server/db.js'
import {
  configFromSiteData,
  managerFromSiteData,
  productFromSiteData,
  toSiteData,
} from '../server/mappers.js'
import type { SiteData } from '../src/types/siteData'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
/** Soft limit — huge base64 images blow past Vercel/serverless body limits. */
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

async function verifyBearer(req: VercelRequest): Promise<boolean> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return false
  const jwt = (await import('jsonwebtoken')).default
  try {
    jwt.verify(header.slice(7), JWT_SECRET)
    return true
  } catch {
    return false
  }
}

function parseBody(req: VercelRequest): SiteData {
  const raw = req.body
  if (raw == null) {
    throw new Error('جسم الطلب فارغ')
  }
  if (typeof raw === 'string') {
    if (raw.length > MAX_BODY_CHARS) {
      throw new Error(
        'حجم البيانات كبير جداً. استخدم روابط صور بدلاً من رفع صور كبيرة داخل الصفحة'
      )
    }
    return JSON.parse(raw) as SiteData
  }
  if (Buffer.isBuffer(raw)) {
    if (raw.length > MAX_BODY_CHARS) {
      throw new Error(
        'حجم البيانات كبير جداً. استخدم روابط صور بدلاً من رفع صور كبيرة داخل الصفحة'
      )
    }
    return JSON.parse(raw.toString('utf8')) as SiteData
  }
  return raw as SiteData
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
      throw new Error(
        `صورة المنتج "${p.title?.ar || p.id}" كبيرة جداً. ارفعها كرابط URL`
      )
    }
  }
}

function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'فشل حفظ البيانات'

  const prismaError = error as Error & { code?: string; meta?: { target?: string[] } }
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const data = await fetchSiteData()
      if (!data) {
        res.status(404).json({ ok: false, error: 'لا توجد بيانات. شغّل: npm run db:seed' })
        return
      }
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
      res.status(200).json({ ok: true, data })
      return
    }

    if (req.method === 'PUT') {
      if (!(await verifyBearer(req))) {
        res.status(401).json({ ok: false, error: 'غير مصرح أو انتهت الجلسة' })
        return
      }

      const body = parseBody(req)
      assertSiteData(body)

      const existing = await prisma.siteConfig.findUnique({ where: { id: 1 } })
      if (!existing) {
        res.status(404).json({ ok: false, error: 'قاعدة البيانات غير مهيأة' })
        return
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
        // Avoid interactive $transaction — unreliable with Supabase transaction pooler
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
        const { syncSuperAdminFromConfig } = await import('../server/utils/adminUsers.js')
        await syncSuperAdminFromConfig(body.settings.adminEmail, nextPassword || undefined)
      } catch (syncErr) {
        console.error('super admin sync skipped', syncErr)
      }

      const data = await fetchSiteData()
      res.status(200).json({ ok: true, message: 'تم النشر على قاعدة البيانات', data })
      return
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('site-data error', error)
    res.status(500).json({
      ok: false,
      error: errorMessage(error),
    })
  }
}
