import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@server/db'
import { parseDataUrl } from '@server/parseDataUrl'

export const runtime = 'nodejs'
export const maxDuration = 30

type Props = { params: Promise<{ id: string }> }

function pickImage(
  image: string,
  images: string[],
  index: number
): string {
  const gallery = images.length > 0 ? images : image ? [image] : []
  if (index <= 0) return image || gallery[0] || ''
  return gallery[index] ?? ''
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params
    const index = Number.parseInt(req.nextUrl.searchParams.get('i') ?? '0', 10) || 0

    const product = await prisma.product.findUnique({
      where: { id },
      select: { image: true, images: true, published: true },
    })

    if (!product || product.published === false) {
      return new NextResponse('Not found', { status: 404 })
    }

    const raw = pickImage(product.image, product.images ?? [], index)
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
    console.error('product image error', error)
    return new NextResponse('Error', { status: 500 })
  }
}
