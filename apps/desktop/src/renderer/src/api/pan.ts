import { API_PATHS, type PanDetail, type PanSearchItem } from '@my-movie/shared'
import { apiGet, apiPost } from './http'

export function searchPan(q: string, page = 1) {
  return apiGet<{ list: PanSearchItem[] }>(API_PATHS.panSearch, { q, page, pageSize: 24 })
}

export function fetchPanDetail(id: string) {
  return apiGet<PanDetail>(API_PATHS.panDetail, { id })
}

export function fetchPanShareUrl(id: string) {
  return apiPost<{ url: string }>(API_PATHS.panShareUrl, { id })
}
