import axios from 'axios'
import type { ApiResponse } from '@my-movie/shared'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (res) => {
    const body = res.data as ApiResponse
    if (body && typeof body.code === 'number' && body.code !== 0) {
      return Promise.reject(new Error(body.message || '请求失败'))
    }
    return res
  },
  (err) => Promise.reject(err),
)

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await http.get<ApiResponse<T>>(url, { params })
  return res.data.data
}

export async function apiPost<T>(url: string, data?: unknown): Promise<T> {
  const res = await http.post<ApiResponse<T>>(url, data)
  return res.data.data
}

export async function apiPut<T>(url: string, data?: unknown): Promise<T> {
  const res = await http.put<ApiResponse<T>>(url, data)
  return res.data.data
}

export async function apiDelete<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await http.delete<ApiResponse<T>>(url, { params })
  return res.data.data
}

export default http
