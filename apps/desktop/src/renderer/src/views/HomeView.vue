<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NSpin } from 'naive-ui'
import MediaRail from '@/components/media/MediaRail.vue'
import ContinueRail from '@/components/media/ContinueRail.vue'
import { searchVod } from '@/api/vod'
import type { VodSearchItem } from '@my-movie/shared'
import { useSourcesStore } from '@/stores/sources'
import { useUserStore } from '@/stores/user'
import { CHANNELS } from '@/constants/channels'
import { listHistory, type ProgressRecord } from '@/utils/progress'
import { makeSearchCacheKey, peekSearchCache } from '@/utils/vodSearchCache'

const router = useRouter()
const sourcesStore = useSourcesStore()
const userStore = useUserStore()

const loading = ref(true)
const featured = ref<VodSearchItem | null>(null)
const rails = ref<Record<string, VodSearchItem[]>>({})
const continues = ref<ProgressRecord[]>([])

const heroStyle = computed(() => {
  const cover = featured.value?.cover
  return cover
    ? {
        backgroundImage: `linear-gradient(90deg, var(--scrim-strong) 0%, var(--scrim-mid) 45%, var(--scrim-soft) 100%), url(${cover})`,
      }
    : undefined
})

function applyHot(list: VodSearchItem[]) {
  featured.value = list[0] || null
  rails.value = {
    ...rails.value,
    hot: list.slice(1),
  }
}

function hydrateFromCache(sourceKeys: string[]) {
  const hotKey = makeSearchCacheKey('热播', sourceKeys, { maxPages: 1 })
  const hotHit = peekSearchCache(hotKey)
  if (hotHit) applyHot(hotHit.data.list.slice(0, 16))

  const next = { ...rails.value }
  for (const ch of CHANNELS) {
    const key = makeSearchCacheKey(ch.query, sourceKeys, { maxPages: 1 })
    const hit = peekSearchCache(key)
    if (hit) next[ch.key] = hit.data.list.slice(0, 12)
  }
  rails.value = next
  return Boolean(hotHit || Object.keys(next).some((k) => k !== 'hot' && (next[k]?.length || 0) > 0))
}

async function loadRail(query: string, sourceKeys: string[], take = 14) {
  const res = await searchVod(query, {
    sources: sourceKeys,
    maxPages: 1,
  })
  return res.list.slice(0, take)
}

async function bootstrap() {
  try {
    await sourcesStore.load()
    const sourceKeys = sourcesStore.enabledKeys.slice(0, 5)
    const hadCache = hydrateFromCache(sourceKeys)
    loading.value = !hadCache

    const [hot, ...channelLists] = await Promise.all([
      loadRail('热播', sourceKeys, 16),
      ...CHANNELS.map((c) => loadRail(c.query, sourceKeys, 12)),
    ])
    applyHot(hot)
    rails.value = {
      hot: hot.slice(1),
      ...Object.fromEntries(CHANNELS.map((c, i) => [c.key, channelLists[i] || []])),
    }
    continues.value = await listHistory(userStore.token || undefined, 12)
  } catch {
    if (!featured.value) {
      featured.value = null
      rails.value = {}
    }
  } finally {
    loading.value = false
  }
}

function openFeatured() {
  if (!featured.value) return
  router.push(`/media/${featured.value.sourceKey}/${featured.value.vodId}`)
}

onMounted(bootstrap)
</script>

<template>
  <div class="home">
    <section class="hero" :style="heroStyle">
      <div class="hero-inner">
        <div class="brand-mark">my-movie</div>
        <h1>{{ featured?.title || '发现好内容' }}</h1>
        <p>
          {{
            featured
              ? `${featured.typeName || '精选'} · ${featured.sourceName}${featured.remarks ? ` · ${featured.remarks}` : ''}`
              : '聚合公开片源，桌面端沉浸播放'
          }}
        </p>
        <div class="cta">
          <NButton
            class="cta-primary"
            type="primary"
            size="large"
            :disabled="!featured"
            @click="openFeatured"
          >
            立即观看
          </NButton>
          <NButton class="cta-secondary" size="large" secondary @click="router.push('/search?q=热播')">
            浏览更多
          </NButton>
        </div>
      </div>
    </section>

    <div class="content">
      <NSpin :show="loading">
        <ContinueRail :items="continues" />
        <MediaRail
          title="今日热播"
          subtitle="多源聚合，本地缓存加速"
          :items="rails.hot || []"
          more-to="/search?q=热播"
        />
        <MediaRail
          v-for="ch in CHANNELS"
          :key="ch.key"
          :title="ch.label"
          :subtitle="ch.blurb"
          :items="rails[ch.key] || []"
          :more-to="`/channel/${ch.key}`"
        />
      </NSpin>
    </div>
  </div>
</template>

<style scoped lang="scss">
.home {
  min-height: calc(100vh - var(--header-h));
}

.hero {
  min-height: min(52vh, 420px);
  display: flex;
  align-items: flex-end;
  background: var(--hero-fallback);
  background-size: cover;
  background-position: center top;
}

.hero-inner {
  width: min(640px, 100%);
  padding: 48px var(--page-x) 40px;
}

.brand-mark {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

h1 {
  margin: 12px 0 8px;
  font-size: clamp(24px, 3.2vw, 40px);
  font-weight: 700;
  max-width: 18ch;
}

p {
  margin: 0;
  max-width: 42ch;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.5;
}

.cta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-5);
}

.cta-primary,
.cta-secondary {
  letter-spacing: 1.4px;
  text-transform: uppercase;
  font-weight: 700 !important;
}

.content {
  padding: var(--space-5) var(--page-x) var(--space-7);
}
</style>
