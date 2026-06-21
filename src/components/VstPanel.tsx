import React, { useState } from 'react';

const { ipcRenderer } = window.require('electron');

export const VstPanel: React.FC = () => {
  const [instPath, setInstPath] = useState('');
  const [instLoaded, setInstLoaded] = useState(false);

  const handleBrowseInst = async () => {
    const p = await ipcRenderer.invoke('select-vst-file');
    if (p) setInstPath(p);
  };

  const handleLoadInst = async () => {
    if (!instPath) return;
    const success = await ipcRenderer.invoke('load-vst', instPath);
    setInstLoaded(success);
  };

  return (
    <div className="vst-panel" style={{ padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <h3 style={{ margin: '0', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>VST HOST (Low Latency)</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'stretch' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: 600 }}>Instrument</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            value={instPath} 
            readOnly
            placeholder="Path to .vst3 instrument"
            style={{ flex: 1, padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '11px', outline: 'none' }}
          />
          <button 
            onClick={handleBrowseInst} 
            style={{ padding: '8px 12px', background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-panel)'}
          >
            Browse
          </button>
        </div>
        <button 
          onClick={handleLoadInst}
          style={{ 
            padding: '10px 15px', 
            background: instLoaded ? 'var(--accent)' : 'var(--bg-panel)', 
            color: instLoaded ? '#000' : 'var(--text-main)', 
            border: `1px solid ${instLoaded ? 'var(--accent)' : 'var(--border)'}`, 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: instLoaded ? '0 0 12px var(--accent-glow)' : 'none',
            transition: 'all 0.2s',
            marginTop: '5px'
          }}
          onMouseOver={(e) => {
             if (!instLoaded) e.currentTarget.style.background = 'var(--bg-hover)'
          }}
          onMouseOut={(e) => {
             if (!instLoaded) e.currentTarget.style.background = 'var(--bg-panel)'
          }}
        >
          {instLoaded ? 'Plugin Loaded & Active' : 'Load Instrument'}
        </button>
      </div>
    </div>
  );
};
