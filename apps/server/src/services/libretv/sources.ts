import type { VodSource } from '@my-movie/shared'

/**
 * 对齐 https://libretv.liumingye.cn/js/config.js 的 API_SITES
 * 成人测试源默认不启用
 */
export const LIBRETV_SOURCES: VodSource[] = [
  {
    key: 'dyttzy',
    name: '电影天堂资源',
    api: 'http://caiji.dyttzyapi.com/api.php/provide/vod',
    detail: 'http://caiji.dyttzyapi.com',
  },
  {
    key: 'ruyi',
    name: '如意资源',
    api: 'https://cj.rycjapi.com/api.php/provide/vod',
  },
  {
    key: 'bfzy',
    name: '暴风资源',
    api: 'https://bfzyapi.com/api.php/provide/vod',
  },
  {
    key: 'tyyszy',
    name: '天涯资源',
    api: 'https://tyyszy.com/api.php/provide/vod',
  },
  {
    key: 'ffzy',
    name: '非凡影视',
    api: 'http://ffzy5.tv/api.php/provide/vod',
    detail: 'http://ffzy5.tv',
  },
  {
    key: 'heimuer',
    name: '黑木耳',
    api: 'https://json.heimuer.xyz/api.php/provide/vod',
    detail: 'https://heimuer.tv',
  },
  {
    key: 'zy360',
    name: '360资源',
    api: 'https://360zy.com/api.php/provide/vod',
  },
  {
    key: 'iqiyi',
    name: 'iqiyi资源',
    api: 'https://www.iqiyizyapi.com/api.php/provide/vod',
  },
  {
    key: 'wolong',
    name: '卧龙资源',
    api: 'https://wolongzyw.com/api.php/provide/vod',
  },
  {
    key: 'jisu',
    name: '极速资源',
    api: 'https://jszyapi.com/api.php/provide/vod',
    detail: 'https://jszyapi.com',
  },
  {
    key: 'dbzy',
    name: '豆瓣资源',
    api: 'https://dbzy.tv/api.php/provide/vod',
  },
  {
    key: 'mozhua',
    name: '魔爪资源',
    api: 'https://mozhuazy.com/api.php/provide/vod',
  },
  {
    key: 'mdzy',
    name: '魔都资源',
    api: 'https://www.mdzyapi.com/api.php/provide/vod',
  },
  {
    key: 'zuid',
    name: '最大资源',
    api: 'https://api.zuidapi.com/api.php/provide/vod',
  },
  {
    key: 'yinghua',
    name: '樱花资源',
    api: 'https://m3u8.apiyhzy.com/api.php/provide/vod',
  },
  {
    key: 'baidu',
    name: '百度云资源',
    api: 'https://api.apibdzy.com/api.php/provide/vod',
  },
  {
    key: 'wujin',
    name: '无尽资源',
    api: 'https://api.wujinapi.me/api.php/provide/vod',
  },
  {
    key: 'wwzy',
    name: '旺旺短剧',
    api: 'https://wwzy.tv/api.php/provide/vod',
  },
  {
    key: 'ikun',
    name: 'iKun资源',
    api: 'https://ikunzyapi.com/api.php/provide/vod',
  },
  {
    key: 'lzi',
    name: '量子资源站',
    api: 'https://cj.lziapi.com/api.php/provide/vod',
  },
]

const sourceMap = new Map(LIBRETV_SOURCES.map((s) => [s.key, s]))

export function listSources(includeAdult = false): VodSource[] {
  return LIBRETV_SOURCES.filter((s) => includeAdult || !s.adult)
}

export function getSource(key: string): VodSource | undefined {
  return sourceMap.get(key)
}

export function normalizeApiBase(api: string): string {
  return api.replace(/\/+$/, '')
}
