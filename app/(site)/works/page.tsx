import type { Metadata } from 'next'
import WorksPage from '@/views/WorksPage'

export const metadata: Metadata = {
  title: 'أعمالنا',
  description: 'معرض أعمال ضرغام CNC — جداريات وأبواب وديكور خشبي بتقنية CNC.',
}

export default function Page() {
  return <WorksPage />
}
