import type { VercelRequest, VercelResponse } from '@vercel/node'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import '../server/loadEnv.js'
import { prisma } from '../server/db.js'
import {
  configFromSiteData,
  managerFromSiteData,
  productFromSiteData,
  toSiteData,
} from '../server/mappers.js'
import type { SiteData } from '../src/types/siteData'
import { syncSuperAdminFromConfig } from '../server/utils/adminUsers.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

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

function requireAuth(req: VercelRequest): { ok: true } | { ok: false; status: number; error: string } {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'غير مصرح' }
  }
  try {
    jwt.verify(header.slice(7), JWT_SECRET)
    return { ok: true }
  } catch {
    return { ok: false, status: 401, error: 'انتهت الجلسة، سجّل الدخول مجدداً' }
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
      const auth = requireAuth(req)
      if (!auth.ok) {
        res.status(auth.status).json({ ok: false, error: auth.error })
        return
      }

      const body = req.body as SiteData
      const existing = await prisma.siteConfig.findUnique({ where: { id: 1 } })

      if (!existing) {
        res.status(404).json({ ok: false, error: 'قاعدة البيانات غير مهيأة' })
        return
      }

      let passwordHash = existing.adminPasswordHash
      if (body.settings?.adminPassword?.trim()) {
        passwordHash = await bcrypt.hash(body.settings.adminPassword.trim(), 10)
      }

      const configData = configFromSiteData(body, passwordHash)

      await prisma.$transaction(async (tx) => {
        await tx.siteConfig.update({
          where: { id: 1 },
          data: configData,
        })
        await tx.product.deleteMany()
        await tx.manager.deleteMany()
        if (body.products?.length > 0) {
          await tx.product.createMany({
            data: body.products.map((p, i) => productFromSiteData(p, i)),
          })
        }
        if (body.managers?.length > 0) {
          await tx.manager.createMany({
            data: body.managers.map((m, i) => managerFromSiteData(m, i)),
          })
        }
      })

      await syncSuperAdminFromConfig(
        body.settings.adminEmail,
        body.settings.adminPassword?.trim() || undefined
      )

      const data = await fetchSiteData()
      res.status(200).json({ ok: true, message: 'تم النشر على قاعدة البيانات', data })
      return
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    console.error('site-data error:', error)
    res.status(500).json({ ok: false, error: 'فشل معالجة البيانات' })
  }
}
