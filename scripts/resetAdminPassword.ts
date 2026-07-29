/**
 * Reset super admin email + password in Supabase (production recovery).
 * Run: RESET_ADMIN_EMAIL=... RESET_ADMIN_PASSWORD=... npx tsx scripts/resetAdminPassword.ts
 */
import '../server/loadEnv.js'
import bcrypt from 'bcryptjs'
import { prisma } from '../server/db.js'
import { DEFAULT_ADMIN_EMAIL } from '../src/data/defaultSiteData'

function resolveResetCredentials() {
  const email = (process.env.RESET_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase()
  const password = process.env.RESET_ADMIN_PASSWORD?.trim()
  if (!password || password.length < 8) {
    throw new Error(
      'Set RESET_ADMIN_PASSWORD (min 8 chars) in env before running this script'
    )
  }
  return { email, password }
}

async function main() {
  const { email, password } = resolveResetCredentials()
  const hash = await bcrypt.hash(password, 10)

  await prisma.siteConfig.update({
    where: { id: 1 },
    data: { adminEmail: email, adminPasswordHash: hash },
  })

  const existing = await prisma.adminUser.findFirst({
    where: { OR: [{ role: 'super' }, { email }] },
  })

  if (existing) {
    await prisma.adminUser.update({
      where: { id: existing.id },
      data: { email, passwordHash: hash, role: 'super' },
    })
  } else {
    await prisma.adminUser.create({
      data: {
        email,
        passwordHash: hash,
        role: 'super',
        nameAr: 'المدير العام',
        nameEn: 'Super Admin',
      },
    })
  }

  console.log(`Reset OK — email: ${email}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
