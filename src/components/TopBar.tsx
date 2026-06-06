import React, { useRef, useState } from 'react'

interface TopBarProps {
  projectTitle: string
  setProjectTitle: (val: string) => void
  isPlaying: boolean
  isRecording: boolean
  isMetronomeOn: boolean
  bpm: number
  setBpm: (val: number) => void
  projectKey: number
  setProjectKey: (val: number) => void
  timeSig: string
  setTimeSig: (val: string) => void
  onPlayToggle: () => void
  onRecordToggle: () => void
  onMetronomeToggle: () => void
  onOpenModal: (name: string) => void
  onSkipPrevious: () => void
  onSkipNext: () => void
  onUndo: () => void
  onRedo: () => void
  onFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSaveWav: () => void
}

export default function TopBar({
  projectTitle,
  setProjectTitle,
  isPlaying,
  isRecording,
  isMetronomeOn,
  bpm,
  setBpm,
  projectKey,
  setProjectKey,
  timeSig,
  setTimeSig,
  onPlayToggle,
  onRecordToggle,
  onMetronomeToggle,
  onOpenModal,
  onSkipPrevious,
  onSkipNext,
  onUndo,
  onRedo,
  onFileImport,
  onSaveWav
}: TopBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)

  const handleTitleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    setIsEditingTitle(false)
    setProjectTitle(e.currentTarget.innerText)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  return (
    <header className="top-bar">
      <div className="menu-icons">
        <i className="bx bx-menu" />
        <span 
          style={{ cursor: 'pointer' }}
          onClick={() => fileInputRef.current?.click()}
        >
          File
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="audio/*" 
            style={{ display: 'none' }} 
            onChange={onFileImport}
          />
        </span>
        <span onClick={() => onOpenModal('edit')}>Edit</span>
        <span onClick={() => onOpenModal('view')}>View</span>
        <span onClick={() => onOpenModal('settings')}>Settings</span>
        <span onClick={() => onOpenModal('help')}>Help</span>
      </div>

      <div 
        className="project-title"
        contentEditable={isEditingTitle}
        onDoubleClick={() => setIsEditingTitle(true)}
        onBlur={handleTitleBlur}
        onKeyDown={handleTitleKeyDown}
        suppressContentEditableWarning
      >
        {projectTitle}
      </div>

      <div className="transport">
        <i className="bx bx-undo" onClick={onUndo} />
        <i className="bx bx-redo" onClick={onRedo} />
        <i className="bx bx-skip-previous" onClick={onSkipPrevious} />
        <i 
          className={isPlaying ? "bx bx-pause" : "bx bx-play"} 
          id="play-btn" 
          onClick={onPlayToggle}
        />
        <i className="bx bx-skip-next" onClick={onSkipNext} />
        <i 
          className="bx bx-radio-circle" 
          id="record-btn" 
          style={{ color: isRecording ? 'red' : '' }} 
          onClick={onRecordToggle}
        />
      </div>

      <div className="time-display">
        <span id="time-text">00:00.0</span>
      </div>

      <div className="project-settings">
        <button 
          className="btn" 
          onClick={onMetronomeToggle}
          style={{ 
            background: isMetronomeOn ? 'var(--accent-glow)' : 'var(--bg-card)',
            color: isMetronomeOn ? 'var(--accent)' : 'var(--text-muted)',
            borderColor: isMetronomeOn ? 'var(--accent)' : 'var(--border)',
            marginRight: '8px'
          }}
          title="Toggle Metronome"
        >
          <i className="bx bx-pulse" /> Metronome
        </button>
        <div className="setting-box">
          <select 
            value={projectKey} 
            onChange={(e) => setProjectKey(parseInt(e.target.value))}
            style={{ background: 'transparent', color: 'white', border: 'none', outline: 'none', cursor: 'pointer' }}
          >
            <option value={0}>C Major</option>
            <option value={1}>D Minor</option>
            <option value={2}>Eb Minor</option>
            <option value={3}>G Major</option>
            <option value={4}>A Minor</option>
          </select>
        </div>
        <div className="setting-box">
          <input 
            type="number" 
            value={bpm} 
            onChange={(e) => setBpm(parseInt(e.target.value) || 90)}
          /> 
          bpm
        </div>
        <div className="setting-box">
          <select 
            value={timeSig} 
            onChange={(e) => setTimeSig(e.target.value)}
            style={{ background: 'transparent', color: 'white', border: 'none', outline: 'none', cursor: 'pointer' }}
          >
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="1/4">1/4 Grid</option>
            <option value="1/8">1/8 Grid</option>
          </select>
        </div>
      </div>

      <div className="actions">
        <button className="btn btn-save" id="save-btn" onClick={onSaveWav}>
          <i className="bx bx-save" /> Save
        </button>
      </div>
    </header>
  )
}
