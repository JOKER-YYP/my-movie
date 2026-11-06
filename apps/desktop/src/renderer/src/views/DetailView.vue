<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NSpin, useMessage } from 'naive-ui'
import { fetchDetail } from '@/api/vod'
import { apiDelete, apiPost } from '@/api/http'
import { API_PATHS, type VodDetail, type VodSearchItem } from '@my-movie/shared'
import { useUserStore } from '@/stores/user'
import { fetchProgress, formatProgress, type ProgressRecord } from '@/utils/progress'
import { useAltSources } from '@/composables/useAltSources'
import SourceSwitch from '@/components/media/SourceSwitch.vue'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

const loading = ref(false)
const detail = ref<VodDetail | null>(null)
const lineIndex = ref(0)
const progress = ref<ProgressRecord | null>(null)
const { alts, loading: altsLoading, loadAlts } = useAltSources()

const source = computed(() => String(route.params.source || ''))
const id = computed(() => String(route.params.id || ''))
const currentLine = computed(() => detail.value?.lines[lineIndex.value])
const progressLabel = computed(() => {
  if (!progress.value) return ''
  return `第 ${progress.value.episodeIndex + 1} 集 · ${formatProgress(progress.value.positionSec, progress.value.durationSec)}`
})

async function load() {
  loading.value = true
  try {
    detail.value = await fetchDetail(source.value, id.value)
    lineIndex.value = 0
    progress.value = await fetchProgress(source.value, id.value, userStore.token || undefined)
    if (progress.value?.lineIndex != null) lineIndex.value = progress.value.lineIndex
    void loadAlts(detail.value.title, source.value, id.value)
  } catch (err) {
    detail.value = null
    progress.value = null
    message.error(err instanceof Error ? err.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function switchSource(item: VodSearchItem) {
  router.push(`/media/${item.sourceKey}/${item.vodId}`)
}

function play(epIndex: number, resume = false) {
  router.push({
    path: `/play/${source.value}/${id.value}`,
    query: {
      ep: String(epIndex),
      line: String(lineIndex.value),
      ...(resume ? { resume: '1' } : {}),
    },
  })
}

function playContinue() {
  if (!progress.value) {
    play(0, true)
    return
  }
  lineIndex.value = progress.value.lineIndex ?? lineIndex.value
  play(progress.value.episodeIndex, true)
}

async function toggleFavorite() {
  if (!userStore.token || !detail.value) {
    message.warning('请先登录')
    router.push('/login')
    return
  }
  try {
    await apiPost(API_PATHS.favorites, {
      sourceKey: detail.value.sourceKey,
      vodId: detail.value.vodId,
      title: detail.value.title,
      cover: detail.value.cover,
    })
    message.success('已收藏')
  } catch (err) {
    message.error(err instanceof Error ? err.message : '收藏失败')
  }
}

async function removeFavorite() {
  if (!detail.value) return
  await apiDelete(API_PATHS.favorites, {
    sourceKey: detail.value.sourceKey,
    vodId: detail.value.vodId,
  })
  message.success('已取消收藏')
}

watch([source, id], load, { immediate: true })
</script>

<template>
  <NSpin :show="loading">
    <div v-if="detail" class="detail">
      <div class="poster" :style="{ backgroundImage: detail.cover ? `url(${detail.cover})` : undefined }" />
      <div class="info">
        <h1>{{ detail.title }}</h1>
        <div class="meta">
          <span>{{ detail.sourceName }}</span>
          <span v-if="detail.typeName">{{ detail.typeName }}</span>
          <span v-if="detail.year">{{ detail.year }}</span>
          <span v-if="detail.remarks">{{ detail.remarks }}</span>
        </div>
        <p class="desc">{{ detail.content || '暂无简介' }}</p>
        <div class="actions">
          <NButton
            v-if="progress && progress.positionSec > 5"
            type="primary"
            @click="playContinue"
          >
            继续播放 · {{ progressLabel }}
          </NButton>
          <NButton
            :type="progress && progress.positionSec > 5 ? 'default' : 'primary'"
            :disabled="!currentLine?.episodes.length"
            @click="play(0)"
          >
            {{ progress && progress.positionSec > 5 ? '从头播放' : '立即播放' }}
          </NButton>
          <NButton @click="toggleFavorite">收藏</NButton>
          <NButton quaternary @click="removeFavorite">取消收藏</NButton>
        </div>

        <SourceSwitch
          :current-source="detail.sourceKey"
          :current-name="detail.sourceName"
          :items="alts"
          :loading="altsLoading"
          @select="switchSource"
        />

        <div v-if="detail.lines.length" class="lines">
          <button
            v-for="(line, idx) in detail.lines"
            :key="line.name"
            class="chip"
            :class="{ active: idx === lineIndex }"
            @click="lineIndex = idx"
          >
            {{ line.name }}
          </button>
        </div>

        <div v-if="currentLine" class="eps">
          <button
            v-for="ep in currentLine.episodes"
            :key="ep.index"
            class="ep"
            :class="{ current: progress?.episodeIndex === ep.index }"
            @click="play(ep.index)"
          >
            {{ ep.name }}
          </button>
        </div>
        <div v-else class="empty">当前源未返回可播放地址</div>
      </div>
    </div>
  </NSpin>
</template>

<style scoped lang="scss">
.detail {
  display: grid;
  grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
  gap: var(--space-6);
  align-items: start;
}

.poster {
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 8px;
  background: var(--bg-card) center/cover no-repeat;
  box-shadow: var(--shadow-soft);
}

h1 {
  margin: 0 0 10px;
  font-size: 24px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--text-muted);
  margin-bottom: 14px;
  font-size: 13px;
}

.desc {
  color: var(--text-muted);
  line-height: 1.75;
  max-width: 68ch;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 18px 0 8px;
}

.lines,
.eps {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.chip,
.ep {
  border: 0;
  background: var(--bg-soft);
  color: var(--text-muted);
  border-radius: var(--radius-pill);
  padding: 8px 14px;
  cursor: pointer;
  font-weight: 700;
  font-size: 12px;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.chip.active,
.ep.current {
  background: var(--accent);
  color: var(--on-accent);
}

.ep:hover,
.chip:hover {
  color: var(--text);
  background: var(--bg-hover);
}

.ep.current:hover,
.chip.active:hover {
  color: var(--on-accent);
  background: var(--accent-hover);
}

.ep:hover {
  transform: scale(1.02);
}

.empty {
  margin-top: 16px;
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .detail {
    grid-template-columns: 1fr;
  }

  .poster {
    max-width: 220px;
  }
}
</style>
