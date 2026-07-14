import type { Metadata } from 'next'
import FAQPage from '@/views/FAQPage'

export const metadata: Metadata = {
  title: 'الأسئلة الشائعة',
  description: 'إجابات عن المواد، التنفيذ، التوصيل، والطلب لدى ضرغام CNC.',
}

export default function Page() {
  return <FAQPage />
}
