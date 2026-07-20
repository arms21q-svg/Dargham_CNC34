import type { Metadata } from 'next'
import { Suspense } from 'react'
import AllWorksPage from '@/views/AllWorksPage'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbSchema, buildPageMetadata, DEFAULT_OG_IMAGE } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/works',
  title: 'أعمالنا',
  description: 'استعرض جميع أعمال ضرغام CNC — جداريات وأبواب وديكور خشبي بتقنية CNC مع التصفية حسب الفئة.',
  image: DEFAULT_OG_IMAGE,
})

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'الرئيسية', path: '/' },
          { name: 'أعمالنا', path: '/works' },
        ])}
      />
      <Suspense
        fallback={
          <div className="bg-black md:bg-transparent">
            <div className="section-padding !pt-6 md:!pt-10">
              <div className="container-main">
                <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-[#c9a227]/35 bg-[#141414] p-4">
                  <div className="mb-2 h-4 w-24 rounded bg-white/10" />
                  <div className="mb-2 h-11 rounded-xl bg-white/10" />
                  <div className="h-11 rounded-xl bg-[#c9a227]/25" />
                </div>
              </div>
            </div>
          </div>
        }
      >
        <AllWorksPage />
      </Suspense>
    </>
  )
}
