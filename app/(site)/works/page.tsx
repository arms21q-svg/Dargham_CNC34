import type { Metadata } from 'next'
import WorksPage from '@/views/WorksPage'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbSchema, buildPageMetadata, DEFAULT_OG_IMAGE } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/works',
  title: 'أعمالنا',
  description:
    'معرض أعمال ضرغام CNC — جداريات وأبواب وديكور خشبي بتقنية CNC، مع بحث بالصورة والذكاء الاصطناعي.',
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
      <WorksPage />
    </>
  )
}
