'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'
import { apiUrl } from '../utils/apiBase'
import { prepareImageFile } from '../utils/imageAi'
import { extractColorsFromDataUrl, findSimilarProducts } from '../utils/imageSearch'
import { localAiReply } from '../utils/localAi'
import { getWhatsAppUrl } from '../utils/siteDataStorage'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  imagePreview?: string
}

interface AiChatPanelProps {
  open: boolean
  onClose: () => void
}

const QUICK_QUESTIONS = {
  ar: ['ما هي أعمالكم؟', 'كم السعر؟', 'كيف أطلب تصميم؟', 'أين موقعكم؟'],
  en: ['What works do you offer?', 'What are the prices?', 'How to order custom?', 'Where are you?'],
}

function localImageReply(lang: 'ar' | 'en', siteData: ReturnType<typeof useSiteData>['siteData'], colors: string[]) {
  const similar = findSimilarProducts(colors, siteData.products, 3)
  const whatsapp = siteData.contact.whatsapp

  if (similar.length > 0) {
    const titles = similar.map((item) => `• ${item.product.title[lang]}`).join('\n')
    return lang === 'ar'
      ? `حلّلت الصورة محلياً. أقرب أعمالنا:\n${titles}\n\nلتنفيذ تصميم مشابه، تواصل عبر واتساب: ${whatsapp}`
      : `I analyzed the image locally. Closest works:\n${titles}\n\nFor a similar custom design, contact us on WhatsApp: ${whatsapp}`
  }

  return lang === 'ar'
    ? `تم استلام الصورة. يمكننا تنفيذ تصاميم خشبية مشابهة بدقة CNC. للسعر الدقيق تواصل عبر واتساب: ${whatsapp}`
    : `Image received. We can produce similar CNC wood designs. For exact pricing contact us on WhatsApp: ${whatsapp}`
}

export default function AiChatPanel({ open, onClose }: AiChatPanelProps) {
  const { lang } = useApp()
  const { siteData } = useSiteData()
  const ai = siteData.contact.aiAssistant
  const welcome =
    ai?.welcomeMessage[lang] ??
    (lang === 'ar'
      ? 'مرحباً! أنا مساعد ضرغام CNC. اسألني عن أعمالنا، الأسعار، أو أرسل صورة لتحليلها.'
      : 'Hello! Ask about our works and prices, or send an image to analyze.')

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(
    null
  )
  const listRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const resetChat = useCallback(() => {
    setMessages([{ role: 'assistant', content: welcome }])
    setInput('')
    setPendingImage(null)
  }, [welcome])

  useEffect(() => {
    if (!open) {
      setMessages([])
      setInput('')
      setPendingImage(null)
      return
    }
    resetChat()
  }, [open, resetChat])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, pendingImage])

  const sendMessage = async (text: string, image?: { base64: string; mimeType: string; preview: string }) => {
    const trimmed = text.trim()
    if ((!trimmed && !image) || loading) return

    const displayText =
      trimmed ||
      (lang === 'ar' ? '📷 صورة مرفقة للتحليل' : '📷 Image attached for analysis')

    const userMessage: ChatMessage = {
      role: 'user',
      content: displayText,
      imagePreview: image?.preview,
    }

    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setPendingImage(null)
    setLoading(true)

    const fallback = image
      ? localImageReply(lang, siteData, [])
      : localAiReply(trimmed, lang, siteData)

    const imageFallback = async () => {
      if (!image?.preview) return fallback
      try {
        const colors = await extractColorsFromDataUrl(image.preview)
        return localImageReply(lang, siteData, colors)
      } catch {
        return fallback
      }
    }

    const resolveFallback = async () => {
      if (image) return imageFallback()
      return fallback
    }

    try {
      const res = await fetch(apiUrl('/api/ai-chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          lang,
          history: nextMessages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
          imageBase64: image?.base64,
          mimeType: image?.mimeType,
        }),
      })

      let json: { ok?: boolean; reply?: string; error?: string } = {}
      try {
        json = (await res.json()) as typeof json
      } catch {
        const reply = await resolveFallback()
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
        return
      }

      if (json.ok && json.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: json.reply! }])
        return
      }

      if (json.error && res.status === 403) {
        setMessages((prev) => [...prev, { role: 'assistant', content: json.error! }])
        return
      }

      // Prefer server-provided fallback text when present
      if (typeof json.reply === 'string' && json.reply.trim()) {
        setMessages((prev) => [...prev, { role: 'assistant', content: json.reply! }])
        return
      }

      const reply = await resolveFallback()
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch {
      const reply = await resolveFallback()
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } finally {
      setLoading(false)
    }
  }

  const handleImagePick = async (file: File) => {
    try {
      const prepared = await prepareImageFile(file, 900, 0.85)
      setPendingImage({
        base64: prepared.base64,
        mimeType: prepared.mimeType,
        preview: prepared.dataUrl,
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'تعذر تحميل الصورة')
    }
  }

  if (!open) return null

  const whatsappUrl = getWhatsAppUrl(siteData.contact, lang)

  return (
    <div className="w-[min(92vw,340px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-base">
            ✨
          </span>
          <div>
            <p className="text-sm font-bold">{lang === 'ar' ? 'المساعد الذكي' : 'AI Assistant'}</p>
            <p className="text-[11px] text-white/85">
              {lang === 'ar' ? 'نص + تحليل صور' : 'Text + image analysis'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={resetChat}
            className="rounded-lg px-2 py-1 text-xs hover:bg-white/20"
            title={lang === 'ar' ? 'محادثة جديدة' : 'New chat'}
          >
            {lang === 'ar' ? 'جديد' : 'New'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-white/20"
            aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={listRef} className="max-h-72 space-y-2 overflow-y-auto p-3">
        {messages.map((msg, index) => (
          <div
            key={`${msg.role}-${index}`}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-ee-sm bg-primary-600 text-white'
                  : 'rounded-es-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
              }`}
            >
              {msg.imagePreview && (
                <img
                  src={msg.imagePreview}
                  alt=""
                  className="mb-2 max-h-32 w-full rounded-lg object-cover"
                />
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-es-sm bg-gray-100 px-3 py-2 text-sm dark:bg-gray-800">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-800">
        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          {lang === 'ar' ? 'أسئلة سريعة:' : 'Quick questions:'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS[lang].map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => sendMessage(q)}
              className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100 disabled:opacity-50 dark:bg-primary-950 dark:text-primary-300 dark:hover:bg-primary-900"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {pendingImage && (
        <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <img src={pendingImage.preview} alt="" className="h-14 w-14 rounded-lg object-cover" />
            <p className="flex-1 text-xs text-gray-500 dark:text-gray-400">
              {lang === 'ar' ? 'صورة جاهزة للإرسال' : 'Image ready to send'}
            </p>
            <button
              type="button"
              onClick={() => setPendingImage(null)}
              className="text-xs text-red-500"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <form
        className="flex gap-2 border-t border-gray-100 p-3 dark:border-gray-800"
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage(input, pendingImage ?? undefined)
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImagePick(file)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="btn-secondary shrink-0 !px-3 !py-2.5 text-sm"
          title={lang === 'ar' ? 'إرفاق صورة' : 'Attach image'}
        >
          📷
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={lang === 'ar' ? 'اكتب سؤالك أو أرفق صورة...' : 'Type or attach an image...'}
          className="input-field !py-2.5 text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || (!input.trim() && !pendingImage)}
          className="btn-primary shrink-0 !px-4 !py-2.5 text-sm disabled:opacity-50"
        >
          {lang === 'ar' ? 'إرسال' : 'Send'}
        </button>
      </form>

      <div className="flex gap-2 border-t border-gray-100 p-3 dark:border-gray-800">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-bold text-white hover:bg-[#20BD5A]"
        >
          WhatsApp
        </a>
        <Link
          href="/works"
          onClick={onClose}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary-600 px-3 py-2 text-xs font-bold text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-950"
        >
          {lang === 'ar' ? 'أعمالنا' : 'Our works'}
        </Link>
      </div>
    </div>
  )
}
