import type { Metadata } from 'next'
import HomePage from '@/views/HomePage'

export const metadata: Metadata = {
  title: 'الرئيسية',
  description:
    'ضرغام CNC — تصاميم خشبية فاخرة بتقنية CNC في العراق. استعرض أعمالنا وتواصل معنا.',
  openGraph: {
    title: 'ضرغام CNC | الصفحة الرئيسية',
    description: 'تصاميم خشبية فاخرة بتقنية CNC في العراق.',
  },
}

export default function Page() {
  return <HomePage />
}
