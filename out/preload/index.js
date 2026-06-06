"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  closeWindow: () => electron.ipcRenderer.send("close-window"),
  minimizeWindow: () => electron.ipcRenderer.send("minimize-window"),
  generateTTS: (text, model, speed, pitch) => electron.ipcRenderer.invoke("generate-tts", { text, model, speed, pitch }),
  listModels: () => electron.ipcRenderer.invoke("list-models"),
  saveFile: (filePath) => electron.ipcRenderer.invoke("save-file", filePath)
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
