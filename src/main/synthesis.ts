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

ipcMain.handle('generate-tts', async (_, { text, model, speed, pitch }) => {
    let vbPath = resolve(process.cwd(), model);
    const subs = ['重音テト音声ライブラリー/重音テト英語音源', '重音テト音声ライブラリー/重音テト単独音'];
    for (const s of subs) {
        const p = resolve(vbPath, s);
        if (fs.existsSync(p)) { vbPath = p; break; }
    }
    return await synthesize(text, vbPath, speed, pitch);
});

ipcMain.handle('list-models', async () => {
    return fs.readdirSync(process.cwd(), { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules' && d.name !== 'src' && d.name !== 'out')
        .map(d => d.name);
});
