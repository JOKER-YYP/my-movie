import { API_PATHS, type WatchProgressPayload } from '@my-movie/shared'
import { apiGet, apiPut } from '@/api/http'

const LOCAL_KEY = 'my-movie:progress'

export interface ProgressRecord extends WatchProgressPayload {
  updatedAt: number
  lineIndex?: number
}

type LocalMap = Record<string, ProgressRecord>

function keyOf(sourceKey: string, vodId: string) {
  return `${sourceKey}::${vodId}`
}

function readLocal(): LocalMap {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') as LocalMap
  } catch {
    return {}
  }
}

function writeLocal(map: LocalMap) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(map))
}

export function saveLocalProgress(record: ProgressRecord) {
  const map = readLocal()
  map[keyOf(record.sourceKey, record.vodId)] = { ...record, updatedAt: Date.now() }
  writeLocal(map)
}

export function getLocalProgress(sourceKey: string, vodId: string): ProgressRecord | null {
  return readLocal()[keyOf(sourceKey, vodId)] || null
}

export function listLocalProgress(limit = 20): ProgressRecord[] {
  return Object.values(readLocal())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit)
}

export async function fetchProgress(
  sourceKey: string,
  vodId: string,
  token?: string,
): Promise<ProgressRecord | null> {
  if (token) {
    try {
      const row = await apiGet<{
        sourceKey: string
        vodId: string
        episodeIndex: number
        positionSec: number
        durationSec: number
        title: string
        cover?: string | null
        updatedAt: string
      } | null>(API_PATHS.progress, { sourceKey, vodId })
      if (row) {
        return {
          sourceKey: row.sourceKey,
          vodId: row.vodId,
          episodeIndex: row.episodeIndex,
          positionSec: row.positionSec,
          durationSec: row.durationSec,
          title: row.title,
          cover: row.cover || undefined,
          updatedAt: new Date(row.updatedAt).getTime(),
        }
      }
    } catch {
      // fall through to local
    }
  }
  return getLocalProgress(sourceKey, vodId)
}

export async function reportProgress(payload: ProgressRecord, token?: string) {
  saveLocalProgress(payload)
  if (!token) return
  try {
    await apiPut(API_PATHS.progress, {
      sourceKey: payload.sourceKey,
      vodId: payload.vodId,
      episodeIndex: payload.episodeIndex,
      positionSec: payload.positionSec,
      durationSec: payload.durationSec,
      title: payload.title,
      cover: payload.cover,
    })
  } catch {
    // keep local
  }
}

export async function listHistory(token?: string, limit = 18): Promise<ProgressRecord[]> {
  if (token) {
    try {
      const rows = await apiGet<
        Array<{
          sourceKey: string
          vodId: string
          episodeIndex: number
          positionSec: number
          durationSec: number
          title: string
          cover?: string | null
          updatedAt: string
        }>
      >(API_PATHS.history)
      return rows.slice(0, limit).map((row) => ({
        sourceKey: row.sourceKey,
        vodId: row.vodId,
        episodeIndex: row.episodeIndex,
        positionSec: row.positionSec,
        durationSec: row.durationSec,
        title: row.title,
        cover: row.cover || undefined,
        updatedAt: new Date(row.updatedAt).getTime(),
      }))
    } catch {
      // fall through
    }
  }
  return listLocalProgress(limit)
}

export function formatProgress(positionSec: number, durationSec: number) {
  if (!durationSec || durationSec <= 0) return '已观看'
  const pct = Math.min(99, Math.max(1, Math.round((positionSec / durationSec) * 100)))
  return `看到 ${pct}%`
}
