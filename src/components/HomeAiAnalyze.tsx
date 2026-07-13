import { useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'
import { analyzeImageWithAi } from '../utils/imageAi'
import { extractColorsFromFile, findSimilarProducts } from '../utils/imageSearch'
import { getWhatsAppUrl } from '../utils/siteDataStorage'

export default function HomeAiAnalyze() {
  const { lang } = useApp()
  const { siteData } = useSiteData()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [reply, setReply] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [similarTitles, setSimilarTitles] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)

  const title = lang === 'ar' ? 'تحليل صورتك بالذكاء الاصطناعي' : 'AI Image Analysis'
  const subtitle =
    lang === 'ar'
      ? 'ارفع صورة تصميم أو قطعة خشب — نحلّلها ونقترح كيف ننفّذها بتقنية CNC'
      : 'Upload a design or wood photo — we analyze it and suggest how to craft it with CNC'

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(lang === 'ar' ? 'الملف يجب أن يكون صورة' : 'Please choose an image file')
      return
    }

    setLoading(true)
    setError(null)
    setReply(null)
    setSimilarTitles([])

    let url: string | null = null
    try {
      url = URL.createObjectURL(file)
      setPreview(url)

      const colors = await extractColorsFromFile(file)
      const similar = findSimilarProducts(colors, siteData.products, 3)
      setSimilarTitles(similar.map((s) => s.product.title[lang]))

      const ai = await analyzeImageWithAi(
        file,
        lang,
        lang === 'ar'
          ? 'حلّل هذه الصورة كتصميم خشبي CNC: نوع العمل، الألوان، الخامة المحتملة، وهل يمكن تنفيذها؟ اقترح أفكار تنفيذ مختصرة.'
          : 'Analyze this image as a CNC wood design: type, colors, likely material, feasibility, and brief production ideas.'
      )

      if (ai?.reply) {
        setReply(ai.reply)
      } else if (similar.length > 0) {
        setReply(
          lang === 'ar'
            ? `تم تحليل الألوان محلياً. أقرب أعمالنا: ${similar.map((s) => s.product.title.ar).join('، ')}. يمكننا تنفيذ تصميم مشابه بدقة CNC — تواصل معنا للتفاصيل.`
            : `Local color analysis: closest works are ${similar.map((s) => s.product.title.en).join(', ')}. We can craft a similar CNC design — contact us for details.`
        )
      } else {
        setReply(
          lang === 'ar'
            ? 'تم استلام الصورة. يمكننا تنفيذ تصاميم خشبية مشابهة بتقنية CNC. أرسلها عبر واتساب لتقييم أدق وسعر.'
            : 'Image received. We can produce similar CNC wood designs. Send it on WhatsApp for a precise quote.'
        )
      }
    } catch (err) {
      if (url) URL.revokeObjectURL(url)
      setPreview(null)
      setError(err instanceof Error ? err.message : lang === 'ar' ? 'تعذر التحليل' : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const clear = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setReply(null)
    setError(null)
    setSimilarTitles([])
    if (fileRef.current) fileRef.current.value = ''
  }

  const whatsappUrl = getWhatsAppUrl(siteData.contact, lang)

  return (
    <section className="section-padding bg-gradient-to-br from-violet-50 via-white to-primary-50 dark:from-violet-950/40 dark:via-gray-950 dark:to-primary-950/30">
      <div className="container-main">
        <div className="mb-8 text-center">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-1 text-sm font-semibold text-white">
            ✨ AI
          </p>
          <h2 className="mb-2 text-3xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
          <p className="mx-auto max-w-2xl text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2" dir="ltr">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />

            {preview ? (
              <div className="card space-y-4 p-4">
                <img
                  src={preview}
                  alt=""
                  className="h-64 w-full rounded-2xl object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary flex-1 !py-2 text-sm">
                    {lang === 'ar' ? 'تغيير الصورة' : 'Change image'}
                  </button>
                  <button type="button" onClick={clear} className="btn-ghost !py-2 text-sm text-red-500">
                    {lang === 'ar' ? 'مسح' : 'Clear'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragEnter={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e: DragEvent) => {
                  e.preventDefault()
                  setDragging(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) handleFile(file)
                }}
                className={`card flex h-72 w-full flex-col items-center justify-center gap-3 border-2 border-dashed p-6 transition-colors ${
                  dragging
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40'
                    : 'border-gray-200 hover:border-violet-400 dark:border-gray-700'
                }`}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-2xl dark:bg-violet-900">
                  📷
                </span>
                <span className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  {lang === 'ar' ? 'ارفع صورة للتحليل' : 'Upload an image to analyze'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'ar' ? 'اسحب وأفلت أو اضغط للاختيار' : 'Drag & drop or click to browse'}
                </span>
              </button>
            )}
          </div>

          <div
            className="card flex min-h-[18rem] flex-col p-6"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            {loading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
                <p className="font-medium text-gray-700 dark:text-gray-200">
                  {lang === 'ar' ? 'جاري تحليل الصورة...' : 'Analyzing your image...'}
                </p>
              </div>
            ) : reply ? (
              <div className="flex flex-1 flex-col">
                <h3 className="mb-3 font-semibold text-violet-700 dark:text-violet-300">
                  {lang === 'ar' ? 'نتيجة التحليل' : 'Analysis result'}
                </h3>
                <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                  {reply}
                </p>
                {similarTitles.length > 0 && (
                  <div className="mt-4 rounded-xl bg-primary-50 p-3 text-sm dark:bg-primary-950/50">
                    <p className="mb-1 font-medium text-primary-800 dark:text-primary-200">
                      {lang === 'ar' ? 'أعمال قريبة من صورتك:' : 'Works close to your photo:'}
                    </p>
                    <ul className="list-inside list-disc text-primary-700 dark:text-primary-300">
                      {similarTitles.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-[#25D366] px-4 py-2 text-sm font-bold text-white hover:bg-[#20BD5A]"
                  >
                    WhatsApp
                  </a>
                  <Link to="/works/all" className="btn-secondary !px-4 !py-2 text-sm">
                    {lang === 'ar' ? 'بحث بالصورة في الأعمال' : 'Search works by image'}
                  </Link>
                  <Link to="/contact" className="btn-primary !px-4 !py-2 text-sm">
                    {lang === 'ar' ? 'طلب تنفيذ' : 'Request quote'}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-gray-500 dark:text-gray-400">
                <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                  {lang === 'ar' ? 'النتيجة تظهر هنا' : 'Results appear here'}
                </p>
                <p className="max-w-sm text-sm">
                  {lang === 'ar'
                    ? 'بعد رفع الصورة ستحصل على وصف للتصميم واقتراحات التنفيذ وأعمال مشابهة.'
                    : 'After upload you get a design description, production tips, and similar works.'}
                </p>
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </div>
      </div>
    </section>
  )
}
