import { NextResponse } from 'next/server'

export const maxDuration = 10
export const runtime = 'nodejs'

/** Legacy PHP path — not supported on Vercel/Next. */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: 'استخدم تسجيل الدخول ثم PUT /api/site-data',
    },
    { status: 410 }
  )
}
