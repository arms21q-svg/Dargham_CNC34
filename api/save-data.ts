import type { VercelRequest, VercelResponse } from '@vercel/node'

/** Legacy PHP path — not supported on Vercel. */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(410).json({
    ok: false,
    error: 'استخدم تسجيل الدخول ثم PUT /api/site-data',
  })
}
