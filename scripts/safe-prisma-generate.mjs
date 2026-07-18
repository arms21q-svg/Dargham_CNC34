/**
 * Windows-safe Prisma generate: if the query engine DLL is locked (EPERM)
 * by `next dev`, reuse the existing client instead of failing the whole build.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const engine = path.join(
  root,
  'node_modules',
  '.prisma',
  'client',
  'query_engine-windows.dll.node'
)
const clientIndex = path.join(root, 'node_modules', '.prisma', 'client', 'index.js')

const result = spawnSync('npx', ['prisma', 'generate'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

if (result.status === 0) {
  process.exit(0)
}

const hasClient = fs.existsSync(clientIndex) && fs.existsSync(engine)
if (hasClient) {
  console.warn(
    '\n[prisma] generate failed (often EPERM on Windows while `npm run dev` is running).'
  )
  console.warn('[prisma] Existing Prisma Client found — continuing build.\n')
  console.warn('[prisma] Tip: stop `npm run dev`, then run `npx prisma generate` once.\n')
  process.exit(0)
}

console.error('[prisma] generate failed and no usable Prisma Client exists.')
process.exit(result.status ?? 1)
