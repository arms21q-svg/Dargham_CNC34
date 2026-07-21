import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../db'
import { toSiteData } from '../mappers'
import type { SiteData } from '../../src/types/siteData'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { syncSuperAdminFromConfig } from '../utils/adminUsers'
import { scheduleProductImageReindex } from '../imageIndex'
import { syncSiteDataToDb } from '../syncSiteData'

const router = Router()

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
    prisma.product.findMany({
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.manager.findMany({
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  if (!config) return null
  return toSiteData(config, products, managers)
}

router.get('/', async (_req, res) => {
  try {
    const data = await fetchSiteData()
    if (!data) {
      res.status(404).json({ ok: false, error: 'لا توجد بيانات. شغّل: npm run db:seed' })
      return
    }
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
    res.json({ ok: true, data: sanitizePublicSiteData(data) })
  } catch (error) {
    console.error('GET site-data error:', error)
    res.status(500).json({ ok: false, error: 'فشل تحميل البيانات' })
  }
})

router.put('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = req.body as SiteData
    if (!body?.home || !body?.contact || !body?.settings) {
      res.status(400).json({ ok: false, error: 'بيانات غير مكتملة' })
      return
    }
    if (!Array.isArray(body.products)) body.products = []
    if (!Array.isArray(body.managers)) body.managers = []

    const existing = await prisma.siteConfig.findUnique({ where: { id: 1 } })

    if (!existing) {
      res.status(404).json({ ok: false, error: 'قاعدة البيانات غير مهيأة' })
      return
    }

    const isSuper = req.adminRole === 'super'
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
    body.updatedAt = Date.now()

    const sync = await syncSiteDataToDb(body, passwordHash)

    if (isSuper) {
      await syncSuperAdminFromConfig(adminEmail, nextPassword)
    }

    if (sync.needsReindex.length > 0) {
      scheduleProductImageReindex(sync.needsReindex)
    }

    res.json({
      ok: true,
      message: 'تم النشر على قاعدة البيانات',
      data: sanitizePublicSiteData(body),
      meta: {
        changedProducts: sync.changedProducts,
        changedManagers: sync.changedManagers,
      },
    })
  } catch (error) {
    console.error('PUT site-data error:', error)
    const message = error instanceof Error ? error.message : 'فشل حفظ البيانات'
    res.status(500).json({ ok: false, error: message })
  }
})

export { router as siteDataRouter }
