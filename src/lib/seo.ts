import type { Metadata } from 'next'

export const SITE_URL = 'https://www.dhirghamcnc.com'
export const SITE_NAME_AR = 'ضرغام CNC'
export const SITE_NAME_EN = 'Dorgham CNC'
export const DEFAULT_OG_IMAGE =
  'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&fm=webp&w=1200&q=80'

export type PageSeoInput = {
  path: string
  title: string
  titleEn?: string
  description: string
  descriptionEn?: string
  image?: string
  noIndex?: boolean
  type?: 'website' | 'article'
}

export function absoluteUrl(path = '/'): string {
  if (!path || path === '/') return SITE_URL
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function buildPageMetadata({
  path,
  title,
  description,
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
  type = 'website',
}: PageSeoInput): Metadata {
  const url = absoluteUrl(path)
  const fullTitle = title.includes(SITE_NAME_AR) ? title : title

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: url,
      languages: {
        'ar-IQ': url,
        en: url,
        'x-default': url,
      },
    },
    openGraph: {
      type,
      locale: 'ar_IQ',
      alternateLocale: ['en_US'],
      url,
      siteName: SITE_NAME_AR,
      title: fullTitle,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
    },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
  }
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME_AR,
    alternateName: SITE_NAME_EN,
    url: SITE_URL,
    logo: absoluteUrl('/logo.png'),
    sameAs: ['https://www.facebook.com/dorghamcnc'],
    areaServed: {
      '@type': 'Country',
      name: 'Iraq',
    },
  }
}

export function localBusinessSchema(opts?: {
  phone?: string
  addressAr?: string
  mapsUrl?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#localbusiness`,
    name: SITE_NAME_AR,
    alternateName: SITE_NAME_EN,
    url: SITE_URL,
    image: DEFAULT_OG_IMAGE,
    telephone: opts?.phone ? `+${opts.phone.replace(/^\+/, '')}` : undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: opts?.addressAr || 'بغداد',
      addressCountry: 'IQ',
    },
    geo: undefined,
    hasMap: opts?.mapsUrl || undefined,
    priceRange: '$$',
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      opens: '09:00',
      closes: '18:00',
    },
  }
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME_AR,
    alternateName: SITE_NAME_EN,
    url: SITE_URL,
    inLanguage: ['ar', 'en'],
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/works?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function imageObjectSchema(opts: {
  url: string
  name: string
  description?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    contentUrl: opts.url,
    url: opts.url,
    name: opts.name,
    description: opts.description || opts.name,
    creditText: SITE_NAME_AR,
  }
}

export function creativeWorkSchema(opts: {
  id: string
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  image: string
  materialsAr?: string
  category?: string
}) {
  const path = `/works/${opts.id}`
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': absoluteUrl(path),
    name: opts.titleAr,
    alternateName: opts.titleEn,
    description: opts.descriptionAr,
    image: opts.image,
    url: absoluteUrl(path),
    inLanguage: ['ar', 'en'],
    creator: {
      '@type': 'Organization',
      name: SITE_NAME_AR,
    },
    material: opts.materialsAr,
    genre: opts.category,
  }
}

export function autoImageAlt(src: string, fallback: string): string {
  const cleaned = fallback?.trim()
  if (cleaned) return cleaned
  try {
    const name = src.split('/').pop()?.split('?')[0] ?? ''
    if (!name) return SITE_NAME_AR
    return decodeURIComponent(name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' '))
  } catch {
    return SITE_NAME_AR
  }
}
