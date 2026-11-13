<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Player from 'xgplayer'
import HlsPlugin from 'xgplayer-hls'
import 'xgplayer/dist/index.min.css'
import { proxyUrl } from '@/api/vod'

const props = defineProps<{
  url: string
  title?: string
  autoplay?: boolean
  /** true=强制代理；false=强制直连；默认跟随设置，失败自动切换 */
  useProxy?: boolean
  /** 续播起点（秒）；接近片尾则忽略 */
  startTime?: number
}>()

const emit = defineEmits<{
  timeupdate: [payload: { currentTime: number; duration: number }]
  ended: []
  error: [message: string]
  ready: []
  proxyFallback: [usingProxy: boolean]
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

function create(viaProxy: boolean) {
  if (!root.value || !props.url) return
  destroy()
  activeProxy = viaProxy
  player = new Player({
    el: root.value,
    url: resolveUrl(props.url, viaProxy),
    plugins: [HlsPlugin],
    autoplay: props.autoplay ?? true,
    fluid: true,
    lang: 'zh-cn',
    playbackRate: [0.5, 0.75, 1, 1.25, 1.5, 2],
    videoFillMode: 'contain',
    lastPlayTime: props.startTime && props.startTime >= 1 ? props.startTime : undefined,
    lastPlayTimeHideDelay: 3,
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
</script>

<template>
  <div class="player-wrap">
    <div ref="root" class="player" />
  </div>
</template>

<style scoped lang="scss">
.player-wrap {
  width: 100%;
  background: #000;
}

.player {
  width: 100%;
  min-height: calc(100vh - 52px);
}
</style>
