/** 归一化标题，便于同名聚合 / 换源匹配 */
export function normalizeTitle(title: string): string {
  return String(title || '')
    .toLowerCase()
    .replace(/[\s\-_.·•|丨／/\\【】\[\]（）()「」『』《》<>《》]/g, '')
    .replace(/(第?\d+集|更新至.*|更至.*|全\d+集|完结|高清|超清|蓝光|4k|1080p|720p)/gi, '')
    .trim()
}

export function isSameTitle(a: string, b: string): boolean {
  const na = normalizeTitle(a)
  const nb = normalizeTitle(b)
  if (!na || !nb) return false
  return na === nb || na.includes(nb) || nb.includes(na)
}
