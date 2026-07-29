/** Parse a data: URL into raw bytes for streaming from API routes. */
export function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl)
  if (!match) return null

  const mime = match[1] || 'application/octet-stream'
  const isBase64 = match[2] === ';base64'
  const data = match[3]

  try {
    const buffer = isBase64
      ? Buffer.from(data, 'base64')
      : Buffer.from(decodeURIComponent(data), 'utf8')
    return { mime, buffer }
  } catch {
    return null
  }
}
