<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NEmpty } from 'naive-ui'
import ContinueRail from '@/components/media/ContinueRail.vue'
import { useUserStore } from '@/stores/user'
import { listHistory, type ProgressRecord } from '@/utils/progress'

const router = useRouter()
const userStore = useUserStore()
const list = ref<ProgressRecord[]>([])

onMounted(async () => {
  list.value = await listHistory(userStore.token || undefined, 40)
})
</script>

<template>
  <div class="page">
    <h1 class="page-title">观看历史</h1>
    <p class="page-hint">
      {{ userStore.token ? '已登录：云端与本地进度同步' : '未登录：进度保存在本机，登录后可云端同步' }}
    </p>
    <NEmpty v-if="!list.length" description="暂无记录">
      <template #extra>
        <NButton @click="router.push('/')">去首页看看</NButton>
      </template>
    </NEmpty>
    <ContinueRail v-else title="最近观看" :show-more="false" :items="list" />
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
}
</style>
