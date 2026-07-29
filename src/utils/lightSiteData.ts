import type { Product, SiteData } from '../types/siteData'
import { slideImages as DEFAULT_SLIDE_IMAGES } from '../data/content'

const MAX_INLINE_CHARS = 512

function isHeavyDataUrl(url: string | undefined): boolean {
  return Boolean(url?.startsWith('data:') && url.length > MAX_INLINE_CHARS)
}

function firstHttpUrl(...candidates: (string | undefined)[]): string {
  for (const url of candidates) {
    if (url && !url.startsWith('data:') && !url.startsWith('blob:')) return url
  }
  return ''
}

/** Drop embedded base64 from public payloads — keeps JSON small for fast load. */
export function lightPublicSiteData(data: SiteData): SiteData {
  const slides = (data.home?.slideImages ?? [])
    .map((url) => (isHeavyDataUrl(url) ? '' : url))
    .filter(Boolean)

  const products: Product[] = (data.products ?? []).map((p) => {
    const httpImage = firstHttpUrl(p.image, ...(p.images ?? []))
    const image = isHeavyDataUrl(p.image) ? httpImage : p.image
    const images = (p.images ?? []).filter((url) => !isHeavyDataUrl(url))

    return {
      ...p,
      image: image || httpImage,
      images,
    }
  })

  return {
    ...data,
    home: {
      ...data.home,
      slideImages: slides.length > 0 ? slides : [...DEFAULT_SLIDE_IMAGES],
    },
    products,
  }
}

export function stripHeavyEmbeddedMedia(data: SiteData): SiteData {
  return lightPublicSiteData(data)
}
