import jwt from 'jsonwebtoken'

function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET?.trim()
  const isProd =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

  if (isProd) {
    if (!fromEnv || fromEnv === 'dev-secret-change-me' || fromEnv.length < 24) {
      console.error('[security] JWT_SECRET missing or too weak for production')
    }
  }

  return fromEnv || 'dev-secret-change-me'
}

const JWT_SECRET = resolveJwtSecret()

export interface AuthPayload {
  email: string
  role: string
  userId?: string
}

export function getJwtSecret() {
  return JWT_SECRET
}

export function verifyBearerHeader(authorization: string | null | undefined): AuthPayload | null {
  if (!authorization?.startsWith('Bearer ')) return null
  try {
    const payload = jwt.verify(authorization.slice(7), JWT_SECRET) as {
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

/** @deprecated Prefer verifyBearerHeader with Next Request headers */
export function verifyBearer(req: { headers: { authorization?: string } }): AuthPayload | null {
  return verifyBearerHeader(req.headers.authorization)
}

export function parseJsonBody<T>(body: unknown): T {
  if (body == null) return {} as T
  if (typeof body === 'string') return JSON.parse(body) as T
  if (Buffer.isBuffer(body)) return JSON.parse(body.toString('utf8')) as T
  return body as T
}

export async function readJsonBody<T>(req: Request): Promise<T> {
  const text = await req.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}
