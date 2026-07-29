import Link from 'next/link'
import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/404',
  title: 'الصفحة غير موجودة',
  description: 'الصفحة التي طلبتها غير موجودة على موقع ضرغام CNC.',
  noIndex: true,
})

export default function NotFound() {
  return (
    <div className="section-padding">
      <div className="container-main text-center">
        <h1 className="mb-3 text-4xl font-bold text-gray-800 dark:text-gray-100">
          الصفحة غير موجودة
        </h1>
        <p className="mb-8 text-gray-600 dark:text-gray-400">
          لم نتمكن من العثور على الصفحة المطلوبة.
        </p>
        <Link href="/" className="btn-primary">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  )
}
