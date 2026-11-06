<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCard, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()
const mode = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const loading = ref(false)

async function submit() {
  loading.value = true
  try {
    if (mode.value === 'login') await userStore.login(username.value, password.value)
    else await userStore.register(username.value, password.value)
    message.success('成功')
    router.push('/')
  } catch (err) {
    message.error(err instanceof Error ? err.message : '失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="wrap">
    <NCard :title="mode === 'login' ? '登录' : '注册'" style="width: 420px">
      <NForm @submit.prevent="submit">
        <NFormItem label="用户名">
          <NInput v-model:value="username" placeholder="至少 3 位" />
        </NFormItem>
        <NFormItem label="密码">
          <NInput v-model:value="password" type="password" show-password-on="click" placeholder="至少 6 位" />
        </NFormItem>
        <div class="actions">
          <NButton type="primary" attr-type="submit" :loading="loading">
            {{ mode === 'login' ? '登录' : '注册并登录' }}
          </NButton>
          <NButton text @click="mode = mode === 'login' ? 'register' : 'login'">
            {{ mode === 'login' ? '没有账号？注册' : '已有账号？登录' }}
          </NButton>
        </div>
      </NForm>
    </NCard>
  </div>
</template>

<style scoped>
.wrap {
  min-height: calc(100vh - var(--header-h) - 96px);
  display: grid;
  place-items: center;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}
</style>
