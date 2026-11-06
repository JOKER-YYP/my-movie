<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { NSpin } from 'naive-ui'
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
  <div class="search-page">
    <div class="head">
      <div class="titles">
        <h1>{{ q ? `搜索：${q}` : '搜索' }}</h1>
        <p v-if="!loading && q" class="count">{{ list.length }} 个结果</p>
      </div>
      <button v-if="q" type="button" class="refresh" :disabled="loading" @click="runSearch(true)">
        刷新结果
      </button>
    </div>

    <div v-if="failures.length" class="fail-bar" role="status">
      <span class="fail-label">部分源失败</span>
      <span
        v-for="f in failures"
        :key="f.sourceKey"
        class="fail-chip"
        :title="f.error"
      >
        {{ f.sourceName }}
        <em>{{ f.timedOut ? '超时' : '失败' }}</em>
      </span>
    </div>

    <NSpin :show="loading">
      <div v-if="list.length" class="grid">
        <MediaCard
          v-for="item in list"
          :key="`${item.sourceKey}-${item.vodId}`"
          :item="item"
        />
      </div>
      <div v-else class="empty">
        <strong>{{ q ? '没有找到匹配的结果' : '请输入关键词开始搜索' }}</strong>
        <p v-if="q">可尝试其它关键词，或到设置中检查已启用的采集源</p>
      </div>
    </NSpin>
  </div>
</template>

<style scoped lang="scss">
.search-page {
  max-width: 1600px;
}

.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.titles h1 {
  margin: 0;
}

.count {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 14px;
}

.refresh {
  border: 0;
  background: var(--bg-soft);
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  transition: background 0.15s ease, color 0.15s ease;
}

.refresh:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--accent);
}

.refresh:disabled {
  opacity: 0.5;
  cursor: default;
}

.fail-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  padding: 10px 12px;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--warning) 12%, var(--bg-elevated));
}

.fail-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--warning);
  letter-spacing: 0.04em;
  margin-right: 4px;
}

.fail-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: var(--bg-soft);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.fail-chip em {
  font-style: normal;
  font-weight: 400;
  color: var(--text-dim);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 18px;
  padding-top: var(--space-2);
}

.empty {
  padding: 72px 0;
  text-align: center;
  color: var(--text-muted);
}

.empty strong {
  display: block;
  color: var(--text);
  font-size: 16px;
  font-weight: 700;
}

.empty p {
  margin: 8px 0 0;
  font-size: 13px;
}
</style>
