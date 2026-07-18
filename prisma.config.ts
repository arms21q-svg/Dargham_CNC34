import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'prisma/config'

const cwd = process.cwd()
for (const file of ['.env', 'prisma/.env']) {
  const path = resolve(cwd, file)
  if (existsSync(path)) {
    config({ path, override: false })
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx server/seed.ts',
  },
})
