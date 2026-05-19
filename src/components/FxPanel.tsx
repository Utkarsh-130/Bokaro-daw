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
      <div className="fx-module" style={{ borderColor: delayEnabled ? 'var(--accent)' : '#444' }}>
        <h4>
          <i className="bx bx-time-five" /> Stereo Delay
        </h4>
        <Knob 
          min={0.0} 
          max={1.0} 
          value={delayAmt} 
          onChange={setDelayAmt} 
          displayValue={`${Math.round(delayAmt * 100)}%`}
        />
        <button 
          className="btn btn-sm"
          onClick={() => setDelayEnabled(!delayEnabled)}
          style={{ 
            background: delayEnabled ? 'var(--accent)' : '#222',
            color: delayEnabled ? 'black' : 'white',
            fontSize: '10px',
            padding: '4px 8px',
            height: 'auto',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {delayEnabled ? 'Active' : 'Bypassed'}
        </button>
      </div>

      <div className="fx-module" style={{ borderColor: panEnabled ? 'var(--accent)' : '#444' }}>
        <h4>
          <i className="bx bx-left-right" /> Auto Panning
        </h4>
        <Knob 
          min={-1.0} 
          max={1.0} 
          value={panAmt} 
          onChange={setPanAmt} 
          displayValue={panAmt === 0 ? 'Center' : panAmt < 0 ? `L ${Math.round(Math.abs(panAmt) * 100)}%` : `R ${Math.round(panAmt * 100)}%`}
        />
        <button 
          className="btn btn-sm"
          onClick={() => setPanEnabled(!panEnabled)}
          style={{ 
            background: panEnabled ? 'var(--accent)' : '#222',
            color: panEnabled ? 'black' : 'white',
            fontSize: '10px',
            padding: '4px 8px',
            height: 'auto',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {panEnabled ? 'Active' : 'Bypassed'}
        </button>
      </div>

      <div className="fx-module" style={{ borderColor: reverbEnabled ? 'var(--accent)' : '#444' }}>
        <h4>
          <i className="bx bx-buildings" /> Space Reverb
        </h4>
        <Knob 
          min={0.0} 
          max={1.0} 
          value={reverbAmt} 
          onChange={setReverbAmt} 
          displayValue={`${Math.round(reverbAmt * 100)}%`}
        />
        <button 
          className="btn btn-sm"
          onClick={() => setReverbEnabled(!reverbEnabled)}
          style={{ 
            background: reverbEnabled ? 'var(--accent)' : '#222',
            color: reverbEnabled ? 'black' : 'white',
            fontSize: '10px',
            padding: '4px 8px',
            height: 'auto',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {reverbEnabled ? 'Active' : 'Bypassed'}
        </button>
      </div>
    </div>
  )
}
