const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')

function createWindow() {
  const win = new BrowserWindow({
    width: 1250,
    height: 850,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    autoHideMenuBar: true
  })

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// UTAU/Vocaloid Voice Changer IPC Handlers
async function synthesize(text, vbPath, speed, pitch, notes, base_freq) {
  const outPath = path.join(app.getPath('temp'), `synthesis_${Date.now()}_${Math.floor(Math.random()*1000)}.wav`);
  const dataPath = path.join(app.getPath('temp'), `data_${Date.now()}_${Math.floor(Math.random()*1000)}.json`);
  const pyScript = path.resolve(__dirname, 'synthesis.py');
  
  const payload = { text, vb_path: vbPath, out_path: outPath, speed, pitch };
  if (notes) payload.notes = notes;
  if (base_freq) payload.base_freq = base_freq;
  
  fs.writeFileSync(dataPath, JSON.stringify(payload));
  
  return new Promise((res, rej) => {
    exec(`python "${pyScript}" "${dataPath}"`, (err, stdout, stderr) => {
      try { if (fs.existsSync(dataPath)) fs.unlinkSync(dataPath); } catch(e){}
      if (err) {
        console.error(`Python Error: ${stderr}`);
        rej(err);
      } else {
        res(outPath);
      }
    });
  });
}

let customVocaloidFolder = '';

ipcMain.handle('set-vocaloid-folder', async (_, folderPath) => {
  customVocaloidFolder = folderPath;
  return true;
});

ipcMain.handle('select-vocaloid-folder', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select UTAU/Vocaloid Voicebanks Directory'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    customVocaloidFolder = result.filePaths[0];
    return customVocaloidFolder;
  }
  return null;
});

ipcMain.handle('generate-tts', async (_, { text, model, speed, pitch, notes, base_freq }) => {
  const searchDir = customVocaloidFolder || __dirname;
  let vbPath = path.resolve(searchDir, model);
  const subs = ['重音テト音声ライブラリー/重音テト英語音源', '重音テト音声ライブラリー/重音テト単独音'];
  for (const s of subs) {
    const p = path.resolve(vbPath, s);
    if (fs.existsSync(p)) { vbPath = p; break; }
  }
  return await synthesize(text, vbPath, speed, pitch, notes, base_freq);
});

ipcMain.handle('list-models', async () => {
  const searchDir = customVocaloidFolder || __dirname;
  try {
    return fs.readdirSync(searchDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules' && d.name !== 'src' && d.name !== 'out' && d.name !== 'dist' && d.name !== '.git' && d.name !== '.gemini')
      .map(d => d.name);
  } catch (err) {
    console.error(err);
    return [];
  }
});

ipcMain.handle('save-file', async (_event, filePath) => {
  const { filePath: savePath } = await dialog.showSaveDialog({
    defaultPath: 'vocaloid_voice.wav',
    filters: [{ name: 'Audio', extensions: ['wav'] }]
  })
  if (savePath) {
    fs.copyFileSync(filePath, savePath)
    return true
  }
  return false
})

