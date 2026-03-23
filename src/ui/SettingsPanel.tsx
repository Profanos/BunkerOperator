/** Settings overlay — toggle with TAB, controls master volume and mute */

import { useState, useEffect } from 'react';
import { EventBridge } from '../shared/EventBridge.ts';

interface Props {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: Props) {
  const [volume, setVolume] = useState(40);
  const [muted, setMuted] = useState(false);

  // Emit initial state on mount so AudioManager syncs
  useEffect(() => {
    EventBridge.emit('settings:volume', volume);
  }, []);

  const handleVolume = (val: number) => {
    setVolume(val);
    if (muted) {
      setMuted(false);
      EventBridge.emit('settings:mute', false);
    }
    EventBridge.emit('settings:volume', val);
  };

  const handleMute = () => {
    const next = !muted;
    setMuted(next);
    EventBridge.emit('settings:mute', next);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)',
      }}
    >
      {/* Panel — stop click propagation so clicking inside doesn't close */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0d120e',
          border: '1px solid #3a5a2a',
          padding: '28px 36px',
          fontFamily: 'monospace',
          color: '#8abf6a',
          minWidth: '280px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ letterSpacing: '4px', fontSize: '11px', color: '#4a7a3a' }}>
          ■ SETTINGS
        </div>

        {/* Volume */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '11px', letterSpacing: '2px', color: '#6a9a5a' }}>
            VOLUME — {muted ? 'MUTED' : `${volume}%`}
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => handleVolume(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#8abf6a',
              cursor: 'pointer',
              opacity: muted ? 0.4 : 1,
            }}
          />
        </div>

        {/* Mute toggle */}
        <button
          onClick={handleMute}
          style={{
            background: muted ? '#1a3a1a' : 'transparent',
            border: `1px solid ${muted ? '#4aff4a' : '#3a5a2a'}`,
            color: muted ? '#4aff4a' : '#6a9a5a',
            fontFamily: 'monospace',
            fontSize: '11px',
            letterSpacing: '2px',
            padding: '8px 0',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {muted ? '◉ UNMUTE' : '○ MUTE'}
        </button>

        <div style={{ fontSize: '10px', color: '#3a5a2a', letterSpacing: '1px', textAlign: 'center' }}>
          TAB to close
        </div>
      </div>
    </div>
  );
}
