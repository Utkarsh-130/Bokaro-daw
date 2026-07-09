import React, { useEffect, useRef } from 'react'
import Knob from './Knob.tsx'

interface Track {
  id: string
  name: string
  type: string
  muted: boolean
  soloed: boolean
  fxEnabled: boolean
  color?: string
  volume?: number
  pan?: number
}

interface TrackNodes {
  gainNode: GainNode;
  pannerNode?: StereoPannerNode;
  analyserNode: AnalyserNode;
}

interface MixerPanelProps {
  tracks: Track[]
  trackNodesRef: React.MutableRefObject<Record<string, TrackNodes>>
  masterAnalyserRef: React.MutableRefObject<AnalyserNode | null>
  onVolumeChange: (id: string, volume: number) => void
  onPanChange: (id: string, pan: number) => void
  onToggleMute: (id: string) => void
  onToggleSolo: (id: string) => void
  masterVolume: number
  setMasterVolume: (volume: number) => void
}

export default function MixerPanel({
  tracks,
  trackNodesRef,
  masterAnalyserRef,
  onVolumeChange,
  onPanChange,
  onToggleMute,
  onToggleSolo,
  masterVolume,
  setMasterVolume
}: MixerPanelProps) {
  
  const meterRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const masterMeterRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let animationId: number
    const dataArray = new Float32Array(256)

    const minDb = -60
    const maxDb = 5 // some headroom

    const getMeterHeight = (rms: number) => {
      if (rms === 0) return 0
      let db = 20 * Math.log10(rms)
      if (db < minDb) return 0
      if (db > maxDb) return 100
      return ((db - minDb) / (maxDb - minDb)) * 100
    }

    const updateMeters = () => {
      if (masterAnalyserRef.current && masterMeterRef.current) {
        masterAnalyserRef.current.getFloatTimeDomainData(dataArray)
        let sum = 0
        for(let i=0; i<dataArray.length; i++) sum += dataArray[i] * dataArray[i]
        const rms = Math.sqrt(sum / dataArray.length)
        masterMeterRef.current.style.height = `${getMeterHeight(rms)}%`
      }
      
      tracks.forEach(track => {
        const nodes = trackNodesRef.current[track.id]
        const meterEl = meterRefs.current[track.id]
        if (nodes && meterEl) {
          nodes.analyserNode.getFloatTimeDomainData(dataArray)
          let sum = 0
          for(let i=0; i<dataArray.length; i++) sum += dataArray[i] * dataArray[i]
          const rms = Math.sqrt(sum / dataArray.length)
          meterEl.style.height = `${getMeterHeight(rms)}%`
        }
      })

      animationId = requestAnimationFrame(updateMeters)
    }
    
    updateMeters()
    return () => cancelAnimationFrame(animationId)
  }, [tracks, trackNodesRef, masterAnalyserRef])

  return (
    <div className="mixer-container">
      <div className="mixer-tracks-scroll">
        {tracks.map((track, i) => (
          <div key={track.id} className="mixer-channel">
            <div className="mixer-channel-header" title={track.name} style={{ background: track.color || '#333' }}>
              {track.name}
            </div>
            
            <div className="mixer-pan-knob-container">
              <Knob 
                min={-1} 
                max={1} 
                value={track.pan ?? 0} 
                onChange={(val) => onPanChange(track.id, val)} 
                displayValue=""
              />
            </div>

            <div className="mixer-fader-container">
              <div className="mixer-fader-track" />
              <input 
                type="range" 
                className="mixer-fader" 
                min="0" max="2" step="0.01" 
                value={track.volume ?? 1} 
                onChange={e => onVolumeChange(track.id, parseFloat(e.target.value))}
              />
              <div className="mixer-meter-bg">
                <div 
                  className="mixer-meter-fill" 
                  ref={el => meterRefs.current[track.id] = el}
                />
              </div>
            </div>

            <div className="mixer-channel-footer">
               <div 
                 className={`mixer-activator ${!track.muted ? 'active' : ''}`}
                 onClick={() => onToggleMute(track.id)}
               >
                 <div className="mixer-activator-inner" />
               </div>
               
               <div className="mixer-track-number">
                 {i + 1}
               </div>

               <div 
                 className={`mixer-btn-s ${track.soloed ? 'active' : ''}`}
                 onClick={() => onToggleSolo(track.id)}
               >
                 S
               </div>
            </div>
          </div>
        ))}

        {/* Master Section */}
        <div className="mixer-channel master">
          <div className="mixer-channel-header" title="Master">Master</div>
          
          <div className="mixer-pan-knob-container">
            <Knob 
              min={-1} 
              max={1} 
              value={0} 
              onChange={() => {}} 
              displayValue=""
            />
          </div>

          <div className="mixer-fader-container">
            <div className="mixer-fader-track" />
            <input 
              type="range" 
              className="mixer-fader" 
              min="0" max="2" step="0.01" 
              value={masterVolume} 
              onChange={e => setMasterVolume(parseFloat(e.target.value))}
            />
            <div className="mixer-meter-bg">
              <div 
                className="mixer-meter-fill" 
                ref={masterMeterRef}
              />
            </div>
          </div>

          <div className="mixer-channel-footer">
             <div className="mixer-activator active" style={{ cursor: 'default' }}>
               <div className="mixer-activator-inner" />
             </div>
             
             <div className="mixer-track-number master">
               M
             </div>

             <div className="mixer-btn-s" style={{ visibility: 'hidden' }}>S</div>
          </div>
        </div>
      </div>
    </div>
  )
}
