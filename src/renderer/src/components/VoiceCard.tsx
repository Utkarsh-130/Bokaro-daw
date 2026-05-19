import React from 'react';

interface VoiceCardProps {
    name: string;
    alias: string;
    color: string;
    isActive: boolean;
    onClick: () => void;
}

const VoiceCard: React.FC<VoiceCardProps> = ({ name, alias, color, isActive, onClick }) => {
    return (
        <div 
            className={`voice-card ${isActive ? 'active' : ''}`} 
            onClick={onClick}
            style={{ '--accent-color': color } as any}
        >
            <div className="voice-avatar">
                {name[0]}
            </div>
            <div className="voice-info">
                <span className="voice-name">{name}</span>
                <span className="voice-alias">{alias}</span>
            </div>
        </div>
    );
};

export default VoiceCard;
