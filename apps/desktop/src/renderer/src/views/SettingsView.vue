<script setup lang="ts">
import { onMounted } from 'vue'
import { NCard, NSpace, NSwitch, NText } from 'naive-ui'
import { useSourcesStore } from '@/stores/sources'
import { useSettingsStore } from '@/stores/settings'
import { THEME_PRESETS, type ThemeId } from '@/themes/presets'

const sourcesStore = useSourcesStore()
const settings = useSettingsStore()

function pickTheme(id: ThemeId) {
  settings.setTheme(id)
}

onMounted(async () => {
  await sourcesStore.load()
})
</script>

<template>
  <div class="page">
    <h1 class="page-title">设置</h1>
    <p class="page-hint">外观、播放偏好与采集源开关</p>

    <NCard title="外观" class="card">
      <div class="theme-grid">
        <button
          v-for="t in THEME_PRESETS"
          :key="t.id"
          type="button"
          class="theme-card"
          :class="{ active: settings.themeId === t.id }"
          @click="pickTheme(t.id)"
        >
          <div class="swatch" aria-hidden="true">
            <i :style="{ background: t.swatch[0] }" />
            <i :style="{ background: t.swatch[1] }" />
            <i :style="{ background: t.swatch[2] }" />
          </div>
          <div class="theme-meta">
            <div class="name">{{ t.label }}</div>
            <NText depth="3">{{ t.blurb }}</NText>
          </div>
        </button>
      </div>
    </NCard>

    <NCard title="播放" class="card">
      <div class="row">
        <div>
          <div class="name">自动连播下一集</div>
          <NText depth="3">本集结束后倒计时 5 秒切换</NText>
        </div>
        <NSwitch v-model:value="settings.autoPlayNext" />
      </div>
      <div class="row">
        <div>
          <div class="name">默认开启媒体代理</div>
          <NText depth="3">解决部分 m3u8 跨域 / 防盗链</NText>
        </div>
        <NSwitch v-model:value="settings.preferProxy" />
      </div>
    </NCard>

    <NCard title="采集源（LibreTV）" class="card">
      <NSpace vertical>
        <div v-for="s in sourcesStore.all" :key="s.key" class="row">
          <div>
            <div class="name">{{ s.name }}</div>
            <NText depth="3">{{ s.key }}</NText>
          </div>
          <NSwitch
            :value="sourcesStore.enabledKeys.includes(s.key)"
            @update:value="(v) => sourcesStore.toggle(s.key, v)"
          />
        </div>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.card {
  margin-top: var(--space-4);
  background: var(--bg-elevated);
  border: 0;
  box-shadow: none;
}

.card:first-of-type {
  margin-top: 0;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
}

.theme-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  text-align: left;
  border: 1px solid transparent;
  background: var(--bg-soft);
  color: var(--text);
  border-radius: var(--radius);
  padding: var(--space-3);
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.theme-card:hover {
  background: var(--bg-hover);
}

.theme-card.active {
  box-shadow: 0 0 0 2px var(--accent);
}

.swatch {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  height: 36px;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.swatch i {
  display: block;
}

.theme-meta .name {
  font-weight: 700;
  margin-bottom: 2px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.row + .row {
  border-top: 1px solid color-mix(in srgb, var(--line) 35%, transparent);
}

.name {
  font-weight: 700;
}
</style>
