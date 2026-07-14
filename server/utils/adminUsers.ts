import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../db'

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export function generateRandomPassword(length = 12): string {
  let password = ''
  for (let i = 0; i < length; i += 1) {
    password += PASSWORD_CHARS[crypto.randomInt(0, PASSWORD_CHARS.length)]
  }
  return password
}

export async function syncSuperAdminFromConfig(email: string, plainPassword?: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return

  const existingSuper = await prisma.adminUser.findFirst({
    where: { role: 'super' },
  })

  const data: {
    email: string
    role: string
    nameAr: string
    nameEn: string
    passwordHash?: string
  } = {
    email: normalizedEmail,
    role: 'super',
    nameAr: 'المدير العام',
    nameEn: 'Super Admin',
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

  if (existing) {
    await prisma.adminUser.update({
      where: { id: existing.id },
      data: { email: normalizedEmail, passwordHash },
    })
    return
  }

  await prisma.adminUser.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: 'super',
      nameAr: 'المدير العام',
      nameEn: 'Super Admin',
    },
  })
}
