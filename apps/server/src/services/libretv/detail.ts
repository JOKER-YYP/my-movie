import type { VodDetail } from '@my-movie/shared'
import { buildDetailUrl, fetchCmsJson, mapDetail, type CmsListResponse } from './cms.js'
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

export async function fetchDetail(sourceKey: string, vodId: string): Promise<VodDetail> {
  const cacheKey = `detail:${sourceKey}:${vodId}`
  const cached = detailCache.get(cacheKey)
  if (cached) return cached

  const source = getSource(sourceKey)
  if (!source) throw new Error('未知采集源')
  const data = (await fetchCmsJson(buildDetailUrl(source, vodId), timeoutMs())) as CmsListResponse
  const raw = Array.isArray(data.list) ? data.list[0] : null
  if (!raw) throw new Error('未找到详情')
  const detail = mapDetail(raw, source)
  detailCache.set(cacheKey, detail, detailCacheTtlMs())
  return detail
}
