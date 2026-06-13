import React, { useState, useRef, useEffect } from 'react'

interface Track {
  id: string
  name: string
  type: string
  muted: boolean
  soloed: boolean
  fxEnabled: boolean
  color?: string
}

interface MidiEvent {
  id: string
  trackId: string
  time: number
  type: string
  data: any
}

interface TimelineProps {
  tracks: Track[]
  activeTrackId: string
  onSelectTrack: (id: string, type: string) => void
  midiEvents: MidiEvent[]
  bpm: number
  onDropNoteOnTimeline: (noteId: string, trackId: string, type: string, dropX: number) => void
  onOpenMidiEditor: () => void
  trackAudioUrls: Record<string, string>
  onSetPlaybackTime?: (time: number) => void
  widthPerBeat: number
  setWidthPerBeat: React.Dispatch<React.SetStateAction<number>>
  trackHeight: number
  setTrackHeight: React.Dispatch<React.SetStateAction<number>>
}

export default function Timeline({ 
  tracks, 
  activeTrackId, 
  onSelectTrack, 
  midiEvents, 
  bpm,
  onDropNoteOnTimeline,
  onOpenMidiEditor,
  trackAudioUrls,
  onSetPlaybackTime,
  widthPerBeat,
  setWidthPerBeat,
  trackHeight,
  setTrackHeight
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  
  let maxTime = 16 * (60 / bpm)
  midiEvents.forEach(ev => {
    const end = ev.time + (ev.data?.duration || 0)
    if (end > maxTime) maxTime = end
  })
  const totalBeats = Math.ceil(maxTime * (bpm / 60)) + 2
  const beats = Array.from({ length: totalBeats }, (_, i) => i + 1)

  useEffect(() => {
    const el = timelineRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        setWidthPerBeat(prev => {
          const delta = e.deltaY < 0 ? 15 : -15
          return Math.max(20, Math.min(400, prev + delta))
        })
      } else if (e.altKey) {
        e.preventDefault()
        if (setTrackHeight) {
          setTrackHeight(prev => {
            const delta = e.deltaY < 0 ? 10 : -10
            return Math.max(40, Math.min(300, prev + delta))
          })
        }
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData('text/plain', noteId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, trackId: string, type: string) => {
    e.preventDefault()
    const noteId = e.dataTransfer.getData('text/plain')
    if (!noteId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const dropX = e.clientX - rect.left
    onDropNoteOnTimeline(noteId, trackId, type, dropX)
  }

  const handleRulerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const mainContent = document.querySelector('.main-content') as HTMLElement
    if (!mainContent) return
    const startScroll = mainContent.scrollLeft

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      mainContent.scrollLeft = startScroll - deltaX
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleRulerDoubleClick = (e: React.MouseEvent) => {
    if (!onSetPlaybackTime) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = Math.max(0, e.clientX - rect.left - 10) // 10px is playhead initial offset
    const time = (clickX / widthPerBeat) / (bpm / 60)
    onSetPlaybackTime(Math.max(0, time))
  }

  return (
    <div ref={timelineRef} className="timeline" id="timeline" style={{ minWidth: `${beats.length * widthPerBeat + 100}px` }}>
      <div 
        className="ruler" 
        id="ruler"
        onMouseDown={handleRulerMouseDown}
        onDoubleClick={handleRulerDoubleClick}
        style={{ cursor: 'grab', userSelect: 'none' }}
      >
        {beats.map((beat) => (
          <div 
            key={beat} 
            className="beat" 
            style={{ width: `${widthPerBeat}px`, flexShrink: 0 }}
          >
            {beat.toString().padStart(2, '0')}
          </div>
        ))}
      </div>

      <div className="playhead" id="playhead" />

      <div className="timeline-tracks" id="timeline-tracks">
        {tracks.map((track) => {
          const trackNotes = midiEvents.filter(ev => ev.trackId === track.id)
          const targetType = track.type === 'vocaloid' ? 'vocaloid' : track.type === 'tone' ? 'keys' : 'drums'

          return (
            <div 
              key={track.id} 
              className={`timeline-track ${track.id === activeTrackId ? 'active-tl' : ''}`}
              id={`timeline-track-${track.id}`}
              style={{ height: `${trackHeight}px` }}
              onClick={() => onSelectTrack(track.id, track.type)}
              onDoubleClick={() => {
                onSelectTrack(track.id, track.type)
                onOpenMidiEditor()
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, track.id, track.type)}
            >
              {(track.type === 'audio' || track.type === 'vocaloid') && (
                <>
                  <audio id={`vocal-playback-${track.id}`} src={trackAudioUrls[track.id] || ''} style={{ display: 'none' }} />
                  {trackAudioUrls[track.id] && (
                    <canvas 
                      className="waveform-canvas" 
                      width={800} 
                      height={60} 
                      style={{ 
                        width: '100%', 
                        height: `${Math.max(20, trackHeight - 30)}px`, 
                        position: 'absolute', 
                        top: '10px', 
                        pointerEvents: 'none',
                        background: track.type === 'vocaloid' ? 'rgba(255, 46, 99, 0.08)' : track.color ? `${track.color.replace(')', ', 0.08)').replace('hsl', 'hsla')}` : undefined,
                        borderColor: track.type === 'vocaloid' ? 'rgba(255, 46, 99, 0.3)' : track.color ? track.color : undefined
                      }} 
                    />
                  )}
                </>
              )}
              {track.type !== 'audio' && (
                <div className={`midi-region ${targetType}`} style={{ left: '0px', width: '100%', height: `${Math.max(20, trackHeight - 10)}px` }}>
                  {trackNotes.map((note) => {
                    const dropX = note.time * (bpm / 60) * widthPerBeat
                    const noteWidth = note.data?.duration ? (note.data.duration / (60 / bpm)) * widthPerBeat : 15
                    return (
                      <div 
                        key={note.id}
                        className={`midi-note ${targetType}`}
                        style={{ 
                          left: `${dropX}px`, 
                          top: `${(Math.sin(note.id.charCodeAt(note.id.length - 1)) * (trackHeight / 3)) + (trackHeight / 2.2)}px`, 
                          width: `${noteWidth}px`,
                          background: track.type === 'vocaloid' ? '#ff2e63' : track.color || 'var(--accent)',
                          boxShadow: `inset 0 1px 2px rgba(255,255,255,0.4), 0 0 4px ${track.type === 'vocaloid' ? '#ff2e63' : track.color || 'var(--accent-glow)'}`,
                          borderColor: track.type === 'vocaloid' ? 'rgba(255, 46, 99, 0.5)' : track.color || 'var(--accent)'
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, note.id)}
                        data-id={note.id}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
