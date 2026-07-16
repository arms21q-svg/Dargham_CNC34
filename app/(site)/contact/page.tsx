import type { Metadata } from 'next'
import ContactPage from '@/views/ContactPage'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbSchema, buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/contact',
  title: 'اتصل بنا',
  description:
    'تواصل مع ضرغام CNC عبر واتساب أو النموذج أو الخريطة — استفسارات التصاميم والطلبات في العراق.',
})

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'الرئيسية', path: '/' },
          { name: 'اتصل بنا', path: '/contact' },
        ])}
      />
      <ContactPage />
    </>
  )
}
