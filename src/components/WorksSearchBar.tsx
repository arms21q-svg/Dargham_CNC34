'use client'

import { useState } from 'react'
import WorksImageSearch, { type WorksImageSearchResult } from './WorksImageSearch'
import { useApp } from '../context/AppContext'

export type { WorksImageSearchResult }

interface WorksSearchBarProps {
  search: string
  onSearchChange: (value: string) => void
  imageSearch: WorksImageSearchResult | null
  onImageResult: (result: WorksImageSearchResult) => void
  onClearImage: () => void
  /** Extra clear (e.g. category reset) */
  onClearAll?: () => void
  disabledTextWhileImage?: boolean
}

/**
 * Always-mounted text + image search bar (no dynamic import — avoids missing UI).
 */
export default function WorksSearchBar({
  search,
  onSearchChange,
  imageSearch,
  onImageResult,
  onClearImage,
  onClearAll,
  disabledTextWhileImage = true,
}: WorksSearchBarProps) {
  const { t } = useApp()
  const [imagePanelOpen, setImagePanelOpen] = useState(false)

  const clearAll = () => {
    onSearchChange('')
    onClearImage()
    setImagePanelOpen(false)
    onClearAll?.()
  }

  const hasActive = Boolean(search.trim() || imageSearch || imagePanelOpen)

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-[#c9a227]/35 bg-[#141414] p-3 md:border-gray-200 md:bg-white md:p-4 md:shadow-sm dark:md:border-gray-700 dark:md:bg-gray-900">
      <label
        className="mb-1.5 block text-xs font-medium text-[#e8c547] md:text-sm md:text-gray-700 dark:md:text-gray-300"
        htmlFor="works-unified-search"
      >
        {t.works.search}
      </label>

      <div className="flex flex-col gap-2">
        <input
          id="works-unified-search"
          type="search"
          value={search}
          onChange={(e) => {
            onSearchChange(e.target.value)
            if (e.target.value.trim()) {
              onClearImage()
              setImagePanelOpen(false)
            }
          }}
          placeholder={t.works.searchPlaceholder}
          className="input-field min-w-0 w-full border-white/10 bg-black text-white placeholder:text-white/40 md:border-gray-200 md:bg-white md:text-gray-900 dark:md:border-gray-700 dark:md:bg-gray-950 dark:md:text-gray-100"
          autoComplete="off"
          disabled={disabledTextWhileImage && Boolean(imageSearch)}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setImagePanelOpen((v) => !v)
              onSearchChange('')
            }}
            aria-expanded={imagePanelOpen}
            aria-controls="works-image-search-panel"
            className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              imagePanelOpen || imageSearch
                ? 'bg-[#c9a227] text-black'
                : 'border border-[#c9a227]/50 bg-[#c9a227]/15 text-[#e8c547] hover:bg-[#c9a227]/25'
            }`}
          >
            <span aria-hidden>📷</span>
            <span>{t.works.searchByImage}</span>
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={!hasActive}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-40 md:border-gray-200 md:text-gray-600 dark:md:border-gray-700 dark:md:text-gray-300"
          >
            {t.works.clearResults}
          </button>
        </div>
      </div>

      <div id="works-image-search-panel">
        <WorksImageSearch
          open={imagePanelOpen}
          onClose={() => setImagePanelOpen(false)}
          onResult={(result) => {
            onImageResult(result)
            onSearchChange('')
            setImagePanelOpen(false)
          }}
        />
      </div>
    </div>
  )
}
