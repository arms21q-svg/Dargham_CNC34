import type { PortfolioCategory } from '../types/siteData'

/** Default portfolio categories — fully editable from admin after seed. */
export function createDefaultCategories(): PortfolioCategory[] {
  const rows: Omit<PortfolioCategory, 'id'>[] = [
    {
      slug: 'doors',
      title: { ar: 'أبواب', en: 'Doors' },
      description: { ar: 'أبواب خشبية منحوتة بتقنية CNC', en: 'CNC carved wooden doors' },
      image:
        'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&fm=webp&w=640&q=72',
      enabled: true,
      sortOrder: 0,
    },
    {
      slug: 'kitchens',
      title: { ar: 'مطابخ', en: 'Kitchens' },
      description: { ar: '', en: '' },
      image:
        'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&fm=webp&w=640&q=72',
      enabled: true,
      sortOrder: 1,
    },
    {
      slug: 'bedrooms',
      title: { ar: 'غرف نوم', en: 'Bedrooms' },
      description: { ar: '', en: '' },
      image:
        'https://images.unsplash.com/photo-1616594039964-40874a7a7439?auto=format&fit=crop&fm=webp&w=640&q=72',
      enabled: true,
      sortOrder: 2,
    },
    {
      slug: 'decor',
      title: { ar: 'ديكورات', en: 'Decor' },
      description: { ar: '', en: '' },
      image:
        'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&fm=webp&w=640&q=72',
      enabled: true,
      sortOrder: 3,
    },
    {
      slug: 'cnc',
      title: { ar: 'CNC', en: 'CNC' },
      description: { ar: '', en: '' },
      image:
        'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&fm=webp&w=640&q=72',
      enabled: true,
      sortOrder: 4,
    },
    {
      slug: 'mdf',
      title: { ar: 'MDF', en: 'MDF' },
      description: { ar: '', en: '' },
      image:
        'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&fm=webp&w=640&q=72',
      enabled: true,
      sortOrder: 5,
    },
    {
      slug: 'facades',
      title: { ar: 'واجهات', en: 'Facades' },
      description: { ar: '', en: '' },
      image:
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&fm=webp&w=640&q=72',
      enabled: true,
      sortOrder: 6,
    },
    {
      slug: 'staircases',
      title: { ar: 'درابزين', en: 'Staircases' },
      description: { ar: '', en: '' },
      image:
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&fm=webp&w=640&q=72',
      enabled: true,
      sortOrder: 7,
    },
    {
      slug: 'tables',
      title: { ar: 'طاولات', en: 'Tables' },
      description: { ar: '', en: '' },
      image:
        'https://images.unsplash.com/photo-1532372320572-cda25653a26d?auto=format&fit=crop&fm=webp&w=640&q=72',
      enabled: true,
      sortOrder: 8,
    },
    {
      slug: 'cabinets',
      title: { ar: 'خزائن', en: 'Cabinets' },
      description: { ar: '', en: '' },
      image:
        'https://images.unsplash.com/photo-1595428774223-ef526241018b?auto=format&fit=crop&fm=webp&w=640&q=72',
      enabled: true,
      sortOrder: 9,
    },
  ]

  return rows.map((row, index) => ({
    ...row,
    id: `cat-${row.slug}`,
    sortOrder: index,
  }))
}

/** Map legacy hardcoded category keys to new category slugs. */
export const LEGACY_CATEGORY_SLUG: Record<string, string> = {
  wallArt: 'decor',
  furniture: 'tables',
  decor: 'decor',
  doors: 'doors',
  panels: 'facades',
  custom: 'cnc',
}
