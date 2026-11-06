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
  <div>
    <h1>设置</h1>

    <NCard title="外观" style="margin-top: 16px">
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

    <NCard title="播放" style="margin-top: 16px">
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

    <NCard title="采集源（LibreTV）" style="margin-top: 16px">
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
h1 {
  margin: 0;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.theme-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
  border: 1px solid var(--line);
  background: var(--bg-soft);
  color: var(--text);
  border-radius: var(--radius);
  padding: 12px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.theme-card:hover {
  border-color: var(--line-strong);
  transform: translateY(-1px);
}

.theme-card.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.swatch {
  display: grid;
  grid-template-columns: 1.4fr 0.7fr 1fr;
  height: 44px;
  border-radius: 6px;
  overflow: hidden;
}

.swatch i {
  display: block;
}

.theme-meta .name {
  margin-bottom: 2px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
}

.row:last-child {
  border-bottom: 0;
}

.name {
  font-weight: 700;
  margin-bottom: 4px;
}
</style>
