import type { VercelRequest, VercelResponse } from '@vercel/node'
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

      const body = (
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      ) as SiteData

      const existing = await prisma.siteConfig.findUnique({ where: { id: 1 } })
      if (!existing) {
        res.status(404).json({ ok: false, error: 'قاعدة البيانات غير مهيأة' })
        return
      }

      const bcrypt = (await import('bcryptjs')).default
      let passwordHash = existing.adminPasswordHash
      if (body.settings?.adminPassword?.trim()) {
        passwordHash = await bcrypt.hash(body.settings.adminPassword.trim(), 10)
      }

      const configData = configFromSiteData(body, passwordHash)

      await prisma.$transaction(async (tx) => {
        await tx.siteConfig.update({ where: { id: 1 }, data: configData })
        await tx.product.deleteMany()
        await tx.manager.deleteMany()
        if (body.products?.length) {
          await tx.product.createMany({
            data: body.products.map((p, i) => productFromSiteData(p, i)),
          })
        }
        if (body.managers?.length) {
          await tx.manager.createMany({
            data: body.managers.map((m, i) => managerFromSiteData(m, i)),
          })
        }
      })

      try {
        const { syncSuperAdminFromConfig } = await import('../server/utils/adminUsers.js')
        await syncSuperAdminFromConfig(
          body.settings.adminEmail,
          body.settings.adminPassword?.trim() || undefined
        )
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
      error: error instanceof Error ? error.message : 'فشل معالجة البيانات',
    })
  }
}
