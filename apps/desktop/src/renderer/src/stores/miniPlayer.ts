import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { VodEpisode } from '@my-movie/shared'

export type MiniPlayerSession = {
  sourceKey: string
  vodId: string
  sourceName: string
  title: string
  cover?: string
  lineIndex: number
  episodeIndex: number
  episodes: VodEpisode[]
  url: string
  positionSec: number
  useProxy: boolean
}

export const useMiniPlayerStore = defineStore('miniPlayer', () => {
  const session = ref<MiniPlayerSession | null>(null)
  const active = computed(() => Boolean(session.value?.url))

  /** 窗口位置（相对视口右下角偏移，便于拖动记忆） */
  const offset = ref({ x: 24, y: 24 })

  function open(next: MiniPlayerSession) {
    session.value = {
      ...next,
      positionSec: Math.max(0, Math.floor(next.positionSec || 0)),
      episodes: next.episodes.map((ep, index) => ({
        name: ep.name,
        url: ep.url,
        index: ep.index ?? index,
      })),
    }
  }

  function updatePosition(sec: number) {
    if (!session.value) return
    session.value = {
      ...session.value,
      positionSec: Math.max(0, Math.floor(sec || 0)),
    }
  }

  function setProxy(useProxy: boolean) {
    if (!session.value) return
    session.value = { ...session.value, useProxy }
  }

  function playEpisode(index: number) {
    if (!session.value) return false
    const eps = session.value.episodes
    if (!eps.length) return false
    const clamped = Math.min(Math.max(0, index), eps.length - 1)
    const ep = eps[clamped]
    if (!ep?.url) return false
    session.value = {
      ...session.value,
      episodeIndex: clamped,
      url: ep.url,
      positionSec: 0,
    }
    return true
  }

  function playNext() {
    if (!session.value) return false
    return playEpisode(session.value.episodeIndex + 1)
  }

  function close() {
    session.value = null
  }

  function setOffset(x: number, y: number) {
    offset.value = {
      x: Math.max(8, x),
      y: Math.max(8, y),
    }
  }

  return {
    session,
    active,
    offset,
    open,
    updatePosition,
    setProxy,
    playEpisode,
    playNext,
    close,
    setOffset,
  }
})
