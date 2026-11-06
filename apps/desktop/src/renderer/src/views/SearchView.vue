<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { NAlert, NSpin } from 'naive-ui'
import MediaCard from '@/components/media/MediaCard.vue'
import { searchVod } from '@/api/vod'
import type { SearchFailure, VodSearchItem } from '@my-movie/shared'
import { useSourcesStore } from '@/stores/sources'
import { useSearchStore } from '@/stores/search'

defineOptions({ name: 'SearchView' })

const route = useRoute()
const sourcesStore = useSourcesStore()
const searchStore = useSearchStore()
const loading = ref(false)
const list = ref<VodSearchItem[]>([])
const failures = ref<SearchFailure[]>([])
const q = computed(() => String(route.query.q || '').trim())

function applyCache(hit: NonNullable<ReturnType<typeof searchStore.get>>) {
  list.value = hit.list
  failures.value = hit.failures
}

async function runSearch(force = false) {
  if (!q.value) {
    list.value = []
    failures.value = []
    return
  }

  await sourcesStore.load().catch(() => undefined)
  const enabled = sourcesStore.enabledKeys

  if (!force) {
    const hit = searchStore.get(q.value, enabled)
    if (hit) {
      applyCache(hit)
      loading.value = false
      return
    }
  }

  loading.value = true
  failures.value = []
  try {
    const cmsRes = await searchVod(q.value, enabled).then(
      (value) => ({ status: 'fulfilled' as const, value }),
      (reason) => ({ status: 'rejected' as const, reason }),
    )
    if (cmsRes.status === 'fulfilled') {
      list.value = cmsRes.value.list
      failures.value = cmsRes.value.failures
    } else {
      list.value = []
      failures.value.push({
        sourceKey: 'cms',
        sourceName: '采集站',
        error: cmsRes.reason instanceof Error ? cmsRes.reason.message : '失败',
      })
    }

    searchStore.set({
      q: q.value,
      enabledKeys: enabled,
      list: list.value,
      failures: failures.value,
    })
  } finally {
    loading.value = false
  }
}

watch(q, () => runSearch(false), { immediate: true })
</script>

<template>
  <div>
    <div class="head">
      <h1>搜索：{{ q || '请输入关键词' }}</h1>
      <div class="head-right">
        <span v-if="!loading && q" class="count">{{ list.length }} 个结果</span>
        <button v-if="q" type="button" class="refresh" :disabled="loading" @click="runSearch(true)">
          刷新结果
        </button>
      </div>
    </div>
    <NAlert v-if="failures.length" type="warning" style="margin: 12px 0 20px" :bordered="false">
      部分源失败：
      {{ failures.map((f) => `${f.sourceName}(${f.timedOut ? '超时' : f.error})`).join('、') }}
    </NAlert>
    <NSpin :show="loading">
      <div v-if="list.length" class="grid">
        <MediaCard
          v-for="item in list"
          :key="`${item.sourceKey}-${item.vodId}`"
          :item="item"
        />
      </div>
      <div v-else class="empty">没有找到结果</div>
    </NSpin>
  </div>
</template>

<style scoped lang="scss">
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

h1 {
  margin: 0;
}

.count {
  color: var(--text-muted);
  font-size: 13px;
}

.refresh {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
  padding: 4px 0;
}

.refresh:hover:not(:disabled) {
  color: var(--accent);
}

.refresh:disabled {
  opacity: 0.5;
  cursor: default;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 18px;
  padding-top: var(--space-3);
}

.empty {
  padding: 64px 0;
  text-align: center;
  color: var(--text-muted);
}
</style>
