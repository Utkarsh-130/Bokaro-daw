import React from 'react'

interface ModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ isOpen, title, onClose, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div 
      className="modal-overlay active" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
          <i className="bx bx-x" onClick={onClose} style={{ cursor: 'pointer', fontSize: '24px' }} />
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}
