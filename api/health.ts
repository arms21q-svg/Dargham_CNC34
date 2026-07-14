import type { VercelRequest, VercelResponse } from '@vercel/node'
import '../server/loadEnv.js'
import { prisma } from '../server/db.js'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // Touch DB lightly so misconfigured env fails with a clear message
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({
      ok: true,
      service: 'dorgham-cnc-api',
      runtime: 'vercel',
      ai: {
        gemini: Boolean(process.env.GEMINI_API_KEY),
        openai: Boolean(process.env.OPENAI_API_KEY),
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      },
    })
  } catch (error) {
    console.error('health error', error)
    res.status(500).json({
      ok: false,
      error: 'API misconfigured — set DATABASE_URL and DIRECT_URL in Vercel env',
    })
  }
}
