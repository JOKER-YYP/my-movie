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
const heroPicks = computed(() => (rails.value.hot || []).slice(0, 5))

const heroStyle = computed(() => {
  const cover = featured.value?.cover
  return cover
    ? {
        backgroundImage: `linear-gradient(90deg, var(--scrim-strong) 8%, var(--scrim-mid) 42%, transparent 72%), linear-gradient(0deg, var(--bg) 0%, transparent 38%), url(${cover})`,
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

function openItem(item: VodSearchItem) {
  featured.value = item
}

function playItem(item: VodSearchItem) {
  router.push(`/media/${item.sourceKey}/${item.vodId}`)
}

onMounted(bootstrap)
</script>

<template>
  <div class="home">
    <section class="hero" :style="heroStyle">
      <div class="hero-inner">
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
            立即播放
          </NButton>
          <NButton class="cta-secondary" size="large" secondary @click="router.push('/search?q=热播')">
            更多热播
          </NButton>
        </div>
      </div>

      <div v-if="heroPicks.length" class="hero-picks" aria-label="热播推荐">
        <button
          v-for="item in heroPicks"
          :key="`${item.sourceKey}-${item.vodId}`"
          type="button"
          class="pick"
          :class="{ active: featured?.vodId === item.vodId && featured?.sourceKey === item.sourceKey }"
          :title="item.title"
          @click="openItem(item)"
          @dblclick="playItem(item)"
        >
          <img v-if="item.cover" :src="item.cover" :alt="item.title" loading="lazy" />
        </button>
      </div>
    </section>

    <div class="content">
      <NSpin :show="loading">
        <ContinueRail :items="continues" />
        <MediaRail
          title="重磅热播"
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
  min-height: 100vh;
}

.hero {
  position: relative;
  min-height: min(62vh, 520px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--space-5);
  padding: calc(var(--header-h) + 28px) var(--page-x) 36px;
  background: var(--hero-fallback);
  background-size: cover;
  background-position: center top;
}

.hero-inner {
  width: min(560px, 100%);
  padding-bottom: 8px;
}

h1 {
  margin: 0 0 10px;
  font-size: clamp(28px, 3.6vw, 44px);
  font-weight: 700;
  max-width: 14ch;
  line-height: 1.15;
  text-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

p {
  margin: 0;
  max-width: 42ch;
  color: color-mix(in srgb, var(--text) 82%, transparent);
  font-size: 14px;
  line-height: 1.55;
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

.hero-picks {
  display: flex;
  align-items: end;
  gap: 10px;
  padding-bottom: 4px;
  max-width: min(420px, 42vw);
  overflow: auto;
  scrollbar-width: none;
}

.hero-picks::-webkit-scrollbar {
  display: none;
}

.pick {
  flex: 0 0 68px;
  width: 68px;
  aspect-ratio: 2 / 3;
  border: 0;
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-card);
  cursor: pointer;
  opacity: 0.72;
  transform: scale(0.96);
  transition: opacity 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: var(--shadow-soft);
}

.pick img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pick:hover,
.pick.active {
  opacity: 1;
  transform: scale(1);
}

.pick.active {
  box-shadow: 0 0 0 2px var(--text), var(--shadow-heavy);
}

.content {
  position: relative;
  z-index: 1;
  margin-top: -8px;
  padding: var(--space-4) var(--page-x) var(--space-7);
  background: linear-gradient(180deg, transparent, var(--bg) 24px);
}

@media (max-width: 980px) {
  .hero {
    grid-template-columns: 1fr;
    min-height: min(54vh, 440px);
  }

  .hero-picks {
    max-width: 100%;
  }
}
</style>
