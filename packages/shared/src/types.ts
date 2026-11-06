/** 采集站配置（对齐 LibreTV API_SITES） */
export interface VodSource {
  key: string
  name: string
  api: string
  detail?: string
  adult?: boolean
}

export interface VodSearchItem {
  vodId: string
  sourceKey: string
  sourceName: string
  title: string
  cover: string
  remarks?: string
  typeName?: string
  year?: string
  area?: string
  actor?: string
  director?: string
}

export interface VodEpisode {
  name: string
  url: string
  index: number
}

export interface VodPlayLine {
  name: string
  episodes: VodEpisode[]
}

export interface VodDetail {
  vodId: string
  sourceKey: string
  sourceName: string
  title: string
  cover: string
  typeName?: string
  year?: string
  area?: string
  actor?: string
  director?: string
  content?: string
  remarks?: string
  lines: VodPlayLine[]
}

export interface SearchFailure {
  sourceKey: string
  sourceName: string
  error: string
  timedOut?: boolean
}

export interface SearchResponse {
  list: VodSearchItem[]
  failures: SearchFailure[]
}

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface WatchProgressPayload {
  sourceKey: string
  vodId: string
  episodeIndex: number
  positionSec: number
  durationSec: number
  title: string
  cover?: string
}

export interface FavoritePayload {
  sourceKey: string
  vodId: string
  title: string
  cover?: string
}
