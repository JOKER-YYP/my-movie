const API = 'https://so.liumingye.cn'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

export type PanProvider = 'baidu' | 'quark' | 'uc' | 'xunlei' | string

export interface XiaGeBaSourceItem {
  id: string
  title: string
  menu?: string
  type?: PanProvider
  createdAt?: string
  description?: string
}

export interface PanSearchHit {
  id: string
  title: string
  panType: PanProvider
  menu: string
  createdAt?: string
  description?: string
  sourceKey: 'xiageba'
  sourceName: string
}

function panLabel(type?: string) {
  if (type === 'baidu') return '下歌吧·百度'
  if (type === 'quark') return '下歌吧·夸克'
  if (type === 'uc') return '下歌吧·UC'
  if (type === 'xunlei') return '下歌吧·迅雷'
  return '下歌吧·网盘'
}

export async function searchXiaGeBaSources(wd: string, page = 1, pageSize = 20): Promise<PanSearchHit[]> {
  const q = wd.trim()
  if (!q) return []
  const url =
    `${API}/api/source/search?q=${encodeURIComponent(q)}` +
    `&page=${page}&pageSize=${Math.min(50, Math.max(1, pageSize))}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  })
  if (!res.ok) throw new Error(`下歌吧搜索失败 HTTP ${res.status}`)
  const json = (await res.json()) as { data?: XiaGeBaSourceItem[] }
  const rows = Array.isArray(json.data) ? json.data : []
  return rows
    .filter((it) => it.id && it.title)
    .map((it) => ({
      id: String(it.id),
      title: String(it.title),
      panType: String(it.type || 'unknown'),
      menu: String(it.menu || ''),
      createdAt: it.createdAt,
      description: it.description,
      sourceKey: 'xiageba' as const,
      sourceName: panLabel(it.type),
    }))
}

export async function fetchXiaGeBaDetail(id: string) {
  const res = await fetch(`${API}/api/source/${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  })
  if (!res.ok) throw new Error(`下歌吧详情失败 HTTP ${res.status}`)
  const json = (await res.json()) as { data?: XiaGeBaSourceItem & { status?: string; cat?: string } }
  if (!json.data?.id) throw new Error('资源不存在')
  const it = json.data
  return {
    id: String(it.id),
    title: String(it.title || ''),
    panType: String(it.type || 'unknown'),
    menu: String(it.menu || ''),
    createdAt: it.createdAt,
    description: it.description || '',
    sourceKey: 'xiageba' as const,
    sourceName: panLabel(it.type),
  }
}

export async function fetchXiaGeBaShareUrl(id: string): Promise<string> {
  const res = await fetch(`${API}/api/source/geturl`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': UA,
    },
    body: JSON.stringify({ id }),
  })
  if (!res.ok) throw new Error(`获取网盘链接失败 HTTP ${res.status}`)
  const json = (await res.json()) as { url?: string; message?: string }
  const url = String(json.url || '').trim()
  if (!url) throw new Error(json.message || '未返回网盘分享链接')
  return url
}

/** 从 menu 文本解析可播视频文件名 */
export function parseVideoFilesFromMenu(menu: string): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  for (const raw of String(menu || '').split(/\r?\n/)) {
    const m = raw.match(/([^\/\\|:*?"<>\n]+?\.(mp4|m4v|mkv|webm|mov|ts|avi|flv))\s*$/i)
    if (!m) continue
    const name = m[1].trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    names.push(name)
  }
  return names
}
