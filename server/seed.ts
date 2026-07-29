import './loadEnv.js'
import bcrypt from 'bcryptjs'
import { prisma } from './db'
import { createDefaultSiteData, DEFAULT_ADMIN_EMAIL } from '../src/data/defaultSiteData'
import {
  configFromSiteData,
  managerFromSiteData,
  productFromSiteData,
} from './mappers'
import { ensureSuperAdminSeeded } from './utils/adminUsers'

function resolveSeedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD?.trim()
  if (!password || password.length < 8) {
    throw new Error(
      'Set SEED_ADMIN_PASSWORD (min 8 chars) in .env before running db:seed'
    )
  }
  return { email, password }
}

async function main() {
  const { email, password } = resolveSeedAdmin()
  const defaults = createDefaultSiteData()
  defaults.settings.adminEmail = email
  defaults.settings.adminPassword = ''

  const passwordHash = await bcrypt.hash(password, 10)
  const configData = configFromSiteData(defaults, passwordHash)

  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: { id: 1, ...configData },
    update: configData,
  })

  await ensureSuperAdminSeeded(email, passwordHash)

  await prisma.product.deleteMany()
  await prisma.manager.deleteMany()

  if (defaults.products.length > 0) {
    await prisma.product.createMany({
      data: defaults.products.map((p, i) => productFromSiteData(p, i)),
    })
  }

  if (defaults.managers.length > 0) {
    await prisma.manager.createMany({
      data: defaults.managers.map((m, i) => managerFromSiteData(m, i)),
    })
  }

  console.log('Database seeded successfully')
  console.log(`Admin email: ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
