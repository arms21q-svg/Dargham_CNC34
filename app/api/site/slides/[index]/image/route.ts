import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@server/db'
import { parseDataUrl } from '@server/parseDataUrl'

export const runtime = 'nodejs'
export const maxDuration = 30

type Props = { params: Promise<{ index: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { index: indexRaw } = await params
    const index = Number.parseInt(indexRaw, 10)
    if (!Number.isFinite(index) || index < 0) {
      return new NextResponse('Bad index', { status: 400 })
    }

    const config = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { slideImages: true },
    })

    const raw = config?.slideImages?.[index]
    if (!raw) return new NextResponse('Not found', { status: 404 })

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
    console.error('slide image error', error)
    return new NextResponse('Error', { status: 500 })
  }
}
