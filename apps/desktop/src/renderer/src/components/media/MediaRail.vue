<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { VodSearchItem } from '@my-movie/shared'
import MediaCard from './MediaCard.vue'

const props = defineProps<{
  title: string
  subtitle?: string
  items: VodSearchItem[]
  moreTo?: string
}>()

const scroller = ref<HTMLElement | null>(null)
const canLeft = ref(false)
const canRight = ref(true)
let ro: ResizeObserver | null = null

function updateArrows() {
  const el = scroller.value
  if (!el) return
  const max = Math.max(0, el.scrollWidth - el.clientWidth)
  canLeft.value = el.scrollLeft > 2
  canRight.value = max > 2 && el.scrollLeft < max - 2
}

function scrollPage(dir: -1 | 1) {
  const el = scroller.value
  if (!el) return
  const step = Math.max(240, Math.floor(el.clientWidth * 0.9))
  const max = Math.max(0, el.scrollWidth - el.clientWidth)
  const next = Math.min(max, Math.max(0, el.scrollLeft + dir * step))
  el.scrollTo({ left: next, behavior: 'smooth' })
  // smooth 滚动过程中补一次状态
  window.setTimeout(updateArrows, 320)
}

function bind() {
  const el = scroller.value
  if (!el) return
  el.addEventListener('scroll', updateArrows, { passive: true })
  ro = new ResizeObserver(() => updateArrows())
  ro.observe(el)
  void nextTick(() => {
    updateArrows()
    // 封面加载会改变可滚动宽度
    window.setTimeout(updateArrows, 80)
    window.setTimeout(updateArrows, 400)
  })
}

function unbind() {
  const el = scroller.value
  el?.removeEventListener('scroll', updateArrows)
  ro?.disconnect()
  ro = null
}

onMounted(() => {
  bind()
  window.addEventListener('resize', updateArrows)
})

onBeforeUnmount(() => {
  unbind()
  window.removeEventListener('resize', updateArrows)
})

watch(
  () => props.items.map((i) => `${i.sourceKey}-${i.vodId}`).join('|'),
  async () => {
    await nextTick()
    updateArrows()
    window.setTimeout(updateArrows, 120)
  },
)
</script>

<template>
  <section v-if="items.length" class="rail">
    <div class="head">
      <div class="titles">
        <h2>{{ title }}</h2>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <RouterLink v-if="moreTo" class="more" :to="moreTo">更多</RouterLink>
    </div>

    <div class="viewport">
      <div ref="scroller" class="track">
        <div v-for="item in items" :key="`${item.sourceKey}-${item.vodId}`" class="slide">
          <MediaCard :item="item" />
        </div>
      </div>

      <button
        v-if="canLeft"
        type="button"
        class="edge left"
        aria-label="向左查看"
        @click.stop.prevent="scrollPage(-1)"
      >
        <span class="chev">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </span>
      </button>
      <button
        v-if="canRight"
        type="button"
        class="edge right"
        aria-label="向右查看"
        @click.stop.prevent="scrollPage(1)"
      >
        <span class="chev">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="currentColor" d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped lang="scss">
.rail {
  margin-top: var(--space-6);
}

.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
  padding: 0 2px;
}

.titles h2 {
  margin: 0;
}

.titles p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.more {
  color: var(--text-muted);
  font-size: 13px;
  padding: 4px 0;
  flex-shrink: 0;
}

.more:hover {
  color: var(--accent);
}

.viewport {
  position: relative;
  margin: 0 -4px;
  padding: 0 4px;
}

.track {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 6px 2px 2px;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}

.track::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
  background: transparent;
}

.slide {
  flex: 0 0 148px;
  width: 148px;
  min-width: 148px;
  max-width: 148px;
}

/* 腾讯视频式：贴内容两侧的圆形切换钮 */
.edge {
  position: absolute;
  top: 42%;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  transform: translateY(-50%);
}

.edge.left {
  left: 2px;
}

.edge.right {
  right: 2px;
}

.chev {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  transition: background 0.15s ease, transform 0.15s ease;
}

.edge:hover .chev {
  background: rgba(0, 0, 0, 0.72);
  transform: scale(1.06);
}

.viewport .edge {
  opacity: 0.92;
}

@media (hover: hover) {
  .viewport .edge {
    opacity: 0;
  }

  .viewport:hover .edge {
    opacity: 1;
  }
}
</style>
