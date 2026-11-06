import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchFailure, VodSearchItem } from '@my-movie/shared'

export type SearchCacheEntry = {
  q: string
  sourceSig: string
  list: VodSearchItem[]
  failures: SearchFailure[]
  at: number
}

const TTL_MS = 15 * 60 * 1000
const MAX_ENTRIES = 20

export const useSearchStore = defineStore('search', () => {
  const cache = ref<Record<string, SearchCacheEntry>>({})
  const lastQ = ref('')

  function cacheKey(q: string, sourceSig: string) {
    return `${q.trim()}::${sourceSig}`
  }

  function sourceSignature(keys: string[]) {
    return [...keys].sort().join(',')
  }

  function get(q: string, enabledKeys: string[]): SearchCacheEntry | null {
    const key = cacheKey(q, sourceSignature(enabledKeys))
    const hit = cache.value[key]
    if (!hit) return null
    if (Date.now() - hit.at > TTL_MS) {
      delete cache.value[key]
      return null
    }
    return hit
  }

  function set(entry: Omit<SearchCacheEntry, 'at' | 'sourceSig'> & { enabledKeys: string[] }) {
    const sourceSig = sourceSignature(entry.enabledKeys)
    const key = cacheKey(entry.q, sourceSig)
    cache.value = {
      ...cache.value,
      [key]: {
        q: entry.q,
        sourceSig,
        list: entry.list,
        failures: entry.failures,
        at: Date.now(),
      },
    }
    lastQ.value = entry.q

    const keys = Object.keys(cache.value)
    if (keys.length > MAX_ENTRIES) {
      const sorted = keys
        .map((k) => ({ k, at: cache.value[k].at }))
        .sort((a, b) => a.at - b.at)
      const next = { ...cache.value }
      for (const item of sorted.slice(0, keys.length - MAX_ENTRIES)) {
        delete next[item.k]
      }
      cache.value = next
    }
  }

  function clear(q?: string) {
    if (!q) {
      cache.value = {}
      return
    }
    const prefix = `${q.trim()}::`
    const next = { ...cache.value }
    for (const k of Object.keys(next)) {
      if (k.startsWith(prefix)) delete next[k]
    }
    cache.value = next
  }

  return { cache, lastQ, get, set, clear, sourceSignature }
})
