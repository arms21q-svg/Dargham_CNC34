import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'

const cwd = process.cwd()

for (const file of ['.env', 'prisma/.env', 'prisma/.evn.local']) {
  const path = resolve(cwd, file)
  if (existsSync(path)) {
    config({ path, override: false })
  }
}
