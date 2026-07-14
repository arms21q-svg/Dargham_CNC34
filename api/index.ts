import type { VercelRequest, VercelResponse } from '@vercel/node'
import app from '../server/app.js'

/**
 * Vercel serverless entry — all /api/* traffic is handled by Express.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res)
}
