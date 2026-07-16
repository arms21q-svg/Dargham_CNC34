import type { Metadata } from 'next'
import HomePage from '@/views/HomePage'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbSchema, buildPageMetadata, DEFAULT_OG_IMAGE } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/',
  title: 'الرئيسية',
  description:
    'ضرغام CNC — تصاميم خشبية فاخرة بتقنية CNC في العراق. استعرض أعمالنا وتواصل معنا لجداريات وأبواب وديكور مخصص.',
  image: DEFAULT_OG_IMAGE,
})

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'الرئيسية', path: '/' },
        ])}
      />
      <HomePage />
    </>
  )
}
