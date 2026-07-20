import { redirect } from 'next/navigation'

/** Legacy URL — all works live at /works now. */
export default function AllWorksRedirectPage() {
  redirect('/works')
}
