const MAX_FILE_SIZE = 8 * 1024 * 1024

export async function fileToDataUrl(
  file: File,
  maxWidth = 1200,
  quality = 0.82
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('يرجى اختيار ملف صورة')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('حجم الصورة كبير جداً. الحد الأقصى 8 ميجابايت')
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('تعذر معالجة الصورة')

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const dataUrl = canvas.toDataURL(mime, quality)

  if (dataUrl.length > 2_000_000) {
    throw new Error('الصورة كبيرة بعد الضغط. جرّب صورة أصغر أو استخدم رابط خارجي')
  }

  return dataUrl
}
