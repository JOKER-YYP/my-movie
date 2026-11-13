import type { VodDetail, VodPlayLine } from '@my-movie/shared'
import {
  buildDetailUrl,
  fetchCmsHtml,
  fetchCmsJson,
  linesHaveM3u8,
  mapDetail,
  parseDetailPageHtml,
  type CmsListResponse,
} from './cms.js'
import { getSource } from './sources.js'
import { TtlCache } from '../../utils/ttlCache.js'

function timeoutMs(): number {
  return Number(process.env.SEARCH_SOURCE_TIMEOUT_MS || 15000)
}

function detailCacheTtlMs(): number {
  const n = Number(process.env.DETAIL_CACHE_TTL_MS || 30 * 60 * 1000)
  return Number.isFinite(n) && n > 0 ? n : 30 * 60 * 1000
}

const detailCache = new TtlCache<VodDetail>(30 * 60 * 1000, 400)

function episodesFromHtml(html: string): VodPlayLine[] {
  const urls = parseDetailPageHtml(html)
  if (urls.length === 0) return []
  return [
    {
      name: '默认',
      episodes: urls.map((url, index) => ({
        name: `第${index + 1}集`,
        url,
        index,
      })),
    },
  ]
}

/**
 * 对齐 LibreTV：
 * 1) CMS 列表详情接口
 * 2) 无 m3u8 / 配置了 detail 时，降级爬取详情页 HTML
 */
export async function fetchDetail(sourceKey: string, vodId: string): Promise<VodDetail> {
  const cacheKey = `detail:${sourceKey}:${vodId}`
  const cached = detailCache.get(cacheKey)
  if (cached) return cached

  const source = getSource(sourceKey)
  if (!source) throw new Error('未知采集源')

  let detail: VodDetail | null = null

  try {
    const data = (await fetchCmsJson(buildDetailUrl(source, vodId), timeoutMs())) as CmsListResponse
    const raw = Array.isArray(data.list) ? data.list[0] : null
    if (raw) detail = mapDetail(raw, source)
  } catch {
    detail = null
  }

  const needHtml =
    Boolean(source.detail) &&
    (!detail || detail.lines.length === 0 || !linesHaveM3u8(detail.lines))

  if (needHtml && source.detail) {
    try {
      const detailPage = `${source.detail.replace(/\/+$/, '')}/index.php/vod/detail/id/${encodeURIComponent(vodId)}.html`
      const html = await fetchCmsHtml(detailPage, timeoutMs())
      const htmlLines = episodesFromHtml(html)
      if (htmlLines.length > 0) {
        if (!detail) {
          const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/)
          detail = {
            vodId,
            sourceKey: source.key,
            sourceName: source.name,
            title: titleMatch ? titleMatch[1].trim() : vodId,
            cover: '',
            lines: htmlLines,
          }
        } else {
          detail = { ...detail, lines: htmlLines }
        }
      }
    } catch {
      // HTML 降级失败时保留 CMS 结果
    }
  }

  if (!detail || detail.lines.length === 0) {
    throw new Error('未找到播放资源')
  }

  detailCache.set(cacheKey, detail, detailCacheTtlMs())
  return detail
}
