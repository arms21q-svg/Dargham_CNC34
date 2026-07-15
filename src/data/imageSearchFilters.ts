import type { Lang } from './content'

export interface ImageSearchFilter {
  id: string
  label: { ar: string; en: string }
  keywords: string[]
}

/** Post-search filters for materials / techniques / styles */
export const IMAGE_SEARCH_FILTERS: ImageSearchFilter[] = [
  {
    id: 'mdf',
    label: { ar: 'MDF', en: 'MDF' },
    keywords: ['mdf', 'ام دي اف', 'إم دي إف', 'ام دي اف'],
  },
  {
    id: 'acrylic',
    label: { ar: 'أكريليك', en: 'Acrylic' },
    keywords: ['أكريليك', 'اكريليك', 'acrylic', 'plexiglass'],
  },
  {
    id: 'metal',
    label: { ar: 'معادن', en: 'Metal' },
    keywords: ['معدن', 'معادن', 'metal', 'حديد', 'ستانلس', 'نحاس', 'ألمنيوم'],
  },
  {
    id: 'carve',
    label: { ar: 'حفر', en: 'Carving' },
    keywords: ['حفر', 'نحت', 'carve', 'carving', 'cnc'],
  },
  {
    id: 'laser',
    label: { ar: 'قص ليزر', en: 'Laser cut' },
    keywords: ['ليزر', 'قص ليزر', 'laser', 'cut'],
  },
  {
    id: 'engraving',
    label: { ar: 'نقش', en: 'Engraving' },
    keywords: ['نقش', 'engraving', 'engrave'],
  },
  {
    id: 'facade',
    label: { ar: 'واجهات', en: 'Facades' },
    keywords: ['واجهة', 'واجهات', 'facade', 'واجهة محل', 'doors', 'أبواب'],
  },
  {
    id: 'decor',
    label: { ar: 'ديكور', en: 'Decor' },
    keywords: ['ديكور', 'decor', 'decoration', 'جدارية', 'wall'],
  },
]

export function productMatchesFilter(
  product: {
    title: { ar: string; en: string }
    description: { ar: string; en: string }
    materials: { ar: string; en: string }
    category: string
  },
  filterId: string,
  analysisTags: string[] = []
): boolean {
  const filter = IMAGE_SEARCH_FILTERS.find((f) => f.id === filterId)
  if (!filter) return true

  const hay = [
    product.title.ar,
    product.title.en,
    product.description.ar,
    product.description.en,
    product.materials.ar,
    product.materials.en,
    product.category,
    ...analysisTags,
  ]
    .join(' ')
    .toLowerCase()

  return filter.keywords.some((k) => hay.includes(k.toLowerCase()))
}

export function filterLabel(id: string, lang: Lang): string {
  return IMAGE_SEARCH_FILTERS.find((f) => f.id === id)?.label[lang] ?? id
}
