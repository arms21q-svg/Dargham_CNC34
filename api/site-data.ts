import type { VercelRequest, VercelResponse } from '@vercel/node'
import '../server/loadEnv.js'
import { prisma } from '../server/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ ok: false, error: 'Method not allowed' })
      return
    }

    const config = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        version: true,
        heroTitleAr: true,
        updatedAt: true,
      },
    })

    if (!config) {
      res.status(404).json({ ok: false, error: 'لا توجد بيانات' })
      return
    }

    const [productCount, managerCount] = await Promise.all([
      prisma.product.count(),
      prisma.manager.count(),
    ])

    res.status(200).json({
      ok: true,
      debug: true,
      configId: config.id,
      version: config.version,
      heroTitleAr: config.heroTitleAr,
      productCount,
      managerCount,
      updatedAt: config.updatedAt,
    })
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
