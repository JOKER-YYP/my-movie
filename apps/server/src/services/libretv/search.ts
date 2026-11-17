import type { SearchFailure, SearchResponse, VodSearchItem } from '@my-movie/shared'
import {
  buildSearchUrl,
  fetchCmsJson,
  isAdultContent,
  isRelevantTitle,
  mapSearchItem,
  type CmsListResponse,
} from './cms.js'
import { getSource, listSources } from './sources.js'
import { TtlCache } from '../../utils/ttlCache.js'

/**
 * 对齐 LibreTV classic `searchByAPIAndKeyWord`：
 * 单页请求超时 15s（官网 search.js），多源由调用方 Promise.all 并行。
 */
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
  // 部分源无结果返回 list:null，按空数组兼容（对齐 LibreTV cms-parser）
  const rawList = Array.isArray(data.list) ? data.list : []
  return rawList.map((item) => mapSearchItem(item, source)).filter((x): x is VodSearchItem => Boolean(x))
}

/**
 * 单源搜索：先拉第 1 页，再按 pagecount 并行补拉后续页（上限 maxPages）。
 * 逻辑对齐 LibreTV classic searchByAPIAndKeyWord；出网中转见 cms.fetchCmsJson。
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

  // LibreTV classic：黄滤默认关闭
  const filterAdult = options.filterAdult === true
  const cacheKey = `search:v4:${wd}::${[...keys].sort().join(',')}::${filterAdult ? 1 : 0}::p${pagesLimit}`
  const cached = searchCache.get(cacheKey)
  if (cached) return cached

  // 多源并行，单源失败不影响其它源（对齐 LibreTV 聚合搜索）
  const settled = await Promise.all(keys.map((key) => searchOne(key, wd, pagesLimit)))
  const failures = settled.map((s) => s.failure).filter((f): f is SearchFailure => Boolean(f))
  const seen = new Set<string>()
  const list: VodSearchItem[] = []

  for (const s of settled) {
    for (const item of s.list) {
      if (filterAdult && isAdultContent(item)) continue
      // 丢掉「搜河神却返回 NBA」这类源站灌水
      if (!isRelevantTitle(item.title, wd)) continue
      const id = `${item.sourceKey}:${item.vodId}`
      if (seen.has(id)) continue
      seen.add(id)
      list.push(item)
    }
  }

  list.sort((a, b) => {
    const byTitle = a.title.localeCompare(b.title, 'zh-CN')
    if (byTitle !== 0) return byTitle
    return a.sourceName.localeCompare(b.sourceName, 'zh-CN')
  })

  const result = { list, failures }
  // 全失败或空结果不缓存，避免把短暂网络故障锁住
  if (list.length > 0) {
    searchCache.set(cacheKey, result, searchCacheTtlMs())
  }
  return result
}
