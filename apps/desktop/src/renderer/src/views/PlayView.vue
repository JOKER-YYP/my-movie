<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSwitch, useMessage } from 'naive-ui'
import XgPlayer from '@/components/player/XgPlayer.vue'
import { fetchDetail } from '@/api/vod'
import type { VodDetail, VodSearchItem } from '@my-movie/shared'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { fetchProgress, reportProgress } from '@/utils/progress'
import { useAltSources } from '@/composables/useAltSources'
import SourceSwitch from '@/components/media/SourceSwitch.vue'
import { useMiniPlayerStore } from '@/stores/miniPlayer'
import type { PlayerToolbarAction } from '@/components/player/plugins/actionBtn'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const userStore = useUserStore()
const settings = useSettingsStore()
const miniPlayer = useMiniPlayerStore()

const detail = ref<VodDetail | null>(null)
const loading = ref(true)
const useProxy = ref(settings.preferProxy)
const epIndex = ref(0)
const lineIndex = ref(0)
const resumeSec = ref(0)
const countdown = ref(0)
const playerEpoch = ref(0)
const currentPlaySec = ref(0)
const currentDuration = ref(0)
const epGridRef = ref<HTMLElement | null>(null)
/** 播放器内弹出的选集 / 换源面板 */
const stageSheet = ref<'episodes' | 'sources' | null>(null)
const sheetEpGridRef = ref<HTMLElement | null>(null)
const { alts, loading: altsLoading, loadAlts } = useAltSources()

const source = computed(() => String(route.params.source || ''))
const id = computed(() => String(route.params.id || ''))
const lines = computed(() => detail.value?.lines || [])
const episodes = computed(() => lines.value[lineIndex.value]?.episodes || [])
const episode = computed(() => episodes.value[epIndex.value])
const hasNext = computed(() => epIndex.value + 1 < episodes.value.length)
const hasPrev = computed(() => epIndex.value > 0)
const episodeLabel = computed(() => {
  if (!episodes.value.length) return ''
  return `${epIndex.value + 1} / ${episodes.value.length}`
})

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

function openMiniPlayer() {
  if (!detail.value || !episode.value?.url) {
    message.warning('当前没有可播放内容')
    return
  }
  clearCountdown()
  const pos = Math.max(
    0,
    Math.floor(currentPlaySec.value > 1 ? currentPlaySec.value : resumeSec.value || 0),
  )
  miniPlayer.open({
    sourceKey: detail.value.sourceKey,
    vodId: detail.value.vodId,
    sourceName: detail.value.sourceName,
    title: detail.value.title,
    cover: detail.value.cover,
    lineIndex: lineIndex.value,
    episodeIndex: epIndex.value,
    episodes: episodes.value,
    url: episode.value.url,
    positionSec: pos,
    useProxy: useProxy.value,
  })
  message.success('已切换到小屏播放')
  if (window.history.length > 1) router.back()
  else router.push('/')
}

async function load() {
  loading.value = true
  clearCountdown()
  stageSheet.value = null
  resumeSec.value = 0
  try {
    detail.value = await fetchDetail(source.value, id.value)

    // 从小屏还原：优先接手小窗进度
    const mini = miniPlayer.session
    const fromMini =
      mini && mini.sourceKey === source.value && mini.vodId === id.value
        ? { ...mini }
        : null
    if (fromMini) miniPlayer.close()

    const explicitEp = route.query.ep != null && route.query.ep !== ''
    const forceResume = route.query.resume === '1'
    const switchTime = Number(route.query.t || 0)
    const progress = await fetchProgress(source.value, id.value, userStore.token || undefined)

    if (fromMini) {
      epIndex.value = fromMini.episodeIndex
      lineIndex.value = fromMini.lineIndex
      resumeSec.value = fromMini.positionSec > 1 ? fromMini.positionSec : 0
      useProxy.value = fromMini.useProxy
    } else if (forceResume && progress) {
      epIndex.value = progress.episodeIndex
      lineIndex.value = progress.lineIndex ?? Number(route.query.line || 0)
      resumeSec.value = progress.positionSec > 1 ? progress.positionSec : 0
    } else if (explicitEp) {
      epIndex.value = Number(route.query.ep || 0)
      lineIndex.value = Number(route.query.line || 0)
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

function selectLine(index: number) {
  if (index === lineIndex.value) return
  clearCountdown()
  lineIndex.value = index
  epIndex.value = clampEpisode(epIndex.value)
  resumeSec.value = 0
  playerEpoch.value += 1
  syncQuery()
  if (stageSheet.value === 'episodes') void scrollSheetEpisodeIntoView()
}

function selectEpisode(index: number) {
  if (index === epIndex.value) {
    stageSheet.value = null
    return
  }
  clearCountdown()
  epIndex.value = clampEpisode(index)
  resumeSec.value = 0
  playerEpoch.value += 1
  syncQuery()
  stageSheet.value = null
  void scrollActiveEpisodeIntoView()
}

function closeStageSheet() {
  stageSheet.value = null
}

function onPlayerAction(action: PlayerToolbarAction) {
  if (action === 'mini') {
    openMiniPlayer()
    return
  }
  if (action === 'episodes') {
    stageSheet.value = stageSheet.value === 'episodes' ? null : 'episodes'
    if (stageSheet.value === 'episodes') void scrollSheetEpisodeIntoView()
    return
  }
  if (action === 'sources') {
    stageSheet.value = stageSheet.value === 'sources' ? null : 'sources'
  }
}

function onSheetSelectSource(item: VodSearchItem) {
  stageSheet.value = null
  switchSource(item)
}

async function scrollActiveEpisodeIntoView() {
  await nextTick()
  const el = epGridRef.value?.querySelector<HTMLElement>('.ep.active')
  el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
}

async function scrollSheetEpisodeIntoView() {
  await nextTick()
  const el = sheetEpGridRef.value?.querySelector<HTMLElement>('.ep.active')
  el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
}

function goPrev() {
  if (!hasPrev.value) return
  selectEpisode(epIndex.value - 1)
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
watch(epIndex, () => {
  void scrollActiveEpisodeIntoView()
})
onBeforeUnmount(clearCountdown)
</script>

<template>
  <div class="play">
    <header class="chrome">
      <button type="button" class="icon-btn" aria-label="返回" @click="router.back()">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            fill="currentColor"
            d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
          />
        </svg>
      </button>

      <div class="meta">
        <h1 class="title">{{ detail?.title || (loading ? '加载中…' : '播放中') }}</h1>
        <p class="sub">
          <span v-if="detail?.sourceName">{{ detail.sourceName }}</span>
          <span v-if="episode"> · {{ episode.name }}</span>
          <span v-if="episodeLabel"> · {{ episodeLabel }}</span>
        </p>
      </div>

    </header>

    <div class="stage">
      <XgPlayer
        v-if="episode?.url && !loading"
        :key="`${playerEpoch}-${episode.url}`"
        :url="episode.url"
        :title="detail?.title"
        :use-proxy="useProxy"
        :start-time="resumeSec"
        :toolbar-actions="true"
        @timeupdate="onTimeupdate"
        @ended="onEnded"
        @action="onPlayerAction"
        @proxy-fallback="
          (via) => {
            useProxy = via
            message.info(via ? '直连失败，已切换媒体代理' : '代理失败，已尝试直连')
          }
        "
        @error="(msg) => message.error(msg)"
      />
      <div v-else class="empty" role="status">
        <strong>{{ loading ? '正在打开播放器' : '暂无可播放地址' }}</strong>
        <p v-if="!loading">可尝试开启代理，或在下方换源</p>
      </div>

      <div
        v-if="stageSheet"
        class="stage-sheet"
        role="dialog"
        :aria-label="stageSheet === 'episodes' ? '选集' : '换源'"
      >
        <div class="sheet-head">
          <strong>{{ stageSheet === 'episodes' ? '选集' : '换源' }}</strong>
          <span v-if="stageSheet === 'episodes' && episodeLabel" class="sheet-meta">{{
            episodeLabel
          }}</span>
          <button type="button" class="sheet-close" aria-label="关闭" @click="closeStageSheet">
            关闭
          </button>
        </div>

        <template v-if="stageSheet === 'episodes'">
          <div v-if="lines.length > 1" class="sheet-lines" role="tablist" aria-label="播放线路">
            <button
              v-for="(line, i) in lines"
              :key="`sheet-${line.name}-${i}`"
              type="button"
              role="tab"
              class="line"
              :class="{ active: i === lineIndex }"
              :aria-selected="i === lineIndex"
              @click="selectLine(i)"
            >
              {{ line.name }}
              <em>{{ line.episodes.length }}</em>
            </button>
          </div>
          <div v-if="episodes.length" ref="sheetEpGridRef" class="ep-grid sheet-eps">
            <button
              v-for="ep in episodes"
              :key="`sheet-ep-${ep.index}`"
              type="button"
              class="ep"
              :class="{ active: ep.index === epIndex }"
              :aria-current="ep.index === epIndex ? 'true' : undefined"
              @click="selectEpisode(ep.index)"
            >
              {{ ep.name }}
            </button>
          </div>
          <p v-else class="hint">{{ loading ? '正在加载分集…' : '暂无分集信息' }}</p>
        </template>

        <div v-else class="sheet-sources">
          <SourceSwitch
            v-if="detail"
            :current-source="detail.sourceKey"
            :current-name="detail.sourceName"
            :items="alts"
            :loading="altsLoading"
            @select="onSheetSelectSource"
          />
        </div>
      </div>
    </div>

    <section class="panel" aria-label="播放控制与选集">
      <div class="tools">
        <label class="toggle">
          <span>连播</span>
          <NSwitch v-model:value="settings.autoPlayNext" size="small" />
        </label>
        <label class="toggle">
          <span>代理</span>
          <NSwitch v-model:value="useProxy" size="small" />
        </label>
        <div class="tools-spacer" />
        <button type="button" class="pill" :disabled="!hasPrev" @click="goPrev">上一集</button>
        <button type="button" class="pill primary" :disabled="!hasNext" @click="goNext">
          下一集
        </button>
      </div>

      <div v-if="detail" class="block">
        <SourceSwitch
          :current-source="detail.sourceKey"
          :current-name="detail.sourceName"
          :items="alts"
          :loading="altsLoading"
          @select="switchSource"
        />
      </div>

      <div v-if="lines.length > 1" class="block">
        <div class="block-title">线路</div>
        <div class="lines" role="tablist" aria-label="播放线路">
          <button
            v-for="(line, i) in lines"
            :key="`${line.name}-${i}`"
            type="button"
            role="tab"
            class="line"
            :class="{ active: i === lineIndex }"
            :aria-selected="i === lineIndex"
            @click="selectLine(i)"
          >
            {{ line.name }}
            <em>{{ line.episodes.length }}</em>
          </button>
        </div>
      </div>

      <div class="block">
        <div class="block-title">
          选集
          <span v-if="episodeLabel" class="block-meta">{{ episodeLabel }}</span>
        </div>
        <div v-if="episodes.length" ref="epGridRef" class="ep-grid">
          <button
            v-for="ep in episodes"
            :key="ep.index"
            type="button"
            class="ep"
            :class="{ active: ep.index === epIndex }"
            :aria-current="ep.index === epIndex ? 'true' : undefined"
            @click="selectEpisode(ep.index)"
          >
            {{ ep.name }}
          </button>
        </div>
        <p v-else class="hint">{{ loading ? '正在加载分集…' : '暂无分集信息' }}</p>
      </div>
    </section>

    <div v-if="countdown > 0" class="next-toast" role="status">
      <span class="toast-copy">{{ countdown }} 秒后播放下一集</span>
      <button type="button" class="toast-btn" @click="cancelAutoNext">取消</button>
      <button type="button" class="toast-btn primary" @click="goNext">立即播放</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.play {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 36px);
  background: var(--bg);
  color: var(--text);
}

.chrome {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--page-x);
  background: var(--bg);
  border-bottom: 1px solid color-mix(in srgb, var(--line) 35%, transparent);
  flex-shrink: 0;
}

.icon-btn {
  flex-shrink: 0;
  width: var(--control-size);
  height: var(--control-size);
  border: 0;
  border-radius: 50%;
  background: var(--bg-soft);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.icon-btn:hover {
  background: var(--bg-hover);
}

.icon-btn:focus-visible,
.pill:focus-visible,
.toast-btn:focus-visible,
.ep:focus-visible,
.line:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.meta {
  flex: 1;
  min-width: 0;
}

.title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage {
  position: relative;
  flex: 0 0 auto;
  width: 80%;
  max-width: 1280px;
  aspect-ratio: 16 / 9;
  min-height: 220px;
  margin: 0 auto;
  display: flex;
  background: var(--player-void);
  overflow: hidden;
  border-radius: 0 0 var(--radius) var(--radius);
}

.stage :deep(.player-wrap),
.stage :deep(.player) {
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;
}

.stage-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  max-height: min(72%, 420px);
  display: flex;
  flex-direction: column;
  padding: var(--space-3) var(--space-4) var(--space-4);
  background: var(--scrim-strong);
  border-top: 1px solid color-mix(in srgb, var(--line) 40%, transparent);
  backdrop-filter: blur(10px);
  animation: sheet-up 0.2s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.sheet-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-shrink: 0;
}

.sheet-head strong {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.sheet-meta {
  color: var(--text-dim);
  font-size: 12px;
}

.sheet-close {
  margin-left: auto;
  border: 0;
  background: var(--bg-soft);
  color: var(--text);
  border-radius: var(--radius-pill);
  padding: var(--chip-pad);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
}

.sheet-close:hover {
  background: var(--bg-hover);
}

.sheet-lines {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-shrink: 0;
}

.sheet-eps {
  overflow: auto;
  min-height: 0;
  padding-bottom: 4px;
}

.sheet-sources {
  overflow: auto;
  min-height: 0;
}

.sheet-sources :deep(.switch) {
  margin-top: 0;
}

@keyframes sheet-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.empty {
  margin: auto;
  text-align: center;
  padding: 48px var(--page-x);
  color: var(--text-muted);
}

.empty strong {
  display: block;
  color: var(--text);
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
}

.empty p {
  margin: 0;
  font-size: 13px;
  color: var(--text-dim);
}

.panel {
  flex: 0 0 auto;
  padding: var(--space-4) var(--page-x) var(--space-7);
  background: var(--bg);
  border-top: 1px solid color-mix(in srgb, var(--line) 28%, transparent);
}

.tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}

.tools-spacer {
  flex: 1 1 12px;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--chip-pad);
  border-radius: var(--radius-pill);
  background: var(--bg-soft);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  user-select: none;
}

.pill {
  border: 0;
  background: var(--bg-soft);
  color: var(--text);
  border-radius: var(--radius-pill);
  padding: var(--chip-pad);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}

.pill:hover:not(:disabled) {
  background: var(--bg-hover);
}

.pill.primary {
  background: var(--accent);
  color: var(--on-accent);
}

.pill.primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.pill:disabled {
  opacity: 0.35;
  cursor: default;
}

.block {
  margin-bottom: var(--space-5);
}

.block:last-child {
  margin-bottom: 0;
}

.block-title {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

.block-meta {
  font-weight: 400;
  letter-spacing: normal;
  text-transform: none;
  color: var(--text-dim);
}

.block :deep(.switch) {
  margin-top: 0;
}

.lines {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.line {
  border: 0;
  background: var(--bg-soft);
  color: var(--text-muted);
  border-radius: var(--radius-pill);
  padding: var(--chip-pad);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.line em {
  margin-left: 6px;
  font-style: normal;
  font-weight: 400;
  opacity: 0.75;
}

.line:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.line.active {
  background: var(--accent);
  color: var(--on-accent);
}

.ep-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: var(--space-2);
}

.ep {
  border: 0;
  background: var(--bg-soft);
  color: var(--text-muted);
  border-radius: var(--radius);
  padding: var(--space-3) var(--space-2);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}

.ep:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.ep.active {
  background: var(--accent);
  color: var(--on-accent);
}

.hint {
  margin: 0;
  color: var(--text-dim);
  font-size: 13px;
}

.next-toast {
  position: fixed;
  right: var(--page-x);
  bottom: var(--space-6);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-heavy);
  animation: pop 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.toast-copy {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.toast-btn {
  border: 0;
  background: var(--bg-soft);
  color: var(--text);
  border-radius: var(--radius-pill);
  padding: var(--chip-pad);
  cursor: pointer;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.04em;
  transition: background 0.15s ease;
}

.toast-btn:hover {
  background: var(--bg-hover);
}

.toast-btn.primary {
  background: var(--accent);
  color: var(--on-accent);
}

.toast-btn.primary:hover {
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

@media (max-width: 960px) {
  .stage {
    width: 100%;
    max-width: none;
    min-height: 180px;
    border-radius: 0;
  }

  .tools-spacer {
    display: none;
  }

  .next-toast {
    left: var(--page-x);
    right: var(--page-x);
  }
}
</style>
