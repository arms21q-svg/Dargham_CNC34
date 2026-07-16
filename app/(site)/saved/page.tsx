import type { Metadata } from 'next'
import SavedPage from '@/views/SavedPage'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbSchema, buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/saved',
  title: 'المحفوظات',
  description: 'الأعمال التي حفظتها من معرض ضرغام CNC للرجوع إليها لاحقاً.',
  noIndex: true,
})

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'الرئيسية', path: '/' },
          { name: 'المحفوظات', path: '/saved' },
        ])}
      />
      <SavedPage />
    </>
  )
}
