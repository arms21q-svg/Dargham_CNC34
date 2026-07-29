import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'

const cwd = process.cwd()

for (const file of ['.env', '.env.local', 'prisma/.env', 'prisma/.evn.local']) {
  const path = resolve(cwd, file)
  if (existsSync(path)) {
    config({ path, override: file === '.env.local' })
  }
}
