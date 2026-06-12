import React, { useRef, useState } from 'react'

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
  onDeleteMidiEvent
}: MidiEditorProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())

  const pitches = Array.from({ length: 25 }, (_, i) => 72 - i)

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
    const pitch = 72 - pitchIdx
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
          const newPitch = Math.max(48, Math.min(72, item.initialPitch + deltaPitch))
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
        onUpdateMidiEvents(updates)
      }
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div className="piano-roll-container">
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
        style={{ height: `${pitches.length * 20}px` }}
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

        {Array.from({ length: 16 * 8 }).map((_, subIdx) => {
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
          const pitchIdx = 72 - notePitch
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
              onClick={(e) => {
                if (e.detail === 3 && isVocaloidTrack) {
                  e.stopPropagation()
                  const nextLyric = prompt('Enter Lyric / Phoneme for Note:', note.data.lyric || 'a')
                  if (nextLyric !== null) {
                    onUpdateMidiEvent(note.id, {
                      data: {
                        ...note.data,
                        lyric: nextLyric
                      }
                    })
                  }
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                if (isVocaloidTrack) {
                  const nextLyric = prompt('Enter Lyric / Phoneme for Note:', note.data.lyric || 'a')
                  if (nextLyric !== null) {
                    onUpdateMidiEvent(note.id, {
                      data: {
                        ...note.data,
                        lyric: nextLyric
                      }
                    })
                  }
                }
              }}
              onContextMenu={(e) => { e.preventDefault(); onDeleteMidiEvent(note.id); }}
              style={{
                left: `${noteLeft}px`,
                top: `${noteTop}px`,
                width: `${noteWidth}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isVocaloidTrack ? 'linear-gradient(90deg, #ff2e63, #ff6b8b)' : undefined,
                boxShadow: isSelected 
                  ? '0 0 12px rgba(255, 255, 255, 0.6)' 
                  : (isVocaloidTrack ? '0 2px 8px rgba(255, 46, 99, 0.4)' : undefined),
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                padding: '0 4px',
                border: isSelected 
                  ? '2px solid #ffffff' 
                  : '1px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              {isVocaloidTrack ? (note.data.lyric || 'a') : ''}
            </div>
          )
        })}
      </div>
    </div>
  )

}
