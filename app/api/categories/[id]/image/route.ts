import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@server/db'
import { parseDataUrl } from '@server/parseDataUrl'
import { isProxyMediaUrl } from '@server/mediaUrls'

export const runtime = 'nodejs'
export const maxDuration = 30

type Props = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const category = await prisma.portfolioCategory.findUnique({
      where: { id },
      select: { image: true, enabled: true },
    })

    if (!category || category.enabled === false) {
      return new NextResponse('Not found', { status: 404 })
    }

    const raw = category.image
    if (!raw || isProxyMediaUrl(raw)) {
      return new NextResponse('Not found', { status: 404 })
    }

    if (raw.startsWith('data:')) {
      const parsed = parseDataUrl(raw)
      if (!parsed) return new NextResponse('Bad image', { status: 500 })
      return new NextResponse(new Uint8Array(parsed.buffer), {
        headers: {
          'Content-Type': parsed.mime,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      })
    }

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return NextResponse.redirect(raw, 302)
    }

    return new NextResponse('Not found', { status: 404 })
  } catch (error) {
    console.error('category image error', error)
    return new NextResponse('Error', { status: 500 })
  }
}
