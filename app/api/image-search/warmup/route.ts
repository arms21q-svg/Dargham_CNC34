import { NextResponse } from 'next/server'
import { countIndexedPublishedProducts, ensureProductImageIndex } from '@server/imageIndex'

export const maxDuration = 60
export const runtime = 'nodejs'

/** Pre-index product images in the background when the user opens /works. */
export async function POST() {
  try {
    const before = await countIndexedPublishedProducts()
    if (before.published > 0 && before.indexed >= before.published) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        catalog: before,
      })
    }

    const result = await ensureProductImageIndex({
      limit: 120,
      deadline: Date.now() + 50_000,
    })
    const after = await countIndexedPublishedProducts()

    return NextResponse.json(
      {
        ok: true,
        ...result,
        catalog: after,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[image-search/warmup]', error)
    return NextResponse.json({ ok: false, error: 'warmup failed' }, { status: 500 })
  }
}

export async function GET() {
  const catalog = await countIndexedPublishedProducts()
  return NextResponse.json({ ok: true, catalog }, { headers: { 'Cache-Control': 'no-store' } })
}
