import { Router } from 'express'
import { isProbablyM3u8, rewriteM3u8 } from '../services/libretv/m3u8.js'
import { fail } from '../utils/response.js'
import { logger } from '../utils/logger.js'

export const proxyRouter = Router()

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.local')) return true
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true
  return false
}

proxyRouter.get('/', async (req, res) => {
  const raw = String(req.query.url || '')
  if (!raw) return fail(res, '缺少 url')
  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return fail(res, 'url 无效')
  }
  if (!['http:', 'https:'].includes(target.protocol)) return fail(res, '仅支持 http/https')
  if (isPrivateHost(target.hostname)) return fail(res, '禁止访问内网地址', 1, 403)

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        'User-Agent': UA,
        Accept: '*/*',
        Referer: target.origin + '/',
      },
    })
    if (!upstream.ok || !upstream.body) {
      return fail(res, `上游错误 ${upstream.status}`, 1, 502)
    }

    const contentType = upstream.headers.get('content-type')
    const buf = Buffer.from(await upstream.arrayBuffer())
    const sample = buf.subarray(0, 64).toString('utf8')
    const proxyPrefix = `${req.protocol}://${req.get('host')}/api/proxy?url=`

    if (isProbablyM3u8(contentType, target.toString(), sample)) {
      const text = buf.toString('utf8')
      const rewritten = rewriteM3u8(text, target.toString(), proxyPrefix)
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
      res.setHeader('Access-Control-Allow-Origin', '*')
      return res.send(rewritten)
    }

    if (contentType) res.setHeader('Content-Type', contentType)
    res.setHeader('Access-Control-Allow-Origin', '*')
    const range = upstream.headers.get('content-range')
    if (range) res.setHeader('Content-Range', range)
    return res.status(upstream.status).send(buf)
  } catch (err) {
    logger.error(err)
    return fail(res, err instanceof Error ? err.message : '代理失败', 1, 502)
  }
})
