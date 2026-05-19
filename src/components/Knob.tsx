import React, { useRef } from 'react'

interface KnobProps {
  min: number
  max: number
  value: number
  onChange: (val: number) => void
  label?: string
  displayValue: string
}

export default function Knob({ min, max, value, onChange, label, displayValue }: KnobProps) {
  const knobRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startValue = value
    const range = max - min

    const handleMouseMove = (moveEv: MouseEvent) => {
      const deltaY = startY - moveEv.clientY
      const newValue = Math.max(min, Math.min(max, startValue + (deltaY / 100) * range))
      onChange(newValue)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const pct = (value - min) / (max - min)
  const deg = pct * 270 - 135

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div 
        ref={knobRef}
        className="knob"
        onMouseDown={handleMouseDown}
      >
        <div 
          className="knob-dot" 
          style={{ transform: `rotate(${deg}deg)` }}
        />
      </div>
      <div style={{ textAlign: 'center', fontSize: '12px', marginTop: '10px' }}>
        {displayValue}
      </div>
    </div>
  )
}
