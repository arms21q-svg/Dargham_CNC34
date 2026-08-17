'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Refresh RSC HTML after admin publish so ISR pages pick up new products. */
export default function CatalogRefreshListener() {
  const router = useRouter()

  useEffect(() => {
    const onPublished = () => {
      router.refresh()
    }
    window.addEventListener('dorgham-catalog-published', onPublished)
    return () => window.removeEventListener('dorgham-catalog-published', onPublished)
  }, [router])

  return null
}
