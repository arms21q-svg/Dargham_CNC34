import type { Metadata } from 'next'
import HomePage from '@/views/HomePage'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbSchema, buildPageMetadata, DEFAULT_OG_IMAGE } from '@/lib/seo'
import { heroPreloadHref, shouldPreloadHeroImage } from '@/lib/heroPreload'
import { getPublicSiteBootstrap } from '@server/publicSiteBootstrap'

export const revalidate = 120

export const metadata: Metadata = buildPageMetadata({
  path: '/',
  title: 'الرئيسية',
  description:
    'ضرغام CNC — تصاميم خشبية فاخرة بتقنية CNC في العراق. استعرض أعمالنا وتواصل معنا لجداريات وأبواب وديكور مخصص.',
  image: DEFAULT_OG_IMAGE,
})

export default async function Page() {
  const bootstrap = await getPublicSiteBootstrap()
  const heroSrc = bootstrap?.home?.slideImages?.[0]

  return (
    <>
      {shouldPreloadHeroImage(heroSrc) ? (
        <link rel="preload" as="image" href={heroPreloadHref(heroSrc)} fetchPriority="high" />
      ) : null}
      <JsonLd
        data={breadcrumbSchema([
          { name: 'الرئيسية', path: '/' },
        ])}
      />
      <HomePage />
    </>
  )
}
