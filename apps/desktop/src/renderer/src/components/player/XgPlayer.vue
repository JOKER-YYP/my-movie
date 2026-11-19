<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Player from 'xgplayer'
import HlsPlugin from 'xgplayer-hls'
import 'xgplayer/dist/index.min.css'
import { proxyUrl } from '@/api/vod'
import {
  EpisodesBtnPlugin,
  MiniBtnPlugin,
  SourcesBtnPlugin,
  toEpisodeMenuItems,
  toSourceMenuItems,
  type PlayerEpisodeOption,
  type PlayerSourceOption,
  type PlayerToolbarAction,
} from '@/components/player/plugins/actionBtn'

const props = defineProps<{
  url: string
  title?: string
  autoplay?: boolean
  /** true=强制代理；false=强制直连；默认跟随设置，失败自动切换 */
  useProxy?: boolean
  /** 续播起点（秒）；接近片尾则忽略 */
  startTime?: number
  /** 小屏模式：更紧凑的播放器布局 */
  compact?: boolean
  /** 是否在控制栏显示选集/换源/小屏（全屏页默认开，小窗关） */
  toolbarActions?: boolean
  /** 当前源分集（仅本源） */
  episodes?: PlayerEpisodeOption[]
  episodeIndex?: number
  /** 换源列表（含当前源） */
  sources?: PlayerSourceOption[]
}>()

const emit = defineEmits<{
  timeupdate: [payload: { currentTime: number; duration: number }]
  ended: []
  error: [message: string]
  ready: []
  proxyFallback: [usingProxy: boolean]
  action: [action: PlayerToolbarAction]
  selectEpisode: [index: number]
  selectSource: [item: PlayerSourceOption]
}>()

const root = ref<HTMLDivElement | null>(null)
let player: Player | null = null
let seekApplied = false
/** 当前实际是否走代理 */
let activeProxy = false
/** 本集是否已尝试过直连/代理切换 */
let switchedOnce = false

function resolveUrl(url: string, viaProxy: boolean) {
  if (!url) return url
  if (viaProxy) return proxyUrl(url)
  return url
}

function destroy() {
  player?.destroy()
  player = null
  seekApplied = false
}

function trySeek() {
  if (!player || seekApplied) return
  const start = props.startTime || 0
  const duration = player.duration || 0
  if (start < 1) return
  if (duration > 0 && start > Math.max(1, duration - 8)) return
  player.currentTime = start
  seekApplied = true
}

function onMxAction(action: PlayerToolbarAction) {
  emit('action', action)
}

function onSelectEpisode(item: { id?: string }) {
  const index = Number(item?.id)
  if (!Number.isFinite(index)) return
  emit('selectEpisode', index)
}

function onSelectSource(item: { id?: string }) {
  const id = String(item?.id || '')
  const [sourceKey, vodId] = id.split('::')
  if (!sourceKey || !vodId) return
  const found = (props.sources || []).find((s) => s.sourceKey === sourceKey && s.vodId === vodId)
  if (!found || found.current) return
  emit('selectSource', found)
}

function syncMenus() {
  if (!player) return
  const epPlugin = player.getPlugin?.('mxEpisodes') as { updateList?: (list: unknown[]) => void } | null
  const srcPlugin = player.getPlugin?.('mxSources') as { updateList?: (list: unknown[]) => void } | null
  // xgplayer 内部插件名可能小写
  const ep =
    epPlugin ||
    (player.getPlugin?.('mxepisodes') as { updateList?: (list: unknown[]) => void } | null)
  const src =
    srcPlugin ||
    (player.getPlugin?.('mxsources') as { updateList?: (list: unknown[]) => void } | null)
  ep?.updateList?.(toEpisodeMenuItems(props.episodes || [], props.episodeIndex ?? 0))
  src?.updateList?.(toSourceMenuItems(props.sources || []))
}

function create(viaProxy: boolean) {
  if (!root.value || !props.url) return
  destroy()
  activeProxy = viaProxy
  const showActions = props.toolbarActions !== false && !props.compact
  const episodeList = toEpisodeMenuItems(props.episodes || [], props.episodeIndex ?? 0)
  const sourceList = toSourceMenuItems(props.sources || [])

  // 铺满父容器；真正全屏交给播放器自带 fullscreen，不占满整页
  player = new Player({
    el: root.value,
    url: resolveUrl(props.url, viaProxy),
    plugins: showActions
      ? [HlsPlugin, EpisodesBtnPlugin, SourcesBtnPlugin, MiniBtnPlugin]
      : [HlsPlugin],
    autoplay: props.autoplay ?? true,
    fluid: false,
    width: '100%',
    height: '100%',
    lang: 'zh-cn',
    fullscreen: true,
    cssFullscreen: true,
    playbackRate: props.compact ? [1, 1.25, 1.5, 2] : [0.5, 0.75, 1, 1.25, 1.5, 2],
    videoFillMode: 'contain',
    lastPlayTime: props.startTime && props.startTime >= 1 ? props.startTime : undefined,
    lastPlayTimeHideDelay: 3,
    mxEpisodes: { list: episodeList },
    mxSources: { list: sourceList },
    // 对齐 LibreTV hls 重试参数，降低偶发分片失败
    hls: {
      enableWorker: true,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      fragLoadingMaxRetry: 6,
      manifestLoadingMaxRetry: 3,
      levelLoadingMaxRetry: 4,
      appendErrorMaxRetry: 5,
    },
  })
  player.on('mxAction', onMxAction)
  player.on('mxSelectEpisode', onSelectEpisode)
  player.on('mxSelectSource', onSelectSource)
  player.on('loadedmetadata', () => {
    trySeek()
    emit('ready')
  })
  player.on('playing', trySeek)
  player.on('timeupdate', () => {
    if (!player) return
    emit('timeupdate', { currentTime: player.currentTime || 0, duration: player.duration || 0 })
  })
  player.on('ended', () => emit('ended'))
  player.on('error', () => {
    // 对齐 LibreTV：直连失败自动改走代理（或反过来再试一次）
    if (!switchedOnce) {
      switchedOnce = true
      const next = !activeProxy
      emit('proxyFallback', next)
      create(next)
      return
    }
    emit('error', '播放失败，可尝试切换「媒体代理」或换源')
  })
}

function boot() {
  switchedOnce = false
  // 用户显式开关优先；默认先走代理（规避 CORS/防盗链，与本站代理能力对齐）
  const prefer = props.useProxy !== false
  create(prefer)
}

onMounted(boot)
onBeforeUnmount(destroy)
watch(
  () => [props.url, props.useProxy] as const,
  () => boot(),
)
watch(
  () => props.startTime,
  () => {
    seekApplied = false
    trySeek()
  },
)
watch(
  () => [props.episodes, props.episodeIndex, props.sources] as const,
  () => syncMenus(),
  { deep: true },
)
</script>

<template>
  <div class="player-wrap" :class="{ compact }">
    <div ref="root" class="player" />
  </div>
</template>

<style scoped lang="scss">
.player-wrap {
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--player-void);
  display: flex;
}

.player {
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;
  position: relative;
}

.player :deep(.xgplayer) {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  background: var(--player-void);
}

.player :deep(.xgplayer-mx-action) {
  position: relative;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 40px;
  padding: 0 var(--space-2);
  color: var(--on-media);
  opacity: 0.92;
}

.player :deep(.xgplayer-mx-action:hover),
.player :deep(.xgplayer-mx-menu.is-open) {
  opacity: 1;
}

.player :deep(.mx-action-text) {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
  white-space: nowrap;
  user-select: none;
}

.player :deep(.mx-menu-panel) {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  transform: translateX(-50%) translateY(6px);
  z-index: 30;
  min-width: 168px;
  max-width: min(280px, 70vw);
  max-height: min(280px, 46vh);
  padding: 8px;
  border-radius: 10px;
  background: rgba(18, 18, 18, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease;
}

.player :deep(.xgplayer-mx-menu.is-open .mx-menu-panel) {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
}

.player :deep(.mx-menu-body) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: min(256px, 42vh);
  overflow: auto;
}

.player :deep(.mx-menu-item) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.86);
  text-align: left;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.player :deep(.mx-menu-item span) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player :deep(.mx-menu-item:hover:not(.is-disabled)) {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.player :deep(.mx-menu-item.is-active) {
  background: var(--accent, #1ed760);
  color: var(--on-accent, #000);
}

.player :deep(.mx-menu-item.is-disabled) {
  opacity: 0.55;
  cursor: default;
}

.player :deep(.mx-menu-meta) {
  flex-shrink: 0;
  font-style: normal;
  font-weight: 400;
  font-size: 11px;
  opacity: 0.75;
}

.player :deep(.mx-menu-empty) {
  padding: 10px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  text-align: center;
}
</style>
