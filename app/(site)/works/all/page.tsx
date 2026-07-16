import type { Metadata } from 'next'
import AllWorksPage from '@/views/AllWorksPage'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbSchema, buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/works/all',
  title: 'كل الأعمال',
  description:
    'تصفح جميع أعمال ضرغام CNC مع البحث النصي والفلاتر والبحث بالصورة لإيجاد التصاميم المشابهة.',
})

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'الرئيسية', path: '/' },
          { name: 'أعمالنا', path: '/works' },
          { name: 'كل الأعمال', path: '/works/all' },
        ])}
      />
      <AllWorksPage />
    </>
  )
}
