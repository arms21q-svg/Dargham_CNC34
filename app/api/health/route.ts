import { NextResponse } from 'next/server'
import { prisma } from '@server/db'
import { countIndexedPublishedProducts } from '@server/imageIndex'

export const maxDuration = 30
export const runtime = 'nodejs'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`

    const catalog = await countIndexedPublishedProducts()

    return NextResponse.json(
      {
        ok: true,
        service: 'dorgham-cnc-api',
        runtime: 'next',
        db: true,
        catalog: {
          published: catalog.published,
          indexed: catalog.indexed,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('health error', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Service unavailable',
      },
      { status: 500 }
    )
  }
}
