import fs from 'fs'
import { join, resolve } from 'path'
import { exec } from 'child_process'
import { ipcMain, app } from 'electron'

async function synthesize(text: string, vbPath: string, speed: number, pitch: number): Promise<string> {
    const outPath = join(app.getPath('temp'), `synthesis_${Date.now()}.wav`);
    const dataPath = join(app.getPath('temp'), `data_${Date.now()}.json`);
    const pyScript = resolve(process.cwd(), 'synthesis.py');
    fs.writeFileSync(dataPath, JSON.stringify({ text, vb_path: vbPath, out_path: outPath, speed, pitch }));
    return new Promise((res, rej) => {
        exec(`python "${pyScript}" "${dataPath}"`, (err, stdout, stderr) => {
            if (err) {
                console.error(`Python Error: ${stderr}`);
                rej(err);
            } else res(outPath);
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

ipcMain.handle('generate-tts', async (_, { text, model, speed, pitch }) => {
    const searchDir = customVocaloidFolder || process.cwd();
    let vbPath = resolve(searchDir, model);
    const subs = ['重音テト音声ライブラリー/重音テト英語音源', '重音テト音声ライブラリー/重音テト単独音'];
    for (const s of subs) {
        const p = resolve(vbPath, s);
        if (fs.existsSync(p)) { vbPath = p; break; }
    }
    return await synthesize(text, vbPath, speed, pitch);
});

ipcMain.handle('list-models', async () => {
    const searchDir = customVocaloidFolder || process.cwd();
    return fs.readdirSync(searchDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules' && d.name !== 'src' && d.name !== 'out')
        .map(d => d.name);
});
