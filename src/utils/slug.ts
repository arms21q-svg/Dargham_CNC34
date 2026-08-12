/** URL-safe slug from English/Arabic title (prefers Latin slug when provided). */
export function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return base || 'category'
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  const slug = slugify(base)
  if (!taken.has(slug)) return slug
  let n = 2
  while (taken.has(`${slug}-${n}`)) n += 1
  return `${slug}-${n}`
}
