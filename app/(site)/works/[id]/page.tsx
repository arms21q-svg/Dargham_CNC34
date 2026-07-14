import type { Metadata } from 'next'
import ProductDetailPage from '@/views/ProductDetailPage'

export const metadata: Metadata = {
  title: 'تفاصيل العمل',
  description: 'تفاصيل عمل من معرض ضرغام CNC.',
}

export default function Page() {
  return <ProductDetailPage />
}
