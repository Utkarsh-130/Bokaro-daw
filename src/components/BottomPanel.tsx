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
  return (
    <div 
      className="bottom-panel" 
      style={{ height: `${panelHeight}px` }}
    >
      <div 
        className="panel-resizer" 
        onMouseDown={onResizeStart}
      />
      <div className="panel-header">
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
      </div>
      <div className="panel-body">
        {children}
      </div>
    </div>
  )
}
