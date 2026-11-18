<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import XgPlayer from '@/components/player/XgPlayer.vue'
import { useMiniPlayerStore } from '@/stores/miniPlayer'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import { reportProgress } from '@/utils/progress'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const mini = useMiniPlayerStore()
const settings = useSettingsStore()
const userStore = useUserStore()

const dragging = ref(false)
const playerEpoch = ref(0)
let lastReport = 0
let dragOrigin = { mx: 0, my: 0, ox: 0, oy: 0 }

const session = computed(() => mini.session)
const episodeName = computed(() => {
  const s = session.value
  if (!s) return ''
  return s.episodes[s.episodeIndex]?.name || `第 ${s.episodeIndex + 1} 集`
})
const hasNext = computed(() => {
  const s = session.value
  if (!s) return false
  return s.episodeIndex + 1 < s.episodes.length
})

const panelStyle = computed(() => ({
  right: `${mini.offset.x}px`,
  bottom: `${mini.offset.y}px`,
}))

/** 回到同片全屏页时，把小窗让给全屏播放器 */
watch(
  () => [route.name, route.params.source, route.params.id, mini.active] as const,
  ([name, source, id, active]) => {
    if (!active || name !== 'play') return
    const s = session.value
    if (!s) return
    if (String(source) === s.sourceKey && String(id) === s.vodId) {
      mini.close()
    }
  },
)

function onTimeupdate(payload: { currentTime: number; duration: number }) {
  const s = session.value
  if (!s) return
  mini.updatePosition(payload.currentTime)
  const now = Date.now()
  if (now - lastReport < 8000) return
  lastReport = now
  void reportProgress(
    {
      sourceKey: s.sourceKey,
      vodId: s.vodId,
      episodeIndex: s.episodeIndex,
      lineIndex: s.lineIndex,
      positionSec: payload.currentTime,
      durationSec: payload.duration,
      title: s.title,
      cover: s.cover,
      updatedAt: now,
    },
    userStore.token || undefined,
  )
}

function onEnded() {
  if (settings.autoPlayNext && hasNext.value) {
    const ok = mini.playNext()
    if (ok) {
      playerEpoch.value += 1
      message.success(`小屏连播：${episodeName.value}`)
      return
    }
  }
  message.info('本集已播完')
}

function expand() {
  const s = session.value
  if (!s) return
  const t = Math.max(0, Math.floor(s.positionSec || 0))
  const path = `/play/${s.sourceKey}/${s.vodId}`
  const query = {
    ep: String(s.episodeIndex),
    line: String(s.lineIndex),
    t: String(t),
  }
  mini.close()
  router.push({ path, query })
}

function close() {
  mini.close()
}

function onProxyFallback(via: boolean) {
  mini.setProxy(via)
  message.info(via ? '直连失败，已切换媒体代理' : '代理失败，已尝试直连')
}

function onPointerDown(e: PointerEvent) {
  const target = e.target as HTMLElement
  if (target.closest('button') || target.closest('.mini-stage')) return
  dragging.value = true
  dragOrigin = {
    mx: e.clientX,
    my: e.clientY,
    ox: mini.offset.x,
    oy: mini.offset.y,
  }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const dx = dragOrigin.mx - e.clientX
  const dy = dragOrigin.my - e.clientY
  const maxX = Math.max(8, window.innerWidth - 360)
  const maxY = Math.max(8, window.innerHeight - 240)
  mini.setOffset(
    Math.min(maxX, Math.max(8, dragOrigin.ox + dx)),
    Math.min(maxY, Math.max(8, dragOrigin.oy + dy)),
  )
}

function onPointerUp(e: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

onBeforeUnmount(() => {
  dragging.value = false
})
</script>

<template>
  <Teleport to="body">
    <aside
      v-if="session"
      class="mini"
      :class="{ dragging }"
      :style="panelStyle"
      role="complementary"
      aria-label="小屏播放"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <header class="mini-bar">
        <div class="mini-meta">
          <strong class="mini-title">{{ session.title }}</strong>
          <span class="mini-sub">{{ episodeName }}</span>
        </div>
        <div class="mini-actions">
          <button type="button" class="mini-btn" title="还原大屏" @click="expand">还原</button>
          <button type="button" class="mini-btn danger" title="关闭小屏" @click="close">关闭</button>
        </div>
      </header>

      <div class="mini-stage">
        <XgPlayer
          :key="`${playerEpoch}-${session.url}`"
          :url="session.url"
          :title="session.title"
          :use-proxy="session.useProxy"
          :start-time="session.positionSec"
          :compact="true"
          @timeupdate="onTimeupdate"
          @ended="onEnded"
          @proxy-fallback="onProxyFallback"
          @error="(msg) => message.error(msg)"
        />
      </div>
    </aside>
  </Teleport>
</template>

<style scoped lang="scss">
.mini {
  position: fixed;
  z-index: 1200;
  width: min(360px, calc(100vw - 24px));
  border-radius: var(--radius-lg);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-heavy);
  overflow: hidden;
  user-select: none;
  border: 1px solid color-mix(in srgb, var(--line) 40%, transparent);
}

.mini.dragging {
  cursor: grabbing;
  opacity: 0.96;
}

.mini-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--bg);
  cursor: grab;
}

.mini.dragging .mini-bar {
  cursor: grabbing;
}

.mini-meta {
  flex: 1;
  min-width: 0;
}

.mini-title {
  display: block;
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-sub {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.mini-btn {
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--bg-soft);
  color: var(--text);
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.mini-btn:hover {
  background: var(--bg-hover);
}

.mini-btn.danger:hover {
  background: color-mix(in srgb, var(--danger) 22%, var(--bg-soft));
  color: var(--danger);
}

.mini-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.mini-stage {
  height: 202px;
  background: var(--player-void);
  cursor: default;
}

.mini-stage :deep(.player-wrap) {
  min-height: 202px;
  height: 202px;
}
</style>
