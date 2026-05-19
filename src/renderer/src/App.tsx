import React, { useState, useEffect } from 'react'
import VoiceCard from './components/VoiceCard'
import ControlSlider from './components/ControlSlider'

interface VoicePreset {
  id: string;
  name: string;
  alias: string;
  color: string;
  desc: string;
  bg: string;
}

const CONV_ID = '14ca4ce4-818c-4968-892f-7940a487bab8';
const BASE_IMG = `media:///C:/Users/utkar/.gemini/antigravity/brain/${CONV_ID}`;

const PRESETS: VoicePreset[] = [
  { id: 'teto', name: 'Kasane Teto', alias: '重音テト', color: '#ff2e63', desc: 'Powerful Vocals', bg: `${BASE_IMG}/teto_background_ui_1778702866956.png` },
  { id: 'defoko', name: 'Uta Utane', alias: '唄音ウタ', color: '#a084ff', desc: 'Digital Soul', bg: `${BASE_IMG}/defoko_portrait_1778703452191.png` },
  { id: 'momo', name: 'Momone Momo', alias: '桃音モモ', color: '#ff84a0', desc: 'Sweet Peaches', bg: `${BASE_IMG}/momo_portrait_1778703473690.png` },
  { id: 'mako', name: 'Mako Nagone', alias: '和音マコ', color: '#888888', desc: 'Sharp Slate', bg: `${BASE_IMG}/mako_portrait_1778703493905.png` },
  { id: 'luna', name: 'Amane Luna', alias: '天音ルナ', color: '#ffeb3b', desc: 'Sunlight Breath', bg: `${BASE_IMG}/luna_portrait_1778703514467.png` },
  { id: 'koe', name: 'Koe Utane', alias: '唄音コエ', color: '#d1a0ff', desc: 'Soft Echo', bg: `${BASE_IMG}/koe_portrait_1778703536389.png` },
  { id: 'taya', name: 'Taya Soune', alias: '蒼音タヤ', color: '#00d2ff', desc: 'Deep Ocean', bg: `${BASE_IMG}/taya_portrait_1778703555834.png` },
];

const App: React.FC = () => {
  const [text, setText] = useState<string>('')
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [rawAudioPath, setRawAudioPath] = useState<string | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [activePreset, setActivePreset] = useState<VoicePreset>(PRESETS[0])
  const [speed, setSpeed] = useState<number>(1.0)
  const [pitch, setPitch] = useState<number>(1.0)

  useEffect(() => {
    window.api.listModels().then(setModels)
  }, [])

  const handleGenerate = async (): Promise<void> => {
    if (!text.trim()) return
    setIsSynthesizing(true)
    setAudioUrl(null)
    try {
      const modelName = models.find(m => m.toLowerCase().includes(activePreset.id)) || models[0]
      const audioPath = await window.api.generateTTS(text, modelName, speed, pitch)
      setRawAudioPath(audioPath)
      setAudioUrl(`media:///${audioPath.replace(/\\/g, '/')}?t=${Date.now()}`)
    } catch (error) {
      console.error(error)
      alert('Synthesis failed.')
    } finally {
      setIsSynthesizing(false)
    }
  }

  return (
    <div className="app-container" style={{ '--accent-red': activePreset.color } as any}>
      <img src={activePreset.bg} className="bg-image" alt="Background" />
      <div className="bg-overlay"></div>

      <aside className="sidebar">
        <div className="side-btn active">🏠</div>
        <div className="side-btn">📁</div>
        <div className="side-btn">⚙️</div>
      </aside>

      <main className="main-wrapper">
        <header className="header">
          <div className="title-section">
            <p>{activePreset.desc}</p>
            <h2>{activePreset.name}</h2>
          </div>
          <div className="win-controls">
            <button onClick={() => window.api.minimizeWindow()} className="win-btn">─</button>
            <button onClick={() => window.api.closeWindow()} className="win-btn">✕</button>
          </div>
        </header>

        <div className="voice-selector-row">
          {PRESETS.map(p => (
            <VoiceCard 
              key={p.id} 
              {...p} 
              isActive={activePreset.id === p.id} 
              onClick={() => setActivePreset(p)} 
            />
          ))}
        </div>

        <div className="bottom-ui">
          <div className="glass-card input-panel">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Speak via ${activePreset.name}...`}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
               <button onClick={handleGenerate} disabled={isSynthesizing} className="generate-btn">
                {isSynthesizing ? 'Processing...' : 'Run Synthesis'} ➜
              </button>
            </div>
          </div>

          <div className="settings-grid">
            <ControlSlider label="Speed" value={speed} min={0.5} max={2.0} step={0.1} unit="x" onChange={setSpeed} />
            <ControlSlider label="Pitch" value={pitch} min={0.5} max={2.0} step={0.1} unit="x" dark onChange={setPitch} />
          </div>
        </div>

        {audioUrl && (
          <div className="glass-card audio-card">
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <audio controls src={audioUrl} autoPlay style={{ flex: 1 }}></audio>
              <button className="generate-btn" style={{ padding: '10px 20px' }} onClick={() => window.api.saveFile(rawAudioPath!)}>Save .wav</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
