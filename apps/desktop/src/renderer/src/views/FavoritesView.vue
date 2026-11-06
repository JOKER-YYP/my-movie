<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NEmpty } from 'naive-ui'
import { apiGet } from '@/api/http'
import { API_PATHS } from '@my-movie/shared'
import { useUserStore } from '@/stores/user'

interface FavRow {
  sourceKey: string
  vodId: string
  title: string
  cover?: string | null
}

const router = useRouter()
const userStore = useUserStore()
const list = ref<FavRow[]>([])

onMounted(async () => {
  if (!userStore.token) return
  list.value = await apiGet(API_PATHS.favorites)
})
</script>

<template>
  <div class="page">
    <h1 class="page-title">我的收藏</h1>
    <p class="page-hint">收藏条目可在登录后跨设备同步</p>

    <NEmpty v-if="!userStore.token" description="登录后可同步收藏">
      <template #extra>
        <NButton type="primary" @click="router.push('/login')">去登录</NButton>
      </template>
    </NEmpty>
    <NEmpty v-else-if="!list.length" description="暂无收藏">
      <template #extra>
        <NButton @click="router.push('/')">去首页看看</NButton>
      </template>
    </NEmpty>
    <div v-else class="list">
      <button
        v-for="item in list"
        :key="`${item.sourceKey}-${item.vodId}`"
        type="button"
        class="row"
        @click="router.push(`/media/${item.sourceKey}/${item.vodId}`)"
      >
        <div
          class="thumb"
          :style="item.cover ? { backgroundImage: `url(${item.cover})` } : undefined"
        />
        <div class="meta">
          <div class="title">{{ item.title }}</div>
          <div class="sub">{{ item.sourceKey }}</div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page {
  max-width: 720px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  text-align: left;
  border: 0;
  background: var(--bg-elevated);
  color: var(--text);
  border-radius: var(--radius);
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}

.row:hover {
  background: var(--bg-soft);
  transform: translateY(-1px);
}

.thumb {
  width: 48px;
  height: 68px;
  border-radius: 4px;
  background: var(--bg-card) center/cover no-repeat;
  flex-shrink: 0;
  box-shadow: var(--shadow-soft);
}

.meta {
  min-width: 0;
}

.title {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
}
</style>
