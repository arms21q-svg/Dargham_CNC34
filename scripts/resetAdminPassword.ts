/**
 * One-shot: reset super admin password to default for production recovery.
 * Run: npx tsx scripts/resetAdminPassword.ts
 */
import '../server/loadEnv.js'
import bcrypt from 'bcryptjs'
import { prisma } from '../server/db.js'

const EMAIL = process.env.RESET_ADMIN_EMAIL || 'admin@dorghamcnc.com'
const PASSWORD = process.env.RESET_ADMIN_PASSWORD || 'dorgham2026'

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10)
  const email = EMAIL.trim().toLowerCase()

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
