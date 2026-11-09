<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { VodSearchItem } from '@my-movie/shared'
import MediaCard from './MediaCard.vue'

defineProps<{
  title: string
  subtitle?: string
  items: VodSearchItem[]
  moreTo?: string
}>()

const scroller = ref<HTMLElement | null>(null)
const canLeft = ref(false)
const canRight = ref(false)

function updateArrows() {
  const el = scroller.value
  if (!el) {
    canLeft.value = false
    canRight.value = false
    return
  }
  const max = el.scrollWidth - el.clientWidth
  canLeft.value = el.scrollLeft > 4
  canRight.value = el.scrollLeft < max - 4
}

function scrollBy(dir: -1 | 1) {
  const el = scroller.value
  if (!el) return
  el.scrollBy({ left: dir * Math.min(720, el.clientWidth * 0.85), behavior: 'smooth' })
}

onMounted(() => {
  updateArrows()
  scroller.value?.addEventListener('scroll', updateArrows, { passive: true })
  window.addEventListener('resize', updateArrows)
})

onBeforeUnmount(() => {
  scroller.value?.removeEventListener('scroll', updateArrows)
  window.removeEventListener('resize', updateArrows)
})
</script>

<template>
  <section v-if="items.length" class="rail">
    <div class="head">
      <div>
        <h2>{{ title }}</h2>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div class="ops">
        <button
          type="button"
          class="nav-btn"
          aria-label="向左滚动"
          :disabled="!canLeft"
          @click="scrollBy(-1)"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        <button
          type="button"
          class="nav-btn"
          aria-label="向右滚动"
          :disabled="!canRight"
          @click="scrollBy(1)"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path fill="currentColor" d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
        <RouterLink v-if="moreTo" class="more" :to="moreTo">更多</RouterLink>
      </div>
    </div>

    <div class="viewport">
      <button
        v-show="canLeft"
        type="button"
        class="edge left"
        aria-label="向左滚动"
        @click="scrollBy(-1)"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>
      <button
        v-show="canRight"
        type="button"
        class="edge right"
        aria-label="向右滚动"
        @click="scrollBy(1)"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path fill="currentColor" d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        </svg>
      </button>

      <div ref="scroller" class="track">
        <div v-for="item in items" :key="`${item.sourceKey}-${item.vodId}`" class="slide">
          <MediaCard :item="item" />
        </div>
      </div>
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

h2 {
  margin: 0;
}

p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.ops {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 0;
  background: var(--bg-soft);
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}

.nav-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--accent);
}

.nav-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.more {
  margin-left: 2px;
  color: var(--text-muted);
  font-size: 13px;
  padding: 6px 4px;
}

.more:hover {
  color: var(--accent);
}

.viewport {
  position: relative;
}

.track {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  overflow-x: auto;
  padding: 8px 2px 4px;
  margin: -8px -2px 0;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.track::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.slide {
  flex: 0 0 148px;
  width: 148px;
  min-width: 148px;
  max-width: 148px;
  scroll-snap-align: start;
}

.edge {
  position: absolute;
  top: 0;
  bottom: 18px;
  z-index: 3;
  width: 44px;
  border: 0;
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.viewport:hover .edge {
  opacity: 1;
}

.edge.left {
  left: 0;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.55), transparent);
}

.edge.right {
  right: 0;
  background: linear-gradient(270deg, rgba(0, 0, 0, 0.55), transparent);
}

.edge svg {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45));
}
</style>
