import './loadEnv.js'
import bcrypt from 'bcryptjs'
import { prisma } from './db'
import { createDefaultSiteData } from '../src/data/defaultSiteData'
import {
  configFromSiteData,
  managerFromSiteData,
  productFromSiteData,
} from './mappers'
import { ensureSuperAdminSeeded } from './utils/adminUsers'

async function main() {
  const defaults = createDefaultSiteData()
  const passwordHash = await bcrypt.hash(defaults.settings.adminPassword, 10)
  const configData = configFromSiteData(defaults, passwordHash)

  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: { id: 1, ...configData },
    update: configData,
  })

  await ensureSuperAdminSeeded(defaults.settings.adminEmail, passwordHash)

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
  console.log(`Admin: ${defaults.settings.adminEmail}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
