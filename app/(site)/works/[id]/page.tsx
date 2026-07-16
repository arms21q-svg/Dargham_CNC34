import type { Metadata } from 'next'
import ProductDetailPage from '@/views/ProductDetailPage'
import JsonLd from '@/components/seo/JsonLd'
import {
  breadcrumbSchema,
  buildPageMetadata,
  creativeWorkSchema,
  DEFAULT_OG_IMAGE,
  imageObjectSchema,
} from '@/lib/seo'
import { prisma } from '@server/db'

type Props = { params: Promise<{ id: string }> }

async function getProduct(id: string) {
  // Skip DB during local/CI build when pooler may be unreachable
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null
  }

  try {
    return await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        titleAr: true,
        titleEn: true,
        descriptionAr: true,
        descriptionEn: true,
        image: true,
        materialsAr: true,
        category: true,
      },
    })
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) {
    return buildPageMetadata({
      path: `/works/${id}`,
      title: 'تفاصيل العمل',
      description: 'تفاصيل عمل من معرض ضرغام CNC.',
      noIndex: true,
    })
  }

  const description =
    product.descriptionAr?.slice(0, 160) ||
    `${product.titleAr} — عمل خشبي بتقنية CNC من ضرغام CNC.`

  return buildPageMetadata({
    path: `/works/${product.id}`,
    title: product.titleAr,
    description,
    image: product.image || DEFAULT_OG_IMAGE,
    type: 'article',
  })
}

export default async function Page({ params }: Props) {
  const { id } = await params
  const product = await getProduct(id)

  return (
    <>
      {product && (
        <JsonLd
          data={[
            breadcrumbSchema([
              { name: 'الرئيسية', path: '/' },
              { name: 'أعمالنا', path: '/works' },
              { name: product.titleAr, path: `/works/${product.id}` },
            ]),
            creativeWorkSchema(product),
            imageObjectSchema({
              url: product.image || DEFAULT_OG_IMAGE,
              name: product.titleAr,
              description: product.descriptionAr,
            }),
          ]}
        />
      )}
      <ProductDetailPage />
    </>
  )
}
