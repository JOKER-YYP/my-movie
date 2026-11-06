<script setup lang="ts">
import { ref, watch } from 'vue'
import type { VodSearchItem } from '@my-movie/shared'

const props = defineProps<{ item: VodSearchItem }>()
const coverBroken = ref(false)

watch(
  () => props.item.cover,
  () => {
    coverBroken.value = false
  },
)
</script>

<template>
  <RouterLink class="card" :to="`/media/${item.sourceKey}/${item.vodId}`">
    <div class="cover">
      <img
        v-if="item.cover && !coverBroken"
        class="poster"
        :src="item.cover"
        :alt="item.title"
        loading="lazy"
        @error="coverBroken = true"
      />
      <span class="source" :title="item.sourceName">{{ item.sourceName }}</span>
      <span v-if="item.remarks" class="badge" :title="item.remarks">{{ item.remarks }}</span>
    </div>
    <div class="meta">
      <div class="title" :title="item.title">{{ item.title }}</div>
      <div class="sub">{{ item.typeName || '影视' }}{{ item.year ? ` · ${item.year}` : '' }}</div>
    </div>
  </RouterLink>
</template>

<style scoped lang="scss">
.card {
  display: block;
  width: 100%;
  min-width: 0;
  color: inherit;
  border-radius: 6px;
}

.cover {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 6px;
  background: var(--bg-card);
  overflow: hidden;
  box-shadow: var(--shadow-soft);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.card:hover .cover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-heavy);
}

.poster {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.25s ease;
}

.card:hover .poster {
  transform: scale(1.03);
}

.source,
.badge {
  position: absolute;
  z-index: 1;
  max-width: calc(100% - 16px);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.33;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
}

.source {
  left: 8px;
  top: 8px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
}

.badge {
  right: 8px;
  bottom: 8px;
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.02em;
  backdrop-filter: blur(6px);
}

.meta {
  padding-top: 10px;
  min-width: 0;
}

.title,
.sub {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
}

.sub {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 400;
}
</style>
