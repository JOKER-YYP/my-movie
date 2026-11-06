/** 自建 BFF 路径约定 */
export const API_PATHS = {
  health: '/api/health',
  authRegister: '/api/auth/register',
  authLogin: '/api/auth/login',
  authRefresh: '/api/auth/refresh',
  vodSources: '/api/vod/sources',
  vodSearch: '/api/vod/search',
  vodDetail: '/api/vod/detail',
  proxy: '/api/proxy',
  progress: '/api/progress',
  history: '/api/history',
  favorites: '/api/favorites',
  panSearch: '/api/pan/search',
  panDetail: '/api/pan/detail',
  panShareUrl: '/api/pan/share-url',
} as const

export type ApiPath = (typeof API_PATHS)[keyof typeof API_PATHS]
