import '../server/loadEnv'
import { ensureProductImageIndex } from '../server/imageIndex'

async function main() {
  console.info('[reindex] building image embeddings for catalog…')
  const result = await ensureProductImageIndex({ limit: 500 })
  console.info('[reindex] done', result)
}

main().catch((err) => {
  console.error('[reindex] failed', err)
  process.exit(1)
})
