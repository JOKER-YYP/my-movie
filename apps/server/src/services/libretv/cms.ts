import type { VodDetail, VodEpisode, VodPlayLine, VodSearchItem, VodSource } from '@my-movie/shared'
import { normalizeApiBase } from './sources.js'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

export interface CmsListResponse {
  code?: number
  list?: CmsVodItem[] | null
  pagecount?: number
  total?: number
}

export interface CmsVodItem {
  vod_id?: string | number
  vod_name?: string
  vod_pic?: string
  vod_remarks?: string
  type_name?: string
  vod_class?: string
  vod_year?: string
  vod_area?: string
  vod_actor?: string
  vod_director?: string
  vod_content?: string
  vod_play_from?: string
  vod_play_url?: string
}

function cmsRetries(): number {
  const n = Number(process.env.CMS_FETCH_RETRIES || 1)
  return Number.isFinite(n) && n >= 0 ? Math.min(4, Math.floor(n)) : 1
}

function libreTvBase(): string {
  return (process.env.LIBRETV_BASE_URL || 'https://libretv.liumingye.cn').replace(/\/+$/, '')
}

/** 仅作「出网中转」：对齐官网前端 PROXY_URL，不是调用他们的搜索页/聚合接口 */
function libreTvProxyUrl(upstream: string): string {
  return `${libreTvBase()}/proxy/${encodeURIComponent(upstream)}`
}

/**
 * CMS 出网模式：
 * - relay（默认）：先走 LibreTV /proxy/ 中转（国内多数采集站直连会被重置），失败再直连
 * - direct：只直连采集站
 */
function cmsFetchMode(): 'relay' | 'direct' {
  const raw = (process.env.CMS_FETCH_MODE || process.env.LIBRETV_PROXY_MODE || 'relay').toLowerCase()
  if (raw === 'direct') return 'direct'
  // 兼容旧配置 via_libretv
  return 'relay'
}

/** 宽松解析 CMS JSON（兼容 BOM / 前后杂质 / list:null） */
export function parseCmsJsonText(text: string): unknown {
  const trimmed = text.replace(/^\uFEFF/, '').trim()
  if (!trimmed) throw new Error('空响应')
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as unknown
      } catch {
        /* fallthrough */
      }
    }
    const preview = trimmed.slice(0, 24)
    throw new Error(`非 JSON 响应: ${preview || '(空)'}`)
  }
}

async function fetchTextOnce(url: string, timeoutMs: number, accept = '*/*'): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const headers: Record<string, string> = {
    'User-Agent': UA,
    Accept: accept,
  }
  try {
    headers.Referer = `${new URL(url).origin}/`
  } catch {
    /* ignore */
  }
  try {
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`上游 HTTP ${res.status}`)
    }
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

async function fetchTextWithRetry(url: string, timeoutMs: number, accept = '*/*'): Promise<string> {
  const retries = cmsRetries()
  let lastError: unknown
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchTextOnce(url, timeoutMs, accept)
    } catch (err) {
      lastError = err
      // 超时不再重试，避免拖垮整次聚合搜索
      if (err instanceof Error && err.name === 'AbortError') throw err
    }
  }
  throw lastError instanceof Error ? lastError : new Error('请求失败')
}

/**
 * 拉取采集站 JSON。
 * 搜索聚合逻辑在 search.ts（自研多源并行）；这里只解决「打得到采集站」。
 * 图二历史播放能出详情，正是因为走了 LibreTV /proxy/ 中转。
 */
export async function fetchCmsJson(upstreamUrl: string, timeoutMs: number): Promise<unknown> {
  const accept = 'application/json,text/plain,*/*'
  const mode = cmsFetchMode()
  if (mode === 'direct') {
    return parseCmsJsonText(await fetchTextWithRetry(upstreamUrl, timeoutMs, accept))
  }

  try {
    const text = await fetchTextWithRetry(libreTvProxyUrl(upstreamUrl), timeoutMs, accept)
    return parseCmsJsonText(text)
  } catch {
    // 中转不可用时再直连（部分源本机可达）
    return parseCmsJsonText(await fetchTextWithRetry(upstreamUrl, timeoutMs, accept))
  }
}

/** 拉取详情页 HTML（同样优先中转） */
export async function fetchCmsHtml(upstreamUrl: string, timeoutMs: number): Promise<string> {
  const accept = 'text/html,*/*'
  const mode = cmsFetchMode()
  if (mode === 'direct') {
    return fetchTextWithRetry(upstreamUrl, timeoutMs, accept)
  }
  try {
    return await fetchTextWithRetry(libreTvProxyUrl(upstreamUrl), timeoutMs, accept)
  } catch {
    return fetchTextWithRetry(upstreamUrl, timeoutMs, accept)
  }
}

export function buildSearchUrl(source: VodSource, wd: string, page = 1): string {
  const base = normalizeApiBase(source.api)
  const q = encodeURIComponent(wd)
  return page <= 1
    ? `${base}?ac=videolist&wd=${q}`
    : `${base}?ac=videolist&wd=${q}&pg=${page}`
}

export function buildDetailUrl(source: VodSource, id: string): string {
  const base = normalizeApiBase(source.api)
  return `${base}?ac=videolist&ids=${encodeURIComponent(id)}`
}

/** 对齐 LibreTV cms-parser / classic 黄滤关键词 */
const ADULT_KEYWORDS = [
  '伦理片',
  '福利',
  '倫理片',
  '福利片',
  '日本伦理',
  '日本福利',
  '日本福利片',
  '日本伦理片',
  '擦边短剧',
  '擦边',
  '韩国伦理',
  '里番动漫',
  '门事件',
  '萝莉少女',
  '制服诱惑',
  '国产传媒',
  'cosplay',
  '黑丝诱惑',
  '无码',
  '日本无码',
  '有码',
  '日本有码',
  'SWAG',
  '网红主播',
  '色情片',
  '同性片',
  '福利视频',
  '无码高清',
  '有码高清',
  '91视频',
  '自拍偷拍',
  'mini传媒',
  '福利片',
]

const M3U8_PATTERN = /\$https?:\/\/[^"'\s]+?\.m3u8/g

export function isAdultContent(item: Pick<VodSearchItem, 'title' | 'typeName'>): boolean {
  const text = `${item.title || ''} ${item.typeName || ''}`
  return ADULT_KEYWORDS.some((k) => text.includes(k))
}

/** 对齐 LibreTV：去空白/标点后做标题相关性匹配，丢掉源站灌水结果 */
export function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '')
}

export function isRelevantTitle(title: string, wd: string): boolean {
  const needle = normalizeTitle(wd)
  if (!needle) return true
  const hay = normalizeTitle(title || '')
  if (!hay) return false
  if (hay.includes(needle)) return true
  const tokens = wd
    .trim()
    .split(/\s+/)
    .map(normalizeTitle)
    .filter(Boolean)
  return tokens.length > 1 && tokens.every((t) => hay.includes(t))
}

/** 从简介等文本兜底提取 m3u8 */
export function extractM3u8FromText(text: string): string[] {
  if (!text) return []
  const matches = text.match(M3U8_PATTERN) || []
  return matches.map((link) => link.replace(/^\$/, ''))
}

/** 从详情页 HTML 提取剧集 m3u8（对齐 handleSpecialSourceDetail） */
export function parseDetailPageHtml(html: string): string[] {
  let matches = html.match(/\$https?:\/\/[^"'\s]+?\.m3u8/g) || []
  if (matches.length === 0) {
    matches = html.match(/\$https?:\/\/[^"'\s]+?\/\d{8}\/\d+_[a-f0-9]+\/index\.m3u8/g) || []
  }
  return [...new Set(matches)].map((link) => {
    let u = link.substring(1)
    const parenIndex = u.indexOf('(')
    if (parenIndex > 0) u = u.substring(0, parenIndex)
    return u
  })
}

export function mapSearchItem(raw: CmsVodItem, source: VodSource): VodSearchItem | null {
  if (raw.vod_id == null || !raw.vod_name) return null
  return {
    vodId: String(raw.vod_id),
    sourceKey: source.key,
    sourceName: source.name,
    title: raw.vod_name,
    cover: raw.vod_pic || '',
    remarks: raw.vod_remarks,
    typeName: raw.type_name || raw.vod_class,
    year: raw.vod_year,
    area: raw.vod_area,
    actor: raw.vod_actor,
    director: raw.vod_director,
  }
}

function parseEpisodesFromGroup(part: string): VodEpisode[] {
  return part
    .split('#')
    .map((ep, index) => {
      const parts = ep.split('$')
      const url = (parts.length > 1 ? parts[1] : parts[0] || '').trim()
      const name = parts.length > 1 ? parts[0] : `第${index + 1}集`
      if (!url || !(url.startsWith('http://') || url.startsWith('https://'))) return null
      return { name: name || `第${index + 1}集`, url, index }
    })
    .filter((x): x is VodEpisode => Boolean(x))
}

/**
 * 解析 vod_play_url：线路 $$$，集数 #，集名$url。
 * 对齐新版 LibreTV：优先保留含 m3u8 直链的线路（量子/非凡第一条常为中转页）。
 */
export function parsePlayUrl(playFrom?: string, playUrl?: string): VodPlayLine[] {
  if (!playUrl) return []
  const fromParts = (playFrom || '').split('$$$').filter(Boolean)
  const urlParts = playUrl.split('$$$')
  const lines = urlParts
    .map((part, i) => {
      const episodes = parseEpisodesFromGroup(part).map((ep, index) => ({ ...ep, index }))
      return {
        name: fromParts[i] || `线路${i + 1}`,
        episodes,
      }
    })
    .filter((line) => line.episodes.length > 0)

  if (lines.length <= 1) return lines

  const withM3u8: VodPlayLine[] = []
  const without: VodPlayLine[] = []
  for (const line of lines) {
    if (line.episodes.some((ep) => ep.url.includes('.m3u8'))) withM3u8.push(line)
    else without.push(line)
  }
  return withM3u8.length > 0 ? [...withM3u8, ...without] : lines
}

export function mapDetail(raw: CmsVodItem, source: VodSource): VodDetail {
  let lines = parsePlayUrl(raw.vod_play_from, raw.vod_play_url)
  if (lines.length === 0) {
    const fromContent = extractM3u8FromText(String(raw.vod_content || ''))
    if (fromContent.length > 0) {
      lines = [
        {
          name: '默认',
          episodes: fromContent.map((url, index) => ({
            name: `第${index + 1}集`,
            url,
            index,
          })),
        },
      ]
    }
  }
  return {
    vodId: String(raw.vod_id ?? ''),
    sourceKey: source.key,
    sourceName: source.name,
    title: raw.vod_name || '',
    cover: raw.vod_pic || '',
    typeName: raw.type_name || raw.vod_class,
    year: raw.vod_year,
    area: raw.vod_area,
    actor: raw.vod_actor,
    director: raw.vod_director,
    content: raw.vod_content,
    remarks: raw.vod_remarks,
    lines,
  }
}

export function linesHaveM3u8(lines: VodPlayLine[]): boolean {
  return lines.some((line) => line.episodes.some((ep) => ep.url.includes('.m3u8')))
}
