import React, { useRef, useState, useEffect } from 'react'

interface MidiEditorProps {
  tracks: any[]
  activeTrackId: string
  midiEvents: any[]
  bpm: number
  timeSig: string
  onAddMidiEvent: (ev: any) => void
  onUpdateMidiEvent: (id: string, updatedData: any) => void
  onUpdateMidiEvents: (updates: { id: string, updatedData: any }[]) => void
  onDeleteMidiEvent: (id: string) => void
  trackAudioUrls?: Record<string, string>
}

export default function MidiEditor({
  tracks,
  activeTrackId,
  midiEvents,
  bpm,
  timeSig,
  onAddMidiEvent,
  onUpdateMidiEvent,
  onUpdateMidiEvents,
  onDeleteMidiEvent,
  trackAudioUrls
}: MidiEditorProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())

  //  // Standard 88 keys piano range: C8 (108) down to A0 (21)
  const pitches = Array.from({ length: 88 }, (_, i) => 108 - i)

  useEffect(() => {
    if (activeTrackId && trackAudioUrls?.[activeTrackId]) {
      const url = trackAudioUrls[activeTrackId]
      const drawWaveform = async () => {
        try {
          const res = await fetch(url)
          const arrayBuf = await res.arrayBuffer()
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
          const ctx = new AudioCtx()
          const audioBuf = await ctx.decodeAudioData(arrayBuf)
          ctx.close()
          const data = audioBuf.getChannelData(0)
          
          const canvasEl = document.getElementById('editor-waveform-canvas') as HTMLCanvasElement
          if (canvasEl) {
            const audioDuration = audioBuf.duration
            const audioBeats = audioDuration * (bpm / 60)
            const pixelWidth = audioBeats * 100
            
            canvasEl.width = pixelWidth || 100
            canvasEl.height = 40
            canvasEl.style.width = `${pixelWidth}px`
            const cctx = canvasEl.getContext('2d')
            if (cctx) {
              cctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
              const step = Math.ceil(data.length / canvasEl.width)
              cctx.fillStyle = '#ffffff'
              for (let i = 0; i < canvasEl.width; i++) {
                let min = 1.0, max = -1.0
                for (let j = 0; j < step; j++) {
                  const val = data[(i * step) + j]
                  if (val < min) min = val
                  if (val > max) max = val
                }
                cctx.fillRect(i, (1 + min) * 20, 1, Math.max(1, (max - min) * 20))
              }
            }
          }
        } catch(e) {}
      }
      drawWaveform()
    }
  }, [trackAudioUrls, activeTrackId])

  useEffect(() => {
    if (containerRef.current) {
      // Scroll to center around C4-C5 initially as the standard used in like other daws like lmms
    
      containerRef.current.scrollTop = 600
    }
  }, [])

  const getNoteName = (p: number) => {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const name = names[p % 12]
    const oct = Math.floor(p / 12) - 1
    return `${name}${oct}`
  }

  const isBlackKey = (p: number) => {
    const rem = p % 12
    return [1, 3, 6, 8, 10].includes(rem)
  }

  const activeTrack = tracks.find(t => t.id === activeTrackId)
  const isVocaloidTrack = activeTrack && activeTrack.type === 'vocaloid'

  const handleGridDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const beatDuration = 60 / bpm
    const rawTime = (clickX / 100) * beatDuration

    let snapUnit = 1.0
    if (timeSig === '1/2') snapUnit = 0.5
    else if (timeSig === '1/4') snapUnit = 0.25
    else if (timeSig === '1/8') snapUnit = 0.125
    else if (timeSig === '1') snapUnit = 1.0
    else if (timeSig === 'Off') snapUnit = 0.001
    
    const snapDiv = beatDuration * snapUnit
    const snappedTime = Math.round(rawTime / snapDiv) * snapDiv

    const pitchIdx = Math.floor(clickY / 20)
    const pitch = 108 - pitchIdx
    const freq = 440 * Math.pow(2, (pitch - 69) / 12)

    onAddMidiEvent({
      id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      trackId: activeTrackId,
      time: snappedTime,
      type: isVocaloidTrack ? 'vocaloid' : 'tone',
      data: {
        freq,
        duration: 0.5,
        type: isVocaloidTrack ? 'vocaloid' : 'basic-sine',
        lyric: isVocaloidTrack ? 'a' : undefined
      }
    })
  }

  const activeNotes = midiEvents.filter(ev => ev.trackId === activeTrackId && ev.data && typeof ev.data.freq === 'number')

  const handleNoteMouseDown = (e: React.MouseEvent<HTMLDivElement>, note: any) => {
    e.stopPropagation()
    e.preventDefault()

    let nextSelection = new Set(selectedNoteIds)
    if (e.ctrlKey) {
      if (nextSelection.has(note.id)) {
        nextSelection.delete(note.id)
      } else {
        nextSelection.add(note.id)
      }
    } else {
      if (!nextSelection.has(note.id)) {
        nextSelection = new Set([note.id])
      }
    }
    setSelectedNoteIds(nextSelection)

    const startX = e.clientX
    const startY = e.clientY

    const initialNotesState = activeNotes
      .filter(n => nextSelection.has(n.id))
      .map(n => {
        const freq = n.data.freq
        const pitch = Math.round(12 * Math.log2(freq / 440) + 69)
        return {
          id: n.id,
          startTime: n.time,
          initialFreq: freq,
          initialPitch: pitch,
          initialDuration: n.data.duration,
          data: n.data
        }
      })

    const handleMouseMove = (moveEv: MouseEvent) => {
      const deltaX = moveEv.clientX - startX
      const deltaY = moveEv.clientY - startY

      const beatDuration = 60 / bpm
      const deltaTime = (deltaX / 100) * beatDuration

      let snapUnit = 1.0
      if (timeSig === '1/2') snapUnit = 0.5
      else if (timeSig === '1/4') snapUnit = 0.25
      else if (timeSig === '1/8') snapUnit = 0.125
      else if (timeSig === '1') snapUnit = 1.0
      else if (timeSig === 'Off') snapUnit = 0.001
      
      const snapDiv = beatDuration * snapUnit

      const isResizing = moveEv.shiftKey

      const updates = initialNotesState.map(item => {
        if (isResizing) {
          const newDuration = Math.max(snapDiv, Math.round((item.initialDuration + deltaTime) / snapDiv) * snapDiv)
          return {
            id: item.id,
            updatedData: {
              data: {
                ...item.data,
                duration: newDuration
              }
            }
          }
        } else {
          const rawNewTime = item.startTime + deltaTime
          const newTime = Math.max(0, Math.round(rawNewTime / snapDiv) * snapDiv)

          const deltaPitch = -Math.round(deltaY / 20)
          const newPitch = Math.max(21, Math.min(108, item.initialPitch + deltaPitch))
          const newFreq = 440 * Math.pow(2, (newPitch - 69) / 12)

          return {
            id: item.id,
            updatedData: {
              time: newTime,
              data: {
                ...item.data,
                freq: newFreq
              }
            }
          }
        }
      })

      if (updates.length > 0) {
        onUpdateMidiEvents(updates.map(u => ({ id: u.id, updatedData: u.updatedData })))
      }
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      if (isVocaloidTrack) {
        window.dispatchEvent(new CustomEvent('request-vocaloid-render'))
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  let maxTime = 16 * (60 / bpm)
  activeNotes.forEach(ev => {
    const end = ev.time + (ev.data?.duration || 0)
    if (end > maxTime) maxTime = end
  })
  const totalBeats = Math.ceil(maxTime * (bpm / 60)) + 4

  return (
    <div className="piano-roll-container" ref={containerRef}>
      <div className="pr-keys">
        {pitches.map((p) => (
          <div 
            key={p} 
            className={`pr-key ${isBlackKey(p) ? 'black' : 'white'}`}
            style={{ height: '20px' }}
          >
            {getNoteName(p)}
          </div>
        ))}
      </div>

      <div 
        ref={gridRef}
        className="pr-grid" 
        id="pr-grid"
        onMouseDown={() => setSelectedNoteIds(new Set())}
        onDoubleClick={handleGridDoubleClick}
        style={{ height: `${pitches.length * 20}px`, minWidth: `${Math.max(800, totalBeats * 100)}px` }}
      >
        {pitches.map((p) => (
          <div 
            key={p} 
            className="pr-grid-row"
            style={{ 
              height: '20px', 
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              background: isBlackKey(p) ? 'rgba(0,0,0,0.15)' : ''
            }}
          />
        ))}

        {Array.from({ length: Math.max(totalBeats * 8, 400) }).map((_, subIdx) => {
          const isBeat = subIdx % 8 === 0
          const isHalfBeat = subIdx % 4 === 0
          const isQuarterBeat = subIdx % 2 === 0
          const isEighthBeat = true
          const leftPx = subIdx * 12.5
          
          let shouldRender = false
          if (timeSig === '1') shouldRender = isBeat
          else if (timeSig === '1/2') shouldRender = isHalfBeat
          else if (timeSig === '1/4') shouldRender = isQuarterBeat
          else if (timeSig === '1/8') shouldRender = isEighthBeat
          else if (timeSig === 'Off') shouldRender = false
          else shouldRender = isQuarterBeat
          
          if (!shouldRender) return null
          
          return (
            <div 
              key={`v-line-${subIdx}`}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${leftPx}px`,
                width: '1px',
                borderLeft: isBeat 
                  ? '1px solid rgba(255, 255, 255, 0.1)' 
                  : isHalfBeat
                    ? '1px solid rgba(255, 255, 255, 0.05)'
                    : '1px dotted rgba(255, 255, 255, 0.02)',
                pointerEvents: 'none'
              }}
            />
          )
        })}

        {activeNotes.map((note) => {
          const notePitch = Math.round(12 * Math.log2(note.data.freq / 440) + 69)
          const pitchIdx = 108 - notePitch
          const noteTop = pitchIdx * 20 + 3
          const beatDuration = 60 / bpm
          const noteLeft = (note.time / beatDuration) * 100
          const noteWidth = (note.data.duration / beatDuration) * 100
          const isSelected = selectedNoteIds.has(note.id)

          return (
            <div 
              key={note.id}
              className={`pr-note ${isSelected ? 'selected' : ''}`}
              onMouseDown={(e) => handleNoteMouseDown(e, note)}
              onDoubleClick={(e) => {
                e.stopPropagation()
                if (isVocaloidTrack) {
                  ;(window as any).__isPromptOpen = true
                  const nextLyric = prompt('Enter Lyric / Phoneme for Note:', note.data.lyric || 'a')
                  ;(window as any).__isPromptOpen = false
                  if (nextLyric !== null) {
                    onUpdateMidiEvent(note.id, {
                      data: {
                        ...note.data,
                        lyric: nextLyric
                      }
                    })
                    window.dispatchEvent(new CustomEvent('request-vocaloid-render'))
                  }
                }
              }}
              onContextMenu={(e) => { e.preventDefault(); onDeleteMidiEvent(note.id); }}
              style={{
                left: `${noteLeft}px`,
                top: `${noteTop}px`,
                width: `${noteWidth}px`,
                height: isVocaloidTrack ? '14px' : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isVocaloidTrack ? '#5ccfe6' : activeTrack?.color || 'var(--accent)',
                boxShadow: isSelected 
                  ? '0 0 12px rgba(255, 255, 255, 0.6)' 
                  : (isVocaloidTrack ? '0 2px 8px rgba(92, 207, 230, 0.4)' : undefined),
                color: isVocaloidTrack ? '#ffffff' : 'transparent',
                fontSize: '11px',
                fontWeight: 'bold',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                padding: '0 4px',
                border: isSelected 
                  ? '2px solid #ffffff' 
                  : '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: isVocaloidTrack ? '4px' : '2px',
                zIndex: 20
              }}
            >
              {isVocaloidTrack ? (note.data.lyric || 'a') : ''}
            </div>
          )
        })}

        {isVocaloidTrack && activeNotes.length > 0 && (
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10, overflow: 'visible' }}>
            {(() => {
              const sortedNotes = [...activeNotes].sort((a, b) => a.time - b.time)
              let pathData = ''
              const beatDuration = 60 / bpm
              sortedNotes.forEach((note, idx) => {
                const notePitch = Math.round(12 * Math.log2(note.data.freq / 440) + 69)
                const pitchIdx = 108 - notePitch
                const noteTop = pitchIdx * 20 + 3
                const noteCenterY = noteTop + 7 
                
                const noteLeft = (note.time / beatDuration) * 100
                const noteWidth = (note.data.duration / beatDuration) * 100
                const noteRight = noteLeft + noteWidth
                
                if (idx === 0) {
                  pathData += `M ${noteLeft} ${noteCenterY} L ${noteRight} ${noteCenterY} `
                } else {
                  const prevNote = sortedNotes[idx - 1]
                  const prevPitch = Math.round(12 * Math.log2(prevNote.data.freq / 440) + 69)
                  const prevPitchIdx = 108 - prevPitch
                  const prevCenterY = prevPitchIdx * 20 + 10
                  
                  const prevLeft = (prevNote.time / beatDuration) * 100
                  const prevWidth = (prevNote.data.duration / beatDuration) * 100
                  const prevRight = prevLeft + prevWidth
                  
                  const gap = noteLeft - prevRight
                  if (gap > 200) {
                    pathData += `M ${noteLeft} ${noteCenterY} L ${noteRight} ${noteCenterY} `
                  } else {
                    const midX = (prevRight + noteLeft) / 2
                    pathData += `C ${midX} ${prevCenterY}, ${midX} ${noteCenterY}, ${noteLeft} ${noteCenterY} `
                    pathData += `L ${noteRight} ${noteCenterY} `
                  }
                }
              })
              return <path d={pathData} fill="none" stroke="#ff2e63" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            })()}
          </svg>
        )}

        {isVocaloidTrack && trackAudioUrls?.[activeTrackId] && (
          <div style={{ position: 'absolute', bottom: 10, left: 0, height: '40px', width: '100%', opacity: 0.6, pointerEvents: 'none', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', zIndex: 5 }}>
            <canvas id="editor-waveform-canvas" style={{ position: 'absolute', height: '100%', top: 0, left: 0 }} />
          </div>
        )}
      </div>
    </div>
  )
}
