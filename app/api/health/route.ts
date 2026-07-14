import { NextResponse } from 'next/server'
import { prisma } from '@server/db'

export const maxDuration = 30
export const runtime = 'nodejs'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      ok: true,
      service: 'dorgham-cnc-api',
      runtime: 'next',
      ai: {
        gemini: Boolean(process.env.GEMINI_API_KEY),
        openai: Boolean(process.env.OPENAI_API_KEY),
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      },
    })
  } catch (error) {
    console.error('health error', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'API misconfigured — set DATABASE_URL and DIRECT_URL in Vercel env',
      },
      { status: 500 }
    )
  }
}
