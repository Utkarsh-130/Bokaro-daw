import React from 'react';

interface ControlSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    dark?: boolean;
    onChange: (val: number) => void;
}

const ControlSlider: React.FC<ControlSliderProps> = ({ label, value, min, max, step, unit = '', dark, onChange }) => {
    return (
        <div className={`stat-box ${dark ? 'dark' : ''}`}>
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value.toFixed(1)}<span style={{ fontSize: '1rem' }}>{unit}</span></span>
            <input 
                type="range" 
                className="slider-input" 
                min={min} 
                max={max} 
                step={step} 
                value={value} 
                onChange={(e) => onChange(parseFloat(e.target.value))} 
            />
        </div>
    );
};

export default ControlSlider;
