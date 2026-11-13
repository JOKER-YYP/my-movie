import { Readable } from 'node:stream'
import { Router } from 'express'
import { isProbablyM3u8, rewriteM3u8, stripAdGroups } from '../services/libretv/m3u8.js'
import { fail } from '../utils/response.js'
import { logger } from '../utils/logger.js'

export const proxyRouter = Router()

const UA =
  process.env.USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

function timeoutMs(): number {
  const n = Number(process.env.REQUEST_TIMEOUT || 8000)
  return Number.isFinite(n) && n > 0 ? n : 8000
}

function maxRetries(): number {
  const n = Number(process.env.MAX_RETRIES || 2)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 2
}

function adFilterMode(): 'classic' | 'smart' | 'off' {
  const v = (process.env.M3U8_AD_FILTER || 'classic').toLowerCase()
  if (v === 'smart' || v === 'off') return v
  return 'classic'
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.local')) return true
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true
  if (/^100\.(6[4-9]|[7-9]\d|1[0-1]\d)\./.test(h)) return true
  return false
}

function isValidTarget(raw: string): URL | null {
  try {
    const target = new URL(raw)
    if (!['http:', 'https:'].includes(target.protocol)) return null
    if (isPrivateHost(target.hostname)) return null
    return target
  } catch {
    return null
  }
}

function looksLikePlaylistUrl(url: string): boolean {
  return url.toLowerCase().split('?')[0].endsWith('.m3u8')
}

/** 手动跟随重定向，每跳校验；返回最终 Response + finalUrl */
async function fetchWithSafeRedirects(
  startUrl: string,
  headers: Record<string, string>,
  signal: AbortSignal,
  maxHops = 5,
): Promise<{ res: Response; finalUrl: string }> {
  let current = startUrl
  for (let hop = 0; hop <= maxHops; hop++) {
    if (!isValidTarget(current)) throw new Error('不允许访问该地址')

    const res = await fetch(current, {
      method: 'GET',
      headers,
      redirect: 'manual',
      signal,
    })

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) throw new Error(`重定向缺少 Location (${res.status})`)
      current = new URL(loc, current).toString()
      continue
    }

    return { res, finalUrl: current }
  }
  throw new Error('重定向次数过多')
}

function buildUpstreamHeaders(range: string | undefined, target: URL) {
  const headers: Record<string, string> = {
    'User-Agent': UA,
    Accept: '*/*',
    Referer: `${target.origin}/`,
  }
  if (range) headers.Range = range

  const host = target.hostname.toLowerCase()
  if (
    host === 'douban.com' ||
    host.endsWith('.douban.com') ||
    host === 'doubanio.com' ||
    host.endsWith('.doubanio.com')
  ) {
    headers.Referer = 'https://movie.douban.com/'
  }
  return headers
}

function setPassthroughHeaders(
  res: import('express').Response,
  upstream: Response,
  contentType: string | null,
) {
  if (contentType) res.setHeader('Content-Type', contentType)
  const acceptRanges = upstream.headers.get('accept-ranges')
  const contentRange = upstream.headers.get('content-range')
  const etag = upstream.headers.get('etag')
  const lastModified = upstream.headers.get('last-modified')
  if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges)
  if (contentRange) res.setHeader('Content-Range', contentRange)
  if (etag) res.setHeader('ETag', etag)
  if (lastModified) res.setHeader('Last-Modified', lastModified)
  res.setHeader(
    'Cache-Control',
    contentType?.startsWith('image/') ? 'public, max-age=2592000' : 'public, max-age=3600',
  )
  res.setHeader('Access-Control-Allow-Origin', '*')
}

proxyRouter.get('/', async (req, res) => {
  const raw = String(req.query.url || '')
  if (!raw) return fail(res, '缺少 url')

  const initial = isValidTarget(raw)
  if (!initial) return fail(res, 'url 无效或禁止访问', 1, 400)

  const retries = maxRetries()
  const ms = timeoutMs()
  let lastError: unknown = null
  const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : undefined

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    try {
      const { res: upstream, finalUrl } = await fetchWithSafeRedirects(
        raw,
        buildUpstreamHeaders(rangeHeader, initial),
        controller.signal,
      )

      if (!upstream.ok && upstream.status !== 206) {
        clearTimeout(timer)
        lastError = new Error(`上游错误 ${upstream.status}`)
        // 消费一下 body 避免泄漏
        try {
          await upstream.arrayBuffer()
        } catch {
          /* ignore */
        }
        continue
      }

      const contentType = upstream.headers.get('content-type')
      const maybePlaylist =
        looksLikePlaylistUrl(raw) ||
        looksLikePlaylistUrl(finalUrl) ||
        Boolean(contentType && /mpegurl|m3u8/i.test(contentType))

      if (maybePlaylist) {
        const buf = Buffer.from(await upstream.arrayBuffer())
        const sample = buf.subarray(0, 64).toString('utf8')
        if (isProbablyM3u8(contentType, finalUrl, sample) || isProbablyM3u8(contentType, raw, sample)) {
          let text = buf.toString('utf8')
          const mode = adFilterMode()
          if (mode !== 'off') text = stripAdGroups(text, mode)
          const host = `${req.protocol}://${req.get('host')}`
          const rewritten = rewriteM3u8(text, finalUrl, `${host}/api/proxy?url=`)
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
          res.setHeader('Cache-Control', 'no-store')
          res.setHeader('Access-Control-Allow-Origin', '*')
          clearTimeout(timer)
          return res.status(200).send(rewritten)
        }
        // 误判为 playlist：当普通资源回传
        setPassthroughHeaders(res, upstream, contentType)
        clearTimeout(timer)
        return res.status(upstream.status).send(buf)
      }

      if (!upstream.body) {
        clearTimeout(timer)
        lastError = new Error('上游无响应体')
        continue
      }

      setPassthroughHeaders(res, upstream, contentType)
      clearTimeout(timer)
      const nodeStream = Readable.fromWeb(upstream.body as import('stream/web').ReadableStream)
      nodeStream.on('error', (err) => {
        logger.error(err)
        if (!res.headersSent) fail(res, '上游传输中断', 1, 502)
        else res.destroy(err)
      })
      return nodeStream.pipe(res.status(upstream.status))
    } catch (err) {
      lastError = err
      clearTimeout(timer)
    }
  }

  logger.error(lastError)
  return fail(res, lastError instanceof Error ? lastError.message : '代理失败', 1, 502)
})
