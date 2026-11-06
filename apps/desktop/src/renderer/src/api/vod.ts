import { API_PATHS, type SearchResponse, type VodDetail, type VodSource } from '@my-movie/shared'
import { apiGet, apiPost } from './http'

export function fetchSources() {
  return apiGet<VodSource[]>(API_PATHS.vodSources)
}

export function searchVod(wd: string, sources?: string[]) {
  // 对齐 LibreTV classic：默认不做黄滤（站点 yellowFilterEnabled 默认关闭）
  return apiPost<SearchResponse>(
    API_PATHS.vodSearch,
    {
      wd,
      sources,
      filterAdult: false,
    },
    { timeout: 90000 },
  )
}

export function fetchDetail(source: string, id: string) {
  return apiGet<VodDetail>(API_PATHS.vodDetail, { source, id })
}

export function proxyUrl(url: string) {
  const base = import.meta.env.VITE_API_BASE_URL || ''
  return `${base}${API_PATHS.proxy}?url=${encodeURIComponent(url)}`
}
