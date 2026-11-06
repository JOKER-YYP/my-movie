<script setup lang="ts">
import type { ProgressRecord } from '@/utils/progress'
import { formatProgress } from '@/utils/progress'

withDefaults(
  defineProps<{
    items: ProgressRecord[]
    title?: string
    showMore?: boolean
  }>(),
  {
    title: '继续观看',
    showMore: true,
  },
)
</script>

<template>
  <section v-if="items.length" class="rail">
    <div class="head">
      <h2>{{ title }}</h2>
      <RouterLink v-if="showMore" class="more" to="/history">全部历史</RouterLink>
    </div>
    <div class="track">
      <RouterLink
        v-for="item in items"
        :key="`${item.sourceKey}-${item.vodId}`"
        class="item"
        :to="`/play/${item.sourceKey}/${item.vodId}?ep=${item.episodeIndex}&line=${item.lineIndex || 0}&resume=1`"
      >
        <div class="cover">
          <img v-if="item.cover" class="poster" :src="item.cover" :alt="item.title" loading="lazy" />
          <div class="bar">
            <i
              :style="{
                width: `${item.durationSec ? Math.min(100, (item.positionSec / item.durationSec) * 100) : 8}%`,
              }"
            />
          </div>
        </div>
        <div class="title">{{ item.title }}</div>
        <div class="sub">
          第 {{ item.episodeIndex + 1 }} 集 · {{ formatProgress(item.positionSec, item.durationSec) }}
        </div>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped lang="scss">
.rail {
  margin-top: var(--space-5);
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--space-3);
}

h2 {
  margin: 0;
}

.more {
  color: var(--text-muted);
  font-size: 13px;
}

.more:hover {
  color: var(--accent);
}

.track {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.item {
  flex: 0 0 220px;
  width: 220px;
  min-width: 220px;
  max-width: 220px;
  color: inherit;
}

.cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 6px;
  background: var(--bg-card);
  overflow: hidden;
  box-shadow: var(--shadow-soft);
}

.poster {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.16);
}

.bar i {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 0 1px 1px 0;
}

.title {
  margin-top: 10px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}
</style>
