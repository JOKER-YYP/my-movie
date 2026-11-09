<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const maximized = ref(false)
let unsubscribe: (() => void) | undefined

onMounted(async () => {
  try {
    maximized.value = Boolean(await window.myMovie?.window?.isMaximized?.())
    unsubscribe = window.myMovie?.window?.onMaximizedChange?.((v) => {
      maximized.value = v
    })
  } catch {
    maximized.value = false
  }
})

onBeforeUnmount(() => {
  unsubscribe?.()
})

function minimize() {
  void window.myMovie?.window?.minimize?.()
}

function toggleMaximize() {
  void window.myMovie?.window?.maximize?.().then((v) => {
    if (typeof v === 'boolean') maximized.value = v
  })
}

function close() {
  void window.myMovie?.window?.close?.()
}
</script>

<template>
  <div class="controls" aria-label="窗口控制">
    <button type="button" class="ctl" aria-label="最小化" @click="minimize">
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
        <rect x="1" y="5.5" width="10" height="1.2" fill="currentColor" />
      </svg>
    </button>
    <button
      type="button"
      class="ctl"
      :aria-label="maximized ? '还原' : '最大化'"
      @click="toggleMaximize"
    >
      <svg v-if="!maximized" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
        <rect
          x="1.5"
          y="1.5"
          width="9"
          height="9"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
        />
      </svg>
      <svg v-else viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
          d="M3.5 3.5h6v6h-6zM2 4.5V2h6.5"
        />
      </svg>
    </button>
    <button type="button" class="ctl close" aria-label="关闭" @click="close">
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
        <path
          d="M2.2 2.2l7.6 7.6M9.8 2.2L2.2 9.8"
          fill="none"
          stroke="currentColor"
          stroke-width="1.3"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped lang="scss">
.controls {
  display: flex;
  align-items: stretch;
  height: 100%;
  margin-right: -4px;
  -webkit-app-region: no-drag;
}

.ctl {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 100%;
  min-height: 36px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.ctl:hover {
  background: var(--bg-soft);
  color: var(--text);
}

.ctl.close:hover {
  background: #e81123;
  color: #fff;
}
</style>
