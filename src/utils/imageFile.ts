const MAX_FILE_SIZE = 6 * 1024 * 1024
/** Keep embedded images small enough for fast admin publish. */
const MAX_DATA_URL_CHARS = 700_000

export async function fileToDataUrl(
  file: File,
  maxWidth = 900,
  quality = 0.72
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('يرجى اختيار ملف صورة')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('حجم الصورة كبير جداً. الحد الأقصى 6 ميجابايت')
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

  // Prefer JPEG for smaller publish payloads (PNG stays for transparency).
  const preferPng = file.type === 'image/png'
  let dataUrl = preferPng
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', quality)

  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    dataUrl = canvas.toDataURL('image/jpeg', Math.min(quality, 0.62))
  }

  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    const smaller = document.createElement('canvas')
    const ratio = 720 / width
    smaller.width = Math.round(width * Math.min(1, ratio))
    smaller.height = Math.round(height * Math.min(1, ratio))
    const sctx = smaller.getContext('2d')
    if (!sctx) throw new Error('تعذر معالجة الصورة')
    sctx.drawImage(canvas, 0, 0, smaller.width, smaller.height)
    dataUrl = smaller.toDataURL('image/jpeg', 0.58)
  }

  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error('الصورة كبيرة بعد الضغط. استخدم رابط URL بدل الرفع من الجهاز')
  }

  return dataUrl
}
