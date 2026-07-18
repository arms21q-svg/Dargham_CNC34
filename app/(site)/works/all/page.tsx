import type { Metadata } from 'next'
import { Suspense } from 'react'
import AllWorksPage from '@/views/AllWorksPage'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbSchema, buildPageMetadata, DEFAULT_OG_IMAGE } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/works/all',
  title: 'جميع الأعمال',
  description: 'استعرض جميع أعمال ضرغام CNC — جداريات وأبواب وديكور خشبي بتقنية CNC.',
  image: DEFAULT_OG_IMAGE,
})

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'الرئيسية', path: '/' },
          { name: 'أعمال مميزة', path: '/works' },
          { name: 'جميع الأعمال', path: '/works/all' },
        ])}
      />
      <Suspense
        fallback={
          <div className="section-padding">
            <div className="container-main py-16 text-center text-gray-500">…</div>
          </div>
        }
      >
        <AllWorksPage />
      </Suspense>
    </>
  )
}
