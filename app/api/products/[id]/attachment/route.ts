import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@server/db'
import { parseDataUrl } from '@server/parseDataUrl'
import { isAttachmentProxyUrl } from '@server/mediaUrls'

export const runtime = 'nodejs'
export const maxDuration = 30

type Props = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        attachmentData: true,
        attachmentName: true,
        attachmentMime: true,
        published: true,
      },
    })

    if (!product || product.published === false) {
      return new NextResponse('Not found', { status: 404 })
    }

    const raw = product.attachmentData?.trim()
    if (!raw || isAttachmentProxyUrl(raw)) {
      return new NextResponse('Not found', { status: 404 })
    }

    const filename = product.attachmentName?.trim() || 'attachment'
    const mime = product.attachmentMime?.trim() || 'application/octet-stream'

    if (raw.startsWith('data:')) {
      const parsed = parseDataUrl(raw)
      if (!parsed) return new NextResponse('Bad file', { status: 500 })
      return new NextResponse(new Uint8Array(parsed.buffer), {
        headers: {
          'Content-Type': parsed.mime || mime,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      })
    }

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return NextResponse.redirect(raw, 302)
    }

    return new NextResponse('Not found', { status: 404 })
  } catch (error) {
    console.error('product attachment error', error)
    return new NextResponse('Error', { status: 500 })
  }
}
