import { NextResponse } from 'next/server'
import { getProductById, getRelatedProducts } from '@server/productDetail'

export const runtime = 'nodejs'
export const maxDuration = 10
export const revalidate = 120

type Ctx = { params: Promise<{ id: string }> }

/**
 * Background related works — never blocks the detail page critical path.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ ok: false, products: [] }, { status: 400 })
  }

  const product = await getProductById(id)
  if (!product) {
    return NextResponse.json({ ok: true, products: [] })
  }

  const products = await getRelatedProducts(id, product.category, 3)

  return NextResponse.json(
    { ok: true, products },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    }
  )
}
