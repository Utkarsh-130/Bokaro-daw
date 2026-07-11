import React, { useState, useEffect } from 'react'

const getIpcRenderer = () => {
  if (typeof window !== 'undefined' && (window as any).electron) {
    return (window as any).electron.ipcRenderer
  }
  if (typeof window !== 'undefined' && (window as any).require) {
    return (window as any).require('electron').ipcRenderer
  }
  return null
}
const ipcRenderer = getIpcRenderer()
export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (!ipcRenderer) return
    ipcRenderer.invoke('window-is-maximized').then((v: boolean) => setIsMaximized(v))
  }, [])

  const minimize = () => ipcRenderer?.send('window-minimize')
  const maximize = () => {
    ipcRenderer?.send('window-maximize')
    setIsMaximized(prev => !prev)
  }
  const close = () => ipcRenderer?.send('window-close')

  return (
    <div className="title-bar">
      <div className="title-bar-drag" />



      <div className="title-bar-controls">
        <button className="wc-btn wc-minimize" onClick={minimize} title="Minimize">
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor" /></svg>
        </button>
        <button className="wc-btn wc-maximize" onClick={maximize} title={isMaximized ? 'Restore' : 'Maximize'}>
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="2" y="0" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1" fill="none" />
              <rect x="0" y="2" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="0" y="0" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          )}
        </button>
        <button className="wc-btn wc-close" onClick={close} title="Close">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
