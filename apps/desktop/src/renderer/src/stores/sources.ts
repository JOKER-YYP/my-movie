import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { VodSource } from '@my-movie/shared'
import { fetchSources } from '@/api/vod'

export const useSourcesStore = defineStore('sources', () => {
  const all = ref<VodSource[]>([])
  const enabledKeys = ref<string[]>([])
  const loaded = ref(false)

  const enabledSources = computed(() => all.value.filter((s) => enabledKeys.value.includes(s.key)))

  async function load() {
    if (loaded.value) return
    all.value = await fetchSources()
    const saved = localStorage.getItem('enabledSources')
    if (saved) {
      try {
        enabledKeys.value = JSON.parse(saved) as string[]
      } catch {
        enabledKeys.value = all.value.map((s) => s.key)
      }
    } else {
      enabledKeys.value = all.value.map((s) => s.key)
    }
    loaded.value = true
  }

  function toggle(key: string, on: boolean) {
    if (on && !enabledKeys.value.includes(key)) enabledKeys.value.push(key)
    if (!on) enabledKeys.value = enabledKeys.value.filter((k) => k !== key)
    localStorage.setItem('enabledSources', JSON.stringify(enabledKeys.value))
  }

  return { all, enabledKeys, enabledSources, loaded, load, toggle }
})
