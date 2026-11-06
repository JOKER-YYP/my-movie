<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NEmpty, NList, NListItem, NThing } from 'naive-ui'
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
  <div>
    <h1>我的收藏</h1>
    <NEmpty v-if="!userStore.token" description="登录后可同步收藏">
      <template #extra>
        <NButton @click="router.push('/login')">去登录</NButton>
      </template>
    </NEmpty>
    <NEmpty v-else-if="!list.length" description="暂无收藏" />
    <NList v-else>
      <NListItem v-for="item in list" :key="`${item.sourceKey}-${item.vodId}`">
        <NThing :title="item.title" :description="item.sourceKey">
          <template #action>
            <NButton size="small" @click="router.push(`/media/${item.sourceKey}/${item.vodId}`)">
              查看详情
            </NButton>
          </template>
        </NThing>
      </NListItem>
    </NList>
  </div>
</template>
