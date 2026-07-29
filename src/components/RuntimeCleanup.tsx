'use client'

import { useLayoutEffect } from 'react'
import { purgeStaleClientCache } from '@/utils/siteDataStorage'

/** Drop legacy SW + stale localStorage after deploy. Runs once before paint. */
export default function RuntimeCleanup() {
  useLayoutEffect(() => {
    purgeStaleClientCache()
  }, [])

  return null
}
