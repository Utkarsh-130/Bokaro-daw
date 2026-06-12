import { app, shell, BrowserWindow, ipcMain, protocol, net } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { pathToFileURL } from 'url'
import './synthesis'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron.vocaloid-tts')

  protocol.handle('media', (request) => {
    try {
      const url = new URL(request.url)
      let filePath = decodeURIComponent(url.pathname)
      // On Windows, the pathname starts with /C:/..., we need to remove the leading /
      if (process.platform === 'win32' && filePath.startsWith('/')) {
        filePath = filePath.slice(1)
      }
      
      console.log(`[Protocol] Requesting: ${filePath}`)
      
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath)
        const ext = filePath.split('.').pop()?.toLowerCase()
        const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'audio/wav'
        return new Response(data, {
          headers: { 'Content-Type': mime }
        })
      } else {
        console.error(`[Protocol] File not found: ${filePath}`)
        return new Response('Not Found', { status: 404 })
      }
    } catch (error) {
      console.error('[Protocol] Error:', error)
      return new Response('Error', { status: 500 })
    }
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.close()
})
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.minimize()
})
ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
})
ipcMain.handle('window-is-maximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  return win ? win.isMaximized() : false
})

ipcMain.handle('save-file', async (_event, filePath: string) => {
  const { dialog } = require('electron')
  const { filePath: savePath } = await dialog.showSaveDialog({
    defaultPath: 'teto_voice.wav',
    filters: [{ name: 'Audio', extensions: ['wav'] }]
  })
  if (savePath) {
    fs.copyFileSync(filePath, savePath)
    return true
  }
  return false
})

let lastCpuTime = process.getCPUUsage()
ipcMain.handle('get-cpu-usage', () => {
  const os = require('os')
  const current = process.getCPUUsage()
  const percent = current.percentCPUUsage
  return percent / os.cpus().length
})

let vstHost: any = null;
try {
  const addonPath = join(__dirname, '../../juce_host/build/Release/addon.node');
  const addon = require(addonPath);
  vstHost = new addon.VstHost();
} catch (e) {
  console.log('VST Addon not built yet', e);
}

ipcMain.handle('load-vst', async (_, vstPath) => {
  if (vstHost) return vstHost.loadPlugin(vstPath);
  return false;
});

ipcMain.handle('load-vst-effect', async (_, vstPath) => {
  if (vstHost) return vstHost.loadEffect(vstPath);
  return false;
});

ipcMain.handle('select-vst-file', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'VST3 Plugins', extensions: ['vst3'] }],
    title: 'Select VST3 Plugin'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-css-file', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'CSS Stylesheets', extensions: ['css'] }],
    title: 'Select Custom CSS'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});
