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

const HISTORY_LIMIT = 10

const QUICK_QUESTIONS = {
  ar: ['ما هي أعمالكم؟', 'كم السعر؟', 'كيف أطلب تصميم؟', 'أين موقعكم؟'],
  en: ['What works do you offer?', 'What are the prices?', 'How to order custom?', 'Where are you?'],
}

function localImageReply(
  lang: 'ar' | 'en',
  siteData: ReturnType<typeof useSiteData>['siteData'],
  colors: string[]
) {
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

async function readSseChat(
  res: Response,
  onMeta: (meta: { mode?: string }) => void,
  onUpdate: (fullText: string) => void
): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No stream')

  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      for (const line of part.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload) continue
        try {
          const json = JSON.parse(payload) as {
            ok?: boolean
            mode?: string
            delta?: string
            done?: boolean
            reply?: string
            error?: string
          }
          if (json.error) throw new Error(json.error)
          if (json.mode && !json.delta) onMeta({ mode: json.mode })
          if (typeof json.delta === 'string' && json.delta) {
            full += json.delta
            onUpdate(full)
          } else if (json.done && typeof json.reply === 'string' && json.reply && !full) {
            full = json.reply
            onUpdate(full)
          }
        } catch (err) {
          if (err instanceof SyntaxError) continue
          throw err
        }
      }
    }
  }

  return full
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
  const [streaming, setStreaming] = useState(false)
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(
    null
  )
  const listRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const resetChat = useCallback(() => {
    setMessages([{ role: 'assistant', content: welcome }])
    setInput('')
    setPendingImage(null)
    setStreaming(false)
  }, [welcome])

  useEffect(() => {
    if (!open) {
      setMessages([])
      setInput('')
      setPendingImage(null)
      setStreaming(false)
      return
    }
    resetChat()
  }, [open, resetChat])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, streaming, pendingImage])

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
    setStreaming(false)

    const history = nextMessages
      .slice(-HISTORY_LIMIT)
      .map((m) => ({ role: m.role, content: m.content }))

    const fallback = image
      ? localImageReply(lang, siteData, [])
      : localAiReply(trimmed, lang, siteData)

    const resolveFallback = async () => {
      if (!image?.preview) return fallback
      try {
        const colors = await extractColorsFromDataUrl(image.preview)
        return localImageReply(lang, siteData, colors)
      } catch {
        return fallback
      }
    }

    const appendAssistant = (content: string) => {
      setMessages((prev) => [...prev, { role: 'assistant', content }])
    }

    const updateLastAssistant = (content: string) => {
      setMessages((prev) => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last?.role === 'assistant') {
          copy[copy.length - 1] = { ...last, content }
          return copy
        }
        return [...copy, { role: 'assistant', content }]
      })
    }

    try {
      const res = await fetch(apiUrl('/api/ai-chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          message: trimmed,
          lang,
          history,
          imageBase64: image?.base64,
          mimeType: image?.mimeType,
          stream: true,
        }),
      })

      const contentType = res.headers.get('content-type') || ''

      if (res.status === 403) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        appendAssistant(json.error || (lang === 'ar' ? 'المساعد غير متاح' : 'Assistant unavailable'))
        return
      }

      if (contentType.includes('text/event-stream') && res.ok && res.body) {
        setStreaming(true)
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

        const assembled = await readSseChat(
          res,
          () => {},
          (fullText) => {
            setMessages((prev) => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = { ...last, content: fullText }
              }
              return copy
            })
          }
        )

        if (!assembled.trim()) {
          updateLastAssistant(await resolveFallback())
        }
        return
      }

      // JSON fallback (non-stream)
      let json: { ok?: boolean; reply?: string; error?: string } = {}
      try {
        json = (await res.json()) as typeof json
      } catch {
        appendAssistant(await resolveFallback())
        return
      }

      if (json.ok && json.reply) {
        appendAssistant(json.reply)
        return
      }

      if (json.error && res.status === 403) {
        appendAssistant(json.error)
        return
      }

      if (typeof json.reply === 'string' && json.reply.trim()) {
        appendAssistant(json.reply)
        return
      }

      appendAssistant(await resolveFallback())
    } catch {
      appendAssistant(await resolveFallback())
    } finally {
      setLoading(false)
      setStreaming(false)
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
  const showTyping = loading && !streaming

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
              className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'rounded-ee-sm bg-primary-600 text-white'
                  : 'rounded-es-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
              }`}
            >
              {msg.imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={msg.imagePreview}
                  alt=""
                  className="mb-2 max-h-32 w-full rounded-lg object-cover"
                />
              )}
              {msg.content}
              {streaming && index === messages.length - 1 && msg.role === 'assistant' && (
                <span className="ms-0.5 inline-block h-3 w-0.5 animate-pulse bg-primary-500 align-middle" />
              )}
            </div>
          </div>
        ))}
        {showTyping && (
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
