/** 对齐 LibreTV：m3u8 代理重写 + 广告分片过滤 */

export const PROXY_QUERY_PREFIX = '/api/proxy?url='

const URI_ATTR_TAGS = [
  '#EXT-X-KEY',
  '#EXT-X-MAP',
  '#EXT-X-MEDIA:',
  '#EXT-X-I-FRAME-STREAM-INF',
  '#EXT-X-SESSION-KEY',
]

export function isProxiedUri(uri: string): boolean {
  return uri.startsWith('/api/proxy')
}

export function makeAbsolute(url: string, base: string): string {
  try {
    return new URL(url, base).href
  } catch {
    return url
  }
}

/** 将 m3u8 中的分片 / key / map / 子列表改写为走本站代理 */
export function rewriteM3u8(content: string, baseUrl: string, proxyPrefix: string): string {
  const lines = content.split('\n')
  return lines
    .map((line) => {
      if (URI_ATTR_TAGS.some((tag) => line.startsWith(tag))) {
        return line.replace(/(URI=")([^"]+)(")/g, (m, p1: string, uri: string, p2: string) => {
          if (isProxiedUri(uri)) return m
          return `${p1}${proxyPrefix}${encodeURIComponent(makeAbsolute(uri, baseUrl))}${p2}`
        })
      }
      if (line.startsWith('#') || line.trim() === '') return line
      if (isProxiedUri(line)) return line
      return `${proxyPrefix}${encodeURIComponent(makeAbsolute(line, baseUrl))}`
    })
    .join('\n')
}

export function isProbablyM3u8(contentType: string | null, url: string, bodySample: string): boolean {
  const ct = (contentType || '').toLowerCase()
  if (ct.includes('mpegurl') || ct.includes('m3u8') || ct.includes('x-mpegurl')) return true
  const path = url.toLowerCase().split('?')[0]
  if (path.endsWith('.m3u8')) return true
  const head = bodySample.trimStart().slice(0, 12)
  return head.startsWith('#EXTM3U')
}

const LEAD_AD_MAX_SECONDS = 90
const LEAD_AD_MAX_SEGMENTS = 20
const AD_URL_PATTERN = /adjump|advert|\/ads?\//i
const INTERSTITIAL_MAX_SECONDS = 30
const INTERSTITIAL_NEIGHBOR_MIN_SECONDS = 120

function isDisc(line: string) {
  return line.trim() === '#EXT-X-DISCONTINUITY'
}

function isSegment(line: string) {
  const t = line.trim()
  return t !== '' && !t.startsWith('#')
}

/** 对齐 LibreTV classic：去掉全部 DISCONTINUITY（部分源靠此才能起播） */
export function stripAllDiscontinuity(m3u8Content: string): string {
  if (!m3u8Content) return ''
  return m3u8Content
    .split('\n')
    .filter((line) => !line.includes('#EXT-X-DISCONTINUITY'))
    .join('\n')
}

function stripMarkedAdGroups(m3u8Content: string): string {
  if (!m3u8Content) return ''
  const lines = m3u8Content.split('\n')
  const drop = new Array(lines.length).fill(false)
  let i = 0
  while (i < lines.length) {
    if (!isDisc(lines[i])) {
      i += 1
      continue
    }
    let j = i + 1
    let count = 0
    let allAd = true
    while (j < lines.length && !isDisc(lines[j])) {
      if (isSegment(lines[j])) {
        count += 1
        if (!AD_URL_PATTERN.test(lines[j].trim())) allAd = false
      }
      j += 1
    }
    if (count > 0 && allAd) {
      drop[i] = true
      for (let k = i + 1; k < j; k++) {
        const t = lines[k].trim()
        if (t.startsWith('#EXT-X-KEY') || t.startsWith('#EXT-X-MAP')) continue
        drop[k] = true
      }
    }
    i = j
  }
  if (!drop.some(Boolean)) return m3u8Content
  return lines.filter((_, idx) => !drop[idx]).join('\n')
}

function stripLeadAdGroup(m3u8Content: string): string {
  if (!m3u8Content) return ''
  const lines = m3u8Content.split('\n')
  const discIdx: number[] = []
  for (let i = 0; i < lines.length; i++) if (isDisc(lines[i])) discIdx.push(i)

  if (discIdx.length >= 4) {
    const groupSize = (from: number, to: number) => {
      let seg = 0
      for (let k = from; k < to; k++) if (isSegment(lines[k])) seg += 1
      return seg
    }
    const leadSize = groupSize(discIdx[0] + 1, discIdx[1])
    const others: number[] = []
    for (let g = 1; g < discIdx.length; g++) {
      others.push(groupSize(discIdx[g] + 1, g + 1 < discIdx.length ? discIdx[g + 1] : lines.length))
    }
    const sorted = [...others].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)] || 0
    const typical = Math.abs(leadSize - median) <= Math.max(3, median * 0.5)
    if (typical) return m3u8Content
  }

  const firstDisc = discIdx[0]
  if (firstDisc === undefined) return m3u8Content
  if (lines.slice(0, firstDisc).some(isSegment)) return m3u8Content
  const nextDisc = discIdx.slice(1).find((i) => i > firstDisc)
  if (nextDisc === undefined) return m3u8Content

  let seconds = 0
  let count = 0
  for (let i = firstDisc + 1; i < nextDisc; i++) {
    const m = lines[i].trim().match(/^#EXTINF:([\d.]+)/)
    if (m) seconds += parseFloat(m[1]) || 0
    else if (isSegment(lines[i])) count += 1
  }
  if (count === 0 || count > LEAD_AD_MAX_SEGMENTS) return m3u8Content
  if (seconds <= 0 || seconds > LEAD_AD_MAX_SECONDS) return m3u8Content

  const kept = lines.filter((l, i) => {
    if (i < firstDisc || i >= nextDisc) return true
    const t = l.trim()
    return t.startsWith('#EXT-X-KEY') || t.startsWith('#EXT-X-MAP')
  })
  const out: string[] = []
  let seenSegment = false
  for (const l of kept) {
    if (!seenSegment && isDisc(l)) continue
    if (isSegment(l)) seenSegment = true
    out.push(l)
  }
  return out.join('\n')
}

interface AdGroupScan {
  start: number
  end: number
  discLine: number
  seconds: number
  count: number
}

function scanGroups(lines: string[]): AdGroupScan[] {
  const discIdx: number[] = []
  for (let i = 0; i < lines.length; i++) if (isDisc(lines[i])) discIdx.push(i)
  const groups: AdGroupScan[] = []
  const bounds = [0, ...discIdx, lines.length]
  for (let k = 0; k < bounds.length - 1; k++) {
    const start = k === 0 ? 0 : bounds[k] + 1
    const end = bounds[k + 1]
    let seconds = 0
    let count = 0
    for (let i = start; i < end; i++) {
      const m = lines[i].trim().match(/^#EXTINF:([\d.]+)/)
      if (m) seconds += parseFloat(m[1]) || 0
      else if (isSegment(lines[i])) count += 1
    }
    groups.push({ start, end, discLine: k === 0 ? -1 : bounds[k], seconds, count })
  }
  return groups
}

function stripInterstitialAdGroups(m3u8Content: string): string {
  if (!m3u8Content) return ''
  const lines = m3u8Content.split('\n')
  const groups = scanGroups(lines)
  const drop = new Array(lines.length).fill(false)
  for (let k = 1; k < groups.length; k++) {
    const g = groups[k]
    const prev = groups[k - 1]
    const next = groups[k + 1]
    if (g.count === 0 || g.discLine < 0) continue
    if (g.seconds <= 0 || g.seconds > INTERSTITIAL_MAX_SECONDS) continue
    if (!prev || prev.seconds < INTERSTITIAL_NEIGHBOR_MIN_SECONDS) continue
    if (!next || next.seconds < INTERSTITIAL_NEIGHBOR_MIN_SECONDS) continue
    drop[g.discLine] = true
    for (let i = g.start; i < g.end; i++) {
      const t = lines[i].trim()
      if (t.startsWith('#EXT-X-KEY') || t.startsWith('#EXT-X-MAP')) continue
      drop[i] = true
    }
  }
  if (!drop.some(Boolean)) return m3u8Content
  return lines.filter((_, idx) => !drop[idx]).join('\n')
}

function stripLeadingDisc(content: string): string {
  const lines = content.split('\n')
  const firstSeg = lines.findIndex((l) => {
    const t = l.trim()
    return t !== '' && !t.startsWith('#')
  })
  if (firstSeg <= 0) return content
  const kept = lines.filter((l, i) => !(i < firstSeg && isDisc(l)))
  return kept.length === lines.length ? content : kept.join('\n')
}

/**
 * 广告过滤总入口。
 * mode=classic：对齐 libretv.liumingye.cn（删除全部 DISCONTINUITY）
 * mode=smart：对齐新版 LibreTV 启发式剔除
 */
export function stripAdGroups(m3u8Content: string, mode: 'classic' | 'smart' = 'classic'): string {
  if (!m3u8Content) return ''
  if (mode === 'classic') return stripAllDiscontinuity(m3u8Content)
  return stripLeadingDisc(
    stripLeadAdGroup(stripInterstitialAdGroups(stripMarkedAdGroups(m3u8Content))),
  )
}
