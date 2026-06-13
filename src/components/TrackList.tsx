import React, { useState } from 'react'

interface Track {
  id: string
  name: string
  type: string
  muted: boolean
  soloed: boolean
  fxEnabled: boolean
  color?: string
}

interface TrackListProps {
  tracks: Track[]
  activeTrackId: string
  onSelectTrack: (id: string, type: string) => void
  onToggleMute: (id: string) => void
  onToggleSolo: (id: string) => void
  onToggleFx: (id: string) => void
  onRenameTrack: (id: string, name: string) => void
  onAddTrack: () => void
  onShowFxPanel: () => void
  trackHeight: number
}

export default function TrackList({ 
  tracks, 
  activeTrackId, 
  onSelectTrack, 
  onToggleMute, 
  onToggleSolo, 
  onToggleFx,
  onRenameTrack,
  onAddTrack,
  onShowFxPanel,
  trackHeight
}: TrackListProps) {
  return (
    <div className="track-list" id="track-list">
      <div className="add-track" onClick={onAddTrack}>
        <i className="bx bx-plus-circle" /> Add Track
      </div>
      {tracks.map((track) => (
        <TrackItem 
          key={track.id}
          track={track}
          isActive={track.id === activeTrackId}
          onSelect={() => onSelectTrack(track.id, track.type)}
          onToggleMute={() => onToggleMute(track.id)}
          onToggleSolo={() => onToggleSolo(track.id)}
          onToggleFx={() => onToggleFx(track.id)}
          onRename={(newName) => onRenameTrack(track.id, newName)}
          onShowFxPanel={onShowFxPanel}
          trackHeight={trackHeight}
        />
      ))}
    </div>
  )
}

interface TrackItemProps {
  track: Track
  isActive: boolean
  onSelect: () => void
  onToggleMute: () => void
  onToggleSolo: () => void
  onToggleFx: () => void
  onRename: (name: string) => void
  onShowFxPanel: () => void
  trackHeight: number
}

function TrackItem({ 
  track, 
  isActive, 
  onSelect, 
  onToggleMute, 
  onToggleSolo, 
  onToggleFx, 
  onRename,
  onShowFxPanel,
  trackHeight
}: TrackItemProps) {
  const [isEditing, setIsEditing] = useState(false)

  const handleBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    setIsEditing(false)
    onRename(e.currentTarget.innerText)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  const handleFxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (e.detail === 3) {
      onToggleFx()
    } else if (e.detail === 1) {
      onShowFxPanel()
    }
  }

  const getIcon = () => {
    if (track.type === 'audio') return 'bx-microphone'
    if (track.type === 'vocaloid') return 'bx-music'
    if (track.type === 'tone') return 'bxs-piano'
    return 'bx-disc'
  }

  return (
    <div 
      className={`track ${isActive ? 'active' : ''}`}
      onClick={onSelect}
      data-track-id={track.id}
      style={{
        height: `${trackHeight}px`,
        borderLeftColor: isActive ? (track.color || 'var(--accent)') : (track.color ? track.color.replace('hsl', 'hsla').replace(')', ', 0.3)') : 'transparent'),
        background: isActive ? (track.color ? track.color.replace('hsl', 'hsla').replace(')', ', 0.08)') : 'rgba(0, 210, 143, 0.06)') : ''
      }}
    >
      <div className="track-controls">
        <button 
          className="btn-m" 
          onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
          style={{ background: track.muted ? 'var(--red)' : '', color: track.muted ? 'white' : '' }}
        >
          M
        </button>
        <button 
          className="btn-s" 
          onClick={(e) => { e.stopPropagation(); onToggleSolo(); }}
          style={{ background: track.soloed ? 'var(--yellow)' : '', color: track.soloed ? '#000' : '' }}
        >
          S
        </button>
      </div>

      <div className="track-info">
        <i className={`bx ${getIcon()}`} />
        <span
          contentEditable={isEditing}
          onDoubleClick={() => setIsEditing(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          suppressContentEditableWarning
        >
          {track.name}
        </span>
      </div>

      <div 
        className="track-effects" 
        onClick={handleFxClick}
        style={{ 
          borderColor: track.fxEnabled ? 'var(--accent)' : '#444',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: 'var(--text-muted)',
          background: 'var(--bg-dark)',
          padding: '4px 6px',
          borderRadius: 'var(--radius-sm)',
          marginTop: 'auto',
          cursor: 'pointer'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <i className="bx bx-slider-alt" style={{ color: track.fxEnabled ? 'var(--accent)' : '#777', fontSize: '12px' }} /> 
          FX Effects
        </span>
        <span style={{ fontSize: '9px', fontWeight: 700, color: track.fxEnabled ? 'var(--accent)' : '#e74c3c' }}>
          {track.fxEnabled ? 'ON' : 'OFF'}
        </span>
      </div>
    </div>
  )
}
