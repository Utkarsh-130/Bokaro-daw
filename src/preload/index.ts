import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  closeWindow: () => ipcRenderer.send('close-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  generateTTS: (text: string, model: string, speed: number, pitch: number) => ipcRenderer.invoke('generate-tts', { text, model, speed, pitch }),
  listModels: () => ipcRenderer.invoke('list-models'),
  saveFile: (filePath: string) => ipcRenderer.invoke('save-file', filePath)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
