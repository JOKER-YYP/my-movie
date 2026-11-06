import { app, BrowserWindow, ipcMain, protocol, shell } from 'electron'
import { join } from 'path'
import {
  hasQuarkLogin,
  openQuarkLoginWindow,
  ensureQuarkLogin,
  logoutQuark,
  resolveQuarkShareDownload,
  downloadWithQuarkSession,
} from './quarkPan'
import {
  hasBaiduLogin,
  openBaiduLoginWindow,
  ensureBaiduLogin,
  logoutBaidu,
  resolveBaiduShareDownload,
  downloadWithBaiduSession,
} from './baiduPan'
import { registerPanStreamProtocol, registerPanStreamToken, toPanStreamUrl } from './streamProxy'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'mm-stream',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
      corsEnabled: true,
    },
  },
])

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#0b0d12',
    title: 'my-movie',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const win = mainWindow
  win.on('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function detectPanKind(shareUrl: string): 'quark' | 'baidu' {
  if (/pan\.quark\.cn/i.test(shareUrl)) return 'quark'
  if (/pan\.baidu\.com/i.test(shareUrl)) return 'baidu'
  throw new Error('仅支持夸克/百度分享链接')
}

app.whenReady().then(() => {
  registerPanStreamProtocol()
  createWindow()

  ipcMain.handle('quark:hasLogin', () => hasQuarkLogin())
  ipcMain.handle('quark:openLogin', () => openQuarkLoginWindow(mainWindow))
  ipcMain.handle('quark:ensureLogin', () => ensureQuarkLogin(mainWindow))
  ipcMain.handle('quark:logout', () => logoutQuark())
  ipcMain.handle('quark:resolveShare', async (_e, shareUrl: string, preferName?: string) => {
    return resolveQuarkShareDownload(String(shareUrl || ''), mainWindow, preferName)
  })
  ipcMain.handle(
    'quark:downloadFile',
    async (_e, payload: { url: string; destPath: string }) => {
      await downloadWithQuarkSession(String(payload?.url || ''), String(payload?.destPath || ''))
      return { ok: true as const, path: payload.destPath }
    },
  )

  ipcMain.handle('baidu:hasLogin', () => hasBaiduLogin())
  ipcMain.handle('baidu:openLogin', () => openBaiduLoginWindow(mainWindow))
  ipcMain.handle('baidu:ensureLogin', () => ensureBaiduLogin(mainWindow))
  ipcMain.handle('baidu:logout', () => logoutBaidu())
  ipcMain.handle('baidu:resolveShare', async (_e, shareUrl: string, preferName?: string) => {
    return resolveBaiduShareDownload(String(shareUrl || ''), mainWindow, preferName)
  })
  ipcMain.handle(
    'baidu:downloadFile',
    async (_e, payload: { url: string; destPath: string }) => {
      await downloadWithBaiduSession(String(payload?.url || ''), String(payload?.destPath || ''))
      return { ok: true as const, path: payload.destPath }
    },
  )

  /** 分享链接 → 流式播放地址（边下边播） */
  ipcMain.handle(
    'pan:resolvePlay',
    async (_e, payload: { shareUrl: string; preferName?: string }) => {
      const shareUrl = String(payload?.shareUrl || '').trim()
      const preferName = payload?.preferName ? String(payload.preferName) : undefined
      if (!shareUrl) throw new Error('缺少分享链接')
      const kind = detectPanKind(shareUrl)
      const resolved =
        kind === 'quark'
          ? await resolveQuarkShareDownload(shareUrl, mainWindow, preferName)
          : await resolveBaiduShareDownload(shareUrl, mainWindow, preferName)
      const token = registerPanStreamToken({
        kind,
        url: resolved.url,
        fileName: resolved.fileName,
      })
      return {
        kind,
        fileName: resolved.fileName,
        playUrl: toPanStreamUrl(token),
        directUrl: resolved.url,
      }
    },
  )

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
