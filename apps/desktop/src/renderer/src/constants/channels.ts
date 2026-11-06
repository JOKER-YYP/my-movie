export interface ChannelDef {
  key: string
  label: string
  query: string
  blurb: string
}

export const CHANNELS: ChannelDef[] = [
  { key: 'movie', label: '电影', query: '电影', blurb: '院线热片与高分佳作' },
  { key: 'tv', label: '电视剧', query: '电视剧', blurb: '连载剧集一口气追完' },
  { key: 'variety', label: '综艺', query: '综艺', blurb: '真人秀与晚会精选' },
  { key: 'anime', label: '动漫', query: '动漫', blurb: '新番与经典动画' },
  { key: 'kids', label: '少儿', query: '少儿', blurb: '亲子向内容' },
]

export function channelByKey(key: string) {
  return CHANNELS.find((c) => c.key === key)
}
