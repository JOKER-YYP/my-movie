import type { SearchFailure, VodSearchItem } from '@my-movie/shared'

export type VodSearchCachePayload = {
  list: VodSearchItem[]
  failures: SearchFailure[]
}

type Entry = VodSearchCachePayload & {
  at: number
}

const STORAGE_KEY = 'vodSearchCache.v1'
/** 新鲜期：直接返回，不打网 */
const FRESH_MS = 15 * 60 * 1000
/** 过期但仍可先展示、后台刷新 */
const STALE_MS = 2 * 60 * 60 * 1000
const MAX_ENTRIES = 40

const memory = new Map<string, Entry>()
const inflight = new Map<string, Promise<VodSearchCachePayload>>()

function sourceSig(keys?: string[]) {
  return [...(keys || [])].sort().join(',')
}

export function makeSearchCacheKey(
  wd: string,
  sources?: string[],
  opts?: { filterAdult?: boolean; maxPages?: number },
) {
  return [
    wd.trim(),
    sourceSig(sources),
    opts?.filterAdult ? '1' : '0',
    `p${opts?.maxPages ?? 'default'}`,
  ].join('::')
}

function readDisk(): Record<string, Entry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Entry>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeDisk(map: Record<string, Entry>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // quota / private mode
  }
}

function prune(map: Record<string, Entry>) {
  const keys = Object.keys(map)
  if (keys.length <= MAX_ENTRIES) return map
  const sorted = keys.sort((a, b) => (map[a].at || 0) - (map[b].at || 0))
  const next = { ...map }
  for (const k of sorted.slice(0, keys.length - MAX_ENTRIES)) delete next[k]
  return next
}

function getEntry(key: string): Entry | null {
  const mem = memory.get(key)
  if (mem) return mem
  const disk = readDisk()[key]
  if (!disk) return null
  memory.set(key, disk)
  return disk
}

export function peekSearchCache(
  key: string,
): { data: VodSearchCachePayload; fresh: boolean; stale: boolean } | null {
  const hit = getEntry(key)
  if (!hit) return null
  const age = Date.now() - hit.at
  if (age > STALE_MS) {
    memory.delete(key)
    return null
  }
  return {
    data: { list: hit.list, failures: hit.failures },
    fresh: age <= FRESH_MS,
    stale: age > FRESH_MS && age <= STALE_MS,
  }
}

export function setSearchCache(key: string, data: VodSearchCachePayload) {
  const entry: Entry = { ...data, at: Date.now() }
  memory.set(key, entry)
  const disk = prune({ ...readDisk(), [key]: entry })
  writeDisk(disk)
}

export async function cachedSearch(
  key: string,
  fetcher: () => Promise<VodSearchCachePayload>,
  opts?: { force?: boolean },
): Promise<VodSearchCachePayload> {
  if (!opts?.force) {
    const hit = peekSearchCache(key)
    if (hit?.fresh) return hit.data
    if (hit?.stale) {
      // stale-while-revalidate：先返回旧数据，后台刷新
      if (!inflight.has(key)) {
        const p = fetcher()
          .then((data) => {
            setSearchCache(key, data)
            return data
          })
          .finally(() => inflight.delete(key))
        inflight.set(key, p)
      }
      return hit.data
    }
  }

  const pending = inflight.get(key)
  if (pending && !opts?.force) return pending

  const p = fetcher()
    .then((data) => {
      setSearchCache(key, data)
      return data
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}
