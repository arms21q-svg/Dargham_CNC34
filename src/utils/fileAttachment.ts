import { formatFileSize } from './imageFile'

/** Max attachment size (PDF, design files, catalogs). */
export const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024
/** Max embedded attachment data URL length for publish. */
export const MAX_ATTACHMENT_DATA_CHARS = 4_000_000

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/postscript',
  'image/vnd.dwg',
  'image/x-dwg',
  'application/acad',
  'application/x-acad',
  'application/octet-stream',
])

const ALLOWED_EXT = new Set([
  'pdf',
  'zip',
  'rar',
  '7z',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'dwg',
  'dxf',
  'ai',
  'eps',
  'psd',
  'cdr',
  'svg',
  'png',
  'jpg',
  'jpeg',
])

export type ProductAttachment = {
  name: string
  mime: string
  size: number
  /** Base64 data URL — admin only; public uses /api/products/{id}/attachment */
  data?: string
}

export function attachmentProxyUrl(productId: string): string {
  return `/api/products/${encodeURIComponent(productId)}/attachment`
}

export function isAttachmentProxyUrl(url: string | undefined): boolean {
  return Boolean(url?.includes('/api/products/') && url.includes('/attachment'))
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

export function validateAttachmentFile(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return `حجم الملف كبير (${formatFileSize(file.size)}). الحد الأقصى ${formatFileSize(MAX_ATTACHMENT_SIZE)}`
  }

  const ext = extOf(file.name)
  const mimeOk = file.type && ALLOWED_MIME.has(file.type)
  const extOk = ext && ALLOWED_EXT.has(ext)

  if (!mimeOk && !extOk) {
    return 'نوع الملف غير مدعوم. يُقبل: PDF, ZIP, DOC, DWG, DXF, AI, PSD, SVG, PNG, JPG…'
  }

  return null
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') resolve(result)
      else reject(new Error('تعذر قراءة الملف'))
    }
    reader.onerror = () => reject(new Error('تعذر قراءة الملف'))
    reader.readAsDataURL(file)
  })
}

export async function fileToAttachment(file: File): Promise<ProductAttachment> {
  const validation = validateAttachmentFile(file)
  if (validation) throw new Error(validation)

  const data = await readFileAsDataUrl(file)
  if (data.length > MAX_ATTACHMENT_DATA_CHARS) {
    throw new Error(
      `الملف كبير جداً للتخزين (${formatFileSize(file.size)}). الحد ${formatFileSize(MAX_ATTACHMENT_SIZE)}`
    )
  }

  return {
    name: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    data,
  }
}

export function formatAttachmentType(mime: string, name: string): string {
  if (mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'PDF'
  const ext = extOf(name).toUpperCase()
  if (ext) return ext
  if (mime.includes('zip')) return 'ZIP'
  if (mime.includes('word')) return 'DOC'
  return mime.split('/').pop()?.toUpperCase() || 'ملف'
}
