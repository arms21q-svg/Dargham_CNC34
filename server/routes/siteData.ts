import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../db.js'
import {
  configFromSiteData,
  managerFromSiteData,
  productFromSiteData,
  toSiteData,
} from '../mappers.js'
import type { SiteData } from '../../src/types/siteData'
import { requireAuth, type AuthRequest } from '../middleware/auth.js'
import { syncSuperAdminFromConfig } from '../utils/adminUsers.js'
const router = Router()

async function fetchSiteData() {
  const [config, products, managers] = await Promise.all([
    prisma.siteConfig.findUnique({ where: { id: 1 } }),
    prisma.product.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        titleAr: true,
        titleEn: true,
        descriptionAr: true,
        descriptionEn: true,
        category: true,
        image: true,
        materialsAr: true,
        materialsEn: true,
        dimensionsAr: true,
        dimensionsEn: true,
        featured: true,
        colors: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.manager.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        roleAr: true,
        roleEn: true,
        phone: true,
        whatsapp: true,
        sortOrder: true,
      },
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
    res.json({ ok: true, data })
  } catch (error) {
    console.error('GET site-data error:', error)
    res.status(500).json({ ok: false, error: 'فشل تحميل البيانات' })
  }
})

router.put('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = req.body as SiteData
    const existing = await prisma.siteConfig.findUnique({ where: { id: 1 } })

    if (!existing) {
      res.status(404).json({ ok: false, error: 'قاعدة البيانات غير مهيأة' })
      return
    }

    let passwordHash = existing.adminPasswordHash
    if (body.settings.adminPassword?.trim()) {
      passwordHash = await bcrypt.hash(body.settings.adminPassword.trim(), 10)
    }

    const configData = configFromSiteData(body, passwordHash)

    // Avoid interactive transactions (unreliable with Supabase pgbouncer)
    await prisma.siteConfig.update({
      where: { id: 1 },
      data: configData,
    })
    await prisma.product.deleteMany()
    await prisma.manager.deleteMany()
    if (body.products.length > 0) {
      await prisma.product.createMany({
        data: body.products.map((p, i) => productFromSiteData(p, i)),
      })
    }
    if (body.managers.length > 0) {
      await prisma.manager.createMany({
        data: body.managers.map((m, i) => managerFromSiteData(m, i)),
      })
    }

    await syncSuperAdminFromConfig(
      body.settings.adminEmail,
      body.settings.adminPassword?.trim() || undefined
    )

    const data = await fetchSiteData()
    res.json({ ok: true, message: 'تم النشر على قاعدة البيانات', data })
  } catch (error) {
    console.error('PUT site-data error:', error)
    const message = error instanceof Error ? error.message : 'فشل حفظ البيانات'
    res.status(500).json({ ok: false, error: message })
  }
})

export { router as siteDataRouter }
