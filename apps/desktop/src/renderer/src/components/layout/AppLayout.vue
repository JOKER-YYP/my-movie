<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton } from 'naive-ui'
import WindowControls from '@/components/layout/WindowControls.vue'
import { useUserStore } from '@/stores/user'
import { useSourcesStore } from '@/stores/sources'
import { useSearchHistoryStore } from '@/stores/searchHistory'
import { CHANNELS } from '@/constants/channels'

type NavItem = {
  to: string
  label: string
  match: string
  icon: 'home' | 'movie' | 'tv' | 'variety' | 'anime' | 'kids' | 'history' | 'fav' | 'settings'
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const sourcesStore = useSourcesStore()
const searchHistory = useSearchHistoryStore()
const keyword = ref('')
const searchFocused = ref(false)

const hideChrome = computed(() => Boolean(route.meta.hideChrome))
const flushMain = computed(() => route.name === 'home' || route.name === 'channel')
const overlayHeader = computed(() => route.name === 'home' || route.name === 'channel')
const showBack = computed(() => route.name === 'detail' || route.name === 'search')

const browseNavs: NavItem[] = [
  { to: '/', label: '首页', match: 'home', icon: 'home' },
  ...CHANNELS.map((c) => ({
    to: `/channel/${c.key}`,
    label: c.label,
    match: c.key,
    icon: (c.key === 'movie'
      ? 'movie'
      : c.key === 'tv'
        ? 'tv'
        : c.key === 'variety'
          ? 'variety'
          : c.key === 'anime'
            ? 'anime'
            : 'kids') as NavItem['icon'],
  })),
]

const libraryNavs: NavItem[] = [
  { to: '/history', label: '历史', match: 'history', icon: 'history' },
  { to: '/favorites', label: '收藏', match: 'favorites', icon: 'fav' },
  { to: '/settings', label: '设置', match: 'settings', icon: 'settings' },
]

function isActive(item: NavItem) {
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
  <div class="shell" :class="{ immersive: hideChrome }">
    <aside v-if="!hideChrome" class="sidebar" aria-label="主导航">
      <div class="sidebar-drag" />
      <button type="button" class="logo no-drag" @click="router.push('/')">my-movie</button>

      <nav class="side-nav no-drag">
        <div class="nav-group">
          <RouterLink
            v-for="item in browseNavs"
            :key="item.to"
            :to="item.to"
            class="side-item"
            :class="{ active: isActive(item) }"
          >
            <span class="ico" aria-hidden="true">
              <svg v-if="item.icon === 'home'" viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M12 3.2 3.5 10.2V21h5.7v-6.2h5.6V21h5.7V10.2L12 3.2z"
                />
              </svg>
              <svg v-else-if="item.icon === 'movie'" viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm2 2v2h2V7H6zm4 0v2h2V7h-2zm4 0v2h2V7h-2zm-8 4v2h2v-2H6zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2zm-8 4v2h2v-2H6zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2z"
                />
              </svg>
              <svg v-else-if="item.icon === 'tv'" viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M4 6h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm4 13h8v1.5H8V19z"
                />
              </svg>
              <svg v-else-if="item.icon === 'variety'" viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M12 3.5 14.2 9H20l-4.5 3.4L17.4 18 12 14.8 6.6 18l1.9-5.6L4 9h5.8L12 3.5z"
                />
              </svg>
              <svg v-else-if="item.icon === 'anime'" viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M12 2a8 8 0 0 0-8 8c0 5.2 4.2 9.5 8 11.5 3.8-2 8-6.3 8-11.5a8 8 0 0 0-8-8zm0 4.2c1.8 0 3.3 1.5 3.3 3.3S13.8 12.8 12 12.8 8.7 11.3 8.7 9.5 10.2 6.2 12 6.2z"
                />
              </svg>
              <svg v-else-if="item.icon === 'kids'" viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-7 15.2c0-3.2 3.1-5.2 7-5.2s7 2 7 5.2V20H5v-.8z"
                />
              </svg>
            </span>
            <span class="label">{{ item.label }}</span>
          </RouterLink>
        </div>

        <div class="nav-divider" />

        <div class="nav-group">
          <RouterLink
            v-for="item in libraryNavs"
            :key="item.to"
            :to="item.to"
            class="side-item"
            :class="{ active: isActive(item) }"
          >
            <span class="ico" aria-hidden="true">
              <svg v-if="item.icon === 'history'" viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M12 4a8 8 0 1 1-7.4 4.9l1.8.6A6.2 6.2 0 1 0 12 5.8V8l3.5-3.5L12 1v3zM11 8h1.5v4.2l3.2 1.9-.7 1.2L11 13V8z"
                />
              </svg>
              <svg v-else-if="item.icon === 'fav'" viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M12 19.3 5.4 13.2A4.4 4.4 0 0 1 12 6.8a4.4 4.4 0 0 1 6.6 6.4L12 19.3z"
                />
              </svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M11 4h2v2.1a6.9 6.9 0 0 1 2.3.9l1.5-1.5 1.4 1.4-1.5 1.5c.4.7.7 1.5.9 2.3H21v2h-2.1a6.9 6.9 0 0 1-.9 2.3l1.5 1.5-1.4 1.4-1.5-1.5a6.9 6.9 0 0 1-2.3.9V20h-2v-2.1a6.9 6.9 0 0 1-2.3-.9l-1.5 1.5-1.4-1.4 1.5-1.5a6.9 6.9 0 0 1-.9-2.3H3v-2h2.1c.2-.8.5-1.6.9-2.3L4.5 7.9 5.9 6.5l1.5 1.5A6.9 6.9 0 0 1 11 6.1V4zm1 5.5A2.5 2.5 0 1 0 12 14a2.5 2.5 0 0 0 0-4.5z"
                />
              </svg>
            </span>
            <span class="label">{{ item.label }}</span>
          </RouterLink>
        </div>
      </nav>
    </aside>

    <div class="stage">
      <div v-if="hideChrome" class="titlebar titlebar-slim">
        <div class="drag-fill" />
        <WindowControls />
      </div>

      <header
        v-else
        class="topbar"
        :class="{ overlay: overlayHeader }"
      >
        <div class="top-left no-drag">
          <button v-if="showBack" type="button" class="icon-btn" aria-label="返回" @click="goBack">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
              />
            </svg>
          </button>
        </div>

        <div class="search no-drag">
          <div class="search-pill" :class="{ focused: searchFocused }">
            <span class="search-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path
                  fill="currentColor"
                  d="M10.5 3.5a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm7.4 10.3 3.4 3.4-1.4 1.4-3.4-3.4 1.4-1.4z"
                />
              </svg>
            </span>
            <input
              v-model="keyword"
              class="search-input"
              type="search"
              enterkeyhint="search"
              placeholder="搜索影片、演员、综艺…"
              @focus="searchFocused = true"
              @blur="onSearchBlur"
              @keyup.enter="onSearch"
            />
            <button
              v-if="keyword"
              type="button"
              class="clear-btn"
              aria-label="清空"
              @mousedown.prevent
              @click="keyword = ''"
            >
              ×
            </button>
            <button type="button" class="search-go" @click="onSearch">搜索</button>
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
        </div>

        <div class="top-right no-drag">
          <NButton quaternary class="ghost" @click="router.push('/history')">历史</NButton>
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
  </div>
</template>

<style scoped lang="scss">
.shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  background: var(--bg);
}

.shell.immersive {
  grid-template-columns: 1fr;
}

.sidebar {
  position: sticky;
  top: 0;
  z-index: 30;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--bg) 88%, #000);
  border-right: 1px solid color-mix(in srgb, var(--line) 28%, transparent);
  -webkit-app-region: drag;
}

.sidebar-drag {
  height: 12px;
  flex-shrink: 0;
}

.no-drag {
  -webkit-app-region: no-drag;
}

.logo {
  margin: 4px 14px 18px;
  border: 0;
  background: transparent;
  text-align: left;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--accent);
  cursor: pointer;
}

.side-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 10px 20px;
  overflow: auto;
  min-height: 0;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-divider {
  height: 1px;
  margin: 8px 8px;
  background: color-mix(in srgb, var(--line) 45%, transparent);
}

.side-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 400;
  transition: background 0.15s ease, color 0.15s ease;
}

.side-item:hover {
  color: var(--text);
  background: var(--bg-soft);
}

.side-item.active {
  color: var(--text);
  font-weight: 700;
  background: var(--accent-soft);
}

.side-item.active .ico {
  color: var(--accent);
}

.ico {
  display: inline-flex;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: inherit;
}

.label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.titlebar,
.topbar {
  -webkit-app-region: drag;
  user-select: none;
}

.titlebar-slim {
  height: 36px;
  display: flex;
  align-items: stretch;
  background: var(--bg);
  border-bottom: 1px solid color-mix(in srgb, var(--line) 28%, transparent);
}

.drag-fill {
  flex: 1;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: var(--header-h);
  display: grid;
  grid-template-columns: auto minmax(220px, 480px) auto auto;
  gap: var(--space-3);
  align-items: stretch;
  justify-content: end;
  padding-left: var(--page-x);
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid color-mix(in srgb, var(--line) 28%, transparent);
}

.topbar.overlay {
  position: absolute;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, var(--scrim-mid), transparent);
  border-bottom: 0;
  backdrop-filter: blur(8px);
}

.top-left,
.top-right,
.search {
  display: flex;
  align-items: center;
  align-self: center;
}

.top-left {
  justify-self: start;
  min-width: 36px;
}

.search {
  justify-self: center;
  width: 100%;
  max-width: 460px;
}

.search-pill {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 0 6px 0 14px;
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.14);
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.topbar:not(.overlay) .search-pill {
  background: var(--bg-soft);
  border-color: color-mix(in srgb, var(--line) 55%, transparent);
}

.search-pill.focused {
  background: rgba(255, 255, 255, 0.16);
  border-color: color-mix(in srgb, var(--accent) 55%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
}

.search-ico {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 36px;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 13px;
  caret-color: var(--accent);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-input::-webkit-search-decoration,
.search-input::-webkit-search-cancel-button {
  display: none;
}

.clear-btn {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  color: var(--text);
  cursor: pointer;
  line-height: 1;
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.28);
}

.search-go {
  flex-shrink: 0;
  height: 30px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.search-go:hover {
  color: var(--accent);
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
}

.clear-all {
  border: 0;
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 12px;
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
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--text-dim);
}

.history-remove:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.top-right {
  gap: 4px;
  justify-self: end;
}

.top-right :deep(.n-button) {
  max-width: 120px;
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
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--accent);
}

.main {
  flex: 1;
  min-width: 0;
  padding: var(--space-5) var(--page-x) var(--space-7);
  -webkit-app-region: no-drag;
}

.main.immersive,
.main.flush {
  padding: 0;
}

.main.flush {
  padding-top: 0;
}

@media (max-width: 980px) {
  .shell {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .logo {
    font-size: 0;
    width: 40px;
    height: 28px;
    margin: 8px auto 12px;
    background: var(--accent);
    border-radius: 8px;
  }

  .side-item {
    justify-content: center;
    padding: 0;
  }

  .label {
    display: none;
  }

  .topbar {
    grid-template-columns: auto 1fr auto auto;
  }

  .search {
    max-width: none;
  }
}
</style>
