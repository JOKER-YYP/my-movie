import type { SearchFailure, SearchResponse, VodSearchItem } from '@my-movie/shared'
import {
  buildSearchUrl,
  fetchCmsJson,
  isAdultContent,
  mapSearchItem,
  type CmsListResponse,
} from './cms.js'
import { getSource, listSources } from './sources.js'
import { TtlCache } from '../../utils/ttlCache.js'

/** 对齐 LibreTV classic：search.js 单源超时 15s */
function timeoutMs(): number {
  const n = Number(process.env.SEARCH_SOURCE_TIMEOUT_MS || 15000)
  return Number.isFinite(n) && n > 0 ? n : 15000
}

/** 对齐 LibreTV classic：API_CONFIG.search.maxPages = 50 */
function defaultMaxPages(): number {
  const n = Number(process.env.SEARCH_MAX_PAGES || 50)
  if (!Number.isFinite(n)) return 50
  return Math.min(50, Math.max(1, Math.floor(n)))
}

function searchCacheTtlMs(): number {
  const n = Number(process.env.SEARCH_CACHE_TTL_MS || 10 * 60 * 1000)
  return Number.isFinite(n) && n > 0 ? n : 10 * 60 * 1000
}

const searchCache = new TtlCache<SearchResponse>(10 * 60 * 1000, 300)

function mapList(data: CmsListResponse, source: ReturnType<typeof getSource>): VodSearchItem[] {
  if (!source) return []
  const rawList = Array.isArray(data.list) ? data.list : []
  return rawList.map((item) => mapSearchItem(item, source)).filter((x): x is VodSearchItem => Boolean(x))
}

/**
 * 对齐 LibreTV `searchByAPIAndKeyWord`：
 * 先拉第 1 页，再按 pagecount 并行补拉后续页（上限 maxPages）。
 */
async function searchOne(
  sourceKey: string,
  wd: string,
  pagesLimitOverride: number,
): Promise<{ list: VodSearchItem[]; failure?: SearchFailure }> {
  const source = getSource(sourceKey)
  if (!source) {
    return {
      list: [],
      failure: { sourceKey, sourceName: sourceKey, error: '未知源' },
    }
  }

  const ms = timeoutMs()
  const pagesLimit = Math.min(50, Math.max(1, Math.floor(pagesLimitOverride)))

  try {
    const first = (await fetchCmsJson(buildSearchUrl(source, wd, 1), ms)) as CmsListResponse
    const list = mapList(first, source)
    const pageCount = Math.max(1, Number(first.pagecount) || 1)
    const pagesToFetch = Math.min(pageCount - 1, pagesLimit - 1)

    if (pagesToFetch > 0) {
      const extra = await Promise.all(
        Array.from({ length: pagesToFetch }, (_, i) => {
          const page = i + 2
          return fetchCmsJson(buildSearchUrl(source, wd, page), ms)
            .then((raw) => mapList(raw as CmsListResponse, source))
            .catch(() => [] as VodSearchItem[])
        }),
      )
      for (const pageList of extra) list.push(...pageList)
    }

    return { list }
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError'
    return {
      list: [],
      failure: {
        sourceKey: source.key,
        sourceName: source.name,
        error: timedOut ? '超时' : err instanceof Error ? err.message : '失败',
        timedOut,
      },
    }
  }
}

export async function aggregateSearch(options: {
  wd: string
  sources?: string[]
  filterAdult?: boolean
  /** 单源最多翻页；首页/频道建议传 1 */
  maxPages?: number
}): Promise<SearchResponse> {
  const wd = options.wd.trim()
  if (!wd) return { list: [], failures: [] }

  const keys =
    options.sources && options.sources.length > 0
      ? options.sources
      : listSources(false).map((s) => s.key)

  const pagesLimit =
    options.maxPages != null && Number.isFinite(options.maxPages)
      ? Math.min(50, Math.max(1, Math.floor(options.maxPages)))
      : defaultMaxPages()

  // LibreTV classic：黄滤默认关闭（localStorage yellowFilterEnabled === 'true' 才开）
  const filterAdult = options.filterAdult === true
  const cacheKey = `search:${wd}::${[...keys].sort().join(',')}::${filterAdult ? 1 : 0}::p${pagesLimit}`
  const cached = searchCache.get(cacheKey)
  if (cached) return cached

  const settled = await Promise.all(keys.map((key) => searchOne(key, wd, pagesLimit)))
  const failures = settled.map((s) => s.failure).filter((f): f is SearchFailure => Boolean(f))
  const seen = new Set<string>()
  const list: VodSearchItem[] = []

  for (const s of settled) {
    for (const item of s.list) {
      if (filterAdult && isAdultContent(item)) continue
      const id = `${item.sourceKey}:${item.vodId}`
      if (seen.has(id)) continue
      seen.add(id)
      list.push(item)
    }
  }

  // 对齐 LibreTV：先按片名，同名再按源名
  list.sort((a, b) => {
    const byTitle = a.title.localeCompare(b.title, 'zh-CN')
    if (byTitle !== 0) return byTitle
    return a.sourceName.localeCompare(b.sourceName, 'zh-CN')
  })

  const result = { list, failures }
  searchCache.set(cacheKey, result, searchCacheTtlMs())
  return result
}
