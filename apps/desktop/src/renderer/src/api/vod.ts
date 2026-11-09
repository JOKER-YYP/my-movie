import { API_PATHS, type SearchResponse, type VodDetail, type VodSource } from '@my-movie/shared'
import { apiGet, apiPost } from './http'
import { cachedSearch, makeSearchCacheKey } from '@/utils/vodSearchCache'

export function fetchSources() {
  return apiGet<VodSource[]>(API_PATHS.vodSources)
}

export type SearchVodOptions = {
  sources?: string[]
  filterAdult?: boolean
  /** 首页/频道用 1，完整搜索可不传 */
  maxPages?: number
  /** 强制绕过缓存 */
  force?: boolean
}

export function searchVod(wd: string, sourcesOrOpts?: string[] | SearchVodOptions, maybeOpts?: SearchVodOptions) {
  const opts: SearchVodOptions = Array.isArray(sourcesOrOpts)
    ? { ...(maybeOpts || {}), sources: sourcesOrOpts }
    : { ...(sourcesOrOpts || {}) }

  const key = makeSearchCacheKey(wd, opts.sources, {
    filterAdult: opts.filterAdult,
    maxPages: opts.maxPages,
  })

  return cachedSearch(
    key,
    () =>
      apiPost<SearchResponse>(
        API_PATHS.vodSearch,
        {
          wd,
          sources: opts.sources,
          filterAdult: opts.filterAdult ?? false,
          maxPages: opts.maxPages,
        },
        { timeout: 90000 },
      ),
    { force: opts.force },
  )
}

const detailMemory = new Map<string, { data: VodDetail; at: number }>()
const DETAIL_FRESH_MS = 30 * 60 * 1000

export async function fetchDetail(source: string, id: string, force = false) {
  const key = `${source}:${id}`
  if (!force) {
    const hit = detailMemory.get(key)
    if (hit && Date.now() - hit.at < DETAIL_FRESH_MS) return hit.data
  }
  const data = await apiGet<VodDetail>(API_PATHS.vodDetail, { source, id })
  detailMemory.set(key, { data, at: Date.now() })
  return data
}

export function proxyUrl(url: string) {
  const base = import.meta.env.VITE_API_BASE_URL || ''
  return `${base}${API_PATHS.proxy}?url=${encodeURIComponent(url)}`
}
