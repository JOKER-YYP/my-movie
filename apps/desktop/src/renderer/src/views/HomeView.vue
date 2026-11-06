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

async function loadRail(query: string, take = 14) {
  const res = await searchVod(query, sourcesStore.enabledKeys.slice(0, 5))
  return res.list.slice(0, take)
}

async function bootstrap() {
  loading.value = true
  try {
    await sourcesStore.load()
    const [hot, ...channelLists] = await Promise.all([
      loadRail('热播', 16),
      ...CHANNELS.map((c) => loadRail(c.query, 12)),
    ])
    featured.value = hot[0] || null
    rails.value = {
      hot: hot.slice(1),
      ...Object.fromEntries(CHANNELS.map((c, i) => [c.key, channelLists[i] || []])),
    }
    continues.value = await listHistory(userStore.token || undefined, 12)
  } catch {
    featured.value = null
    rails.value = {}
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
          <NButton type="primary" size="large" :disabled="!featured" @click="openFeatured">
            立即观看
          </NButton>
          <NButton size="large" secondary @click="router.push('/search?q=热播')">浏览更多</NButton>
        </div>
      </div>
    </section>

    <div class="content">
      <NSpin :show="loading">
        <ContinueRail :items="continues" />
        <MediaRail
          title="今日热播"
          subtitle="多源聚合，实时刷新"
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

.content {
  padding: var(--space-2) var(--page-x) var(--space-7);
}
</style>
