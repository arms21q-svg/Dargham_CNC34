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
import { getProductById } from '@server/productDetail'

type Props = { params: Promise<{ id: string }> }

/** ISR: reuse HTML/RSC for identical products for ~2 minutes. */
export const revalidate = 120

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const product = await getProductById(id)

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
  // One PK lookup only — no related / AI / full catalog on the critical path
  const product = await getProductById(id)

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
      <ProductDetailPage initialProduct={product} />
    </>
  )
}
