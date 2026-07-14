import type { Metadata } from 'next'
import AllWorksPage from '@/views/AllWorksPage'

export const metadata: Metadata = {
  title: 'كل الأعمال',
  description: 'تصفح جميع أعمال ضرغام CNC مع البحث والفلاتر والبحث بالصورة.',
}

export default function Page() {
  return <AllWorksPage />
}
