<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { VodSearchItem } from '@my-movie/shared'

const props = defineProps<{
  title: string
  items: VodSearchItem[]
}>()

const open = ref(false)
const coverBroken = ref(false)
const primary = computed(() => props.items[0])

watch(
  () => primary.value?.cover,
  () => {
    coverBroken.value = false
  },
)
</script>

<template>
  <div class="group">
    <RouterLink class="main" :to="`/media/${primary.sourceKey}/${primary.vodId}`">
      <div class="cover">
        <img
          v-if="primary.cover && !coverBroken"
          class="poster"
          :src="primary.cover"
          :alt="title"
          loading="lazy"
          @error="coverBroken = true"
        />
        <span v-if="items.length > 1" class="sources">{{ items.length }} 源</span>
        <span v-if="primary.remarks" class="badge" :title="primary.remarks">{{ primary.remarks }}</span>
      </div>
      <div class="meta">
        <div class="title" :title="title">{{ title }}</div>
        <div class="sub">{{ primary.sourceName }} · {{ primary.typeName || '影视' }}</div>
      </div>
    </RouterLink>
    <button v-if="items.length > 1" type="button" class="toggle" @click="open = !open">
      {{ open ? '收起源' : `展开 ${items.length} 个源` }}
    </button>
    <div v-if="open" class="alts">
      <RouterLink
        v-for="item in items"
        :key="`${item.sourceKey}-${item.vodId}`"
        class="alt"
        :to="`/media/${item.sourceKey}/${item.vodId}`"
      >
        <span>{{ item.sourceName }}</span>
        <em>{{ item.remarks || item.typeName || '可播' }}</em>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped lang="scss">
.group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  width: 100%;
}

.main {
  display: block;
  color: inherit;
  min-width: 0;
  border-radius: var(--radius);
  padding: 8px;
  margin: -8px;
  transition: background 0.15s ease;
}

.main:hover {
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

.sources {
  position: absolute;
  left: 8px;
  top: 8px;
  z-index: 1;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  pointer-events: none;
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

.toggle {
  border: 0;
  background: var(--bg-soft);
  color: var(--text-muted);
  border-radius: var(--radius-pill);
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  transition: color 0.15s ease, background 0.15s ease;
}

.toggle:hover {
  color: var(--text);
  background: var(--bg-hover);
}

.alts {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.alt {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  color: inherit;
  font-size: 12px;
  transition: background 0.15s ease;
}

.alt:hover {
  background: var(--bg-soft);
}

.alt em {
  font-style: normal;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 48%;
}
</style>
