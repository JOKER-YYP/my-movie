<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAlert, NSpin, NTabPane, NTabs } from 'naive-ui'
import GroupedMediaCard from '@/components/media/GroupedMediaCard.vue'
import { searchVod } from '@/api/vod'
import { searchPan } from '@/api/pan'
import type { PanSearchItem, SearchFailure, VodSearchItem } from '@my-movie/shared'
import { useSourcesStore } from '@/stores/sources'
import { normalizeTitle } from '@/utils/title'

const route = useRoute()
const router = useRouter()
const sourcesStore = useSourcesStore()
const loading = ref(false)
const tab = ref<'cms' | 'pan'>('cms')
const list = ref<VodSearchItem[]>([])
const panList = ref<PanSearchItem[]>([])
const failures = ref<SearchFailure[]>([])
const q = computed(() => String(route.query.q || '').trim())

const grouped = computed(() => {
  const map = new Map<string, { title: string; items: VodSearchItem[] }>()
  for (const item of list.value) {
    const key = normalizeTitle(item.title) || `${item.sourceKey}-${item.vodId}`
    const hit = map.get(key)
    if (hit) hit.items.push(item)
    else map.set(key, { title: item.title, items: [item] })
  }
  return [...map.values()].sort((a, b) => b.items.length - a.items.length)
})

async function runSearch() {
  if (!q.value) {
    list.value = []
    panList.value = []
    return
  }
  loading.value = true
  failures.value = []
  try {
    await sourcesStore.load()
    const [cmsRes, panRes] = await Promise.allSettled([
      searchVod(q.value, sourcesStore.enabledKeys),
      searchPan(q.value),
    ])
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
    if (panRes.status === 'fulfilled') {
      panList.value = panRes.value.list
    } else {
      panList.value = []
      failures.value.push({
        sourceKey: 'xiageba',
        sourceName: '下歌吧网盘',
        error: panRes.reason instanceof Error ? panRes.reason.message : '失败',
      })
    }
    if (!list.value.length && panList.value.length) tab.value = 'pan'
  } finally {
    loading.value = false
  }
}

watch(q, runSearch, { immediate: true })
</script>

<template>
  <div>
    <h1>搜索：{{ q || '请输入关键词' }}</h1>
    <NAlert v-if="failures.length" type="warning" style="margin: 12px 0 20px" :bordered="false">
      部分源失败：
      {{ failures.map((f) => `${f.sourceName}(${f.timedOut ? '超时' : f.error})`).join('、') }}
    </NAlert>
    <NSpin :show="loading">
      <NTabs v-model:value="tab" type="line" animated>
        <NTabPane name="cms" :tab="`在线源 (${list.length})`">
          <div v-if="grouped.length" class="grid">
            <GroupedMediaCard
              v-for="g in grouped"
              :key="g.title + g.items[0].sourceKey"
              :title="g.title"
              :items="g.items"
            />
          </div>
          <div v-else class="empty">没有找到在线源结果</div>
        </NTabPane>
        <NTabPane name="pan" :tab="`网盘 (${panList.length})`">
          <div v-if="panList.length" class="pan-list">
            <button
              v-for="item in panList"
              :key="item.id"
              type="button"
              class="pan-item"
              @click="router.push(`/pan/${item.id}`)"
            >
              <div class="pan-title">{{ item.title }}</div>
              <div class="pan-sub">{{ item.sourceName }} · {{ item.panType }}</div>
            </button>
          </div>
          <div v-else class="empty">没有找到网盘资源</div>
        </NTabPane>
      </NTabs>
    </NSpin>
  </div>
</template>

<style scoped lang="scss">
h1 {
  margin: 0 0 var(--space-3);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 18px;
  padding-top: var(--space-3);
}

.pan-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: var(--space-3);
}

.pan-item {
  text-align: left;
  border: 0;
  background: var(--bg-elevated);
  color: var(--text);
  border-radius: var(--radius);
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.pan-item:hover {
  background: var(--bg-soft);
  box-shadow: var(--shadow-soft);
}

.pan-title {
  font-weight: 600;
}

.pan-sub {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 12px;
}

.empty {
  padding: 64px 0;
  text-align: center;
  color: var(--text-muted);
}
</style>
