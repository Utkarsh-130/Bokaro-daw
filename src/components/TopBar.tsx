import React, { useRef, useState, useEffect } from 'react'

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
  onLoadCss: () => void
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
  onSaveWav,
  onLoadCss
}: TopBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cpuLoad, setCpuLoad] = useState(0)
  const [isEditingTitle, setIsEditingTitle] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if ((window as any).require) {
      const { ipcRenderer } = (window as any).require('electron')
      interval = setInterval(async () => {
        try {
          const load = await ipcRenderer.invoke('get-cpu-usage')
          setCpuLoad(Math.min(100, Math.round(load)))
        } catch (e) {
          // Ignore
        }
      }, 500)
    }
    return () => clearInterval(interval)
  }, [])

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
        <div className="menu-dropdown">
          <span className="menu-btn">File</span>
          <div className="menu-dropdown-content">
            <div onClick={() => fileInputRef.current?.click()}><i className="bx bx-import" /> Import Audio</div>
            <div onClick={onSaveWav}><i className="bx bx-export" /> Export Project (.wav)</div>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="audio/*" 
              style={{ display: 'none' }} 
              onChange={onFileImport}
            />
          </div>
        </div>
        <div className="menu-dropdown">
          <span className="menu-btn">Edit</span>
          <div className="menu-dropdown-content">
            <div onClick={onUndo}><i className="bx bx-undo" /> Undo</div>
            <div onClick={onRedo}><i className="bx bx-redo" /> Redo</div>
            <div onClick={() => onOpenModal('edit')}><i className="bx bx-edit" /> Preferences</div>
          </div>
        </div>
        <div className="menu-dropdown">
          <span className="menu-btn">View</span>
          <div className="menu-dropdown-content">
            <div onClick={() => onOpenModal('view')}><i className="bx bx-window-open" /> Layout Options</div>
            <div onClick={onLoadCss}><i className="bx bx-palette" /> Load Custom Theme (.css)</div>
          </div>
        </div>
        <div className="menu-dropdown">
          <span className="menu-btn">Settings</span>
          <div className="menu-dropdown-content">
            <div onClick={() => onOpenModal('settings')}><i className="bx bx-cog" /> Audio Settings</div>
            <div onClick={() => onOpenModal('settings')}><i className="bx bx-midi" /> MIDI Settings</div>
          </div>
        </div>
        <div className="menu-dropdown">
          <span className="menu-btn">Help</span>
          <div className="menu-dropdown-content">
            <div onClick={() => onOpenModal('help')}><i className="bx bx-book-open" /> Documentation</div>
            <div onClick={() => onOpenModal('help')}><i className="bx bx-info-circle" /> About</div>
          </div>
        </div>
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
            style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none', cursor: 'pointer' }}
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
        <div className="setting-box" title="Grid Snap">
          <i className="bx bx-grid-small" style={{ fontSize: '16px' }} />
          <select 
            value={timeSig} 
            onChange={(e) => setTimeSig(e.target.value)}
            style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none', cursor: 'pointer' }}
          >
            <option value="Off">Off</option>
            <option value="1">1/4 (Beat)</option>
            <option value="1/2">1/8 Note</option>
            <option value="1/4">1/16 Note</option>
            <option value="1/8">1/32 Note</option>
          </select>
        </div>
        
        <div 
          className="cpu-monitor" 
          title={`CPU Load: ${cpuLoad}%`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            padding: '4px 6px',
            width: '60px',
            height: '32px',
            marginLeft: '8px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)'
          }}
        >
          <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '2px', zIndex: 1, textShadow: '0 1px 2px rgba(0,0,0,0.8)', fontWeight: 600 }}>CPU</div>
          <div style={{ 
            height: '6px', 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: '2px', 
            overflow: 'hidden',
            zIndex: 1,
            position: 'relative'
          }}>
            <div style={{
              width: `${cpuLoad}%`,
              height: '100%',
              background: cpuLoad > 80 ? 'var(--red)' : cpuLoad > 50 ? 'var(--yellow)' : 'var(--accent)',
              transition: 'width 0.3s ease-out, background 0.3s',
              boxShadow: `0 0 8px ${cpuLoad > 80 ? 'var(--red)' : cpuLoad > 50 ? 'var(--yellow)' : 'var(--accent)'}`
            }} />
          </div>
        </div>
      </div>

      <div className="actions">
        <button 
          className="btn btn-save" 
          id="save-btn" 
          onClick={onSaveWav}
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            transition: 'all 0.2s',
            fontWeight: 600
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'var(--accent-glow)'
            e.currentTarget.style.color = 'var(--accent)'
            e.currentTarget.style.borderColor = 'var(--accent)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'var(--bg-card)'
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          <i className="bx bx-save" /> Save
        </button>
      </div>
    </header>
  )
}
