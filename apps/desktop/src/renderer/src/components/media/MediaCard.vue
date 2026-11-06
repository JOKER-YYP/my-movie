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
      <span v-if="item.remarks" class="badge" :title="item.remarks">{{ item.remarks }}</span>
    </div>
    <div class="meta">
      <div class="title" :title="item.title">{{ item.title }}</div>
      <div class="sub">{{ item.sourceName }} · {{ item.typeName || '影视' }}</div>
    </div>
  </RouterLink>
</template>

<style scoped lang="scss">
.card {
  display: block;
  width: 100%;
  min-width: 0;
  color: inherit;
  border-radius: var(--radius);
  padding: 8px;
  margin: -8px;
  transition: background 0.15s ease;
}

.card:hover {
  background: var(--bg-soft);
}

.cover {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
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

.badge {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 1;
  max-width: calc(100% - 16px);
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
  pointer-events: none;
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
}

.sub {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
}
</style>
