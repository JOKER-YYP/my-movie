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
  useProxy?: boolean
  /** 续播起点（秒）；接近片尾则忽略 */
  startTime?: number
}>()

const emit = defineEmits<{
  timeupdate: [payload: { currentTime: number; duration: number }]
  ended: []
  error: [message: string]
  ready: []
}>()

const root = ref<HTMLDivElement | null>(null)
let player: Player | null = null
let seekApplied = false

function resolveUrl(url: string) {
  if (!url) return url
  if (props.useProxy) return proxyUrl(url)
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
  // 换源续播允许从 1s 起跳；接近片尾则不跳，避免瞬间结束
  if (start < 1) return
  if (duration > 0 && start > Math.max(1, duration - 8)) return
  player.currentTime = start
  seekApplied = true
}

function create() {
  if (!root.value || !props.url) return
  destroy()
  player = new Player({
    el: root.value,
    url: resolveUrl(props.url),
    plugins: [HlsPlugin],
    autoplay: props.autoplay ?? true,
    fluid: true,
    lang: 'zh-cn',
    playbackRate: [0.5, 0.75, 1, 1.25, 1.5, 2],
    videoFillMode: 'contain',
    lastPlayTime: props.startTime && props.startTime >= 1 ? props.startTime : undefined,
    lastPlayTimeHideDelay: 3,
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
    emit('error', '播放失败，可尝试开启代理或换源')
  })
}

onMounted(create)
onBeforeUnmount(destroy)
watch(
  () => [props.url, props.useProxy] as const,
  () => create(),
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
