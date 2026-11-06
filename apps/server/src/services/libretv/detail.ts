import type { VodDetail } from '@my-movie/shared'
import { buildDetailUrl, fetchCmsJson, mapDetail, type CmsListResponse } from './cms.js'
import { getSource } from './sources.js'

function timeoutMs(): number {
  return Number(process.env.SEARCH_SOURCE_TIMEOUT_MS || 10000)
}

export async function fetchDetail(sourceKey: string, vodId: string): Promise<VodDetail> {
  const source = getSource(sourceKey)
  if (!source) throw new Error('未知采集源')
  const data = (await fetchCmsJson(buildDetailUrl(source, vodId), timeoutMs())) as CmsListResponse
  const raw = Array.isArray(data.list) ? data.list[0] : null
  if (!raw) throw new Error('未找到详情')
  return mapDetail(raw, source)
}
