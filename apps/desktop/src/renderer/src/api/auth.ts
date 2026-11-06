import { API_PATHS } from '@my-movie/shared'
import { apiGet, apiPost } from './http'

export interface AuthUser {
  id: string
  username: string
  nickname?: string | null
  avatar?: string | null
}

export function login(username: string, password: string) {
  return apiPost<{ token: string; user: AuthUser }>(API_PATHS.authLogin, { username, password })
}

export function register(username: string, password: string) {
  return apiPost<{ token: string; user: AuthUser }>(API_PATHS.authRegister, { username, password })
}

export function fetchMe() {
  return apiGet<AuthUser>('/api/auth/me')
}
