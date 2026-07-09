import React, { useState, useRef, useEffect } from 'react'
import { AutomationPoint } from '../App.tsx'

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
  volumeAutomation?: AutomationPoint[]
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
  onUpdateMidiEvent?: (noteId: string, updatedData: any) => void
  onUpdateAutomation?: (trackId: string, automation: AutomationPoint[]) => void
  showAutomation: boolean
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
  setTrackHeight,
  onUpdateMidiEvent,
  onUpdateAutomation,
  showAutomation
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
    Object.keys(trackAudioUrls).forEach(trackId => {
      const audioEl = document.getElementById(`vocal-playback-${trackId}`) as HTMLAudioElement
      if (audioEl) {
        const wasPlaying = !audioEl.paused
        const currentTime = audioEl.currentTime
        audioEl.load()
        if (wasPlaying) {
          audioEl.currentTime = currentTime
          audioEl.play().catch(e => console.error(e))
        }
      }
    })
  }, [trackAudioUrls])

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

  const handleSvgDoubleClick = (e: React.MouseEvent, trackId: string, track: Track) => {
    if (!showAutomation) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    const time = (clickX / widthPerBeat) / (bpm / 60)
    const value = 1 - (clickY / trackHeight)
    
    const newPoint = { id: `pt-${Date.now()}`, time: Math.max(0, time), value: Math.max(0, Math.min(1, value)) }
    const points = track.volumeAutomation ? [...track.volumeAutomation] : []
    points.push(newPoint)
    points.sort((a, b) => a.time - b.time)
    if (onUpdateAutomation) onUpdateAutomation(trackId, points)
  }

  const handlePointMouseDown = (e: React.MouseEvent, trackId: string, pointId: string, track: Track) => {
    e.stopPropagation()
    if (e.button === 2) {
      // right click to delete
      const points = (track.volumeAutomation || []).filter(p => p.id !== pointId)
      if (onUpdateAutomation) onUpdateAutomation(trackId, points)
      return
    }

    const startX = e.clientX
    const startY = e.clientY
    
    const point = track.volumeAutomation?.find(p => p.id === pointId)
    if (!point) return
    
    const startTime = point.time
    const startValue = point.value

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      
      const deltaTime = (deltaX / widthPerBeat) / (bpm / 60)
      const deltaValue = -(deltaY / trackHeight)
      
      const newTime = Math.max(0, startTime + deltaTime)
      const newValue = Math.max(0, Math.min(1, startValue + deltaValue))
      
      const points = (track.volumeAutomation || []).map(p => 
        p.id === pointId ? { ...p, time: newTime, value: newValue } : p
      )
      points.sort((a, b) => a.time - b.time)
      if (onUpdateAutomation) onUpdateAutomation(trackId, points)
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!onSetPlaybackTime) return

    const startX = e.clientX
    const mainContent = document.querySelector('.main-content') as HTMLElement
    if (!mainContent) return
    const startScroll = mainContent.scrollLeft

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = timelineRef.current?.getBoundingClientRect()
      if (!rect) return
      
      const clickX = Math.max(0, moveEvent.clientX - rect.left - 10)
      const time = (clickX / widthPerBeat) / (bpm / 60)
      onSetPlaybackTime(Math.max(0, time))
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div ref={timelineRef} className="timeline" id="timeline" style={{ minWidth: `${beats.length * widthPerBeat + 100}px`, position: 'relative' }}>
      
      <div 
        className="ruler" 
        id="ruler"
        onMouseDown={handleRulerMouseDown}
        onDoubleClick={handleRulerDoubleClick}
        style={{ cursor: 'grab', userSelect: 'none', marginTop: '-30px' }}
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

      <div className="playhead" id="playhead" onMouseDown={handlePlayheadMouseDown} />

      <div className="timeline-tracks" id="timeline-tracks">
        {tracks.map((track) => {
          const trackNotes = midiEvents.filter(ev => ev.trackId === track.id)
          const targetType = track.type === 'vocaloid' ? 'vocaloid' : track.type === 'tone' ? 'keys' : 'drums'

          return (
            <div 
              key={track.id} 
              className={`timeline-track ${track.id === activeTrackId ? 'active-tl' : ''}`}
              id={`timeline-track-${track.id}`}
              style={{ height: `${trackHeight}px`, position: 'relative' }}
              onClick={() => onSelectTrack(track.id, track.type)}
              onDoubleClick={() => {
                onSelectTrack(track.id, track.type)
                if (!showAutomation) onOpenMidiEditor()
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
                          top: track.type === 'vocaloid' ? `${Math.max(0, Math.min(trackHeight - 15, trackHeight - (12 * Math.log2((note.data?.freq || 220) / 220) + 12) * (trackHeight / 24)))}px` : `${(Math.sin(note.id.charCodeAt(note.id.length - 1)) * (trackHeight / 3)) + (trackHeight / 2.2)}px`, 
                          width: `${noteWidth}px`,
                          height: track.type === 'vocaloid' ? '15px' : undefined,
                          background: track.type === 'vocaloid' ? '#ff2e63' : track.color || 'var(--accent)',
                          boxShadow: `inset 0 1px 2px rgba(255,255,255,0.4), 0 0 4px ${track.type === 'vocaloid' ? '#ff2e63' : track.color || 'var(--accent-glow)'}`,
                          borderColor: track.type === 'vocaloid' ? 'rgba(255, 46, 99, 0.5)' : track.color || 'var(--accent)',
                          display: track.type === 'vocaloid' ? 'flex' : undefined,
                          alignItems: track.type === 'vocaloid' ? 'center' : undefined,
                          justifyContent: track.type === 'vocaloid' ? 'center' : undefined,
                          color: track.type === 'vocaloid' ? 'white' : undefined,
                          fontSize: track.type === 'vocaloid' ? '11px' : undefined,
                          fontWeight: track.type === 'vocaloid' ? 'bold' : undefined,
                          overflow: track.type === 'vocaloid' ? 'hidden' : undefined,
                          textOverflow: track.type === 'vocaloid' ? 'ellipsis' : undefined,
                          whiteSpace: track.type === 'vocaloid' ? 'nowrap' : undefined,
                          padding: track.type === 'vocaloid' ? '0 4px' : undefined
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, note.id)}
                        data-id={note.id}
                      >
                        {track.type === 'vocaloid' ? (note.data?.lyric || 'a') : ''}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Automation Overlay */}
              {showAutomation && (
                <svg 
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'auto', background: 'rgba(0,0,0,0.1)' }}
                  onDoubleClick={(e) => handleSvgDoubleClick(e, track.id, track)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {(() => {
                    const points = track.volumeAutomation || []
                    if (points.length === 0) return null
                    const pts = points.map(p => {
                      const cx = p.time * (bpm / 60) * widthPerBeat
                      const cy = (1 - p.value) * trackHeight
                      return `${cx},${cy}`
                    }).join(' ')
                    
                    return (
                      <>
                        <polyline points={pts} fill="none" stroke="#ff7b89" strokeWidth="2" />
                        {points.map(p => {
                          const cx = p.time * (bpm / 60) * widthPerBeat
                          const cy = (1 - p.value) * trackHeight
                          return (
                            <circle 
                              key={p.id}
                              cx={cx} 
                              cy={cy} 
                              r="5" 
                              fill="#ff7b89" 
                              stroke="#fff"
                              strokeWidth="1"
                              style={{ cursor: 'pointer' }}
                              onMouseDown={(e) => handlePointMouseDown(e, track.id, p.id, track)}
                              onContextMenu={(e) => e.preventDefault()}
                            />
                          )
                        })}
                      </>
                    )
                  })()}
                </svg>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
