import type { Metadata } from 'next'
import AboutPage from '@/views/AboutPage'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbSchema, buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/about',
  title: 'من نحن',
  description:
    'تعرّف على ورشة ضرغام CNC في العراق: قصتنا، مهمتنا، ورؤيتنا في التصاميم الخشبية بتقنية CNC.',
})

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'الرئيسية', path: '/' },
          { name: 'من نحن', path: '/about' },
        ])}
      />
      <AboutPage />
    </>
  )
}
