import React from 'react'

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
}

export default function Timeline({ 
  tracks, 
  activeTrackId, 
  onSelectTrack, 
  midiEvents, 
  bpm,
  onDropNoteOnTimeline,
  onOpenMidiEditor,
  trackAudioUrls
}: TimelineProps) {
  const widthPerBeat = 100
  const beats = Array.from({ length: 16 }, (_, i) => i + 1)

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

  return (
    <div className="timeline" id="timeline">
      <div className="ruler" id="ruler">
        {beats.map((beat) => (
          <div 
            key={beat} 
            className="beat" 
            style={{ width: `${widthPerBeat}px` }}
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
                        height: '60px', 
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
                <div className={`midi-region ${targetType}`} style={{ left: '0px', width: '100%' }}>
                  {trackNotes.map((note) => {
                    const dropX = note.time * (bpm / 60) * 100
                    return (
                      <div 
                        key={note.id}
                        className={`midi-note ${targetType}`}
                        style={{ 
                          left: `${dropX}px`, 
                          top: `${(Math.sin(note.id.charCodeAt(note.id.length - 1)) * 30) + 40}px`, 
                          width: '15px',
                          background: track.type === 'vocaloid' ? 'linear-gradient(90deg, #ff2e63, #ff6b8b)' : track.color || 'var(--accent)',
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
