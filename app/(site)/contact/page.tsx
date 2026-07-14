import type { Metadata } from 'next'
import ContactPage from '@/views/ContactPage'

export const metadata: Metadata = {
  title: 'اتصل بنا',
  description: 'تواصل مع ضرغام CNC عبر واتساب أو زيارة الموقع على الخريطة.',
}

export default function Page() {
  return <ContactPage />
}
