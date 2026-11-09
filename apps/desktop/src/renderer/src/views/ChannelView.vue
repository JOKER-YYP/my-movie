<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin } from 'naive-ui'
import MediaCard from '@/components/media/MediaCard.vue'
import { searchVod } from '@/api/vod'
import type { VodSearchItem } from '@my-movie/shared'
import { CHANNELS, channelByKey } from '@/constants/channels'
import { useSourcesStore } from '@/stores/sources'
import { makeSearchCacheKey, peekSearchCache } from '@/utils/vodSearchCache'

const route = useRoute()
const router = useRouter()
const sourcesStore = useSourcesStore()

const loading = ref(false)
const list = ref<VodSearchItem[]>([])
const banner = ref<VodSearchItem | null>(null)

const channel = computed(() => channelByKey(String(route.params.type || '')) || CHANNELS[0])

function applyList(items: VodSearchItem[]) {
  banner.value = items[0] || null
  list.value = items.slice(1)
}

async function load() {
  try {
    await sourcesStore.load()
    const sourceKeys = sourcesStore.enabledKeys.slice(0, 6)
    const cacheKey = makeSearchCacheKey(channel.value.query, sourceKeys, { maxPages: 1 })
    const hit = peekSearchCache(cacheKey)
    if (hit) {
      applyList(hit.data.list)
      loading.value = false
    } else {
      loading.value = true
    }

    const res = await searchVod(channel.value.query, {
      sources: sourceKeys,
      maxPages: 1,
    })
    applyList(res.list)
  } catch {
    if (!list.value.length) {
      banner.value = null
      list.value = []
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.type,
  () => load(),
  { immediate: true },
)
</script>

<template>
  <div class="channel">
    <section
      class="banner"
      :style="
        banner?.cover
          ? {
              backgroundImage: `linear-gradient(90deg, var(--scrim-strong) 10%, var(--scrim-soft) 55%, transparent), linear-gradient(0deg, var(--bg), transparent 40%), url(${banner.cover})`,
            }
          : undefined
      "
    >
      <h1>{{ channel.label }}</h1>
      <p>{{ channel.blurb }}</p>
      <button
        v-if="banner"
        type="button"
        class="watch"
        @click="router.push(`/media/${banner.sourceKey}/${banner.vodId}`)"
      >
        播放 · {{ banner.title }}
      </button>
    </section>

    <NSpin :show="loading">
      <div class="grid">
        <MediaCard v-for="item in list" :key="`${item.sourceKey}-${item.vodId}`" :item="item" />
      </div>
      <div v-if="!loading && !list.length" class="empty">该频道暂无内容</div>
    </NSpin>
  </div>
</template>

<style scoped lang="scss">
.channel {
  min-height: 100vh;
}

.banner {
  min-height: min(42vh, 340px);
  padding: calc(var(--header-h) + 28px) var(--page-x) 36px;
  background: var(--banner-fallback);
  background-size: cover;
  background-position: center;
}

h1 {
  margin: 0;
  font-size: clamp(26px, 3vw, 36px);
}

p {
  margin: 10px 0 0;
  color: var(--text-muted);
  max-width: 48ch;
}

.watch {
  margin-top: 20px;
  border: 0;
  border-radius: var(--radius-pill);
  padding: 10px 24px;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  cursor: pointer;
  max-width: min(420px, 100%);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.watch:hover {
  filter: brightness(1.06);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 18px;
  padding: 28px var(--page-x) 48px;
}

.empty {
  padding: 64px;
  text-align: center;
  color: var(--text-muted);
}
</style>
