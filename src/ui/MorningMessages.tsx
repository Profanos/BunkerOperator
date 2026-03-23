/** Morning messages overlay — shown at the start of each day after day 1.
 *  Blocks interaction until dismissed. Messages auto-log to journal on display. */

import { useEffect } from 'react';
import { StateManager } from '../shared/StateManager.ts';
import { formatGameTime } from '../shared/constants.ts';
import type { MorningMessage } from '../data/dialogue/types.ts';

interface Props {
  day: number;
  messages: MorningMessage[];
  onDismiss: () => void;
}

export function MorningMessages({ day, messages, onDismiss }: Props) {
  // Log all messages to journal when the overlay appears
  useEffect(() => {
    const state = StateManager.getState();
    const timeStr = formatGameTime(state.timeRemaining);

    for (const msg of messages) {
      const alreadyLogged = state.journal.some((e) => e.key === msg.journalKey);
      if (!alreadyLogged) {
        StateManager.addJournalEntry({
          key: msg.journalKey,
          timestamp: Date.now(),
          day,
          timeStr,
          text: msg.journalText,
        });
      }
    }
  }, [day, messages]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '960px', height: '540px',
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '32px',
        fontFamily: 'monospace',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#3a3a5e', fontSize: '11px', letterSpacing: '3px', marginBottom: '8px' }}>
          INCOMING TRANSMISSION
        </div>
        <div style={{ color: '#6a9fb5', fontSize: '16px', letterSpacing: '2px' }}>
          DAY {day} — MORNING
        </div>
      </div>

      {/* Messages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '560px', width: '100%' }}>
        {messages.map((msg) => (
          <div
            key={msg.journalKey}
            style={{
              backgroundColor: '#0a0a14',
              border: '1px solid #2a2a4a',
              padding: '20px 24px',
            }}
          >
            <div style={{ color: '#4a4a8e', fontSize: '10px', letterSpacing: '2px', marginBottom: '10px' }}>
              FROM: {msg.from.toUpperCase()}
            </div>
            <div style={{ color: '#b0b0c8', fontSize: '13px', lineHeight: '1.7' }}>
              "{msg.text}"
            </div>
          </div>
        ))}
      </div>

      {/* Dismiss */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={onDismiss}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #3a3a5e',
            color: '#6a9fb5',
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '10px 32px',
            cursor: 'pointer',
            letterSpacing: '2px',
          }}
        >
          ACKNOWLEDGE
        </button>
        <div style={{ color: '#2a2a4e', fontSize: '10px', marginTop: '10px' }}>
          Verify positions with radar before acting on this information.
        </div>
      </div>
    </div>
  );
}
