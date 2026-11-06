<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NSwitch, useMessage } from 'naive-ui'
import XgPlayer from '@/components/player/XgPlayer.vue'
import { fetchDetail } from '@/api/vod'
import type { VodDetail, VodSearchItem } from '@my-movie/shared'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { fetchProgress, reportProgress } from '@/utils/progress'
import { useAltSources } from '@/composables/useAltSources'
import SourceSwitch from '@/components/media/SourceSwitch.vue'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const userStore = useUserStore()
const settings = useSettingsStore()

const detail = ref<VodDetail | null>(null)
const loading = ref(true)
const useProxy = ref(settings.preferProxy)
const epIndex = ref(0)
const lineIndex = ref(0)
const resumeSec = ref(0)
const countdown = ref(0)
const playerEpoch = ref(0)
const showSources = ref(false)
const currentPlaySec = ref(0)
const currentDuration = ref(0)
const { alts, loading: altsLoading, loadAlts } = useAltSources()

const source = computed(() => String(route.params.source || ''))
const id = computed(() => String(route.params.id || ''))
const episodes = computed(() => detail.value?.lines[lineIndex.value]?.episodes || [])
const episode = computed(() => episodes.value[epIndex.value])
const hasNext = computed(() => epIndex.value + 1 < episodes.value.length)

let lastReport = 0
let countdownTimer: ReturnType<typeof setInterval> | null = null

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  countdown.value = 0
}

function syncQuery() {
  router.replace({
    path: route.path,
    query: {
      ep: String(epIndex.value),
      line: String(lineIndex.value),
    },
  })
}

function clampEpisode(index: number) {
  const max = Math.max(0, episodes.value.length - 1)
  if (!episodes.value.length) return 0
  return Math.min(Math.max(0, index), max)
}

async function load() {
  loading.value = true
  clearCountdown()
  resumeSec.value = 0
  try {
    detail.value = await fetchDetail(source.value, id.value)
    const explicitEp = route.query.ep != null && route.query.ep !== ''
    const forceResume = route.query.resume === '1'
    const switchTime = Number(route.query.t || 0)
    const progress = await fetchProgress(source.value, id.value, userStore.token || undefined)

    if (forceResume && progress) {
      epIndex.value = progress.episodeIndex
      lineIndex.value = progress.lineIndex ?? Number(route.query.line || 0)
      resumeSec.value = progress.positionSec > 1 ? progress.positionSec : 0
    } else if (explicitEp) {
      epIndex.value = Number(route.query.ep || 0)
      lineIndex.value = Number(route.query.line || 0)
      // 换源携带的时间优先，避免被新源自己的进度覆盖
      if (switchTime > 1) {
        resumeSec.value = switchTime
      } else if (
        progress &&
        progress.episodeIndex === epIndex.value &&
        (progress.lineIndex ?? 0) === lineIndex.value &&
        progress.positionSec > 1
      ) {
        resumeSec.value = progress.positionSec
      }
    } else if (progress) {
      epIndex.value = progress.episodeIndex
      lineIndex.value = progress.lineIndex ?? 0
      resumeSec.value = progress.positionSec > 1 ? progress.positionSec : 0
    } else {
      epIndex.value = 0
      lineIndex.value = 0
    }

    // 新源集数可能更少，夹到合法范围
    epIndex.value = clampEpisode(epIndex.value)
    currentPlaySec.value = resumeSec.value
    playerEpoch.value += 1
    syncQuery()
    if (detail.value) void loadAlts(detail.value.title, source.value, id.value)
  } catch (err) {
    detail.value = null
    message.error(err instanceof Error ? err.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function switchSource(item: VodSearchItem) {
  clearCountdown()
  const keepEp = epIndex.value
  // 优先用实时进度；若刚开播还没有 timeupdate，退回续播起点
  const keepTime = Math.max(
    0,
    Math.floor(currentPlaySec.value > 1 ? currentPlaySec.value : resumeSec.value || 0),
  )
  message.info(
    keepTime > 0
      ? `已切换到：${item.sourceName}（第 ${keepEp + 1} 集 · ${keepTime}s）`
      : `已切换到：${item.sourceName}（第 ${keepEp + 1} 集）`,
  )
  router.replace({
    path: `/play/${item.sourceKey}/${item.vodId}`,
    query: {
      ep: String(keepEp),
      line: '0',
      t: String(keepTime),
    },
  })
}

async function onTimeupdate(payload: { currentTime: number; duration: number }) {
  currentPlaySec.value = payload.currentTime || 0
  currentDuration.value = payload.duration || 0
  if (!detail.value) return
  const now = Date.now()
  if (now - lastReport < 8000) return
  lastReport = now
  await reportProgress(
    {
      sourceKey: detail.value.sourceKey,
      vodId: detail.value.vodId,
      episodeIndex: epIndex.value,
      lineIndex: lineIndex.value,
      positionSec: payload.currentTime,
      durationSec: payload.duration,
      title: detail.value.title,
      cover: detail.value.cover,
      updatedAt: now,
    },
    userStore.token || undefined,
  )
}

function goNext() {
  clearCountdown()
  if (!hasNext.value) {
    message.info('已经是最后一集')
    return
  }
  const next = epIndex.value + 1
  epIndex.value = next
  resumeSec.value = 0
  playerEpoch.value += 1
  syncQuery()
  const name = episodes.value[next]?.name
  message.success(`正在播放：${name || `第 ${next + 1} 集`}`)
}

function onEnded() {
  if (!settings.autoPlayNext || !hasNext.value) {
    if (!hasNext.value) message.info('本片已播完')
    return
  }
  countdown.value = 5
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearCountdown()
      goNext()
    }
  }, 1000)
}

function cancelAutoNext() {
  clearCountdown()
  message.info('已取消自动连播')
}

watch(useProxy, (v) => {
  settings.preferProxy = v
})

watch([source, id], load, { immediate: true })
onBeforeUnmount(clearCountdown)
</script>

<template>
  <div class="play">
    <div class="toolbar">
      <NButton quaternary class="back-btn" @click="router.back()">返回</NButton>
      <div class="title">
        {{ detail?.title || '播放中' }}
        <span v-if="episode"> · {{ episode.name }}</span>
      </div>
      <div class="proxy">
        <span>自动连播</span>
        <NSwitch v-model:value="settings.autoPlayNext" />
        <span>媒体代理</span>
        <NSwitch v-model:value="useProxy" />
        <NButton size="small" @click="showSources = !showSources">
          换源{{ alts.length ? ` (${alts.length})` : '' }}
        </NButton>
        <NButton v-if="hasNext" size="small" @click="goNext">下一集</NButton>
      </div>
    </div>

    <div v-if="showSources && detail" class="source-panel">
      <SourceSwitch
        :current-source="detail.sourceKey"
        :current-name="detail.sourceName"
        :items="alts"
        :loading="altsLoading"
        @select="switchSource"
      />
    </div>

    <XgPlayer
      v-if="episode?.url && !loading"
      :key="`${playerEpoch}-${episode.url}`"
      :url="episode.url"
      :title="detail?.title"
      :use-proxy="useProxy"
      :start-time="resumeSec"
      @timeupdate="onTimeupdate"
      @ended="onEnded"
      @error="(msg) => message.error(msg)"
    />
    <div v-else class="empty">{{ loading ? '加载中…' : '暂无可播放地址' }}</div>

    <div v-if="countdown > 0" class="next-toast">
      <span>{{ countdown }} 秒后播放下一集</span>
      <button type="button" @click="cancelAutoNext">取消</button>
      <button type="button" class="primary" @click="goNext">立即播放</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.play {
  position: relative;
  min-height: 100vh;
  background: #000;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px var(--page-x);
  background: var(--bg);
}

.title {
  flex: 1;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proxy {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
  font-size: 13px;
}

.source-panel {
  padding: 8px var(--page-x) 12px;
  background: var(--bg-elevated);
}

.empty {
  padding: 80px;
  text-align: center;
  color: var(--text-muted);
}

.next-toast {
  position: absolute;
  right: var(--page-x);
  bottom: 88px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-heavy);
  animation: pop 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.next-toast button {
  border: 0;
  background: var(--bg-soft);
  color: var(--text);
  border-radius: var(--radius-pill);
  padding: 6px 14px;
  cursor: pointer;
  font-weight: 700;
  font-size: 12px;
  transition: background 0.15s ease;
}

.next-toast button:hover {
  background: var(--bg-hover);
}

.next-toast .primary {
  background: var(--accent);
  color: var(--on-accent);
}

.next-toast .primary:hover {
  background: var(--accent-hover);
}

@keyframes pop {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
