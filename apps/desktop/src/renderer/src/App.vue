<script setup lang="ts">
import { computed } from 'vue'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  darkTheme,
  lightTheme,
  zhCN,
  dateZhCN,
} from 'naive-ui'
import AppLayout from './components/layout/AppLayout.vue'
import { useSettingsStore } from '@/stores/settings'
import { getThemePreset } from '@/themes/presets'

const settings = useSettingsStore()

const naiveTheme = computed(() =>
  getThemePreset(settings.themeId).mode === 'light' ? lightTheme : darkTheme,
)

const themeOverrides = computed(() => getThemePreset(settings.themeId).naive)
</script>

<template>
  <NConfigProvider
    :theme="naiveTheme"
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme-overrides="themeOverrides"
  >
    <NMessageProvider>
      <NDialogProvider>
        <AppLayout />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
