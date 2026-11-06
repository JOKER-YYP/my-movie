import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchMe, login as loginApi, register as registerApi, type AuthUser } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<AuthUser | null>(null)

  async function bootstrap() {
    if (!token.value) return
    try {
      user.value = await fetchMe()
    } catch {
      logout()
    }
  }

  async function login(username: string, password: string) {
    const data = await loginApi(username, password)
    token.value = data.token
    user.value = data.user
    localStorage.setItem('token', data.token)
  }

  async function register(username: string, password: string) {
    const data = await registerApi(username, password)
    token.value = data.token
    user.value = data.user
    localStorage.setItem('token', data.token)
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
  }

  return { token, user, bootstrap, login, register, logout }
})
