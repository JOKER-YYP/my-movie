import { contextBridge, ipcRenderer } from 'electron'

const api = {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },

  quarkHasLogin: () => ipcRenderer.invoke('quark:hasLogin') as Promise<boolean>,
  quarkOpenLogin: () => ipcRenderer.invoke('quark:openLogin') as Promise<boolean>,
  quarkEnsureLogin: () => ipcRenderer.invoke('quark:ensureLogin') as Promise<boolean>,
  quarkLogout: () => ipcRenderer.invoke('quark:logout') as Promise<boolean>,
  quarkResolveShare: (shareUrl: string, preferName?: string) =>
    ipcRenderer.invoke('quark:resolveShare', shareUrl, preferName) as Promise<{
      url: string
      fileName: string
    }>,

  baiduHasLogin: () => ipcRenderer.invoke('baidu:hasLogin') as Promise<boolean>,
  baiduOpenLogin: () => ipcRenderer.invoke('baidu:openLogin') as Promise<boolean>,
  baiduEnsureLogin: () => ipcRenderer.invoke('baidu:ensureLogin') as Promise<boolean>,
  baiduLogout: () => ipcRenderer.invoke('baidu:logout') as Promise<boolean>,
  baiduResolveShare: (shareUrl: string, preferName?: string) =>
    ipcRenderer.invoke('baidu:resolveShare', shareUrl, preferName) as Promise<{
      url: string
      fileName: string
    }>,

  panResolvePlay: (payload: { shareUrl: string; preferName?: string }) =>
    ipcRenderer.invoke('pan:resolvePlay', payload) as Promise<{
      kind: 'quark' | 'baidu'
      fileName: string
      playUrl: string
      directUrl: string
    }>,
}

contextBridge.exposeInMainWorld('myMovie', api)

export type MyMovieAPI = typeof api
