import React from 'react'
import Knob from './Knob.tsx'
import { VstPanel } from './VstPanel.tsx'

interface InstrumentPanelProps {
  tracks?: any[]
  setTracks?: React.Dispatch<React.SetStateAction<any[]>>
  trackType: string
  synthInstrument: string
  setSynthInstrument: (val: string) => void
  projectKey: number
  setProjectKey?: (val: number) => void
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

function PianoRoll({ onPlay }: { onPlay: (noteName: string, oct: number, semis: number) => void }) {
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
    <div className="piano-keys" style={{ height: '140px', justifyContent: 'center' }}>
      {octaves.map((octave) =>
        octave.keys.map((key) => (
          <div
            key={key.noteName}
            className={`piano-key ${key.type}`}
            onClick={() => onPlay(key.noteName, octave.oct, key.semis)}
            style={{
              height: key.type === 'white' ? '120px' : '80px',
            }}
          >
            <span className="key-label" style={{ fontSize: '10px' }}>{key.map}</span>
          </div>
        ))
      )}
    </div>
  )
}

export default function InstrumentPanel(props: InstrumentPanelProps) {
  const {
    trackType,
    synthInstrument,
    setSynthInstrument,
    projectKey,
    setProjectKey,
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
  } = props;

  const [audioPitchShift, setAudioPitchShift] = React.useState(0)

  if (trackType === 'audio') {
    return <AudioPanel {...props} audioPitchShift={audioPitchShift} setAudioPitchShift={setAudioPitchShift} />
  }
  if (trackType === 'tone') {
    return <TonePanel {...props} />
  }
  if (trackType === 'drum') {
    return <DrumPanel {...props} />
  }
  if (trackType === 'vocaloid') {
    return <VocaloidPanel {...props} />
  }
  if (trackType === 'autogun') {
    return <AuraSynthPanel {...props} />
  }

  return null
}




function AuraSynthPanel({ activeTrackId, tracks, setTracks }: any) {
  const track = tracks?.find((t: any) => t.id === activeTrackId)
  if (!track) return null

  const preset = track.auraPreset || 1
  const level = track.auraLevel || 0.8
  const magic = track.auraMagic || false

  const updateTrack = (updates: any) => {
    setTracks?.((prev: any) => prev.map((t: any) => t.id === activeTrackId ? { ...t, ...updates } : t))
  }

  const randomize = () => {
    updateTrack({ auraPreset: Math.floor(Math.random() * 4294967295) + 1 })
  }

  const stepPreset = (dir: number) => {
    let p = preset + dir
    if (p < 1) p = 4294967295
    if (p > 4294967295) p = 1
    updateTrack({ auraPreset: p })
  }

  return (
    <div className="panel-view" id="view-aurasynth" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontSize: '13px', fontWeight: 700 }}>
        <i className="bx bx-slider-alt" /> AuraSynth
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', flexGrow: 1 }}>
        
        {/* Main Display Area */}
        <div style={{ 
          flex: 1, 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border)', 
          borderRadius: '8px',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '15px',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)'
        }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 700, letterSpacing: '1px' }}>
            ALGORITHMIC PRESET
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px',
            background: '#0a0a0a',
            borderRadius: '4px',
            border: '1px solid #222'
          }}>
            <i 
              className="bx bx-chevron-left" 
              style={{ fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }} 
              onClick={() => stepPreset(-1)}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            />
            <div style={{ 
              fontFamily: 'monospace', 
              fontSize: '32px', 
              color: 'var(--accent)',
              textShadow: '0 0 10px var(--accent-glow)',
              letterSpacing: '3px'
            }}>
              {preset.toString().padStart(10, '0')}
            </div>
            <i 
              className="bx bx-chevron-right" 
              style={{ fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }} 
              onClick={() => stepPreset(1)}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            />
          </div>
          <button
            onClick={randomize}
            style={{
              background: 'transparent',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              padding: '6px 24px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px',
              letterSpacing: '1px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#000'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent)'; }}
          >
            RANDOMIZE
          </button>
        </div>

        {/* Controls Area */}
        <div style={{ 
          width: '180px', 
          background: 'rgba(255,255,255,0.02)', 
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>MASTER LEVEL</span>
            <Knob 
              min={0} max={1} 
              value={level} 
              onChange={(val) => updateTrack({ auraLevel: val })}
              displayValue={`${Math.round(level * 100)}%`}
            />
          </div>

          <button
            onClick={() => updateTrack({ auraMagic: !magic })}
            style={{
              background: magic ? 'linear-gradient(45deg, #f093fb 0%, #f5576c 100%)' : 'transparent',
              border: magic ? 'none' : '1px solid var(--border)',
              color: magic ? '#fff' : 'var(--text-muted)',
              padding: '8px 30px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '14px',
              letterSpacing: '2px',
              boxShadow: magic ? '0 0 15px rgba(245, 87, 108, 0.4)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            MAGIC
          </button>
        </div>

      </div>
    </div>
  )
}

function AudioPanel({
  isMicAllowed, onAllowMic, audioInputs, selectedInputId, setSelectedInputId,
  audioOutputs, selectedOutputId, setSelectedOutputId, audioPitchShift, setAudioPitchShift
}: any) {
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
                background: isMicAllowed ? 'var(--accent)' : 'var(--bg-card)',
                color: isMicAllowed ? '#000' : 'var(--text-muted)',
                border: isMicAllowed ? 'none' : '1px solid var(--border)',
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
                boxShadow: isMicAllowed ? '0 0 10px var(--accent-glow)' : 'none'
              }}
            >
              {isMicAllowed ? (
                <span>Mic Ready!<br/>Click Red<br/>Record Button<br/>In Top Bar</span>
              ) : (
                <span>Enable<br/>Microphone</span>
              )}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Pitch Shift</span>
              <Knob
                min={-12}
                max={12}
                value={audioPitchShift}
                onChange={(val) => setAudioPitchShift(Math.round(val))}
                displayValue={`${audioPitchShift > 0 ? '+' : ''}${Math.round(audioPitchShift)} st`}
              />
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

function TonePanel({
  synthInstrument, setSynthInstrument, projectKey, setProjectKey, onPlayChordPad, onPlayPianoKey
}: any) {
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
      <div className="panel-view" id="view-keys" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%', flexGrow: 1, gap: '40px', alignItems: 'flex-start', justifyContent: 'center', padding: '20px' }}>

          <div className="synth-settings" style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '220px', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', margin: 0 }}>
                Synthesizer
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <select
                  value={synthInstrument}
                  onChange={(e) => setSynthInstrument(e.target.value)}
                  style={{ padding: '8px 12px', background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', width: '100%' }}
                >
                  <option value="basic-sine">Rhodes Sine</option>
                  <option value="retro-square">Retro Arcade Square</option>
                  <option value="warm-saw">Warm Brass Saw</option>
                  <option value="harmonic-triangle">Harmonic Flute</option>
                  <option value="rhodes-fm">Rhodes Electric Piano</option>
                </select>
                <div
                  tabIndex={0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--accent)',
                    cursor: 'pointer',
                    outline: 'none',
                    width: '100%'
                  }}
                  onKeyDown={(e) => {
                    if (!setProjectKey) return
                    if (e.key === '-' || e.key === '_') {
                      e.preventDefault()
                      setProjectKey(Math.max(0, projectKey - 1))
                    } else if (e.key === '+' || e.key === '=') {
                      e.preventDefault()
                      setProjectKey(Math.min(scales.length - 1, projectKey + 1))
                    }
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'var(--accent)', cursor: 'pointer' }}>
                    <i className="bx bx-minus" onClick={() => setProjectKey && setProjectKey(Math.max(0, projectKey - 1))} />
                    <i className="bx bx-plus" onClick={() => setProjectKey && setProjectKey(Math.min(scales.length - 1, projectKey + 1))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{currentScale.name}</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>(Use +/- keys)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>


          <div className="chord-pads-container" style={{ flexGrow: 1, minWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
              Scale Chord Pads
            </h4>
            <div className="chord-pads" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', width: '100%' }}>
              {currentScale.chords.map((chord, idx) => (
                <div
                  key={chord}
                  className="chord-pad"
                  onClick={() => onPlayChordPad(chord, idx)}
                  style={{
                    padding: '15px 5px',
                    fontSize: '20px',
                    fontWeight: 700,
                    textAlign: 'center',
                    margin: 0,
                    height: 'auto',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'var(--accent-glow)'
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'var(--bg-card)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  {chord}
                </div>
              ))}
            </div>
          </div>

          <div className="piano-container" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
              Piano Keyboard
            </h4>
            <div className="piano-keys" id="piano-keys" style={{ height: '240px', justifyContent: 'center' }}>
              {octaves.map((octave) =>
                octave.keys.map((key) => (
                  <div
                    key={key.noteName}
                    className={`piano-key ${key.type}`}
                    onClick={() => onPlayPianoKey(key.noteName, octave.oct, key.semis)}
                    style={{
                      height: key.type === 'white' ? '220px' : '140px',
                      width: key.type === 'white' ? '60px' : '38px',
                      marginLeft: key.type === 'black' ? '-19px' : '0',
                      marginRight: key.type === 'black' ? '-19px' : '0'
                    }}
                  >
                    {key.type === 'white' && (
                      <>
                        <span className="key-label" style={{ fontSize: '12px' }}>{key.noteName}</span>
                        <span className="key-shortcut" style={{ fontSize: '12px', padding: '2px 4px', marginTop: '4px' }}>{key.map.toUpperCase()}</span>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="vst-input-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', flexShrink: 0 }}>
            <VstPanel />
          </div>
        </div>
      </div>
    )
}

function DrumPanel({ onPlayDrumPad }: any) {
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

function VocaloidPanel({
  vocaloidFolder, activeTrackId, setMidiEvents, midiEvents, setTrackAudioUrls
}: any) {
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

    const [activeModel, setActiveModel] = React.useState<string | null>(() => {
      return localStorage.getItem('vocaloidActiveModel') || null
    })
    const [speed, setSpeed] = React.useState(1.0)
    const [pitch, setPitch] = React.useState(1.0)
    const [baseFreq, setBaseFreq] = React.useState(261.63)
    const [text, setText] = React.useState('')
    const [models, setModels] = React.useState<string[]>([])
    const [isSynthesizing, setIsSynthesizing] = React.useState(false)
    const [audioUrl, setAudioUrl] = React.useState<string | null>(null)
    const [rawAudioPath, setRawAudioPath] = React.useState<string | null>(null)

    const getPresetInfo = (modelName: string) => {
      if (!modelName) return PRESETS[0]
      const match = PRESETS.find(p => modelName.toLowerCase().includes(p.id))
      if (match) return match
      return { id: modelName, name: modelName, alias: 'Custom Model', color: 'var(--accent)', desc: 'Local Voicebank', baseFreq: 220.0 }
    }

    const activePreset = getPresetInfo(activeModel || '')

    const midiInputRef = React.useRef<HTMLInputElement>(null)

    const handleImportMidi = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !activeTrackId || !setMidiEvents) return

      try {
        const { Midi } = await import('@tonejs/midi')
        const arrayBuffer = await file.arrayBuffer()
        const parsedMidi = new Midi(arrayBuffer)
        
        if (parsedMidi.tracks.length > 0) {
          const track = parsedMidi.tracks[0]
          const newEvents: any[] = []
          
          track.notes.forEach(note => {
            const freq = 440 * Math.pow(2, (note.midi - 69) / 12)
            newEvents.push({
              id: `ev-midi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              trackId: activeTrackId,
              time: note.time,
              type: 'vocaloid',
              data: {
                freq,
                duration: note.duration,
                type: 'vocaloid',
                lyric: 'a'
              }
            })
          })

          if (newEvents.length > 0) {
            setMidiEvents(prev => {
              const otherNotes = prev.filter(ev => ev.trackId !== activeTrackId)
              return [...otherNotes, ...newEvents].sort((a, b) => a.time - b.time)
            })
          }
        }
      } catch (err) {
        console.error('Error parsing MIDI:', err)
        alert('Failed to import MIDI.')
      }
      
      if (midiInputRef.current) midiInputRef.current.value = ''
    }

    const handleMapLyrics = () => {
      if (!text.trim() || !activeTrackId || !setMidiEvents) return
      const tokens = text.trim().split(/[\s-]+/).filter(Boolean)
      if (tokens.length === 0) return
      
      setMidiEvents(prev => {
        const existingNotes = prev.filter(ev => ev.trackId === activeTrackId).sort((a, b) => a.time - b.time)
        const otherNotes = prev.filter(ev => ev.trackId !== activeTrackId)
        
        const updatedNotes = existingNotes.map((note, index) => {
          if (index < tokens.length) {
            return { ...note, data: { ...note.data, lyric: tokens[index] } }
          }
          return note
        })
        
        return [...otherNotes, ...updatedNotes].sort((a, b) => a.time - b.time)
      })
    }

    React.useEffect(() => {
      if (ipcRenderer) {
        ipcRenderer.invoke('list-models').then((res: string[]) => {
          setModels(res)
          if (res.length > 0) {
            const saved = localStorage.getItem('vocaloidActiveModel')
            if (saved && res.includes(saved)) {
              setActiveModel(saved)
            } else if (!activeModel || !res.includes(activeModel)) {
              setActiveModel(res[0])
            }
          }
        }).catch(console.error)
      }
    }, [vocaloidFolder])

    React.useEffect(() => {
      if (activeModel) localStorage.setItem('vocaloidActiveModel', activeModel)
      setBaseFreq(activePreset.baseFreq)
    }, [activeModel])

    const handleSingleGenerate = async () => {
      if (!text.trim() || !ipcRenderer) return
      setIsSynthesizing(true)
      setAudioUrl(null)
      try {
        const modelName = activeModel || models[0] || 'TETO-English-150401'
        const audioPath = await ipcRenderer.invoke('generate-tts', {
          text: text.trim(),
          model: modelName,
          speed,
          pitch
        })
        setRawAudioPath(audioPath)
        const newUrl = `file:///${audioPath.replace(/\\/g, '/')}?t=${Date.now()}`
        setAudioUrl(newUrl)
        if (activeTrackId && setTrackAudioUrls) {
          setTrackAudioUrls(prev => ({ ...prev, [activeTrackId]: newUrl }))
        }

        // Map text tokens directly into MIDI notes on this track
        if (activeTrackId && setMidiEvents) {
          const tokens = text.trim().split(/[\s-]+/).filter(Boolean)
          if (tokens.length > 0) {
            setMidiEvents(prev => {
              const existingNotes = prev.filter(ev => ev.trackId === activeTrackId).sort((a, b) => a.time - b.time)
              const otherNotes = prev.filter(ev => ev.trackId !== activeTrackId)
              
              if (existingNotes.length > 0) {
                const updatedNotes = existingNotes.map((note, index) => {
                  if (index < tokens.length) {
                    return { ...note, data: { ...note.data, lyric: tokens[index] } }
                  }
                  return note
                })
                
                let finalNotes = [...updatedNotes]
                if (tokens.length > existingNotes.length) {
                  let lastNote = existingNotes[existingNotes.length - 1]
                  let lastTime = lastNote.time + (lastNote.data.duration || 0.5)
                  for (let i = existingNotes.length; i < tokens.length; i++) {
                    finalNotes.push({
                      id: `ev-tts-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
                      trackId: activeTrackId,
                      time: lastTime,
                      type: 'vocaloid',
                      data: {
                        freq: lastNote.data.freq,
                        duration: 0.5,
                        type: 'vocaloid',
                        lyric: tokens[i]
                      }
                    })
                    lastTime += 0.5
                  }
                }
                return [...otherNotes, ...finalNotes]
              } else {
                const beatDuration = 0.5
                const newNotes = tokens.map((token, index) => {
                  const noteTime = index * beatDuration
                  const pitch = 60 // C4
                  const freq = 440 * Math.pow(2, (pitch - 69) / 12)
                  return {
                    id: `ev-tts-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
                    trackId: activeTrackId,
                    time: noteTime,
                    type: 'vocaloid',
                    data: { freq, duration: beatDuration, type: 'vocaloid', lyric: token }
                  }
                })
                return [...otherNotes, ...newNotes]
              }
            })
          }
        }
      } catch (error) {
        console.error(error)
        alert('Synthesis failed. Make sure voicebank models and Python environment are ready.')
      } finally {
        setIsSynthesizing(false)
      }
    }

  useEffect(() => {
    const handleAutoRender = () => {
      handleSequenceGenerate()
    }
    window.addEventListener('request-vocaloid-render', handleAutoRender)
    return () => window.removeEventListener('request-vocaloid-render', handleAutoRender)
  }, [midiEvents, activeTrackId, speed, pitch, baseFreq])

  const handleSequenceGenerate = async () => {
    if (!activeTrackId || !setTrackAudioUrls || !ipcRenderer) return

    const trackNotes = midiEvents.filter(ev => ev.trackId === activeTrackId)
      if (trackNotes.length === 0) {
        if (text.trim()) {
          return handleSingleGenerate()
        }
        alert('No MIDI notes found on this track! Double click inside the MIDI Editor grid to add notes snapped to the grid.')
        return
      }

      setIsSynthesizing(true)
      try {
        const modelName = activeModel || models[0] || 'TETO-English-150401'

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Voice Models
            </div>
            <button
              onClick={async () => {
                if (ipcRenderer) {
                  const res = await ipcRenderer.invoke('select-vocaloid-folder')
                  if (res) {
                    const newModels = await ipcRenderer.invoke('list-models')
                    setModels(newModels)
                    if (newModels.length > 0) {
                      setActiveModel(newModels[newModels.length - 1])
                    }
                  }
                }
              }}
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '9px', padding: '3px 8px', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 600, transition: 'background 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              Add Folder
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            {models.length === 0 && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No models found. Click "Add Folder".</div>}
            {models.map((modelName) => {
              const p = getPresetInfo(modelName)
              const isActive = activeModel === modelName
              return (
                <div
                  key={modelName}
                  onClick={() => setActiveModel(modelName)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isActive ? 'var(--accent-glow)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isActive ? 'var(--accent)' : 'rgba(255, 255, 255, 0.06)'}`,
                    transition: 'all 0.2s',
                    boxShadow: isActive ? '0 0 10px var(--accent-glow)' : 'none'
                  }}
                >
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, background: isActive ? 'var(--accent)' : p.color, boxShadow: `0 0 8px ${isActive ? 'var(--accent)' : p.color}` }} />
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.alias} • {p.desc}</span>
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
            <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1px solid rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(8px)', borderRadius: '10px', padding: '16px', gap: '8px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="bx bx-music" style={{ color: 'var(--accent)', fontSize: '20px', textShadow: '0 0 8px var(--accent-glow)' }} />
                <span style={{ fontWeight: 700, fontSize: '13px' }}>UTAU MIDI Sequencer Compiler</span>
              </div>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>
                Synthesize all MIDI notes inside this track using <strong>{activePreset.name}</strong>\'s voicebank. Each note\'s lyric text will be dynamically mapped to UTAU phonemes and pitched to match the timeline.
              </p>
              <button
                onClick={handleSequenceGenerate}
                disabled={isSynthesizing}
                style={{
                  background: 'rgba(80, 250, 123, 0.1)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontWeight: 600,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: '0 0 10px var(--accent-glow), inset 0 0 5px var(--accent-glow)',
                  marginTop: '4px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(80, 250, 123, 0.2)'
                  e.currentTarget.style.color = '#fff'
                  e.currentTarget.style.textShadow = '0 0 5px var(--accent)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(80, 250, 123, 0.1)'
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.textShadow = 'none'
                }}
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
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <input
                  type="file"
                  accept=".mid,.midi"
                  ref={midiInputRef}
                  style={{ display: 'none' }}
                  onChange={handleImportMidi}
                />
                <button
                  onClick={() => midiInputRef.current?.click()}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-main)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="bx bx-import" /> Import MIDI Notes
                </button>
                <button
                  onClick={handleMapLyrics}
                  disabled={!text.trim()}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-main)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="bx bx-text" /> Map TTS Text to Notes
                </button>
              </div>
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
                      background: 'rgba(80, 250, 123, 0.1)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)',
                      borderRadius: '6px',
                      padding: '4px 16px',
                      fontWeight: 600,
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      height: '100%',
                      boxShadow: '0 0 10px var(--accent-glow), inset 0 0 5px var(--accent-glow)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(80, 250, 123, 0.2)'
                      e.currentTarget.style.color = '#fff'
                      e.currentTarget.style.textShadow = '0 0 5px var(--accent)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(80, 250, 123, 0.1)'
                      e.currentTarget.style.color = 'var(--accent)'
                      e.currentTarget.style.textShadow = 'none'
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
