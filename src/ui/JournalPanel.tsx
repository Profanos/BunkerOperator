/** Journal — full-screen tool view with scrollable timestamped entries */

import { useEffect, useState } from 'react';
import { StateManager } from '../shared/StateManager.ts';
import type { JournalEntry } from '../shared/types.ts';

export function JournalPanel() {
  const [entries, setEntries] = useState<JournalEntry[]>(StateManager.getState().journal);

  useEffect(() => {
    const unsub = StateManager.subscribe((state) => {
      setEntries(state.journal);
    });
    return unsub;
  }, []);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '960px',
      height: '540px',
      backgroundColor: '#0a0a14',
      color: '#b0b0c8',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '16px 24px 12px',
        borderBottom: '1px solid #1a1a2e',
      }}>
        <h2 style={{ color: '#6a9fb5', fontSize: '14px', margin: 0, letterSpacing: '2px' }}>
          ▌ OPERATOR JOURNAL
        </h2>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 24px',
      }}>
        {entries.length === 0 ? (
          <div style={{ color: '#3a3a5e', fontStyle: 'italic', marginTop: '20px' }}>
            No entries recorded.
          </div>
        ) : (
          [...entries].reverse().map((entry, i) => (
            <div key={i} style={{
              marginBottom: '10px',
              paddingBottom: '10px',
              borderBottom: '1px solid #1a1a2e',
              lineHeight: '1.5',
            }}>
              <span style={{ color: '#4a6a8e', fontSize: '10px', marginRight: '10px' }}>
                DAY {entry.day} — {entry.timeStr}
              </span>
              <span style={{ color: '#8a8aae' }}>{entry.text}</span>
            </div>
          ))
        )}
      </div>

      <div style={{
        padding: '8px',
        textAlign: 'center',
        color: '#3a3a4e',
        fontSize: '10px',
      }}>
        ESC to return to desk
      </div>
    </div>
  );
}
