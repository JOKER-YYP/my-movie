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

function libreTvProxyUrl(upstream: string): string {
  const base = (process.env.LIBRETV_BASE_URL || 'https://libretv.liumingye.cn').replace(/\/+$/, '')
  return `${base}/proxy/${encodeURIComponent(upstream)}`
}

async function fetchOnce(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`上游 HTTP ${res.status}`)
    }
    const text = await res.text()
    try {
      return JSON.parse(text) as unknown
    } catch {
      const preview = text.trim().slice(0, 24)
      throw new Error(`非 JSON 响应: ${preview || '(空)'}`)
    }
  } finally {
    clearTimeout(timer)
  }
}

/** 对齐 LibreTV：优先经 /proxy/ 访问采集站；失败时可直连回退 */
export async function fetchCmsJson(upstreamUrl: string, timeoutMs: number): Promise<unknown> {
  const mode = process.env.LIBRETV_PROXY_MODE || 'via_libretv'
  if (mode === 'direct') {
    return fetchOnce(upstreamUrl, timeoutMs)
  }
  if (mode === 'via_libretv') {
    try {
      return await fetchOnce(libreTvProxyUrl(upstreamUrl), timeoutMs)
    } catch {
      // 公共代理偶发不可用时直连 CMS，行为仍对齐「能搜到尽量搜到」
      return fetchOnce(upstreamUrl, timeoutMs)
    }
  }
  return fetchOnce(upstreamUrl, timeoutMs)
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

/** 对齐 LibreTV classic app.js 黄滤关键词 */
const ADULT_KEYWORDS = [
  '伦理片',
  '福利',
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
  '福利片',
]

export function isAdultContent(item: Pick<VodSearchItem, 'title' | 'typeName'>): boolean {
  const text = `${item.title || ''} ${item.typeName || ''}`
  return ADULT_KEYWORDS.some((k) => text.includes(k))
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

/** 解析 vod_play_url：线路 $$$，集数 #，集名$url */
export function parsePlayUrl(playFrom?: string, playUrl?: string): VodPlayLine[] {
  if (!playUrl) return []
  const fromParts = (playFrom || '').split('$$$').filter(Boolean)
  const urlParts = playUrl.split('$$$')
  return urlParts.map((part, i) => {
    const episodes: VodEpisode[] = part
      .split('#')
      .map((ep, index) => {
        const [name, url] = ep.split('$')
        if (!url) return null
        return { name: name || `第${index + 1}集`, url: url.trim(), index }
      })
      .filter((x): x is VodEpisode => Boolean(x))
    return {
      name: fromParts[i] || `线路${i + 1}`,
      episodes,
    }
  }).filter((line) => line.episodes.length > 0)
}

export function mapDetail(raw: CmsVodItem, source: VodSource): VodDetail {
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
    lines: parsePlayUrl(raw.vod_play_from, raw.vod_play_url),
  }
}
