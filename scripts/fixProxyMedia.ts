import '../server/loadEnv'
import { Prisma } from '@prisma/client'
import { prisma } from '../server/db'
import { isProxyMediaUrl, isServeableMediaUrl } from '../server/mediaUrls'
import { slideImages as DEFAULT_SLIDE_IMAGES } from '../src/data/content'

function defaultSlideUrl(index: number): string {
  return DEFAULT_SLIDE_IMAGES[index] ?? DEFAULT_SLIDE_IMAGES[0] ?? ''
}

async function main() {
  const config = await prisma.siteConfig.findUnique({
    where: { id: 1 },
    select: { slideImages: true },
  })

  if (!config) {
    console.error('[fix-media] siteConfig missing — run db:seed first')
    process.exit(1)
  }

  const prevSlides = config.slideImages ?? []
  const nextSlides = prevSlides.map((url, index) => {
    if (isServeableMediaUrl(url)) return url
    const fallback = defaultSlideUrl(index)
    if (fallback) {
      console.info('[fix-media] slide', index, '→ default URL')
      return fallback
    }
    return url
  })

  const slidesChanged = nextSlides.some((url, i) => url !== prevSlides[i])
  if (slidesChanged) {
    await prisma.siteConfig.update({
      where: { id: 1 },
      data: { slideImages: nextSlides },
    })
    console.info('[fix-media] updated slideImages', { count: nextSlides.length })
  } else {
    console.info('[fix-media] slideImages already OK')
  }

  const products = await prisma.product.findMany({
    select: { id: true, titleAr: true, image: true, images: true },
  })

  const broken = products.filter(
    (p) =>
      isProxyMediaUrl(p.image) ||
      (p.images ?? []).some((url) => isProxyMediaUrl(url))
  )

  if (broken.length === 0) {
    console.info('[fix-media] all product images OK')
    return
  }

  console.warn(
    `[fix-media] ${broken.length} product(s) still need image re-upload in admin:`
  )
  for (const p of broken) {
    console.warn(' -', p.id, p.titleAr || '(no title)')
    await prisma.product.update({
      where: { id: p.id },
      data: {
        image: '',
        images: [],
        imageHash: null,
        imageVector: Prisma.DbNull,
        indexedAt: null,
      },
    })
    console.info('[fix-media] cleared proxy-only image fields for', p.id)
  }
}

main()
  .catch((err) => {
    console.error('[fix-media] failed', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
