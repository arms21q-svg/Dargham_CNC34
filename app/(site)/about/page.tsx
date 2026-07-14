import type { Metadata } from 'next'
import AboutPage from '@/views/AboutPage'

export const metadata: Metadata = {
  title: 'من نحن',
  description: 'تعرّف على ورشة ضرغام CNC وخبرتنا في التصاميم الخشبية بتقنية CNC.',
}

export default function Page() {
  return <AboutPage />
}
