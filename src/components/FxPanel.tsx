import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import Knob from './Knob.tsx'
import { FxPlugin, EqBand } from '../App.tsx'

interface FxPanelProps {
  fxChain: FxPlugin[]
  setFxChain: React.Dispatch<React.SetStateAction<FxPlugin[]>>
  analyserRef?: React.MutableRefObject<AnalyserNode | null>
  dataArrayRef?: React.MutableRefObject<Uint8Array | null>
}

const DEFAULT_BANDS: EqBand[] = [
  { freq: 60, gain: 0, type: 'lowshelf', Q: 1 },
  { freq: 250, gain: 0, type: 'peaking', Q: 1.5 },
  { freq: 500, gain: 0, type: 'peaking', Q: 1.5 },
  { freq: 1000, gain: 0, type: 'peaking', Q: 1.5 },
  { freq: 2000, gain: 0, type: 'peaking', Q: 1.5 },
  { freq: 4000, gain: 0, type: 'peaking', Q: 1.5 },
  { freq: 8000, gain: 0, type: 'highshelf', Q: 1 }
]


export default function FxPanel({ fxChain, setFxChain, analyserRef, dataArrayRef }: FxPanelProps) {
  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null)
  const [showStockSubmenu, setShowStockSubmenu] = useState(false)

  const handleUpdatePlugin = (id: string, updates: Partial<FxPlugin>) => {
    setFxChain(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  const handleRemovePlugin = (id: string) => {
    setFxChain(prev => prev.filter(p => p.id !== id))
  }

  const handleAddPluginClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenuPos({ x: e.clientX, y: e.clientY })
    setShowStockSubmenu(false)
  }

  const handleAddStock = (type: string) => {
    const id = `fx-${Date.now()}`
    setFxChain(prev => [...prev, { id, type, amount: 0.5, enabled: true }])
    setMenuPos(null)
  }

  const handleAddVst = async () => {
    setMenuPos(null)
    const ipc = (window as any).require?.('electron')?.ipcRenderer;
    if (ipc) {
      const p = await ipc.invoke('select-vst-file');
      if (p) {
        const id = `fx-${Date.now()}`
        const success = await ipc.invoke('load-vst-effect', { path: p, id });
        if (success) {
          setFxChain(prev => [...prev, { id, type: 'vst', amount: 1.0, enabled: true }])
        } else {
          alert('Failed to load VST Effect');
        }
      }
    } else {
       const id = `fx-${Date.now()}`
       setFxChain(prev => [...prev, { id, type: 'vst', amount: 1.0, enabled: true }])
    }
  }

  return (
    <div className="panel-view" id="view-fx" style={{ display: 'flex', gap: '20px', padding: '15px', alignItems: 'center', justifyContent: 'flex-start', width: '100%', overflowX: 'auto' }}>
      
      {fxChain.map(plugin => (
        <div key={plugin.id} className="fx-module" style={{ position: 'relative', flexShrink: 0 }}>
          <i 
            className="bx bx-x" 
            style={{ position: 'absolute', top: '8px', right: '8px', cursor: 'pointer', color: 'var(--text-muted)' }} 
            onClick={() => handleRemovePlugin(plugin.id)}
            title="Remove Plugin"
          />
          <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '6px', paddingRight: '16px' }}>
            <div 
              className={`led-dot ${plugin.enabled ? 'active' : ''}`} 
              onClick={() => handleUpdatePlugin(plugin.id, { enabled: !plugin.enabled })}
            />
            <h4 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {plugin.type === 'delay' && 'Stereo Delay'}
              {plugin.type === 'reverb' && 'Space Reverb'}
              {plugin.type === 'pan' && 'Auto Panning'}
              {plugin.type === 'delay3' && 'Time Warp Delay'}
              {plugin.type === 'maximus' && 'Titan Multiband'}
              {plugin.type === 'vocodex' && 'RoboVox'}
              {plugin.type === 'vst' && 'VST Effect'}
            </h4>
          </div>
          
          {plugin.type === 'delay3' ? (
            <div style={{ padding: '16px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'linear-gradient(180deg, #2c2f33 0%, #1e2023 100%)', borderRadius: '4px', border: '1px solid #333' }}>
               <div style={{ fontSize: '10px', color: '#ffb74d', fontWeight: 600, letterSpacing: '1px' }}>TIME WARP DELAY</div>
               <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                  <Knob min={0} max={1} value={plugin.amount} onChange={(val) => handleUpdatePlugin(plugin.id, { amount: val })} label="Time" displayValue={`${Math.round(plugin.amount * 2000)}ms`} />
                  <Knob min={0} max={1} value={0.5} onChange={() => {}} label="Feedback" displayValue="50%" />
                  <Knob min={0} max={1} value={0.8} onChange={() => {}} label="Cutoff" displayValue="80%" />
                  <Knob min={0} max={1} value={0.2} onChange={() => {}} label="Drive" displayValue="20%" />
               </div>
            </div>
          ) : plugin.type === 'maximus' ? (
            <div style={{ padding: '16px', minWidth: '320px', background: 'linear-gradient(180deg, #2c2f33 0%, #1e2023 100%)', borderRadius: '4px', border: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '10px', color: '#ef5350', fontWeight: 600, letterSpacing: '1px' }}>TITAN MULTIBAND</div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, background: '#111', border: '1px solid #000', borderRadius: '2px', padding: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '9px', color: '#888' }}>LOW</span>
                  <Knob min={0} max={1} value={0.6} onChange={() => {}} />
                </div>
                <div style={{ flex: 1, background: '#111', border: '1px solid #000', borderRadius: '2px', padding: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'inset 0 0 0 1px #ef5350' }}>
                  <span style={{ fontSize: '9px', color: '#ef5350' }}>MID</span>
                  <Knob min={0} max={1} value={plugin.amount} onChange={(val) => handleUpdatePlugin(plugin.id, { amount: val })} />
                </div>
                <div style={{ flex: 1, background: '#111', border: '1px solid #000', borderRadius: '2px', padding: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '9px', color: '#888' }}>HIGH</span>
                  <Knob min={0} max={1} value={0.7} onChange={() => {}} />
                </div>
              </div>
            </div>
          ) : plugin.type === 'vocodex' ? (
            <div style={{ padding: '12px', background: 'linear-gradient(180deg, #2c2f33 0%, #1e2023 100%)', borderRadius: '4px', border: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '10px', color: '#9c27b0', fontWeight: 600, letterSpacing: '1px', display: 'flex', justifyContent: 'space-between' }}>
                <span>ROBOVOX</span>
                <span style={{ color: '#888' }}>BAND: 40</span>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1, background: '#111', border: '1px solid #000', padding: '4px', borderRadius: '2px' }}>
                  <div style={{ fontSize: '9px', color: '#888', marginBottom: '4px' }}>MOD</div>
                  <select style={{ width: '100%', background: '#222', color: '#fff', border: '1px solid #333', fontSize: '9px', padding: '2px' }}><option>Track 1</option></select>
                </div>
                <div style={{ flex: 1, background: '#111', border: '1px solid #000', padding: '4px', borderRadius: '2px' }}>
                  <div style={{ fontSize: '9px', color: '#888', marginBottom: '4px' }}>CAR</div>
                  <select style={{ width: '100%', background: '#222', color: '#fff', border: '1px solid #333', fontSize: '9px', padding: '2px' }}><option>Synth</option></select>
                </div>
              </div>
            </div>
          ) : plugin.type !== 'vst' ? (
            <Knob 
              min={plugin.type === 'pan' ? -1.0 : 0.0} 
              max={1.0} 
              value={plugin.amount} 
              onChange={(val) => handleUpdatePlugin(plugin.id, { amount: val })} 
              displayValue={
                plugin.type === 'pan' 
                  ? (plugin.amount === 0 ? 'Center' : plugin.amount < 0 ? `L ${Math.round(Math.abs(plugin.amount) * 100)}%` : `R ${Math.round(plugin.amount * 100)}%`)
                  : `${Math.round(plugin.amount * 100)}%`
              }
            />
          ) : (
            <div
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              onDoubleClick={async () => {
                const ipc = (window as any).require?.('electron')?.ipcRenderer
                if (ipc) await ipc.invoke('open-vst-editor', plugin.id)
              }}
              title="Double-click to open plugin editor"
            >
              <Knob
                min={0}
                max={1}
                value={plugin.amount}
                onChange={(val) => handleUpdatePlugin(plugin.id, { amount: val })}
                label="Mix"
                displayValue={`${Math.round(plugin.amount * 100)}%`}
              />
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '1px', marginTop: '2px' }}>DBL-CLICK TO OPEN</span>
            </div>
          )}
        </div>
      ))}

      <div 
        className="fx-module" 
        style={{ cursor: 'pointer', justifyContent: 'center', opacity: 0.7, border: '1px dashed var(--border)', background: 'transparent' }}
        onContextMenu={handleAddPluginClick}
        onClick={handleAddPluginClick}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <i className="bx bx-plus" style={{ fontSize: '32px' }} />
          <span>Add Plugin</span>
        </div>
      </div>

      {menuPos && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} onClick={() => setMenuPos(null)} onContextMenu={(e) => { e.preventDefault(); setMenuPos(null); }} />
          <div 
            style={{
              position: 'fixed',
              left: menuPos.x,
              top: Math.max(0, menuPos.y - 120),
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '4px 0',
              zIndex: 10000,
              minWidth: '150px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}
          >
            <div 
              style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; setShowStockSubmenu(true); }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Stock Plugins <i className="bx bx-chevron-right" />
            </div>
            <div 
              style={{ padding: '8px 16px', cursor: 'pointer', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; setShowStockSubmenu(false); }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onClick={handleAddVst}
            >
              VST Effect
            </div>

            {showStockSubmenu && (
              <div 
                style={{
                  position: 'absolute',
                  left: '100%',
                  top: 0,
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '4px 0',
                  minWidth: '150px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}
              >
                <div style={{ padding: '8px 16px', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => handleAddStock('delay')}>Stereo Delay</div>
                <div style={{ padding: '8px 16px', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => handleAddStock('reverb')}>Space Reverb</div>
                <div style={{ padding: '8px 16px', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => handleAddStock('pan')}>Auto Panner</div>
                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                <div style={{ padding: '8px 16px', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => handleAddStock('delay3')}>Time Warp Delay</div>
                <div style={{ padding: '8px 16px', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => handleAddStock('maximus')}>Titan Multiband</div>
                <div style={{ padding: '8px 16px', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => handleAddStock('vocodex')}>RoboVox</div>
              </div>
            )}
          </div>
        </>,
        document.body
      )}

    </div>
  )
}
