import React, { useState, useEffect, useRef } from 'react'
import TopBar from './components/TopBar.tsx'
import TrackList from './components/TrackList.tsx'
import Timeline from './components/Timeline.tsx'
import BottomPanel from './components/BottomPanel.tsx'
import InstrumentPanel from './components/InstrumentPanel.tsx'
import FxPanel from './components/FxPanel.tsx'
import MidiEditor from './components/MidiEditor.tsx'
import Modal from './components/Modal.tsx'

interface Track {
  id: string
  name: string
  type: string
  muted: boolean
  soloed: boolean
  fxEnabled: boolean
}

interface MidiEvent {
  id: string
  trackId: string
  time: number
  type: string
  data: any
}

function bufferToWav(buffer: AudioBuffer) {
  const numOfChan = buffer.numberOfChannels
  const length = buffer.length * numOfChan * 2 + 44
  const bufferArr = new ArrayBuffer(length)
  const view = new DataView(bufferArr)
  const channels = []
  let offset = 0
  let pos = 0

  const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; }
  const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; }

  setUint32(0x46464952)
  setUint32(length - 8)
  setUint32(0x45564157)
  setUint32(0x20746d66)
  setUint32(16)
  setUint16(1)
  setUint16(numOfChan)
  setUint32(buffer.sampleRate)
  setUint32(buffer.sampleRate * numOfChan * 2)
  setUint16(numOfChan * 2)
  setUint16(16)
  setUint32(0x61746164)
  setUint32(length - pos - 4)

  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i))
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]))
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      view.setInt16(pos, sample, true)
      pos += 2
    }
    offset++
  }

  return new Blob([bufferArr], { type: 'audio/wav' })
}

export default function App() {
  const [projectTitle, setProjectTitle] = useState('My Premium Session')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isMetronomeOn, setIsMetronomeOn] = useState(false)
  const [bpm, setBpm] = useState(90)
  const [projectKey, setProjectKey] = useState(0)
  const [timeSig, setTimeSig] = useState('4/4')

  const [tracks, setTracks] = useState<Track[]>([
    { id: '1', name: 'Vocal Recording', type: 'audio', muted: false, soloed: false, fxEnabled: true },
    { id: '2', name: 'Synthesizer L', type: 'tone', muted: false, soloed: false, fxEnabled: true },
    { id: '3', name: 'Drum Pads Main', type: 'drum', muted: false, soloed: false, fxEnabled: true }
  ])
  const [activeTrackId, setActiveTrackId] = useState('1')
  const [activeTrackType, setActiveTrackType] = useState('audio')
  const [trackAudioUrls, setTrackAudioUrls] = useState<Record<string, string>>({
    '1': ''
  })

  const [midiEvents, setMidiEvents] = useState<MidiEvent[]>([
    { id: 'ev-1', trackId: '2', time: 0.0, type: 'tone', data: { freq: 261.63, duration: 0.4, type: 'basic-sine' } },
    { id: 'ev-2', trackId: '2', time: 0.5, type: 'tone', data: { freq: 329.63, duration: 0.4, type: 'basic-sine' } },
    { id: 'ev-3', trackId: '2', time: 1.0, type: 'tone', data: { freq: 392.00, duration: 0.4, type: 'basic-sine' } },
    { id: 'ev-4', trackId: '3', time: 0.0, type: 'drum', data: { type: 'kick', duration: 0.2 } },
    { id: 'ev-5', trackId: '3', time: 0.5, type: 'drum', data: { type: 'snare', duration: 0.2 } },
    { id: 'ev-6', trackId: '3', time: 1.0, type: 'drum', data: { type: 'kick', duration: 0.2 } }
  ])

  const [activeTab, setActiveTab] = useState('instrument')
  const [panelHeight, setPanelHeight] = useState(260)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [vocaloidFolder, setVocaloidFolder] = useState(() => {
    return localStorage.getItem('vocaloidFolder') || ''
  })

  const [delayAmt, setDelayAmt] = useState(0.3)
  const [panAmt, setPanAmt] = useState(0.0)
  const [reverbAmt, setReverbAmt] = useState(0.2)
  const [delayEnabled, setDelayEnabled] = useState(true)
  const [panEnabled, setPanEnabled] = useState(true)
  const [reverbEnabled, setReverbEnabled] = useState(true)

  const [synthInstrument, setSynthInstrument] = useState('rhodes-fm')

  const [isMicAllowed, setIsMicAllowed] = useState(false)
  const [isRecordingVocal, setIsRecordingVocal] = useState(false)

  const [undoStack, setUndoStack] = useState<MidiEvent[][]>([])
  const [redoStack, setRedoStack] = useState<MidiEvent[][]>([])

  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([])
  const [selectedInputId, setSelectedInputId] = useState('')
  const [selectedOutputId, setSelectedOutputId] = useState('')

  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const startTimeRef = useRef(0)
  const playbackTimeRef = useRef(0)
  const animationIdRef = useRef<number | null>(null)
  const nextEventIdxRef = useRef(0)
  const nextMetronomeBeatIdxRef = useRef(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const delayNodeRef = useRef<DelayNode | null>(null)
  const panNodeRef = useRef<StereoPannerNode | null>(null)
  const reverbNodeRef = useRef<ConvolverNode | null>(null)

  const isMetronomeOnRef = useRef(isMetronomeOn)
  const bpmRef = useRef(bpm)
  const midiEventsRef = useRef(midiEvents)
  const tracksRef = useRef(tracks)
  const isPlayingRef = useRef(isPlaying)
  const isRecordingRef = useRef(isRecording)

  useEffect(() => { isMetronomeOnRef.current = isMetronomeOn }, [isMetronomeOn])
  useEffect(() => { bpmRef.current = bpm }, [bpm])
  useEffect(() => { midiEventsRef.current = midiEvents }, [midiEvents])
  useEffect(() => { tracksRef.current = tracks }, [tracks])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { isRecordingRef.current = isRecording }, [isRecording])

  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const inputs = devices.filter(d => d.kind === 'audioinput')
      const outputs = devices.filter(d => d.kind === 'audiooutput')
      setAudioInputs(inputs)
      setAudioOutputs(outputs)
      if (inputs.length > 0 && !selectedInputId) setSelectedInputId(inputs[0].deviceId)
      if (outputs.length > 0 && !selectedOutputId) setSelectedOutputId(outputs[0].deviceId)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadAudioDevices()
    navigator.mediaDevices.addEventListener('devicechange', loadAudioDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', loadAudioDevices)
  }, [])

  useEffect(() => {
    if (audioCtxRef.current && (audioCtxRef.current as any).setSinkId && selectedOutputId) {
      (audioCtxRef.current as any).setSinkId(selectedOutputId).catch((e: any) => console.error(e))
    }
  }, [selectedOutputId])

  useEffect(() => {
    if ((window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron')
        ipcRenderer.invoke('set-vocaloid-folder', vocaloidFolder).catch((err: any) => {
          console.warn("set-vocaloid-folder IPC handler not ready yet:", err)
        })
      } catch (e) {
        console.warn("Electron set-vocaloid-folder invoke error:", e)
      }
    }
  }, [vocaloidFolder])

  const handleSelectVocaloidFolder = async () => {
    if ((window as any).require) {
      const { ipcRenderer } = (window as any).require('electron')
      const folderPath = await ipcRenderer.invoke('select-vocaloid-folder')
      if (folderPath) {
        setVocaloidFolder(folderPath)
        localStorage.setItem('vocaloidFolder', folderPath)
      }
    }
  }

  const pushUndo = () => {
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(midiEvents))])
    setRedoStack([])
  }

  const handleUndo = () => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setUndoStack(curr => curr.slice(0, -1))
    setRedoStack(curr => [...curr, JSON.parse(JSON.stringify(midiEvents))])
    setMidiEvents(prev)
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setRedoStack(curr => curr.slice(0, -1))
    setUndoStack(curr => [...curr, JSON.parse(JSON.stringify(midiEvents))])
    setMidiEvents(next)
  }

  const initAudioCtx = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      audioCtxRef.current = new AudioCtx()
      
      const ctx = audioCtxRef.current
      delayNodeRef.current = ctx.createDelay(5.0)
      panNodeRef.current = ctx.createStereoPanner()
      
      const reverb = ctx.createConvolver()
      const rate = ctx.sampleRate
      const len = rate * 2.0
      const decay = 2.0
      const impulse = ctx.createBuffer(2, len, rate)
      for (let i = 0; i < 2; i++) {
        const channel = impulse.getChannelData(i)
        for (let j = 0; j < len; j++) {
          channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, decay)
        }
      }
      reverb.buffer = impulse
      reverbNodeRef.current = reverb

      delayNodeRef.current.delayTime.value = delayAmt
      panNodeRef.current.pan.value = panAmt

      delayNodeRef.current.connect(ctx.destination)
      panNodeRef.current.connect(ctx.destination)
      reverbNodeRef.current.connect(ctx.destination)

      if (selectedOutputId && (ctx as any).setSinkId) {
        (ctx as any).setSinkId(selectedOutputId).catch((e: any) => console.error(e))
      }
    }
    const ctx = audioCtxRef.current
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(e => console.error(e))
    }
  }

  useEffect(() => {
    if (delayNodeRef.current) {
      delayNodeRef.current.delayTime.value = delayAmt * 1.5
    }
  }, [delayAmt])

  useEffect(() => {
    if (panNodeRef.current) {
      panNodeRef.current.pan.value = panAmt
    }
  }, [panAmt])

  const routeAudioNode = (srcNode: AudioNode, trackId: string) => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const track = tracks.find(t => t.id === trackId)

    srcNode.connect(ctx.destination)

    if (track && track.fxEnabled) {
      if (delayEnabled && delayNodeRef.current) {
        srcNode.connect(delayNodeRef.current)
      }
      if (panEnabled && panNodeRef.current) {
        srcNode.connect(panNodeRef.current)
      }
      if (reverbEnabled && reverbNodeRef.current) {
        srcNode.connect(reverbNodeRef.current)
      }
    }
  }

  const playTone = (freq: number, type: string, duration: number, isAutoScheduled = false, trackId = activeTrackId) => {
    initAudioCtx()
    const ctx = audioCtxRef.current
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc.connect(gainNode)
    routeAudioNode(gainNode, trackId)

    if (type === 'rhodes-fm') {
      const mod = ctx.createOscillator()
      const modGain = ctx.createGain()
      mod.connect(modGain)
      modGain.connect(osc.frequency)
      mod.frequency.value = freq * 2
      modGain.gain.value = 500
      mod.start()
      mod.stop(ctx.currentTime + duration)
      osc.type = 'sine'
    } else {
      osc.type = type === 'basic-sine' ? 'sine' : type === 'retro-square' ? 'square' : type === 'warm-saw' ? 'sawtooth' : 'triangle'
    }

    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)

    osc.start()
    osc.stop(ctx.currentTime + duration)
  }

  const playDrum = (type: string, isAutoScheduled = false, trackId = activeTrackId) => {
    initAudioCtx()
    const ctx = audioCtxRef.current
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc.connect(gainNode)
    routeAudioNode(gainNode, trackId)

    if (type === 'kick') {
      osc.frequency.setValueAtTime(150, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3)
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    } else if (type === 'snare') {
      const bufferSize = ctx.sampleRate * 0.2
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buffer
      const filter = ctx.createBiquadFilter()
      filter.type = 'highpass'
      filter.frequency.value = 1000
      noise.connect(filter)
      filter.connect(gainNode)
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2)
      noise.start()
      noise.stop(ctx.currentTime + 0.2)
    } else {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(1200, ctx.currentTime)
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05)
      osc.start()
      osc.stop(ctx.currentTime + 0.05)
    }
  }

  const playMetronomeClick = (beatIdx: number) => {
    initAudioCtx()
    const ctx = audioCtxRef.current
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()
    osc.connect(gainNode)
    gainNode.connect(ctx.destination)
    const isDownbeat = (beatIdx % 4 === 0)
    osc.frequency.setValueAtTime(isDownbeat ? 1000 : 600, ctx.currentTime)
    osc.type = 'triangle'
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08)
    osc.start()
    osc.stop(ctx.currentTime + 0.08)
  }

  const formatTime = (ms: number) => {
    const ts = ms / 1000
    const m = Math.floor(ts / 60)
    const s = Math.floor(ts % 60)
    const ms2 = Math.floor((ts % 1) * 10)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms2}`
  }

  const updatePlayhead = () => {
    if (isPlayingRef.current || isRecordingRef.current) {
      const elapsed = performance.now() - startTimeRef.current
      playbackTimeRef.current = elapsed / 1000
      
      const timeTextEl = document.getElementById('time-text')
      if (timeTextEl) timeTextEl.textContent = formatTime(elapsed)
      
      const playheadEl = document.getElementById('playhead')
      const currentX = (elapsed / 1000) * ((bpmRef.current / 60) * 100)
      if (playheadEl) playheadEl.style.left = `${10 + currentX}px`

      if (isRecordingRef.current && activeTrackType === 'audio') {
        const elapsedRec = performance.now() - startTimeRef.current
        const currentSecondsRec = elapsedRec / 1000
        const totalDurationRec = 16 * (60 / bpmRef.current)
        const progressPercentRec = Math.min(1.0, currentSecondsRec / totalDurationRec)

        const canvases = document.querySelectorAll(`.waveform-canvas`)
        canvases.forEach(node => {
          const canvasEl = node as HTMLCanvasElement
          if (canvasEl.width !== canvasEl.clientWidth || canvasEl.height !== canvasEl.clientHeight) {
            canvasEl.width = canvasEl.clientWidth
            canvasEl.height = canvasEl.clientHeight
          }
          
          const ctx = canvasEl.getContext('2d')
          if (ctx) {
            const drawX = progressPercentRec * canvasEl.width
            let amp = Math.random() * (canvasEl.height * 0.2) + 2
            if (analyserRef.current && dataArrayRef.current) {
              analyserRef.current.getByteTimeDomainData(dataArrayRef.current as any)
              let maxVal = 0
              for (let i = 0; i < dataArrayRef.current.length; i++) {
                let v = Math.abs(dataArrayRef.current[i] - 128)
                if (v > maxVal) maxVal = v
              }
              amp = (maxVal / 128) * (canvasEl.height / 2)
              if (amp < 2) amp = 2
            }
            ctx.strokeStyle = '#ff7b89'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(drawX, canvasEl.height / 2 - amp)
            ctx.lineTo(drawX, canvasEl.height / 2 + amp)
            ctx.stroke()
          }
        })
      }

      if (isMetronomeOnRef.current) {
        const beatDuration = 60 / bpmRef.current
        const currentSeconds = elapsed / 1000
        
        if (nextMetronomeBeatIdxRef.current * beatDuration < currentSeconds - beatDuration) {
          nextMetronomeBeatIdxRef.current = Math.floor(currentSeconds / beatDuration)
        }
        
        const currentBeatTime = nextMetronomeBeatIdxRef.current * beatDuration
        if (currentBeatTime <= currentSeconds) {
          playMetronomeClick(nextMetronomeBeatIdxRef.current)
          nextMetronomeBeatIdxRef.current++
        }
      }

      if (isPlayingRef.current) {
        const currentSeconds = elapsed / 1000
        const events = midiEventsRef.current
        while (nextEventIdxRef.current < events.length && events[nextEventIdxRef.current].time <= currentSeconds) {
          const ev = events[nextEventIdxRef.current]
          if (ev.time >= playbackTimeRef.current - 0.1) {
            const tId = ev.trackId || (ev.type === 'tone' ? '2' : '3')
            const track = tracksRef.current.find(t => t.id === tId)
            const isAnySoloed = tracksRef.current.some(t => t.soloed)
            const shouldMute = track?.muted || (isAnySoloed && !track?.soloed)
            
            if (!shouldMute) {
              if (ev.type === 'tone' || ev.type === 'vocaloid') {
                playTone(ev.data.freq, ev.type === 'vocaloid' ? 'basic-sine' : ev.data.type, ev.data.duration, true, tId)
              } else if (ev.type === 'drum') {
                playDrum(ev.data.type, true, tId)
              }
            }
          }
          nextEventIdxRef.current++
        }
      }

      animationIdRef.current = requestAnimationFrame(updatePlayhead)
    }
  }

  const handlePlayToggle = () => {
    initAudioCtx()
    if (!isPlaying) {
      setIsPlaying(true)
      setIsRecording(false)
      isPlayingRef.current = true
      isRecordingRef.current = false
      startTimeRef.current = performance.now() - playbackTimeRef.current * 1000
      
      const startSecs = playbackTimeRef.current
      let idx = 0
      const events = midiEventsRef.current
      while (idx < events.length && events[idx].time < startSecs) {
        idx++
      }
      nextEventIdxRef.current = idx

      const beatDuration = 60 / bpmRef.current
      nextMetronomeBeatIdxRef.current = Math.floor(startSecs / beatDuration)
      
      tracks.forEach(track => {
        if (track.type === 'audio' || track.type === 'vocaloid') {
          const audioEl = document.getElementById(`vocal-playback-${track.id}`) as HTMLAudioElement
          if (audioEl && audioEl.src) {
            audioEl.currentTime = playbackTimeRef.current
            audioEl.play().catch(e => console.error(e))
          }
        }
      })

      setTimeout(() => {
        updatePlayhead()
      }, 50)
    } else {
      setIsPlaying(false)
      isPlayingRef.current = false
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
      
      tracks.forEach(track => {
        if (track.type === 'audio' || track.type === 'vocaloid') {
          const audioEl = document.getElementById(`vocal-playback-${track.id}`) as HTMLAudioElement
          if (audioEl) audioEl.pause()
        }
      })
    }
  }

  const handleRecordToggle = () => {
    initAudioCtx()
    if (!isRecording) {
      setIsRecording(true)
      setIsPlaying(false)
      isRecordingRef.current = true
      isPlayingRef.current = false
      startTimeRef.current = performance.now()
      playbackTimeRef.current = 0
      nextMetronomeBeatIdxRef.current = 0
      
      const canvases = document.querySelectorAll(`.waveform-canvas`)
      canvases.forEach(node => {
        const canvasEl = node as HTMLCanvasElement
        canvasEl.width = canvasEl.clientWidth
        canvasEl.height = canvasEl.clientHeight
        const ctx2d = canvasEl.getContext('2d')
        if (ctx2d) ctx2d.clearRect(0, 0, canvasEl.width, canvasEl.height)
      })

      setTimeout(() => {
        updatePlayhead()
      }, 50)
    } else {
      setIsRecording(false)
      isRecordingRef.current = false
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
    }
  }

  const handleMetronomeToggle = () => {
    initAudioCtx()
    const nextVal = !isMetronomeOn
    setIsMetronomeOn(nextVal)
    if (nextVal) {
      playMetronomeClick(0)
    }
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    const handleMouseMove = (moveEv: MouseEvent) => {
      const newHeight = window.innerHeight - moveEv.clientY
      setPanelHeight(Math.max(100, Math.min(newHeight, window.innerHeight * 0.8)))
    }
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleAddTrackWithType = (type: string) => {
    const nextId = (tracks.length + 1).toString()
    const name = type === 'vocaloid' ? `🎤 Vocaloid Singer ${nextId}` : type === 'audio' ? `Vocal Rec ${nextId}` : type === 'tone' ? `Synth ${nextId}` : `Drums ${nextId}`
    const newTrack: Track = {
      id: nextId,
      name: name,
      type: type,
      muted: false,
      soloed: false,
      fxEnabled: true
    }
    setTracks([...tracks, newTrack])
    setActiveTrackId(nextId)
    setActiveTrackType(type)
    setActiveModal(null)
  }

  const handleSelectTrack = (trackId: string, type: string) => {
    setActiveTrackId(trackId)
    setActiveTrackType(type)
  }

  const handleToggleMute = (trackId: string) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t))
  }

  const handleToggleSolo = (trackId: string) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, soloed: !t.soloed } : t))
  }

  const handleToggleFx = (trackId: string) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, fxEnabled: !t.fxEnabled } : t))
  }

  const handleRenameTrack = (trackId: string, newName: string) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, name: newName } : t))
  }

  const handleAddMidiEvent = (ev: MidiEvent) => {
    pushUndo()
    setMidiEvents(prev => [...prev, ev].sort((a, b) => a.time - b.time))
  }

  const handleUpdateMidiEvent = (noteId: string, updatedData: any) => {
    setMidiEvents(prev => prev.map(ev => {
      if (ev.id === noteId) {
        return {
          ...ev,
          ...updatedData,
          data: {
            ...ev.data,
            ...(updatedData.data || {})
          }
        }
      }
      return ev
    }))
  }

  const handleUpdateMidiEvents = (updates: { id: string, updatedData: any }[]) => {
    setMidiEvents(prev => prev.map(ev => {
      const match = updates.find(u => u.id === ev.id)
      if (match) {
        return {
          ...ev,
          ...match.updatedData,
          data: {
            ...ev.data,
            ...(match.updatedData.data || {})
          }
        }
      }
      return ev
    }))
  }

  const handleDeleteMidiEvent = (noteId: string) => {
    pushUndo()
    setMidiEvents(prev => prev.filter(ev => ev.id !== noteId))
  }

  const handleDropNoteOnTimeline = (noteId: string, trackId: string, type: string, dropX: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    const beatPx = 100
    let snapUnit = 1.0
    if (timeSig === '1/4') snapUnit = 0.25
    else if (timeSig === '1/8') snapUnit = 0.125
    
    const snapPx = beatPx * snapUnit
    const snappedDropX = Math.round(dropX / snapPx) * snapPx
    const snappedTime = Math.max(0, (snappedDropX / 100) / (bpm / 60))

    const targetType = track.type === 'tone' ? 'tone' : 'drum'
    let updatedData: any = {
      trackId,
      time: snappedTime,
      type: targetType
    }

    const currentNote = midiEvents.find(x => x.id === noteId)
    if (currentNote && currentNote.type !== targetType) {
      if (targetType === 'tone') {
        updatedData.data = {
          freq: 261.63,
          duration: 0.5,
          type: synthInstrument
        }
      } else {
        updatedData.data = {
          type: 'kick',
          duration: 0.2
        }
      }
    }

    handleUpdateMidiEvent(noteId, updatedData)
  }

  const handlePlayPianoKey = (noteName: string, oct: number, semis: number) => {
    const freq = 440 * Math.pow(2, ((semis + (oct - 4) * 12)) / 12)
    playTone(freq, synthInstrument, 0.5)

    if (isRecording) {
      const elapsed = performance.now() - startTimeRef.current
      const beatDuration = 60 / bpm
      const rawTime = (elapsed / 1000)
      const snapDiv = beatDuration / 2
      const snappedTime = Math.round(rawTime / snapDiv) * snapDiv

      handleAddMidiEvent({
        id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        trackId: activeTrackId,
        time: snappedTime,
        type: 'tone',
        data: {
          freq,
          duration: 0.5,
          type: synthInstrument
        }
      })
    }
  }

  const handlePlayDrumPad = (type: string) => {
    playDrum(type)

    if (isRecording) {
      const elapsed = performance.now() - startTimeRef.current
      const beatDuration = 60 / bpm
      const rawTime = (elapsed / 1000)
      const snapDiv = beatDuration / 2
      const snappedTime = Math.round(rawTime / snapDiv) * snapDiv

      handleAddMidiEvent({
        id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        trackId: activeTrackId,
        time: snappedTime,
        type: 'drum',
        data: {
          type,
          duration: 0.2
        }
      })
    }
  }

  const handlePlayChordPad = (chord: string, idx: number) => {
    const chordFreqs: Record<string, number[]> = {
      'C': [261.63, 329.63, 392.00],
      'Dm': [293.66, 349.23, 440.00],
      'Em': [329.63, 392.00, 493.88],
      'F': [349.23, 440.00, 523.25],
      'G': [392.00, 493.88, 587.33],
      'Am': [440.00, 523.25, 659.25],
      'Bdim': [493.88, 587.33, 698.46],
      'C5': [261.63, 392.00, 523.25],
      'Edim': [329.63, 392.00, 466.16],
      'Gm': [392.00, 466.16, 587.33],
      'Bb': [466.16, 587.33, 698.46],
      'D5': [293.66, 440.00, 587.33],
      'Ebm': [311.13, 369.99, 466.16],
      'Fdim': [349.23, 415.30, 493.88],
      'Gb': [369.99, 466.16, 554.37],
      'Abm': [415.30, 493.88, 622.25],
      'Bbm': [466.16, 554.37, 698.46],
      'Cb': [493.88, 622.25, 739.99],
      'Db': [554.37, 659.25, 830.61],
      'Eb5': [311.13, 466.16, 622.25],
      'Bm': [246.94, 293.66, 369.99],
      'F#dim': [369.99, 440.00, 523.25],
      'G5': [392.00, 587.33, 783.99],
      'A5': [440.00, 659.25, 880.00]
    }

    const freqs = chordFreqs[chord] || [261.63, 329.63, 392.00]
    freqs.forEach(freq => playTone(freq, synthInstrument, 0.8))

    if (isRecording) {
      const elapsed = performance.now() - startTimeRef.current
      const beatDuration = 60 / bpm
      const rawTime = (elapsed / 1000)
      const snapDiv = beatDuration / 2
      const snappedTime = Math.round(rawTime / snapDiv) * snapDiv

      freqs.forEach((freq, fIdx) => {
        handleAddMidiEvent({
          id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}-${fIdx}`,
          trackId: activeTrackId,
          time: snappedTime,
          type: 'tone',
          data: {
            freq,
            duration: 0.8,
            type: synthInstrument
          }
        })
      })
    }
  }

  const handleAllowMic = async () => {
    try {
      const constraints = {
        audio: selectedInputId ? { deviceId: { exact: selectedInputId } } : true
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      initAudioCtx()
      const ctx = audioCtxRef.current
      if (ctx) {
        const source = ctx.createMediaStreamSource(stream)
        
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        analyserRef.current = analyser
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
      }
      mediaRecorderRef.current = new MediaRecorder(stream)
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        const url = URL.createObjectURL(blob)
        setTrackAudioUrls(prev => ({ ...prev, [activeTrackId]: url }))

        try {
          const buf = await blob.arrayBuffer()
          const audioBuf = await audioCtxRef.current!.decodeAudioData(buf)
          const data = audioBuf.getChannelData(0)

          const drawWaveform = (canvasEl: HTMLCanvasElement, color: string) => {
            if (!canvasEl) return
            canvasEl.width = canvasEl.clientWidth
            canvasEl.height = canvasEl.clientHeight
            const cctx = canvasEl.getContext('2d')
            if (!cctx) return
            cctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
            const step = Math.ceil(data.length / canvasEl.width)
            cctx.fillStyle = color
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

          const trackCanvases = document.querySelectorAll(`.waveform-canvas`)
          trackCanvases.forEach(node => {
            drawWaveform(node as HTMLCanvasElement, '#ff7b89')
          })
        } catch (e) {
          console.error(e)
        }
      }
      setIsMicAllowed(true)
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleVocalRecord = () => {
    initAudioCtx()
    if (!isMicAllowed) {
      handleAllowMic()
      return
    }
    if (!isRecordingVocal) {
      setIsRecordingVocal(true)
      audioChunksRef.current = []
      mediaRecorderRef.current?.start()
    } else {
      setIsRecordingVocal(false)
      mediaRecorderRef.current?.stop()
    }
  }

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      const nextId = (tracks.length + 1).toString()
      const newTrackName = file.name ? file.name.replace(/\.[^/.]+$/, "") : `Audio Track ${nextId}`
      
      const newTrack: Track = {
        id: nextId,
        name: newTrackName,
        type: 'audio',
        muted: false,
        soloed: false,
        fxEnabled: true
      }
      
      setTracks(prev => [...prev, newTrack])
      setTrackAudioUrls(prev => ({ ...prev, [nextId]: url }))
      setActiveTrackId(nextId)
      setActiveTrackType('audio')

      setTimeout(async () => {
        try {
          initAudioCtx()
          const ctx = audioCtxRef.current
          if (!ctx) return
          const res = await fetch(url)
          const buf = await res.arrayBuffer()
          const audioBuf = await ctx.decodeAudioData(buf)
          const data = audioBuf.getChannelData(0)

          const drawWaveform = (canvasEl: HTMLCanvasElement, color: string) => {
            if (!canvasEl) return
            canvasEl.width = canvasEl.clientWidth
            canvasEl.height = canvasEl.clientHeight
            const cctx = canvasEl.getContext('2d')
            if (!cctx) return
            cctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
            const step = Math.ceil(data.length / canvasEl.width)
            cctx.fillStyle = color
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

          const trackCanvases = document.querySelectorAll(`.waveform-canvas`)
          trackCanvases.forEach(node => {
            drawWaveform(node as HTMLCanvasElement, '#ff7b89')
          })
        } catch (err) {
          console.error(err)
        }
      }, 200)
    }
  }

  const handleSaveWav = async () => {
    // Stop real-time transport playback and metronome sound first
    if (isPlayingRef.current) {
      setIsPlaying(false)
      isPlayingRef.current = false
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
      tracks.forEach(track => {
        if (track.type === 'audio' || track.type === 'vocaloid') {
          const audioEl = document.getElementById(`vocal-playback-${track.id}`) as HTMLAudioElement
          if (audioEl) audioEl.pause()
        }
      })
    }
    if (isRecordingRef.current) {
      setIsRecording(false)
      isRecordingRef.current = false
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
    }

    initAudioCtx()
    const ctx = audioCtxRef.current
    if (!ctx) return

    let maxT = 5.0
    midiEvents.forEach(ev => {
      if (ev.time + 1.5 > maxT) maxT = ev.time + 1.5
    })

    const sampleRate = ctx.sampleRate
    const renderDuration = maxT + 3.0
    const offlineCtx = new OfflineAudioContext(2, sampleRate * renderDuration, sampleRate)

    const offlineDelay = offlineCtx.createDelay(5.0)
    const offlinePan = offlineCtx.createStereoPanner()
    const offlineReverb = offlineCtx.createConvolver()
    
    if (reverbNodeRef.current && reverbNodeRef.current.buffer) {
      offlineReverb.buffer = reverbNodeRef.current.buffer
    }

    offlineDelay.delayTime.value = delayAmt * 1.5
    offlinePan.pan.value = panAmt

    offlineDelay.connect(offlineCtx.destination)
    offlinePan.connect(offlineCtx.destination)
    offlineReverb.connect(offlineCtx.destination)

    const routeOfflineAudioNode = (srcNode: AudioNode, trackId: string) => {
      const track = tracks.find(t => t.id === trackId)
      srcNode.connect(offlineCtx.destination)
      if (track && track.fxEnabled) {
        if (delayEnabled) srcNode.connect(offlineDelay)
        if (panEnabled) srcNode.connect(offlinePan)
        if (reverbEnabled) srcNode.connect(offlineReverb)
      }
    }

    midiEvents.forEach(ev => {
      const tId = ev.trackId || (ev.type === 'tone' ? '2' : '3')
      const track = tracks.find(t => t.id === tId)
      const isAnySoloed = tracks.some(t => t.soloed)
      const shouldMute = track?.muted || (isAnySoloed && !track?.soloed)
      if (shouldMute) return

      if (ev.type === 'tone') {
        const osc = offlineCtx.createOscillator()
        const gainNode = offlineCtx.createGain()
        osc.connect(gainNode)
        routeOfflineAudioNode(gainNode, tId)

        if (ev.data.type === 'rhodes-fm') {
          const mod = offlineCtx.createOscillator()
          const modGain = offlineCtx.createGain()
          mod.connect(modGain)
          modGain.connect(osc.frequency)
          mod.frequency.value = ev.data.freq * 2
          modGain.gain.value = 500
          mod.start(ev.time)
          mod.stop(ev.time + ev.data.duration)
          osc.type = 'sine'
        } else {
          osc.type = ev.data.type === 'basic-sine' ? 'sine' : ev.data.type === 'retro-square' ? 'square' : ev.data.type === 'warm-saw' ? 'sawtooth' : 'triangle'
        }

        osc.frequency.setValueAtTime(ev.data.freq, ev.time)
        gainNode.gain.setValueAtTime(0.12, ev.time)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ev.time + ev.data.duration)

        osc.start(ev.time)
        osc.stop(ev.time + ev.data.duration)
      } else if (ev.type === 'drum') {
        const osc = offlineCtx.createOscillator()
        const gainNode = offlineCtx.createGain()
        osc.connect(gainNode)
        routeOfflineAudioNode(gainNode, tId)

        if (ev.data.type === 'kick') {
          osc.frequency.setValueAtTime(150, ev.time)
          osc.frequency.exponentialRampToValueAtTime(0.01, ev.time + 0.3)
          gainNode.gain.setValueAtTime(0.4, ev.time)
          gainNode.gain.exponentialRampToValueAtTime(0.0001, ev.time + 0.3)
          osc.start(ev.time)
          osc.stop(ev.time + 0.3)
        } else if (ev.data.type === 'snare') {
          const bufferSize = sampleRate * 0.2
          const buffer = offlineCtx.createBuffer(1, bufferSize, sampleRate)
          const data = buffer.getChannelData(0)
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1
          }
          const noise = offlineCtx.createBufferSource()
          noise.buffer = buffer
          const filter = offlineCtx.createBiquadFilter()
          filter.type = 'highpass'
          filter.frequency.value = 1000
          noise.connect(filter)
          filter.connect(gainNode)
          gainNode.gain.setValueAtTime(0.2, ev.time)
          gainNode.gain.exponentialRampToValueAtTime(0.0001, ev.time + 0.2)
          noise.start(ev.time)
          noise.stop(ev.time + 0.2)
        } else {
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(1200, ev.time)
          gainNode.gain.setValueAtTime(0.08, ev.time)
          gainNode.gain.exponentialRampToValueAtTime(0.0001, ev.time + 0.05)
          osc.start(ev.time)
          osc.stop(ev.time + 0.05)
        }
      }
    })

    for (const track of tracks) {
      if (track.type === 'audio' || track.type === 'vocaloid') {
        const isAnySoloed = tracks.some(t => t.soloed)
        const shouldMute = track.muted || (isAnySoloed && !track.soloed)
        if (shouldMute) continue

        const url = trackAudioUrls[track.id]
        if (url) {
          try {
            const res = await fetch(url)
            const arrayBuf = await res.arrayBuffer()
            const audioBuf = await ctx.decodeAudioData(arrayBuf)
            
            const sourceNode = offlineCtx.createBufferSource()
            sourceNode.buffer = audioBuf
            routeOfflineAudioNode(sourceNode, track.id)
            sourceNode.start(0)
          } catch (e) {
            console.error(e)
          }
        }
      }
    }

    try {
      const renderedBuffer = await offlineCtx.startRendering()
      const wavBlob = bufferToWav(renderedBuffer)
      const downloadUrl = URL.createObjectURL(wavBlob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `${projectTitle.toLowerCase().replace(/\s+/g, '_')}_session.wav`
      a.click()
    } catch (e) {
      console.error(e)
    }
  }

  const handleTranspose = (semitones: number) => {
    pushUndo()
    setMidiEvents(prev => prev.map(ev => {
      if (ev.type === 'tone') {
        return {
          ...ev,
          data: {
            ...ev.data,
            freq: ev.data.freq * Math.pow(2, semitones / 12)
          }
        }
      }
      return ev
    }))
  }

  const handleSkipPrevious = () => {
    playbackTimeRef.current = 0
    nextEventIdxRef.current = 0
    nextMetronomeBeatIdxRef.current = 0
    
    if (isPlaying || isRecording) {
      startTimeRef.current = performance.now()
    }
    
    const playheadEl = document.getElementById('playhead')
    if (playheadEl) playheadEl.style.left = '10px'
    const timeTextEl = document.getElementById('time-text')
    if (timeTextEl) timeTextEl.textContent = '00:00.0'
  }

  const handleSkipNext = () => {
    let maxT = 0
    midiEvents.forEach(ev => { if (ev.time > maxT) maxT = ev.time })
    
    playbackTimeRef.current = maxT
    if (isPlaying || isRecording) {
      startTimeRef.current = performance.now() - maxT * 1000
    }
    
    const currentX = maxT * (bpm / 60) * 100
    const playheadEl = document.getElementById('playhead')
    if (playheadEl) playheadEl.style.left = `${10 + currentX}px`
    const timeTextEl = document.getElementById('time-text')
    if (timeTextEl) timeTextEl.textContent = formatTime(maxT * 1000)
  }

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.getAttribute('contenteditable') === 'true') return
      
      const keyMap3: Record<string, number> = {
        'z': 0, 's': 1, 'x': 2, 'd': 3, 'c': 4, 'v': 5, 'g': 6, 'b': 7, 'h': 8, 'n': 9, 'j': 10, 'm': 11
      }
      const keyMap4: Record<string, number> = {
        'q': 0, '2': 1, 'w': 2, '3': 3, 'e': 4, 'r': 5, '5': 6, 't': 7, '6': 8, 'y': 9, '7': 10, 'u': 11
      }
      const drumMap = ['1', '2', '3', '4', '5', '6', '7', '8']

      if (e.key === ' ') {
        e.preventDefault()
        handlePlayToggle()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handleSkipPrevious()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleSkipNext()
      } else if (keyMap3[e.key] !== undefined) {
        handlePlayPianoKey(e.key.toUpperCase(), 3, keyMap3[e.key])
      } else if (keyMap4[e.key] !== undefined) {
        handlePlayPianoKey(e.key.toUpperCase(), 4, keyMap4[e.key])
      } else if (drumMap.includes(e.key)) {
        const drumTypes = ['kick', 'snare', 'hihat', 'openhat', 'clap', 'tom1', 'tom2', 'crash']
        handlePlayDrumPad(drumTypes[parseInt(e.key) - 1])
      } else if (e.shiftKey && e.key === 'ArrowUp') {
        handleTranspose(1)
      } else if (e.shiftKey && e.key === 'ArrowDown') {
        handleTranspose(-1)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [activeTrackId, synthInstrument, isRecording, midiEvents, isPlaying])

  return (
    <div className="daw-container">
      <TopBar 
        projectTitle={projectTitle}
        setProjectTitle={setProjectTitle}
        isPlaying={isPlaying}
        isRecording={isRecording}
        isMetronomeOn={isMetronomeOn}
        bpm={bpm}
        setBpm={setBpm}
        projectKey={projectKey}
        setProjectKey={setProjectKey}
        timeSig={timeSig}
        setTimeSig={setTimeSig}
        onPlayToggle={handlePlayToggle}
        onRecordToggle={handleRecordToggle}
        onMetronomeToggle={handleMetronomeToggle}
        onOpenModal={setActiveModal}
        onSkipPrevious={handleSkipPrevious}
        onSkipNext={handleSkipNext}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onFileImport={handleFileImport}
        onSaveWav={handleSaveWav}
      />

      <main className="main-content">
        <TrackList 
          tracks={tracks}
          activeTrackId={activeTrackId}
          onSelectTrack={handleSelectTrack}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
          onToggleFx={handleToggleFx}
          onRenameTrack={handleRenameTrack}
          onAddTrack={() => setActiveModal('addTrack')}
          onShowFxPanel={() => setActiveTab('fx')}
        />
        <Timeline 
          tracks={tracks}
          activeTrackId={activeTrackId}
          onSelectTrack={handleSelectTrack}
          midiEvents={midiEvents}
          bpm={bpm}
          onDropNoteOnTimeline={handleDropNoteOnTimeline}
          onOpenMidiEditor={() => setActiveTab('midi')}
          trackAudioUrls={trackAudioUrls}
        />
      </main>

      <BottomPanel 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        panelHeight={panelHeight}
        onResizeStart={handleResizeStart}
        panelTitle={activeTab === 'instrument' ? 'Track Instrument Settings' : activeTab === 'fx' ? 'FX Routing Effects Chain' : 'MIDI Step Sequencer Roll'}
      >
        {activeTab === 'instrument' && (
          <InstrumentPanel 
            trackType={activeTrackType}
            synthInstrument={synthInstrument}
            setSynthInstrument={setSynthInstrument}
            projectKey={projectKey}
            onPlayPianoKey={handlePlayPianoKey}
            onPlayDrumPad={handlePlayDrumPad}
            onPlayChordPad={handlePlayChordPad}
            isRecordingVocal={isRecordingVocal}
            onToggleVocalRecord={handleToggleVocalRecord}
            isMicAllowed={isMicAllowed}
            onAllowMic={handleAllowMic}
            audioInputs={audioInputs}
            audioOutputs={audioOutputs}
            selectedInputId={selectedInputId}
            setSelectedInputId={setSelectedInputId}
            selectedOutputId={selectedOutputId}
            setSelectedOutputId={setSelectedOutputId}
            activeTrackId={activeTrackId}
            midiEvents={midiEvents}
            setTrackAudioUrls={setTrackAudioUrls}
            setMidiEvents={setMidiEvents}
            vocaloidFolder={vocaloidFolder}
          />
        )}
        {activeTab === 'fx' && (
          <FxPanel 
            delayAmt={delayAmt}
            setDelayAmt={setDelayAmt}
            panAmt={panAmt}
            setPanAmt={setPanAmt}
            reverbAmt={reverbAmt}
            setReverbAmt={setReverbAmt}
            delayEnabled={delayEnabled}
            setDelayEnabled={setDelayEnabled}
            panEnabled={panEnabled}
            setPanEnabled={setPanEnabled}
            reverbEnabled={reverbEnabled}
            setReverbEnabled={setReverbEnabled}
          />
        )}
        {activeTab === 'midi' && (
          <MidiEditor 
            tracks={tracks}
            activeTrackId={activeTrackId}
            midiEvents={midiEvents}
            bpm={bpm}
            timeSig={timeSig}
            onAddMidiEvent={handleAddMidiEvent}
            onUpdateMidiEvent={handleUpdateMidiEvent}
            onUpdateMidiEvents={handleUpdateMidiEvents}
            onDeleteMidiEvent={handleDeleteMidiEvent}
          />
        )}
      </BottomPanel>

      <Modal 
        isOpen={activeModal === 'addTrack'} 
        title="Add New Track" 
        onClose={() => setActiveModal(null)}
      >
        <div className="modal-item" onClick={() => handleAddTrackWithType('vocaloid')} style={{ background: 'rgba(255, 46, 99, 0.04)', borderColor: 'rgba(255, 46, 99, 0.2)' }}>
          <div className="modal-item-info">
            <span className="modal-item-title" style={{ color: '#ff2e63', fontWeight: 'bold' }}>🎤 UTAU Vocaloid Track</span>
            <span className="modal-item-desc">Synthesize virtual Japanese/English singers with full text-to-speech lyrics & MIDI</span>
          </div>
          <i className="bx bx-music modal-item-action" style={{ color: '#ff2e63' }} />
        </div>
        <div className="modal-item" onClick={() => handleAddTrackWithType('audio')}>
          <div className="modal-item-info">
            <span className="modal-item-title">Vocal Recorder Track</span>
            <span className="modal-item-desc">Record external mic input or import audio sample tracks</span>
          </div>
          <i className="bx bx-microphone modal-item-action" />
        </div>
        <div className="modal-item" onClick={() => { setActiveModal(null); const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*'; inp.onchange = (e: any) => handleFileImport(e); inp.click(); }}>
          <div className="modal-item-info">
            <span className="modal-item-title">Import Audio File Track</span>
            <span className="modal-item-desc">Pick an audio file from your device to load onto its own track</span>
          </div>
          <i className="bx bx-file modal-item-action" />
        </div>
        <div className="modal-item" onClick={() => handleAddTrackWithType('tone')}>
          <div className="modal-item-info">
            <span className="modal-item-title">Virtual Synthesizer Track</span>
            <span className="modal-item-desc">Synthesize woodblock or Rhodes keys step sequencer</span>
          </div>
          <i className="bx bxs-piano modal-item-action" />
        </div>
        <div className="modal-item" onClick={() => handleAddTrackWithType('drum')}>
          <div className="modal-item-info">
            <span className="modal-item-title">Drum Sampler Track</span>
            <span className="modal-item-desc">Trigger drum pads using physical or touch controls</span>
          </div>
          <i className="bx bx-disc modal-item-action" />
        </div>
      </Modal>

      <Modal 
        isOpen={activeModal === 'edit'} 
        title="Edit Tools" 
        onClose={() => setActiveModal(null)}
      >
        <div className="modal-item" onClick={() => { setActiveModal(null); pushUndo(); setMidiEvents([]); }}>
          <div className="modal-item-info">
            <span className="modal-item-title">Clear Sequencer</span>
            <span className="modal-item-desc">Clear all notes from piano roll and timeline</span>
          </div>
          <i className="bx bx-trash modal-item-action" style={{ color: '#e74c3c' }} />
        </div>
        <div className="modal-item" onClick={() => { setActiveModal(null); handleTranspose(1); }}>
          <div className="modal-item-info">
            <span className="modal-item-title">Transpose +1 Semitone</span>
            <span className="modal-item-desc">Shift all synth notes up by one half step</span>
          </div>
          <i className="bx bx-trending-up modal-item-action" />
        </div>
        <div className="modal-item" onClick={() => { setActiveModal(null); handleTranspose(-1); }}>
          <div className="modal-item-info">
            <span className="modal-item-title">Transpose -1 Semitone</span>
            <span className="modal-item-desc">Shift all synth notes down by one half step</span>
          </div>
          <i className="bx bx-trending-down modal-item-action" />
        </div>
      </Modal>

      <Modal 
        isOpen={activeModal === 'view'} 
        title="View Configuration" 
        onClose={() => setActiveModal(null)}
      >
        <div className="modal-item" onClick={() => { setActiveModal(null); const grid = document.getElementById('pr-grid'); if (grid) grid.classList.toggle('high-contrast-grid'); }}>
          <div className="modal-item-info">
            <span className="modal-item-title">Toggle High Contrast Grid</span>
            <span className="modal-item-desc">Make vertical grid subdivisions easier to see</span>
          </div>
          <i className="bx bx-grid-alt modal-item-action" />
        </div>
        <div className="modal-item" onClick={() => { setActiveModal(null); setActiveTab(activeTab ? '' : 'instrument'); }}>
          <div className="modal-item-info">
            <span className="modal-item-title">{activeTab ? 'Hide Bottom Panel' : 'Show Bottom Panel'}</span>
            <span className="modal-item-desc">Toggle the bottom editor and settings panel visibility</span>
          </div>
          <i className="bx bx-dock-bottom modal-item-action" />
        </div>
      </Modal>

      <Modal 
        isOpen={activeModal === 'settings'} 
        title="Project Settings" 
        onClose={() => setActiveModal(null)}
      >
        <div className="modal-item" style={{ cursor: 'default' }}>
          <div className="modal-item-info">
            <span className="modal-item-title">Sample Rate</span>
            <span className="modal-item-desc">Dynamic output sample rate configured by web audio context</span>
          </div>
          <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '13px' }}>48000 Hz</span>
        </div>
        <div className="modal-item" style={{ cursor: 'default' }}>
          <div className="modal-item-info">
            <span className="modal-item-title">Synthesizer Engine</span>
            <span className="modal-item-desc">Polyphony, envelope triggers, and filter parameters</span>
          </div>
          <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '13px' }}>Active</span>
        </div>
        <div className="modal-item" onClick={handleSelectVocaloidFolder}>
          <div className="modal-item-info">
            <span className="modal-item-title">UTAU/Vocaloid Voicebank Folder</span>
            <span className="modal-item-desc">{vocaloidFolder || 'Workspace Root (Default)'}</span>
          </div>
          <i className="bx bx-folder modal-item-action" style={{ color: 'var(--accent)' }} />
        </div>
      </Modal>

      <Modal 
        isOpen={activeModal === 'help'} 
        title="Mini-DAW User Manual" 
        onClose={() => setActiveModal(null)}
      >
        <div className="manual-section" style={{ fontSize: '13px', lineHeight: 1.6, color: '#ddd', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p>Welcome to <strong>Mini DAW Studio</strong>, a premium, low-latency web-based music production system!</p>
          <div>
            <h4 style={{ color: '#fff', marginBottom: '4px', fontWeight: 600 }}><i className="bx bxs-keyboard" style={{ color: 'var(--accent)' }} /> Physical Keyboards Play</h4>
            <p style={{ color: '#aaa', fontSize: '12px' }}>Use your physical keyboard to play notes in Octave 3 (keys <strong>Z X C V B N M , . /</strong>) and Octave 4 (keys <strong>A W S E D F T G Y H U J</strong>).</p>
          </div>
          <div>
            <h4 style={{ color: '#fff', marginBottom: '4px', fontWeight: 600 }}><i className="bx bx-grid-alt" style={{ color: 'var(--accent)' }} /> Grid Snapping</h4>
            <p style={{ color: '#aaa', fontSize: '12px' }}>Change snap resolution in the top bar. Double-click or double-tap inside the MIDI Editor grid to add notes snapped to these divisions.</p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
