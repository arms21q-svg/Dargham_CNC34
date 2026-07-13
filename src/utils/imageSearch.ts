export function getDominantColors(imageData: ImageData, count = 6): string[] {
  const colorMap = new Map<string, number>()
  const data = imageData.data
  const step = 4

  for (let i = 0; i < data.length; i += step * 3) {
    const alpha = data[i + 3]
    if (alpha < 140) continue

    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    // skip near-white / near-black noise
    const brightness = (r + g + b) / 3
    if (brightness > 245 || brightness < 12) continue

    const qr = Math.round(r / 20) * 20
    const qg = Math.round(g / 20) * 20
    const qb = Math.round(b / 20) * 20
    const key = `${qr},${qg},${qb}`
    colorMap.set(key, (colorMap.get(key) || 0) + 1)
  }

  return Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => {
      const [r, g, b] = key.split(',').map(Number)
      return `#${clampHex(r)}${clampHex(g)}${clampHex(b)}`
    })
}

function clampHex(n: number) {
  return Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
}

export function colorDistance(c1: string, c2: string): number {
  const parse = (hex: string) => {
    const h = hex.replace('#', '')
    return [
      parseInt(h.slice(0, 2), 16) || 0,
      parseInt(h.slice(2, 4), 16) || 0,
      parseInt(h.slice(4, 6), 16) || 0,
    ]
  }
  const [r1, g1, b1] = parse(c1)
  const [r2, g2, b2] = parse(c2)
  // weighted RGB distance (closer to human perception)
  return Math.sqrt(2 * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + 3 * (b1 - b2) ** 2)
}

const DEFAULT_WOOD_COLORS = ['#8B4513', '#D2691E', '#A0522D', '#DEB887', '#5C4033', '#C4A882']

export function getProductColors(product: { colors?: string[]; category?: string }): string[] {
  if (product.colors?.length) return product.colors
  return DEFAULT_WOOD_COLORS
}

/** Score product similarity using average of best color matches */
export function findSimilarProducts<T extends { id: string; colors?: string[]; category?: string }>(
  uploadedColors: string[],
  products: T[],
  limit = 12
): { product: T; score: number }[] {
  if (uploadedColors.length === 0 || products.length === 0) return []

  const scored = products
    .map((product) => {
      const palette = getProductColors(product)
      const distances: number[] = []

      for (const uploaded of uploadedColors) {
        let best = Infinity
        for (const productColor of palette) {
          best = Math.min(best, colorDistance(uploaded, productColor))
        }
        distances.push(best)
      }

      distances.sort((a, b) => a - b)
      const top = distances.slice(0, Math.min(3, distances.length))
      const avgDist = top.reduce((sum, d) => sum + d, 0) / top.length
      const score = Math.max(0, Math.min(100, Math.round(100 - avgDist * 0.28)))

      return { product, score }
    })
    .sort((a, b) => b.score - a.score)

  const meaningful = scored.filter((item) => item.score >= 20)
  if (meaningful.length > 0) return meaningful.slice(0, limit)

  return scored.slice(0, Math.min(limit, 8))
}

async function colorsFromBitmap(bitmap: ImageBitmap, sampleSize = 80): Promise<string[]> {
  const canvas = document.createElement('canvas')
  canvas.width = sampleSize
  canvas.height = sampleSize
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  if (!ctx) throw new Error('Canvas not supported')

  ctx.drawImage(bitmap, 0, 0, sampleSize, sampleSize)
  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize)
  return getDominantColors(imageData)
}

export async function extractColorsFromFile(file: File): Promise<string[]> {
  if (!file.type.startsWith('image/')) {
    throw new Error('يرجى اختيار ملف صورة')
  }

  const bitmap = await createImageBitmap(file)
  try {
    return await colorsFromBitmap(bitmap)
  } finally {
    bitmap.close()
  }
}

export async function extractColorsFromDataUrl(dataUrl: string): Promise<string[]> {
  const img = new Image()
  img.decoding = 'async'

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })

  await img.decode()

  const canvas = document.createElement('canvas')
  canvas.width = 80
  canvas.height = 80
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas not supported')

  ctx.drawImage(img, 0, 0, 80, 80)
  return getDominantColors(ctx.getImageData(0, 0, 80, 80))
}

export function downloadImage(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
