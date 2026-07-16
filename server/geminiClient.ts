/**
 * Gemini REST client — retry, timeout, model validation, structured logging.
 * Uses Google Generative Language API v1beta (generateContent / streamGenerateContent).
 */

export type GeminiErrorKind =
  | 'quota'
  | 'timeout'
  | 'auth'
  | 'server'
  | 'invalid_model'
  | 'invalid_key'
  | 'network'
  | 'empty'
  | 'unknown'

export interface GeminiResult {
  text: string | null
  ok: boolean
  status?: number
  kind?: GeminiErrorKind
  model?: string
  durationMs: number
  retries: number
  rawError?: string
}

const REQUEST_TIMEOUT_MS = 28_000
const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 600

function isProd() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
}

/** Reject values that look like API keys mistakenly put in GEMINI_MODEL. */
export function normalizeGeminiModel(raw: string | undefined | null): string | null {
  const m = (raw ?? '').trim().replace(/^models\//, '')
  if (!m) return null
  if (m.startsWith('AIza')) return null
  if (m.includes(' ') || m.includes('\n')) return null
  if (m.length > 64) return null
  if (!/^[a-zA-Z0-9._-]+$/.test(m)) return null
  return m
}

export function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) return null
  if (key.length < 20) {
    console.warn('[ai] GEMINI_API_KEY looks invalid (too short)')
    return null
  }
  return key
}

export function getGeminiModels(): string[] {
  const preferred = normalizeGeminiModel(process.env.GEMINI_MODEL)
  if (process.env.GEMINI_MODEL && !preferred) {
    console.warn(
      '[ai] GEMINI_MODEL is invalid (must be a model id like gemini-2.0-flash, not an API key). Falling back.'
    )
  }
  const primary = preferred || 'gemini-2.0-flash'
  const extras = ['gemini-2.0-flash', 'gemini-2.5-flash']
  return Array.from(new Set([primary, ...extras]))
}

export function classifyGeminiStatus(status: number, body: string): GeminiErrorKind {
  const lower = body.toLowerCase()
  if (status === 429 || lower.includes('quota') || lower.includes('resource_exhausted')) {
    return 'quota'
  }
  if (status === 401 || status === 403 || lower.includes('api key')) return 'auth'
  if (status === 404 || lower.includes('not found')) return 'invalid_model'
  if (status === 503 || status === 500 || status === 502) return 'server'
  if (status === 408) return 'timeout'
  return 'unknown'
}

export function serviceUnavailableMessage(lang: 'ar' | 'en'): string {
  return lang === 'ar'
    ? 'خدمة الذكاء الاصطناعي غير متاحة مؤقتًا، يرجى المحاولة لاحقًا.'
    : 'The AI service is temporarily unavailable. Please try again later.'
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function logGemini(event: Record<string, unknown>) {
  const line = {
    scope: 'gemini',
    ts: new Date().toISOString(),
    ...event,
  }
  if (event.ok) {
    console.info('[ai]', JSON.stringify(line))
  } else {
    console.error('[ai]', JSON.stringify(line))
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function geminiGenerateContent(opts: {
  apiKey: string
  body: unknown
  models?: string[]
}): Promise<GeminiResult> {
  const models = opts.models?.length ? opts.models : getGeminiModels()
  const started = Date.now()
  let retries = 0
  let last: GeminiResult = {
    text: null,
    ok: false,
    kind: 'unknown',
    durationMs: 0,
    retries: 0,
  }

  for (const model of models) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) retries += 1
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`
        const res = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(opts.body),
        })

        const raw = await res.text()
        if (!res.ok) {
          const kind = classifyGeminiStatus(res.status, raw)
          last = {
            text: null,
            ok: false,
            status: res.status,
            kind,
            model,
            durationMs: Date.now() - started,
            retries,
            rawError: raw.slice(0, 400),
          }

          logGemini({
            ok: false,
            op: 'generateContent',
            model,
            status: res.status,
            kind,
            attempt,
            durationMs: last.durationMs,
            error: last.rawError,
          })

          if (kind === 'quota' || kind === 'server') {
            const backoff = BASE_BACKOFF_MS * 2 ** attempt + Math.floor(Math.random() * 200)
            await sleep(backoff)
            continue
          }
          // auth / invalid model → try next model or stop
          break
        }

        let data: {
          candidates?: { content?: { parts?: { text?: string }[] } }[]
        }
        try {
          data = JSON.parse(raw) as typeof data
        } catch {
          last = {
            text: null,
            ok: false,
            kind: 'unknown',
            model,
            durationMs: Date.now() - started,
            retries,
            rawError: 'invalid JSON',
          }
          break
        }

        const text =
          data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() || null

        if (text) {
          const result: GeminiResult = {
            text,
            ok: true,
            status: 200,
            model,
            durationMs: Date.now() - started,
            retries,
          }
          logGemini({
            ok: true,
            op: 'generateContent',
            model,
            status: 200,
            attempt,
            durationMs: result.durationMs,
            retries,
          })
          return result
        }

        last = {
          text: null,
          ok: false,
          kind: 'empty',
          model,
          status: 200,
          durationMs: Date.now() - started,
          retries,
        }
        break
      } catch (err) {
        const aborted = err instanceof Error && err.name === 'AbortError'
        last = {
          text: null,
          ok: false,
          kind: aborted ? 'timeout' : 'network',
          model,
          durationMs: Date.now() - started,
          retries,
          rawError: err instanceof Error ? err.message : String(err),
        }
        logGemini({
          ok: false,
          op: 'generateContent',
          model,
          kind: last.kind,
          attempt,
          durationMs: last.durationMs,
          error: last.rawError,
        })
        const backoff = BASE_BACKOFF_MS * 2 ** attempt
        await sleep(backoff)
      }
    }
  }

  last.durationMs = Date.now() - started
  last.retries = retries
  return last
}

/** Stream tokens; throws/returns meta via callback on terminal failure. */
export async function* geminiStreamContent(opts: {
  apiKey: string
  body: unknown
  models?: string[]
  onFailure?: (result: GeminiResult) => void
}): AsyncGenerator<string, GeminiResult, unknown> {
  const models = opts.models?.length ? opts.models : getGeminiModels()
  const started = Date.now()
  let retries = 0
  let last: GeminiResult = {
    text: null,
    ok: false,
    kind: 'unknown',
    durationMs: 0,
    retries: 0,
  }

  for (const model of models) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) retries += 1
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(opts.apiKey)}`
        const res = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(opts.body),
        })

        if (!res.ok || !res.body) {
          const raw = await res.text().catch(() => '')
          const kind = classifyGeminiStatus(res.status, raw)
          last = {
            text: null,
            ok: false,
            status: res.status,
            kind,
            model,
            durationMs: Date.now() - started,
            retries,
            rawError: raw.slice(0, 400),
          }
          logGemini({
            ok: false,
            op: 'streamGenerateContent',
            model,
            status: res.status,
            kind,
            attempt,
            durationMs: last.durationMs,
            error: last.rawError,
          })
          if (kind === 'quota' || kind === 'server') {
            await sleep(BASE_BACKOFF_MS * 2 ** attempt)
            continue
          }
          break
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let yielded = false
        let assembled = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const chunks = buffer.split('\n')
          buffer = chunks.pop() ?? ''

          for (const line of chunks) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const payload = trimmed.slice(5).trim()
            if (!payload || payload === '[DONE]') continue

            // Skip error payloads that look like API errors
            if (payload.includes('"status"') && payload.includes('RESOURCE_EXHAUSTED')) {
              last = {
                text: null,
                ok: false,
                status: 429,
                kind: 'quota',
                model,
                durationMs: Date.now() - started,
                retries,
                rawError: payload.slice(0, 400),
              }
              opts.onFailure?.(last)
              return last
            }

            try {
              const json = JSON.parse(payload) as {
                candidates?: { content?: { parts?: { text?: string }[] } }[]
                error?: { message?: string; code?: number }
              }
              if (json.error) {
                const kind = classifyGeminiStatus(json.error.code ?? 500, json.error.message ?? '')
                last = {
                  text: null,
                  ok: false,
                  status: json.error.code,
                  kind,
                  model,
                  durationMs: Date.now() - started,
                  retries,
                  rawError: json.error.message,
                }
                opts.onFailure?.(last)
                return last
              }
              const text =
                json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
              if (text) {
                yielded = true
                assembled += text
                yield text
              }
            } catch {
              // ignore partial JSON
            }
          }
        }

        if (yielded) {
          const result: GeminiResult = {
            text: assembled,
            ok: true,
            status: 200,
            model,
            durationMs: Date.now() - started,
            retries,
          }
          logGemini({
            ok: true,
            op: 'streamGenerateContent',
            model,
            status: 200,
            durationMs: result.durationMs,
            retries,
          })
          return result
        }

        last = {
          text: null,
          ok: false,
          kind: 'empty',
          model,
          durationMs: Date.now() - started,
          retries,
        }
        break
      } catch (err) {
        const aborted = err instanceof Error && err.name === 'AbortError'
        last = {
          text: null,
          ok: false,
          kind: aborted ? 'timeout' : 'network',
          model,
          durationMs: Date.now() - started,
          retries,
          rawError: err instanceof Error ? err.message : String(err),
        }
        logGemini({
          ok: false,
          op: 'streamGenerateContent',
          model,
          kind: last.kind,
          attempt,
          error: last.rawError,
        })
        await sleep(BASE_BACKOFF_MS * 2 ** attempt)
      }
    }
  }

  last.durationMs = Date.now() - started
  last.retries = retries
  opts.onFailure?.(last)
  return last
}

export function logEnvHealth() {
  const key = getGeminiApiKey()
  const model = normalizeGeminiModel(process.env.GEMINI_MODEL) || 'gemini-2.0-flash'
  const jwtOk = Boolean(
    process.env.JWT_SECRET?.trim() &&
      process.env.JWT_SECRET !== 'dev-secret-change-me' &&
      (process.env.JWT_SECRET?.length ?? 0) >= 24
  )
  console.info(
    '[ai:env]',
    JSON.stringify({
      GEMINI_API_KEY: key ? 'set' : 'missing',
      GEMINI_MODEL: model,
      GEMINI_MODEL_RAW_VALID: Boolean(normalizeGeminiModel(process.env.GEMINI_MODEL)),
      JWT_SECRET: jwtOk ? 'ok' : isProd() ? 'missing_or_weak' : 'dev_default',
    })
  )
}
