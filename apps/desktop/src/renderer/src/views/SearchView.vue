<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin } from 'naive-ui'
import MediaCard from '@/components/media/MediaCard.vue'
import { searchVod } from '@/api/vod'
import type { SearchFailure, VodSearchItem } from '@my-movie/shared'
import { useSourcesStore } from '@/stores/sources'
import { useSearchHistoryStore } from '@/stores/searchHistory'
import { makeSearchCacheKey, peekSearchCache } from '@/utils/vodSearchCache'

defineOptions({ name: 'SearchView' })

const route = useRoute()
const router = useRouter()
const sourcesStore = useSourcesStore()
const searchHistory = useSearchHistoryStore()
const loading = ref(false)
const list = ref<VodSearchItem[]>([])
const failures = ref<SearchFailure[]>([])
const q = computed(() => String(route.query.q || '').trim())

/** 成功源及其条数（数据就在下方卡片列表里，角标为 sourceName） */
const successStats = computed(() => {
  const map = new Map<string, number>()
  for (const item of list.value) {
    map.set(item.sourceName, (map.get(item.sourceName) || 0) + 1)
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'))
})

function goHistory(item: string) {
  searchHistory.add(item)
  router.push({ path: '/search', query: { q: item } })
}

async function runSearch(force = false) {
  if (!q.value) {
    list.value = []
    failures.value = []
    return
  }

  searchHistory.add(q.value)
  await sourcesStore.load().catch(() => undefined)
  const enabled = sourcesStore.enabledKeys

  if (!force) {
    const hit = peekSearchCache(makeSearchCacheKey(q.value, enabled))
    if (hit) {
      list.value = hit.data.list
      failures.value = hit.data.failures
      loading.value = false
      if (hit.fresh) return
    } else {
      loading.value = true
    }
  } else {
    loading.value = true
  }

  failures.value = []
  try {
    const cmsRes = await searchVod(q.value, { sources: enabled, force }).then(
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
  } finally {
    loading.value = false
  }
}

watch(q, () => runSearch(false), { immediate: true })
</script>

<template>
  <div class="page wide search-page">
    <div class="head">
      <div class="titles">
        <h1 class="page-title">{{ q ? `搜索：${q}` : '搜索' }}</h1>
        <p v-if="!loading && q" class="page-hint count">{{ list.length }} 个结果</p>
      </div>
      <button v-if="q" type="button" class="refresh" :disabled="loading" @click="runSearch(true)">
        刷新结果
      </button>
    </div>

    <div v-if="searchHistory.items.length" class="recent">
      <div class="recent-head">
        <span>最近搜索</span>
        <button type="button" class="clear-all" @click="searchHistory.clear()">清空</button>
      </div>
      <div class="chips">
        <button
          v-for="item in searchHistory.items"
          :key="item"
          type="button"
          class="chip"
          :class="{ active: item === q }"
          @click="goHistory(item)"
        >
          <span>{{ item }}</span>
          <span
            class="chip-x"
            role="button"
            tabindex="-1"
            aria-label="删除"
            @click.stop="searchHistory.remove(item)"
          >
            ×
          </span>
        </button>
      </div>
    </div>

    <div v-if="q && !loading && (successStats.length || failures.length)" class="status-bar" role="status">
      <div v-if="successStats.length" class="ok-bar">
        <span class="ok-label">已成功 {{ successStats.length }} 个源</span>
        <span v-for="s in successStats" :key="s.name" class="ok-chip" :title="`${s.count} 条结果`">
          {{ s.name }}
          <em>{{ s.count }}</em>
        </span>
      </div>
      <div v-if="failures.length" class="fail-bar">
        <span class="fail-label">失败 {{ failures.length }} 个源</span>
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
        <p v-else-if="searchHistory.items.length">点击上方最近搜索可快速再搜</p>
      </div>
    </NSpin>
  </div>
</template>

<style scoped lang="scss">
.search-page {
  max-width: var(--page-max-wide);
}

.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.titles .page-title {
  margin-bottom: 0;
}

.count {
  margin: var(--space-1) 0 0;
}

.refresh {
  border: 0;
  background: var(--bg-soft);
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  padding: var(--chip-pad-lg);
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

.recent {
  margin-bottom: var(--space-4);
}

.recent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

.clear-all {
  border: 0;
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}

.clear-all:hover {
  color: var(--accent);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 100%;
  border: 0;
  background: var(--bg-soft);
  color: var(--text-muted);
  border-radius: var(--radius-pill);
  padding: var(--chip-pad);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  transition: background 0.15s ease, color 0.15s ease;
}

.chip span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip:hover,
.chip.active {
  background: var(--bg-hover);
  color: var(--text);
}

.chip.active {
  box-shadow: 0 0 0 1px var(--accent);
  color: var(--accent);
}

.chip-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: var(--text-dim);
  font-size: 13px;
  line-height: 1;
  flex-shrink: 0;
}

.chip-x:hover {
  background: var(--bg-card);
  color: var(--text);
}

.status-bar {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.ok-bar,
.fail-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: 10px 12px;
  border-radius: var(--radius);
}

.ok-bar {
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-elevated));
}

.fail-bar {
  background: color-mix(in srgb, var(--warning) 12%, var(--bg-elevated));
}

.ok-label,
.fail-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-right: 4px;
}

.ok-label {
  color: var(--accent);
}

.fail-label {
  color: var(--warning);
}

.ok-chip,
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

.ok-chip em,
.fail-chip em {
  font-style: normal;
  font-weight: 400;
  color: var(--text-dim);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: var(--space-grid);
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
