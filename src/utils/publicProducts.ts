/** Public catalog helpers — hide unpublished works. */
export function isPublishedProduct(p: { published?: boolean }): boolean {
  return p.published !== false
}

export function publicProducts<T extends { published?: boolean }>(products: T[]): T[] {
  return products.filter(isPublishedProduct)
}
