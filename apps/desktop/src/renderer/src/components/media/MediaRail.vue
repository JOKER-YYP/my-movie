<script setup lang="ts">
import { ref } from 'vue'
import type { VodSearchItem } from '@my-movie/shared'
import MediaCard from './MediaCard.vue'

defineProps<{
  title: string
  subtitle?: string
  items: VodSearchItem[]
  moreTo?: string
}>()

const scroller = ref<HTMLElement | null>(null)

function scrollBy(dir: -1 | 1) {
  const el = scroller.value
  if (!el) return
  el.scrollBy({ left: dir * Math.min(720, el.clientWidth * 0.8), behavior: 'smooth' })
}
</script>

<template>
  <section v-if="items.length" class="rail">
    <div class="head">
      <div>
        <h2>{{ title }}</h2>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div class="ops">
        <button type="button" class="nav-btn" aria-label="向左滚动" @click="scrollBy(-1)">‹</button>
        <button type="button" class="nav-btn" aria-label="向右滚动" @click="scrollBy(1)">›</button>
        <RouterLink v-if="moreTo" class="more" :to="moreTo">更多</RouterLink>
      </div>
    </div>
    <div ref="scroller" class="track">
      <div v-for="item in items" :key="`${item.sourceKey}-${item.vodId}`" class="slide">
        <MediaCard :item="item" />
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
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 0;
  background: var(--bg-soft);
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.nav-btn:hover {
  background: var(--bg-hover);
  color: var(--accent);
  transform: scale(1.05);
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

.track {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  overflow-x: auto;
  padding: 8px 2px 10px;
  margin: -8px -2px 0;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
}

.slide {
  flex: 0 0 148px;
  width: 148px;
  min-width: 148px;
  max-width: 148px;
  scroll-snap-align: start;
}
</style>
