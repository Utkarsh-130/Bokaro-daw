import React from 'react'
import Knob from './Knob.tsx'

interface InstrumentPanelProps {
  trackType: string
  synthInstrument: string
  setSynthInstrument: (val: string) => void
  projectKey: number
  onPlayPianoKey: (noteName: string, oct: number, semis: number) => void
  onPlayDrumPad: (type: string) => void
  onPlayChordPad: (chord: string, idx: number) => void
  isRecordingVocal: boolean
  onToggleVocalRecord: () => void
  isMicAllowed: boolean
  onAllowMic: () => void
  audioInputs?: MediaDeviceInfo[]
  audioOutputs?: MediaDeviceInfo[]
  selectedInputId?: string
  setSelectedInputId?: (val: string) => void
  selectedOutputId?: string
  setSelectedOutputId?: (val: string) => void
  activeTrackId?: string
  midiEvents?: any[]
  setTrackAudioUrls?: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setMidiEvents?: React.Dispatch<React.SetStateAction<any[]>>
  vocaloidFolder?: string
}

export default function InstrumentPanel({
  trackType,
  synthInstrument,
  setSynthInstrument,
  projectKey,
  onPlayPianoKey,
  onPlayDrumPad,
  onPlayChordPad,
  isRecordingVocal,
  onToggleVocalRecord,
  isMicAllowed,
  onAllowMic,
  audioInputs = [],
  audioOutputs = [],
  selectedInputId = '',
  setSelectedInputId,
  selectedOutputId = '',
  setSelectedOutputId,
  activeTrackId,
  midiEvents = [],
  setTrackAudioUrls,
  setMidiEvents,
  vocaloidFolder
}: InstrumentPanelProps) {
  if (trackType === 'audio') {
    return (
      <div className="panel-view" id="view-audio" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontSize: '13px', fontWeight: 700 }}>
          <i className="bx bx-microphone" /> Vocals
        </div>

        <div style={{ display: 'flex', gap: '15px', width: '100%', flexGrow: 1, alignItems: 'stretch' }}>
          <div className="pitch-shift-card" style={{ 
            width: '110px', 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid rgba(255,255,255,0.08)', 
            borderRadius: '8px', 
            padding: '12px 10px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '12px',
            flexShrink: 0
          }}>
            <button 
              onClick={onAllowMic}
              style={{
                width: '90px',
                height: '56px',
                background: isMicAllowed ? '#00d28f' : '#222',
                color: isMicAllowed ? 'black' : 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '9px',
                fontWeight: 700,
                lineHeight: '1.3',
                cursor: 'pointer',
                textAlign: 'center',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isMicAllowed ? '0 0 10px rgba(0,210,143,0.3)' : 'none'
              }}
            >
              {isMicAllowed ? (
                <span>Mic Ready!<br/>Click Red<br/>Record Button<br/>In Top Bar</span>
              ) : (
                <span>Enable<br/>Microphone</span>
              )}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%' }}>
              <span style={{ fontSize: '8px', fontWeight: 700, color: '#556', letterSpacing: '0.8px' }}>PITCH SHIFT</span>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #3a3a4a, #111)', border: '2px solid #3a3a4a', position: 'relative', cursor: 'pointer' }}>
                <div style={{ width: '4px', height: '4px', background: '#00d28f', borderRadius: '50%', position: 'absolute', top: '4px', left: '17px', boxShadow: '0 0 4px #00d28f' }} />
              </div>
              <span style={{ fontSize: '9px', color: '#556', fontWeight: 600 }}>0 st</span>
            </div>
          </div>

          <div style={{ flexGrow: 1, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: '8px', fontWeight: 700, color: '#556', letterSpacing: '0.8px' }}>RECORDING WAVEFORM</span>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                {audioInputs && audioInputs.length > 0 && (
                  <select 
                    value={selectedInputId} 
                    onChange={(e) => setSelectedInputId?.(e.target.value)}
                    style={{ background: '#111', color: '#ccc', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '9px', padding: '2px 6px', cursor: 'pointer' }}
                  >
                    {audioInputs.map(input => (
                      <option key={input.deviceId} value={input.deviceId}>In: {input.label || `Device ${input.deviceId.slice(0, 4)}`}</option>
                    ))}
                  </select>
                )}

                {audioOutputs && audioOutputs.length > 0 && (
                  <select 
                    value={selectedOutputId} 
                    onChange={(e) => setSelectedOutputId?.(e.target.value)}
                    style={{ background: '#111', color: '#ccc', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '9px', padding: '2px 6px', cursor: 'pointer' }}
                  >
                    {audioOutputs.map(output => (
                      <option key={output.deviceId} value={output.deviceId}>Out: {output.label || `Device ${output.deviceId.slice(0, 4)}`}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div style={{ flexGrow: 1, position: 'relative', width: '100%', minHeight: '80px' }}>
              <canvas 
                className="waveform-canvas" 
                style={{ width: '100%', height: '100%', background: '#090a0f', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }} 
              />
              <div style={{ position: 'absolute', top: '50%', left: '4px', right: '4px', height: '2px', background: '#ff7b89', opacity: 0.6, pointerEvents: 'none', borderRadius: '1px' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (trackType === 'tone') {
    const scales = [
      { name: 'C Major', chords: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim', 'C5'] },
      { name: 'D Minor', chords: ['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C', 'D5'] },
      { name: 'Eb Minor', chords: ['Ebm', 'Fdim', 'Gb', 'Abm', 'Bbm', 'Cb', 'Db', 'Eb5'] },
      { name: 'G Major', chords: ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim', 'G5'] },
      { name: 'A Minor', chords: ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G', 'A5'] }
    ]
    const currentScale = scales[projectKey] || scales[0]

    const octaves = [
      { oct: 3, keys: [
        { semis: 0, type: 'white', noteName: 'C3', map: 'z' },
        { semis: 1, type: 'black', noteName: 'C#3', map: 's' },
        { semis: 2, type: 'white', noteName: 'D3', map: 'x' },
        { semis: 3, type: 'black', noteName: 'D#3', map: 'd' },
        { semis: 4, type: 'white', noteName: 'E3', map: 'c' },
        { semis: 5, type: 'white', noteName: 'F3', map: 'v' },
        { semis: 6, type: 'black', noteName: 'F#3', map: 'g' },
        { semis: 7, type: 'white', noteName: 'G3', map: 'b' },
        { semis: 8, type: 'black', noteName: 'G#3', map: 'h' },
        { semis: 9, type: 'white', noteName: 'A3', map: 'n' },
        { semis: 10, type: 'black', noteName: 'A#3', map: 'j' },
        { semis: 11, type: 'white', noteName: 'B3', map: 'm' }
      ] },
      { oct: 4, keys: [
        { semis: 0, type: 'white', noteName: 'C4', map: 'q' },
        { semis: 1, type: 'black', noteName: 'C#4', map: '2' },
        { semis: 2, type: 'white', noteName: 'D4', map: 'w' },
        { semis: 3, type: 'black', noteName: 'D#4', map: '3' },
        { semis: 4, type: 'white', noteName: 'E4', map: 'e' },
        { semis: 5, type: 'white', noteName: 'F4', map: 'r' },
        { semis: 6, type: 'black', noteName: 'F#4', map: '5' },
        { semis: 7, type: 'white', noteName: 'G4', map: 't' },
        { semis: 8, type: 'black', noteName: 'G#4', map: '6' },
        { semis: 9, type: 'white', noteName: 'A4', map: 'y' },
        { semis: 10, type: 'black', noteName: 'A#4', map: '7' },
        { semis: 11, type: 'white', noteName: 'B4', map: 'u' }
      ] }
    ]

    return (
      <div className="panel-view" id="view-keys" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
        <div className="synth-controls" style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '8px' }}>
          <select 
            value={synthInstrument} 
            onChange={(e) => setSynthInstrument(e.target.value)}
          >
            <option value="basic-sine">Rhodes Sine</option>
            <option value="retro-square">Retro Arcade Square</option>
            <option value="warm-saw">Warm Brass Saw</option>
            <option value="harmonic-triangle">Harmonic Flute</option>
            <option value="rhodes-fm">Rhodes Electric Piano</option>
          </select>
          <span className="hint" style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Play via clicking or using home row keys.</span>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', width: '100%', overflowX: 'auto', flexGrow: 1 }}>
          <div className="chord-pads-container" style={{ flexShrink: 0, width: '220px' }}>
            <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Scale Chord Pads ({currentScale.name})
            </h4>
            <div className="chord-pads" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {currentScale.chords.map((chord, idx) => (
                <div 
                  key={chord} 
                  className="chord-pad"
                  onClick={() => onPlayChordPad(chord, idx)}
                  style={{ padding: '8px 4px', fontSize: '11px', textAlign: 'center', margin: 0, height: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  {chord}
                </div>
              ))}
            </div>
          </div>

          <div className="piano-container" style={{ flexGrow: 1, minWidth: 0 }}>
            <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Piano Keyboard synthesizer
            </h4>
            <div className="piano-keys" id="piano-keys" style={{ height: '110px' }}>
              {octaves.map((octave) => 
                octave.keys.map((key) => (
                  <div 
                    key={key.noteName}
                    className={`piano-key ${key.type}`}
                    onClick={() => onPlayPianoKey(key.noteName, octave.oct, key.semis)}
                    style={{ height: key.type === 'white' ? '100px' : '60px' }}
                  >
                    {key.type === 'white' && (
                      <>
                        <span className="key-label" style={{ fontSize: '8px' }}>{key.noteName}</span>
                        <span className="key-shortcut" style={{ fontSize: '8px', padding: '1px 2px' }}>{key.map.toUpperCase()}</span>
                      </>
                    )}
                  </div>
                ))
              )}
              <div 
                className="piano-key white piano-key-lg"
                onClick={() => onPlayPianoKey('C5', 5, 0)}
                style={{ height: '100px' }}
              >
                <span className="key-label" style={{ fontSize: '8px' }}>C5</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (trackType === 'drum') {
    const drums = [
      { name: 'Kick', type: 'kick', shortcut: '1' },
      { name: 'Snare', type: 'snare', shortcut: '2' },
      { name: 'HiHat', type: 'hihat', shortcut: '3' },
      { name: 'OpenHat', type: 'openhat', shortcut: '4' },
      { name: 'Clap', type: 'clap', shortcut: '5' },
      { name: 'Tom 1', type: 'tom1', shortcut: '6' },
      { name: 'Tom 2', type: 'tom2', shortcut: '7' },
      { name: 'Crash', type: 'crash', shortcut: '8' }
    ]

    return (
      <div className="panel-view" id="view-drums">
        <p className="hint">Tap drum pads or use keys [1] to [8] to play drum samples.</p>
        <div className="drum-pads" id="drum-pads">
          {drums.map((drum) => (
            <div 
              key={drum.name}
              className="drum-pad"
              onClick={() => onPlayDrumPad(drum.type)}
            >
              <span>{drum.name}</span>
              <span>[{drum.shortcut}]</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (trackType === 'vocaloid') {
    const ipcRenderer = (window as any).require ? (window as any).require('electron').ipcRenderer : null;

    const PRESETS = [
      { id: 'teto', name: 'Kasane Teto', alias: '重音テト', color: '#ff2e63', desc: 'Powerful Vocals', baseFreq: 261.63 },
      { id: 'defoko', name: 'Uta Utane', alias: '唄音ウタ', color: '#a084ff', desc: 'Digital Soul', baseFreq: 220.0 },
      { id: 'momo', name: 'Momone Momo', alias: '桃音モモ', color: '#ff84a0', desc: 'Sweet Peaches', baseFreq: 261.63 },
      { id: 'mako', name: 'Mako Nagone', alias: '和音マコ', color: '#888888', desc: 'Sharp Slate', baseFreq: 220.0 },
      { id: 'luna', name: 'Amane Luna', alias: '天音ルナ', color: '#ffeb3b', desc: 'Sunlight Breath', baseFreq: 220.0 },
      { id: 'koe', name: 'Koe Utane', alias: '唄音コエ', color: '#d1a0ff', desc: 'Soft Echo', baseFreq: 220.0 },
      { id: 'taya', name: 'Taya Soune', alias: '蒼音タヤ', color: '#00d2ff', desc: 'Deep Ocean', baseFreq: 174.61 }
    ]

    const [activePreset, setActivePreset] = React.useState(PRESETS[0])
    const [speed, setSpeed] = React.useState(1.0)
    const [pitch, setPitch] = React.useState(1.0)
    const [baseFreq, setBaseFreq] = React.useState(261.63)
    const [text, setText] = React.useState('')
    const [models, setModels] = React.useState<string[]>([])
    const [isSynthesizing, setIsSynthesizing] = React.useState(false)
    const [audioUrl, setAudioUrl] = React.useState<string | null>(null)
    const [rawAudioPath, setRawAudioPath] = React.useState<string | null>(null)

    React.useEffect(() => {
      if (ipcRenderer) {
        ipcRenderer.invoke('list-models').then((res: string[]) => {
          setModels(res)
        }).catch(console.error)
      }
    }, [vocaloidFolder])

    React.useEffect(() => {
      setBaseFreq(activePreset.baseFreq)
    }, [activePreset])

    const handleSingleGenerate = async () => {
      if (!text.trim() || !ipcRenderer) return
      setIsSynthesizing(true)
      setAudioUrl(null)
      try {
        const modelName = models.find(m => m.toLowerCase().includes(activePreset.id)) || models[0] || 'TETO-English-150401'
        const audioPath = await ipcRenderer.invoke('generate-tts', { 
          text: text.trim(), 
          model: modelName, 
          speed, 
          pitch 
        })
        setRawAudioPath(audioPath)
        setAudioUrl(`file:///${audioPath.replace(/\\/g, '/')}?t=${Date.now()}`)

        // Map text tokens directly into MIDI notes on this track
        if (activeTrackId && setMidiEvents) {
          const tokens = text.trim().split(/[\s-]+/).filter(Boolean)
          if (tokens.length > 0) {
            const beatDuration = 0.5 // 120 bpm quarter note
            const newNotes = tokens.map((token, index) => {
              const noteTime = index * beatDuration
              const pitch = 60 // C4
              const freq = 440 * Math.pow(2, (pitch - 69) / 12)
              return {
                id: `ev-tts-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
                trackId: activeTrackId,
                time: noteTime,
                type: 'vocaloid',
                data: {
                  freq,
                  duration: beatDuration,
                  type: 'vocaloid',
                  lyric: token
                }
              }
            })
            // Clear existing notes on active track first, and map the new ones
            setMidiEvents(prev => [
              ...prev.filter(ev => ev.trackId !== activeTrackId),
              ...newNotes
            ])
          }
        }
      } catch (error) {
        console.error(error)
        alert('Synthesis failed. Make sure voicebank models and Python environment are ready.')
      } finally {
        setIsSynthesizing(false)
      }
    }

    const handleSequenceGenerate = async () => {
      if (!activeTrackId || !setTrackAudioUrls || !ipcRenderer) return
      
      const trackNotes = midiEvents.filter(ev => ev.trackId === activeTrackId)
      if (trackNotes.length === 0) {
        alert('No MIDI notes found on this track! Double click inside the MIDI Editor grid to add notes snapped to the grid.')
        return
      }

      setIsSynthesizing(true)
      try {
        const modelName = models.find(m => m.toLowerCase().includes(activePreset.id)) || models[0] || 'TETO-English-150401'
        
        const notesPayload = trackNotes.map(n => ({
          time: n.time,
          duration: n.data.duration || 0.5,
          freq: n.data.freq,
          lyric: n.data.lyric || 'a'
        }))

        const audioPath = await ipcRenderer.invoke('generate-tts', {
          text: '',
          model: modelName,
          speed,
          pitch,
          notes: notesPayload,
          base_freq: baseFreq
        })

        const fileUrl = `file:///${audioPath.replace(/\\/g, '/')}?t=${Date.now()}`
        
        setTrackAudioUrls(prev => ({
          ...prev,
          [activeTrackId]: fileUrl
        }))

        setTimeout(async () => {
          try {
            const res = await fetch(fileUrl)
            const arrayBuf = await res.arrayBuffer()
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
            const ctx = new AudioCtx()
            const audioBuf = await ctx.decodeAudioData(arrayBuf)
            const data = audioBuf.getChannelData(0)

            const canvasEl = document.querySelector(`#timeline-track-${activeTrackId} .waveform-canvas`) as HTMLCanvasElement
            if (canvasEl) {
              canvasEl.width = canvasEl.clientWidth
              canvasEl.height = canvasEl.clientHeight
              const cctx = canvasEl.getContext('2d')
              if (cctx) {
                cctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
                const step = Math.ceil(data.length / canvasEl.width)
                cctx.fillStyle = activePreset.color
                for (let i = 0; i < canvasEl.width; i++) {
                  let min = 1.0, max = -1.0
                  for (let j = 0; j < step; j++) {
                    const val = data[(i * step) + j]
                    if (val < min) min = val
                    if (val > max) max = val
                  }
                  cctx.fillRect(i, (1 + min) * (canvasEl.height / 2), 1, Math.max(1, (max - min) * (canvasEl.height / 2)))
                }
              }
            }
          } catch(err) {
            console.error('Error drawing timeline waveform:', err)
          }
        }, 150)

        alert('Vocal Track Rendered Successfully! Play the session to hear it synced in real time.')
      } catch (error) {
        console.error(error)
        alert('Render failed. Make sure voicebank models and Python environment are ready.')
      } finally {
        setIsSynthesizing(false)
      }
    }

    return (
      <div className="panel-view" id="view-vocaloid" style={{ display: 'flex', width: '100%', gap: '20px', color: '#fff', height: '100%', minHeight: '220px' }}>
        
        {/* Left column: Preset Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '250px', flexShrink: 0, gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
            UTAU Voice Presets
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            {PRESETS.map((p) => {
              const isActive = activePreset.id === p.id
              return (
                <div 
                  key={p.id}
                  onClick={() => setActivePreset(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isActive ? `rgba(255, 46, 99, 0.1)` : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isActive ? p.color : 'rgba(255, 255, 255, 0.06)'}`,
                    transition: 'all 0.2s',
                    boxShadow: isActive ? `0 0 10px rgba(255, 46, 99, 0.2)` : 'none'
                  }}
                >
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{p.name} <span style={{ fontSize: '9px', opacity: 0.6 }}>({p.alias})</span></span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{p.desc}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Center column: Parameters & Render controls */}
        <div style={{ display: 'flex', flex: 1, gap: '20px' }}>
          
          {/* Slider details replaced with Knobs */}
          <div style={{ display: 'flex', flexDirection: 'column', width: '280px', gap: '12px', flexShrink: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Voice Parameters
            </div>
            
            <div style={{ 
              background: 'rgba(0,0,0,0.15)', 
              border: '1px solid rgba(255,255,255,0.04)', 
              padding: '16px', 
              borderRadius: '8px', 
              display: 'flex', 
              gap: '20px', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: '120px'
            }}>
              {/* Speed Knob */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Base Speed</span>
                <Knob 
                  min={0.5} 
                  max={2.0} 
                  value={speed} 
                  onChange={setSpeed} 
                  displayValue={`${speed.toFixed(1)}x`}
                />
              </div>

              {/* Pitch Knob */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Pitch Scale</span>
                <Knob 
                  min={0.5} 
                  max={2.0} 
                  value={pitch} 
                  onChange={setPitch} 
                  displayValue={`${pitch.toFixed(1)}x`}
                />
              </div>

              {/* Base Freq Knob */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>UTAU Base</span>
                <Knob 
                  min={110.0} 
                  max={440.0} 
                  value={baseFreq} 
                  onChange={setBaseFreq} 
                  displayValue={`${baseFreq.toFixed(0)} Hz`}
                />
              </div>
            </div>
          </div>

          {/* Right section: TTS Preview & Sequences rendering */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px' }}>
            
            {/* Sequence compile */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255, 46, 99, 0.03)', border: '1px solid rgba(255, 46, 99, 0.15)', borderRadius: '10px', padding: '16px', gap: '8px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="bx bx-music" style={{ color: activePreset.color, fontSize: '20px' }} />
                <span style={{ fontWeight: 700, fontSize: '13px' }}>UTAU MIDI Sequencer Compiler</span>
              </div>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>
                Synthesize all MIDI notes inside this track using <strong>{activePreset.name}</strong>\'s voicebank. Each note\'s lyric text will be dynamically mapped to UTAU phonemes and pitched to match the timeline.
              </p>
              <button 
                onClick={handleSequenceGenerate}
                disabled={isSynthesizing}
                style={{
                  background: `linear-gradient(135deg, ${activePreset.color}, #d81b60)`,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: `0 4px 15px rgba(255, 46, 99, 0.3)`,
                  marginTop: '4px'
                }}
                onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
              >
                {isSynthesizing ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" /> Rendering Track Vocals...
                  </>
                ) : (
                  <>
                    <i className="bx bx-play-circle" /> Compile & Render Vocal Track
                  </>
                )}
              </button>
            </div>

            {/* Vocalizer TTS */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '12px', gap: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>PREVIEW SINGER (TTS VOICECHANGER)</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  value={text} 
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Speak via ${activePreset.name}...`}
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '8px 12px',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSingleGenerate()}
                />
                <button 
                  onClick={handleSingleGenerate}
                  disabled={isSynthesizing || !text.trim()}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '0 16px',
                    fontWeight: 600,
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                  Generate
                </button>
              </div>
              {audioUrl && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '6px' }}>
                  <audio controls src={audioUrl} autoPlay style={{ height: '24px', flex: 1 }}></audio>
                  <button 
                    onClick={() => ipcRenderer.invoke('save-file', rawAudioPath)}
                    style={{
                      background: activePreset.color,
                      color: 'white',
                      border: 'none',
                      padding: '4px 10px',
                      fontSize: '9px',
                      fontWeight: 700,
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Save WAV
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    )
  }

  return null
}
