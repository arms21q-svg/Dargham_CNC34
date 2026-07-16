import type { Metadata } from 'next'
import FAQPage from '@/views/FAQPage'
import JsonLd from '@/components/seo/JsonLd'
import { translations } from '@/data/content'
import { breadcrumbSchema, buildPageMetadata, faqSchema } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/faq',
  title: 'الأسئلة الشائعة',
  description:
    'إجابات عن تقنية CNC، المواد، مدة التنفيذ، التوصيل، الضمان، والطلبات المخصصة لدى ضرغام CNC.',
})

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: 'الرئيسية', path: '/' },
            { name: 'الأسئلة الشائعة', path: '/faq' },
          ]),
          faqSchema(translations.ar.faq.items),
        ]}
      />
      <FAQPage />
    </>
  )
}
