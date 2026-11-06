/** 将 m3u8 中的相对/绝对 URI 改写为走本站代理 */
export function rewriteM3u8(content: string, baseUrl: string, proxyPrefix: string): string {
  const base = new URL(baseUrl)
  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        if (trimmed.startsWith('#EXT-X-KEY') || trimmed.startsWith('#EXT-X-MAP') || trimmed.startsWith('#EXT-X-MEDIA')) {
          return trimmed.replace(/URI="([^"]+)"/g, (_m, uri: string) => {
            const abs = new URL(uri, base).toString()
            return `URI="${proxyPrefix}${encodeURIComponent(abs)}"`
          })
        }
        return line
      }
      const abs = new URL(trimmed, base).toString()
      return `${proxyPrefix}${encodeURIComponent(abs)}`
    })
    .join('\n')
}

export function isProbablyM3u8(contentType: string | null, url: string, bodySample: string): boolean {
  if (contentType?.includes('mpegurl') || contentType?.includes('m3u8')) return true
  if (url.includes('.m3u8')) return true
  const head = bodySample.trimStart().slice(0, 12)
  return head.startsWith('#EXTM3U')
}
