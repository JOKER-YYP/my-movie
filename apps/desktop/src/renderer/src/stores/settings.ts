import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import {
  THEME_STORAGE_KEY,
  applyDocumentTheme,
  getThemePreset,
  readStoredTheme,
  type ThemeId,
} from '@/themes/presets'

export const useSettingsStore = defineStore('settings', () => {
  const autoPlayNext = ref(localStorage.getItem('autoPlayNext') !== '0')
  const preferProxy = ref(localStorage.getItem('preferProxy') !== '0')
  const themeId = ref<ThemeId>(readStoredTheme())

  applyDocumentTheme(themeId.value)

  watch(autoPlayNext, (v) => localStorage.setItem('autoPlayNext', v ? '1' : '0'))
  watch(preferProxy, (v) => localStorage.setItem('preferProxy', v ? '1' : '0'))
  watch(
    themeId,
    (id) => {
      localStorage.setItem(THEME_STORAGE_KEY, id)
      applyDocumentTheme(id)
    },
    { immediate: true },
  )

  function setTheme(id: ThemeId) {
    themeId.value = id
  }

  const themePreset = () => getThemePreset(themeId.value)

  return { autoPlayNext, preferProxy, themeId, setTheme, themePreset }
})
