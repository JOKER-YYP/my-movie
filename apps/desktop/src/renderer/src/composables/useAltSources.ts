import { ref } from 'vue'
import type { VodSearchItem } from '@my-movie/shared'
import { searchVod } from '@/api/vod'
import { useSourcesStore } from '@/stores/sources'
import { isSameTitle } from '@/utils/title'

export function useAltSources() {
  const alts = ref<VodSearchItem[]>([])
  const loading = ref(false)
  const sourcesStore = useSourcesStore()

  async function loadAlts(title: string, currentSource: string, currentId: string) {
    loading.value = true
    try {
      await sourcesStore.load()
      const res = await searchVod(title, sourcesStore.enabledKeys)
      alts.value = res.list.filter(
        (it) =>
          isSameTitle(it.title, title) &&
          !(it.sourceKey === currentSource && it.vodId === currentId),
      )
    } catch {
      alts.value = []
    } finally {
      loading.value = false
    }
  }

  return { alts, loading, loadAlts }
}
