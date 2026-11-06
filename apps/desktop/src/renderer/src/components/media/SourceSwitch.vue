<script setup lang="ts">
import type { VodSearchItem } from '@my-movie/shared'

defineProps<{
  currentSource: string
  currentName?: string
  items: VodSearchItem[]
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [item: VodSearchItem]
}>()
</script>

<template>
  <section v-if="loading || items.length || currentName" class="switch">
    <div class="label">换源</div>
    <div class="chips">
      <span class="chip active">{{ currentName || currentSource }} · 当前</span>
      <button
        v-for="item in items"
        :key="`${item.sourceKey}-${item.vodId}`"
        type="button"
        class="chip"
        :title="item.remarks || item.title"
        @click="emit('select', item)"
      >
        {{ item.sourceName }}
        <em v-if="item.remarks">{{ item.remarks }}</em>
      </button>
      <span v-if="loading" class="hint">正在查找其它源…</span>
      <span v-else-if="!items.length" class="hint">暂无其它同名源</span>
    </div>
  </section>
</template>

<style scoped lang="scss">
.switch {
  margin-top: var(--space-4);
}

.label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: var(--space-2);
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.chip {
  border: 0;
  background: var(--bg-soft);
  color: var(--text-muted);
  border-radius: var(--radius-pill);
  padding: 8px 16px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  transition: background 0.15s ease, color 0.15s ease;
}

.chip.active {
  background: var(--accent);
  color: var(--on-accent);
  cursor: default;
}

.chip:not(.active):hover {
  background: var(--bg-hover);
  color: var(--text);
}

.chip em {
  margin-left: 6px;
  font-style: normal;
  font-weight: 400;
  color: inherit;
  opacity: 0.75;
  font-size: 11px;
}

.hint {
  color: var(--text-dim);
  font-size: 12px;
}
</style>
