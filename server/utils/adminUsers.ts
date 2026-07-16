import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../db'

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const USERNAME_RE = /^[a-z0-9._-]{3,32}$/

export type AdminUserStatus = 'active' | 'disabled'

export function generateRandomPassword(length = 12): string {
  let password = ''
  for (let i = 0; i < length; i += 1) {
    password += PASSWORD_CHARS[crypto.randomInt(0, PASSWORD_CHARS.length)]
  }
  return password
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username)
}

export function usernameFromEmail(email: string): string {
  const local = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'user'
  const base = local.slice(0, 24) || 'user'
  return base.length >= 3 ? base : `${base}admin`.slice(0, 32)
}

export async function allocateUniqueUsername(preferred: string, excludeId?: string): Promise<string> {
  let base = normalizeUsername(preferred)
  if (!isValidUsername(base)) {
    base = usernameFromEmail(`${base || 'user'}@local`)
  }

  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? base : `${base.slice(0, 28)}${i + 1}`
    const existing = await prisma.adminUser.findUnique({ where: { username: candidate } })
    if (!existing || existing.id === excludeId) return candidate
  }

  return `${base.slice(0, 20)}${crypto.randomInt(1000, 9999)}`
}

export function serializeAdminUser(user: {
  id: string
  email: string
  username: string | null
  role: string
  nameAr: string
  nameEn: string
  status: string
  createdAt: Date
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username || usernameFromEmail(user.email),
    role: user.role,
    nameAr: user.nameAr,
    nameEn: user.nameEn,
    status: user.status === 'disabled' ? 'disabled' : 'active',
    createdAt: user.createdAt.toISOString(),
  }
}

export async function ensureAdminUsernames() {
  const users = await prisma.adminUser.findMany({
    where: { OR: [{ username: null }, { username: '' }] },
  })

  for (const user of users) {
    const username = await allocateUniqueUsername(usernameFromEmail(user.email), user.id)
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { username },
    })
  }
}

export async function writeAdminAuditLog(input: {
  action: string
  actorEmail: string
  actorRole?: string
  targetUserId?: string | null
  targetEmail?: string | null
  details?: string
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        action: input.action,
        actorEmail: input.actorEmail,
        actorRole: input.actorRole ?? '',
        targetUserId: input.targetUserId ?? null,
        targetEmail: input.targetEmail ?? null,
        details: input.details ?? '',
      },
    })
  } catch (error) {
    console.error('admin audit log write failed', error)
  }
}

export async function syncSuperAdminFromConfig(email: string, plainPassword?: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return

  const existingSuper = await prisma.adminUser.findFirst({
    where: { role: 'super' },
  })

  const username = await allocateUniqueUsername(
    usernameFromEmail(normalizedEmail),
    existingSuper?.id
  )

  const data: {
    email: string
    username: string
    role: string
    nameAr: string
    nameEn: string
    status: string
    passwordHash?: string
  } = {
    email: normalizedEmail,
    username,
    role: 'super',
    nameAr: 'المدير العام',
    nameEn: 'Super Admin',
    status: 'active',
  }

  if (plainPassword?.trim()) {
    data.passwordHash = await bcrypt.hash(plainPassword.trim(), 10)
  }

  if (existingSuper) {
    await prisma.adminUser.update({
      where: { id: existingSuper.id },
      data,
    })
    return
  }

  const password = plainPassword?.trim() || generateRandomPassword()
  await prisma.adminUser.create({
    data: {
      ...data,
      passwordHash: data.passwordHash ?? (await bcrypt.hash(password, 10)),
    },
  })
}

export async function ensureSuperAdminSeeded(email: string, passwordHash: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const existing = await prisma.adminUser.findFirst({ where: { role: 'super' } })
  const username = await allocateUniqueUsername(
    usernameFromEmail(normalizedEmail),
    existing?.id
  )

  if (existing) {
    await prisma.adminUser.update({
      where: { id: existing.id },
      data: {
        email: normalizedEmail,
        passwordHash,
        username,
        status: 'active',
      },
    })
    return
  }

  await prisma.adminUser.create({
    data: {
      email: normalizedEmail,
      username,
      passwordHash,
      role: 'super',
      status: 'active',
      nameAr: 'المدير العام',
      nameEn: 'Super Admin',
    },
  })
}
