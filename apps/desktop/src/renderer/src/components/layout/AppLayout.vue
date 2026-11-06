<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NInput } from 'naive-ui'
import { useUserStore } from '@/stores/user'
import { useSourcesStore } from '@/stores/sources'
import { CHANNELS } from '@/constants/channels'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const sourcesStore = useSourcesStore()
const keyword = ref('')

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
  router.push({ path: '/search', query: { q } })
}
</script>

<template>
  <div class="shell">
    <header v-if="!hideChrome" class="topbar">
      <div class="brand-row">
        <button v-if="showBack" type="button" class="back" aria-label="返回" @click="goBack">
          ←
        </button>
        <button type="button" class="brand" @click="router.push('/')">my-movie</button>
      </div>
      <nav class="nav" aria-label="主导航">
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
      <div class="search">
        <NInput
          v-model:value="keyword"
          clearable
          placeholder="搜索影片、演员、综艺…"
          @keyup.enter="onSearch"
        />
        <NButton type="primary" @click="onSearch">搜索</NButton>
      </div>
      <div class="user">
        <NButton v-if="userStore.user" quaternary @click="userStore.logout()">
          {{ userStore.user.nickname || userStore.user.username }}
        </NButton>
        <NButton v-else quaternary @click="router.push('/login')">登录</NButton>
      </div>
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

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: var(--header-h);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(200px, 320px) auto;
  gap: var(--space-4);
  align-items: center;
  padding: 0 var(--page-x);
  background: var(--bg);
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.back {
  border: 0;
  background: var(--bg-soft);
  color: var(--text);
  width: 32px;
  height: 32px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

.back:hover {
  color: var(--accent);
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
}

.brand:hover {
  filter: brightness(1.08);
}

.nav {
  display: flex;
  gap: 4px;
  overflow: auto;
  scrollbar-width: none;
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
  display: flex;
  gap: var(--space-2);
  min-width: 0;
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
    grid-template-rows: auto auto;
    height: auto;
    padding-top: 10px;
    padding-bottom: 10px;
    row-gap: 10px;
  }

  .brand {
    grid-column: 1;
  }

  .user {
    grid-column: 3;
    justify-self: end;
  }

  .nav {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .search {
    grid-column: 1 / -1;
    grid-row: 3;
  }
}
</style>
