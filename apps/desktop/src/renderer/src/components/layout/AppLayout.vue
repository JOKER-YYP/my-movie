<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NInput } from 'naive-ui'
import WindowControls from '@/components/layout/WindowControls.vue'
import { useUserStore } from '@/stores/user'
import { useSourcesStore } from '@/stores/sources'
import { useSearchHistoryStore } from '@/stores/searchHistory'
import { CHANNELS } from '@/constants/channels'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const sourcesStore = useSourcesStore()
const searchHistory = useSearchHistoryStore()
const keyword = ref('')
const searchFocused = ref(false)

const hideChrome = computed(() => Boolean(route.meta.hideChrome))
const flushMain = computed(() => route.name === 'home' || route.name === 'channel')
const showBack = computed(() => route.name === 'detail' || route.name === 'search')

const navs = [
  { to: '/', label: '首页', match: 'home' },
  ...CHANNELS.map((c) => ({
    to: `/channel/${c.key}`,
    label: c.label,
    match: c.key,
  })),
  { to: '/history', label: '历史', match: 'history' },
  { to: '/favorites', label: '收藏', match: 'favorites' },
  { to: '/settings', label: '设置', match: 'settings' },
]

function isActive(item: (typeof navs)[number]) {
  if (item.match === 'home') return route.name === 'home'
  if (route.name === 'channel') return String(route.params.type) === item.match
  return route.name === item.match
}

onMounted(async () => {
  await Promise.all([userStore.bootstrap(), sourcesStore.load().catch(() => undefined)])
})

watch(
  () => route.query.q,
  (q) => {
    if (route.name === 'search' && typeof q === 'string') keyword.value = q
  },
  { immediate: true },
)

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/')
}

function onSearch() {
  const q = keyword.value.trim()
  if (!q) return
  searchHistory.add(q)
  searchFocused.value = false
  router.push({ path: '/search', query: { q } })
}

function pickHistory(q: string) {
  keyword.value = q
  searchHistory.add(q)
  searchFocused.value = false
  router.push({ path: '/search', query: { q } })
}

function onSearchBlur() {
  window.setTimeout(() => {
    searchFocused.value = false
  }, 120)
}
</script>

<template>
  <div class="shell">
    <!-- 无边框窗口：始终保留可拖拽标题区 + 窗口按钮 -->
    <div v-if="hideChrome" class="titlebar titlebar-slim">
      <div class="drag-fill" />
      <WindowControls />
    </div>

    <header v-else class="topbar">
      <div class="brand-row no-drag">
        <button v-if="showBack" type="button" class="icon-btn" aria-label="返回" @click="goBack">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="currentColor"
              d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
            />
          </svg>
        </button>
        <button type="button" class="brand" @click="router.push('/')">my-movie</button>
      </div>
      <nav class="nav no-drag" aria-label="主导航">
        <RouterLink
          v-for="item in navs"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item) }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="search no-drag">
        <div class="search-field">
          <NInput
            v-model:value="keyword"
            clearable
            round
            placeholder="搜索影片、演员、综艺…"
            @focus="searchFocused = true"
            @blur="onSearchBlur"
            @keyup.enter="onSearch"
          />
          <div
            v-if="searchFocused && searchHistory.items.length"
            class="history-pop"
            @mousedown.prevent
          >
            <div class="history-head">
              <span>最近搜索</span>
              <button type="button" class="clear-all" @click="searchHistory.clear()">清空</button>
            </div>
            <button
              v-for="item in searchHistory.items"
              :key="item"
              type="button"
              class="history-item"
              @click="pickHistory(item)"
            >
              <span class="history-text">{{ item }}</span>
              <span
                class="history-remove"
                role="button"
                tabindex="-1"
                aria-label="删除"
                @click.stop="searchHistory.remove(item)"
              >
                ×
              </span>
            </button>
          </div>
        </div>
        <NButton type="primary" class="search-btn" @click="onSearch">搜索</NButton>
      </div>
      <div class="user no-drag">
        <NButton v-if="userStore.user" quaternary @click="userStore.logout()">
          {{ userStore.user.nickname || userStore.user.username }}
        </NButton>
        <NButton v-else quaternary @click="router.push('/login')">登录</NButton>
      </div>
      <WindowControls />
    </header>

    <main class="main" :class="{ immersive: hideChrome, flush: flushMain }">
      <RouterView v-slot="{ Component, route: r }">
        <KeepAlive include="SearchView">
          <component :is="Component" :key="r.name === 'search' ? 'search' : r.fullPath" />
        </KeepAlive>
      </RouterView>
    </main>
  </div>
</template>

<style scoped lang="scss">
.shell {
  min-height: 100vh;
  background: var(--bg);
}

.titlebar,
.topbar {
  -webkit-app-region: drag;
  user-select: none;
}

.no-drag {
  -webkit-app-region: no-drag;
}

.titlebar-slim {
  position: sticky;
  top: 0;
  z-index: 30;
  height: 36px;
  display: flex;
  align-items: stretch;
  background: var(--bg);
  border-bottom: 1px solid color-mix(in srgb, var(--line) 28%, transparent);
}

.drag-fill {
  flex: 1;
  min-width: 0;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: var(--header-h);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(200px, 320px) auto auto;
  gap: var(--space-3);
  align-items: stretch;
  padding: 0 0 0 var(--page-x);
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid color-mix(in srgb, var(--line) 35%, transparent);
}

.brand-row,
.nav,
.search,
.user {
  display: flex;
  align-items: center;
  align-self: center;
}

.brand-row {
  gap: var(--space-2);
  min-width: 0;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: var(--bg-soft);
  color: var(--text);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--accent);
  transform: scale(1.04);
}

.brand {
  border: 0;
  background: transparent;
  padding: 0;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--accent);
  cursor: pointer;
  white-space: nowrap;
}

.brand:hover {
  filter: brightness(1.08);
}

.nav {
  gap: 2px;
  overflow: auto;
  scrollbar-width: none;
  min-width: 0;
}

.nav::-webkit-scrollbar {
  display: none;
}

.nav-item {
  padding: 8px 14px;
  color: var(--text-muted);
  white-space: nowrap;
  border-radius: var(--radius-pill);
  font-size: 14px;
  font-weight: 400;
  transition: color 0.15s ease, background 0.15s ease;
}

.nav-item:hover {
  color: var(--text);
  background: var(--bg-soft);
}

.nav-item.active {
  color: var(--text);
  font-weight: 700;
  background: var(--bg-soft);
}

.search {
  gap: var(--space-2);
  min-width: 0;
}

.search-field {
  position: relative;
  flex: 1;
  min-width: 0;
}

.search-field :deep(.n-input) {
  width: 100%;
}

.history-pop {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 40;
  padding: 10px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-heavy);
  max-height: 280px;
  overflow: auto;
  -webkit-app-region: no-drag;
}

.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 4px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.clear-all {
  border: 0;
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}

.clear-all:hover {
  color: var(--accent);
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--text);
  text-align: left;
  padding: 8px 10px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font-size: 13px;
}

.history-item:hover {
  background: var(--bg-soft);
}

.history-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-remove {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--text-dim);
  font-size: 14px;
  line-height: 1;
}

.history-remove:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.search-btn {
  letter-spacing: 1.4px;
  text-transform: uppercase;
  font-weight: 700 !important;
  flex-shrink: 0;
}

.user :deep(.n-button) {
  max-width: 120px;
}

.main {
  padding: var(--space-5) var(--page-x) var(--space-7);
}

.main.immersive,
.main.flush {
  padding: 0;
}

@media (max-width: 980px) {
  .topbar {
    grid-template-columns: auto 1fr auto;
    grid-template-rows: auto auto auto;
    height: auto;
    min-height: var(--header-h);
    padding-top: 6px;
    padding-bottom: 10px;
    row-gap: 10px;
  }

  .brand-row {
    grid-column: 1;
  }

  .user {
    grid-column: 2;
    justify-self: end;
  }

  .topbar > :deep(.controls),
  .topbar > :last-child {
    grid-column: 3;
    grid-row: 1;
  }

  .nav {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .search {
    grid-column: 1 / -1;
    grid-row: 3;
    padding-right: var(--page-x);
  }
}
</style>
