import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../routes/auth.js'

export interface AuthRequest extends Request {
  adminEmail?: string
  adminRole?: string
  adminUserId?: string
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ ok: false, error: 'غير مصرح' })
    return
  }

  try {
    const token = header.slice(7)
    const payload = jwt.verify(token, JWT_SECRET) as {
      email: string
      role?: string
      userId?: string
    }
    req.adminEmail = payload.email
    req.adminRole = payload.role ?? 'admin'
    req.adminUserId = payload.userId
    next()
  } catch {
    res.status(401).json({ ok: false, error: 'انتهت الجلسة، سجّل الدخول مجدداً' })
  }
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.adminRole !== 'super') {
    res.status(403).json({ ok: false, error: 'هذا الإجراء للمدير الرئيسي فقط' })
    return
  }
  next()
}
