import React from 'react'

interface BottomPanelProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  panelHeight: number
  onResizeStart: (e: React.MouseEvent) => void
  panelTitle: string
  children: React.ReactNode
}

export default function BottomPanel({
  activeTab,
  setActiveTab,
  panelHeight,
  onResizeStart,
  panelTitle,
  children
}: BottomPanelProps) {
  if (!activeTab || activeTab === 'none') return null

  return (
    <div 
      className="bottom-panel" 
      style={{ height: `${panelHeight}px` }}
    >
      <div 
        className="resizer" 
        onMouseDown={onResizeStart}
      />
      <div className="panel-header" style={{ padding: '0 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="panel-tabs">
          <span 
            className={activeTab === 'instrument' ? 'active' : ''} 
            onClick={() => setActiveTab('instrument')}
          >
            Track Instrument Settings
          </span>
          <span 
            className={activeTab === 'fx' ? 'active' : ''} 
            onClick={() => setActiveTab('fx')}
          >
            FX Routing Effects Chain
          </span>
          <span 
            className={activeTab === 'midi' ? 'active' : ''} 
            onClick={() => setActiveTab('midi')}
          >
            MIDI Step Sequencer Roll
          </span>
        </div>
        <button 
          onClick={() => setActiveTab('')} 
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '4px',
            transition: 'all 0.15s'
          }}
          className="panel-close-btn"
          title="Close Panel"
        >
          <i className="bx bx-x" style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
      <div className="panel-body">
        {children}
      </div>
    </div>
  )
}
