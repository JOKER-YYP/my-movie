/**
 * 网盘 CDN 流式代理：用网盘登录分区拉直链，支持 Range，供渲染进程边下边播。
 */
import { net, protocol, session } from 'electron'
import { randomBytes } from 'crypto'
import type { IncomingMessage } from 'http'

type PanKind = 'quark' | 'baidu'

type Entry = {
  kind: PanKind
  url: string
  fileName: string
  createdAt: number
}

const TTL_MS = 2 * 60 * 60 * 1000
const store = new Map<string, Entry>()

function panSession(kind: PanKind) {
  return session.fromPartition(kind === 'quark' ? 'persist:mm-quark' : 'persist:mm-baidu')
}

function refererOf(kind: PanKind) {
  return kind === 'quark' ? 'https://pan.quark.cn/' : 'https://pan.baidu.com/'
}

export function registerPanStreamToken(input: {
  kind: PanKind
  url: string
  fileName: string
}): string {
  const token = randomBytes(16).toString('hex')
  store.set(token, {
    kind: input.kind,
    url: input.url,
    fileName: input.fileName,
    createdAt: Date.now(),
  })
  return token
}

function getEntry(token: string): Entry | null {
  const hit = store.get(token)
  if (!hit) return null
  if (Date.now() - hit.createdAt > TTL_MS) {
    store.delete(token)
    return null
  }
  return hit
}

export function toPanStreamUrl(token: string) {
  return `mm-stream://play/${token}`
}

function fetchUpstream(
  kind: PanKind,
  url: string,
  range?: string,
): Promise<{ status: number; headers: Record<string, string>; body: IncomingMessage }> {
  return new Promise((resolve, reject) => {
    const req = net.request({
      method: 'GET',
      url,
      session: panSession(kind),
      useSessionCookies: true,
      redirect: 'follow',
    })
    req.setHeader(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    )
    req.setHeader('Accept', '*/*')
    req.setHeader('Referer', refererOf(kind))
    if (range) req.setHeader('Range', range)
    req.on('response', (res) => {
      const headers: Record<string, string> = {}
      for (const [k, v] of Object.entries(res.headers)) {
        if (v == null) continue
        headers[k.toLowerCase()] = Array.isArray(v) ? v.join(',') : String(v)
      }
      resolve({ status: res.statusCode || 200, headers, body: res })
    })
    req.on('error', reject)
    req.end()
  })
}

export function registerPanStreamProtocol() {
  protocol.handle('mm-stream', async (request) => {
    try {
      const u = new URL(request.url)
      const token = decodeURIComponent(u.pathname.replace(/^\/play\//, '').split('/')[0] || '')
      const entry = getEntry(token)
      if (!entry) {
        return new Response('stream token expired', { status: 410 })
      }
      const range = request.headers.get('range') || undefined
      const upstream = await fetchUpstream(entry.kind, entry.url, range)
      const passthrough = ['content-type', 'content-length', 'content-range', 'accept-ranges']
      const outHeaders = new Headers()
      for (const key of passthrough) {
        if (upstream.headers[key]) outHeaders.set(key, upstream.headers[key])
      }
      if (!outHeaders.has('content-type')) {
        outHeaders.set('content-type', 'video/mp4')
      }
      outHeaders.set('access-control-allow-origin', '*')
      outHeaders.set('cache-control', 'no-store')

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          upstream.body.on('data', (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk))
          })
          upstream.body.on('end', () => controller.close())
          upstream.body.on('error', (err) => controller.error(err))
        },
        cancel() {
          upstream.body.destroy()
        },
      })

      return new Response(stream, {
        status: upstream.status,
        headers: outHeaders,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'stream proxy failed'
      return new Response(msg, { status: 502 })
    }
  })
}
