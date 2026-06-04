"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const utils = require("@electron-toolkit/utils");
const child_process = require("child_process");
async function synthesize(text, vbPath, speed, pitch) {
  const outPath = path.join(electron.app.getPath("temp"), `synthesis_${Date.now()}.wav`);
  const dataPath = path.join(electron.app.getPath("temp"), `data_${Date.now()}.json`);
  const pyScript = path.resolve(process.cwd(), "synthesis.py");
  fs.writeFileSync(dataPath, JSON.stringify({ text, vb_path: vbPath, out_path: outPath, speed, pitch }));
  return new Promise((res, rej) => {
    child_process.exec(`python "${pyScript}" "${dataPath}"`, (err, stdout, stderr) => {
      if (err) {
        console.error(`Python Error: ${stderr}`);
        rej(err);
      } else res(outPath);
    });
  });
}
electron.ipcMain.handle("generate-tts", async (_, { text, model, speed, pitch }) => {
  let vbPath = path.resolve(process.cwd(), model);
  const subs = ["重音テト音声ライブラリー/重音テト英語音源", "重音テト音声ライブラリー/重音テト単独音"];
  for (const s of subs) {
    const p = path.resolve(vbPath, s);
    if (fs.existsSync(p)) {
      vbPath = p;
      break;
    }
  }
  return await synthesize(text, vbPath, speed, pitch);
});
electron.ipcMain.handle("list-models", async () => {
  return fs.readdirSync(process.cwd(), { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "node_modules" && d.name !== "src" && d.name !== "out").map((d) => d.name);
});
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1e3,
    height: 700,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });
  mainWindow.on("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.electron.vocaloid-tts");
  electron.protocol.handle("media", (request) => {
    try {
      const url = new URL(request.url);
      let filePath = decodeURIComponent(url.pathname);
      if (process.platform === "win32" && filePath.startsWith("/")) {
        filePath = filePath.slice(1);
      }
      console.log(`[Protocol] Requesting: ${filePath}`);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath);
        const ext = filePath.split(".").pop()?.toLowerCase();
        const mime = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "audio/wav";
        return new Response(data, {
          headers: { "Content-Type": mime }
        });
      } else {
        console.error(`[Protocol] File not found: ${filePath}`);
        return new Response("Not Found", { status: 404 });
      }
    } catch (error) {
      console.error("[Protocol] Error:", error);
      return new Response("Error", { status: 500 });
    }
  });
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
electron.ipcMain.on("close-window", () => electron.app.quit());
electron.ipcMain.on("minimize-window", (event) => {
  const win = electron.BrowserWindow.fromWebContents(event.sender);
  win?.minimize();
});
electron.ipcMain.handle("save-file", async (_event, filePath) => {
  const { dialog } = require("electron");
  const { filePath: savePath } = await dialog.showSaveDialog({
    defaultPath: "teto_voice.wav",
    filters: [{ name: "Audio", extensions: ["wav"] }]
  });
  if (savePath) {
    fs.copyFileSync(filePath, savePath);
    return true;
  }
  return false;
});
