import '../server/loadEnv'
import { countIndexedPublishedProducts, ensureProductImageIndex } from '../server/imageIndex'

async function main() {
  console.info('[reindex] building image embeddings for catalog…')

  let totalIndexed = 0
  let lastFailed = 0
  let failedIds: string[] | undefined
  let pass = 0

  while (pass < 3) {
    pass += 1
    const result = await ensureProductImageIndex({
      limit: 500,
      ...(failedIds?.length ? { forceIds: failedIds } : {}),
    })
    totalIndexed += result.indexed
    lastFailed = result.failed
    failedIds = result.failedIds
    console.info(`[reindex] pass ${pass}`, result)

    if (result.failed === 0 || result.indexed === 0) break
  }

  const catalog = await countIndexedPublishedProducts()
  console.info('[reindex] done', {
    indexedThisRun: totalIndexed,
    failedRemaining: lastFailed,
    catalog,
  })

  if (catalog.published > 0 && catalog.indexed < catalog.published) {
    console.warn(
      `[reindex] ${catalog.published - catalog.indexed} product(s) still missing images in DB — add images in admin then re-run`
    )
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('[reindex] failed', err)
  process.exit(1)
})
