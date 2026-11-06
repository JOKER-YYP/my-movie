<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, useMessage } from 'naive-ui'
import Player from 'xgplayer'
import 'xgplayer/dist/index.min.css'

const router = useRouter()
const message = useMessage()
const root = ref<HTMLDivElement | null>(null)
const title = ref('网盘播放')
const fileName = ref('')
let player: Player | null = null

onMounted(() => {
  const raw = sessionStorage.getItem('pan-play')
  if (!raw || !root.value) {
    message.error('播放会话失效，请从详情重新进入')
    router.back()
    return
  }
  try {
    const data = JSON.parse(raw) as { title?: string; fileName?: string; playUrl?: string }
    title.value = data.title || '网盘播放'
    fileName.value = data.fileName || ''
    if (!data.playUrl) throw new Error('缺少播放地址')
    player = new Player({
      el: root.value,
      url: data.playUrl,
      autoplay: true,
      fluid: true,
      lang: 'zh-cn',
      playbackRate: [0.75, 1, 1.25, 1.5, 2],
      videoFillMode: 'contain',
    })
    player.on('error', () => {
      message.error('播放失败：网盘限速、格式不支持或登录失效，可重试或换文件')
    })
  } catch (err) {
    message.error(err instanceof Error ? err.message : '无法播放')
  }
})

onBeforeUnmount(() => {
  player?.destroy()
  player = null
})
</script>

<template>
  <div class="play">
    <div class="toolbar">
      <NButton quaternary @click="router.back()">返回</NButton>
      <div class="title">
        {{ title }}
        <span v-if="fileName"> · {{ fileName }}</span>
      </div>
    </div>
    <div ref="root" class="player" />
  </div>
</template>

<style scoped lang="scss">
.play {
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

.player {
  width: 100%;
  min-height: calc(100vh - 52px);
}
</style>
