import React from 'react'
import Knob from './Knob.tsx'

interface FxPanelProps {
  delayAmt: number
  setDelayAmt: (val: number) => void
  panAmt: number
  setPanAmt: (val: number) => void
  reverbAmt: number
  setReverbAmt: (val: number) => void
  delayEnabled: boolean
  setDelayEnabled: (val: boolean) => void
  panEnabled: boolean
  setPanEnabled: (val: boolean) => void
  reverbEnabled: boolean
  setReverbEnabled: (val: boolean) => void
}

export default function FxPanel({
  delayAmt,
  setDelayAmt,
  panAmt,
  setPanAmt,
  reverbAmt,
  setReverbAmt,
  delayEnabled,
  setDelayEnabled,
  panEnabled,
  setPanEnabled,
  reverbEnabled,
  setReverbEnabled
}: FxPanelProps) {
  return (
    <div className="panel-view" id="view-fx" style={{ display: 'flex', gap: '20px', padding: '15px', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      <div className="fx-module">
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '6px' }}>
          <div 
            className={`led-dot ${delayEnabled ? 'active' : ''}`} 
            onClick={() => setDelayEnabled(!delayEnabled)}
          />
          <h4>Stereo Delay</h4>
        </div>
        <Knob 
          min={0.0} 
          max={1.0} 
          value={delayAmt} 
          onChange={setDelayAmt} 
          displayValue={`${Math.round(delayAmt * 100)}%`}
        />
      </div>

      <div className="fx-module">
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '6px' }}>
          <div 
            className={`led-dot ${panEnabled ? 'active' : ''}`} 
            onClick={() => setPanEnabled(!panEnabled)}
          />
          <h4>Auto Panning</h4>
        </div>
        <Knob 
          min={-1.0} 
          max={1.0} 
          value={panAmt} 
          onChange={setPanAmt} 
          displayValue={panAmt === 0 ? 'Center' : panAmt < 0 ? `L ${Math.round(Math.abs(panAmt) * 100)}%` : `R ${Math.round(panAmt * 100)}%`}
        />
      </div>

      <div className="fx-module">
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '6px' }}>
          <div 
            className={`led-dot ${reverbEnabled ? 'active' : ''}`} 
            onClick={() => setReverbEnabled(!reverbEnabled)}
          />
          <h4>Space Reverb</h4>
        </div>
        <Knob 
          min={0.0} 
          max={1.0} 
          value={reverbAmt} 
          onChange={setReverbAmt} 
          displayValue={`${Math.round(reverbAmt * 100)}%`}
        />
      </div>

      <div className="fx-module">
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '6px' }}>
          <div className="led-dot active" />
          <h4>VST Effect</h4>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="bx bx-plug" style={{ fontSize: '48px', color: 'var(--accent)', opacity: 0.5 }} />
        </div>
        <button 
          onClick={async () => {
            const ipc = window.require('electron').ipcRenderer;
            const p = await ipc.invoke('select-vst-file');
            if (p) {
              const success = await ipc.invoke('load-vst-effect', p);
              if (success) alert('VST Effect Loaded!');
              else alert('Failed to load VST Effect');
            }
          }}
          className="fx-toggle-btn active"
        >
          Browse & Load
        </button>
      </div>
    </div>
  )
}
