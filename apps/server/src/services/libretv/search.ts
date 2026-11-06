import type { SearchFailure, SearchResponse, VodSearchItem } from '@my-movie/shared'
import {
  buildSearchUrl,
  fetchCmsJson,
  isAdultContent,
  mapSearchItem,
  type CmsListResponse,
} from './cms.js'
import { getSource, listSources } from './sources.js'

function timeoutMs(): number {
  return Number(process.env.SEARCH_SOURCE_TIMEOUT_MS || 10000)
}

async function searchOne(
  sourceKey: string,
  wd: string,
): Promise<{ list: VodSearchItem[]; failure?: SearchFailure }> {
  const source = getSource(sourceKey)
  if (!source) {
    return {
      list: [],
      failure: { sourceKey, sourceName: sourceKey, error: '未知源' },
    }
  }
  try {
    const data = (await fetchCmsJson(buildSearchUrl(source, wd), timeoutMs())) as CmsListResponse
    const rawList = Array.isArray(data.list) ? data.list : []
    const list = rawList
      .map((item) => mapSearchItem(item, source))
      .filter((x): x is VodSearchItem => Boolean(x))
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
}): Promise<SearchResponse> {
  const wd = options.wd.trim()
  if (!wd) return { list: [], failures: [] }

  const keys =
    options.sources && options.sources.length > 0
      ? options.sources
      : listSources(false).map((s) => s.key)

  const settled = await Promise.all(keys.map((key) => searchOne(key, wd)))
  const failures = settled.map((s) => s.failure).filter((f): f is SearchFailure => Boolean(f))
  const seen = new Set<string>()
  const list: VodSearchItem[] = []
  for (const s of settled) {
    for (const item of s.list) {
      if (options.filterAdult !== false && isAdultContent(item)) continue
      const id = `${item.sourceKey}:${item.vodId}`
      if (seen.has(id)) continue
      seen.add(id)
      list.push(item)
    }
  }
  list.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
  return { list, failures }
}
