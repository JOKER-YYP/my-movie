import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'searchHistory'
/** 对齐 LibreTV MAX_HISTORY_ITEMS，略放宽到 10 */
const MAX_ITEMS = 10

function readStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .slice(0, MAX_ITEMS)
  } catch {
    return []
  }
}

function writeStorage(items: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
}

export const useSearchHistoryStore = defineStore('searchHistory', () => {
  const items = ref<string[]>(readStorage())

  function persist() {
    writeStorage(items.value)
  }

  function add(q: string) {
    const text = q.trim()
    if (!text) return
    items.value = [text, ...items.value.filter((x) => x !== text)].slice(0, MAX_ITEMS)
    persist()
  }

  function remove(q: string) {
    items.value = items.value.filter((x) => x !== q)
    persist()
  }

  function clear() {
    items.value = []
    persist()
  }

  return { items, add, remove, clear }
})
