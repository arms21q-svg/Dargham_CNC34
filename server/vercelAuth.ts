import type { VercelRequest } from '@vercel/node'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

export interface AuthPayload {
  email: string
  role: string
  userId?: string
}

export function getJwtSecret() {
  return JWT_SECRET
}

export function verifyBearer(req: VercelRequest): AuthPayload | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as {
      email: string
      role?: string
      userId?: string
    }
    return {
      email: payload.email,
      role: payload.role ?? 'admin',
      userId: payload.userId,
    }
  } catch {
    return null
  }
}

export function parseJsonBody<T>(req: VercelRequest): T {
  const raw = req.body
  if (raw == null) return {} as T
  if (typeof raw === 'string') return JSON.parse(raw) as T
  if (Buffer.isBuffer(raw)) return JSON.parse(raw.toString('utf8')) as T
  return raw as T
}
