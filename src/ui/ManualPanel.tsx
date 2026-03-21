/** Technical Manual — full-screen reference panel. Station frequencies are illegible
 *  until the player scans near them with the radar — discovery happens in the field. */

import { useState, useEffect } from 'react';
import { ZONES, RADIO_STATIONS, LANDMARKS, gridLabel } from '../shared/territory.ts';
import { StateManager } from '../shared/StateManager.ts';
import { formatGameTime } from '../shared/constants.ts';
import type { JournalEntry } from '../shared/types.ts';

function logOnce(key: string, text: string): void {
  const state = StateManager.getState();
  // Check journal directly — component refs reset on unmount, journal is the source of truth
  if (state.journal.some((e) => e.key === key)) return;
  StateManager.addJournalEntry({
    key,
    timestamp: Date.now(),
    day: state.currentDay,
    timeStr: formatGameTime(state.timeRemaining),
    text,
  });
}

function isDiscovered(stationId: string, journal: JournalEntry[]): boolean {
  return journal.some((e) => e.key === `radar:discovered_${stationId}`);
}

export function ManualPanel() {
  const [journal, setJournal] = useState(StateManager.getState().journal);

  useEffect(() => {
    const unsub = StateManager.subscribe((state) => setJournal(state.journal));
    return unsub;
  }, []);

  // Log zones and landmarks on first open — these are always legible
  // Station frequencies are NOT logged here; radar discovery owns that
  useEffect(() => {
    for (const zone of ZONES) {
      logOnce(
        `manual:zone_${zone.id}`,
        `MANUAL — ${zone.name}: grid ${gridLabel(zone.start)} to ${gridLabel(zone.end)}.`
      );
    }
    for (const landmark of LANDMARKS) {
      logOnce(
        `manual:landmark_${landmark.id}`,
        `MANUAL — ${landmark.name} at ${gridLabel(landmark.position)}: ${landmark.description}`
      );
    }
  }, []);

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0,
      width: '960px', height: '540px',
      backgroundColor: '#0a0a14',
      color: '#b0b0c8',
      fontFamily: 'monospace',
      fontSize: '13px',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid #1a1a2e' }}>
        <h2 style={{ color: '#6a9fb5', fontSize: '14px', margin: 0, letterSpacing: '2px' }}>
          ▌ TECHNICAL MANUAL — FIELD REFERENCE
        </h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', lineHeight: '1.7' }}>

        {/* Radio Stations */}
        <h3 style={{ color: '#7a7a9e', fontSize: '12px', margin: '0 0 10px 0', borderBottom: '1px solid #1a1a2e', paddingBottom: '4px', letterSpacing: '1px' }}>
          RADIO STATIONS
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ color: '#5a5a7e', fontSize: '10px', textAlign: 'left' }}>
              <th style={{ padding: '4px 12px', fontWeight: 'normal' }}>STATION</th>
              <th style={{ padding: '4px 12px', fontWeight: 'normal' }}>FREQ (MHz)</th>
              <th style={{ padding: '4px 12px', fontWeight: 'normal' }}>POSITION</th>
              <th style={{ padding: '4px 12px', fontWeight: 'normal' }}>RANGE</th>
            </tr>
          </thead>
          <tbody>
            {RADIO_STATIONS.map((s) => {
              const discovered = isDiscovered(s.id, journal);
              return (
                <tr key={s.id}>
                  <td style={{ padding: '4px 12px', color: '#9ad4e8' }}>{s.name}</td>
                  <td style={{ padding: '4px 12px', color: discovered ? '#f59e0b' : '#3a3a5e', fontWeight: 'bold' }}>
                    {discovered ? s.frequency.toFixed(1) : '[ILLEGIBLE]'}
                  </td>
                  <td style={{ padding: '4px 12px' }}>{gridLabel(s.position)}</td>
                  <td style={{ padding: '4px 12px' }}>{s.coverageRadius} cells</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Zones */}
        <h3 style={{ color: '#7a7a9e', fontSize: '12px', margin: '0 0 10px 0', borderBottom: '1px solid #1a1a2e', paddingBottom: '4px', letterSpacing: '1px' }}>
          TERRITORY ZONES
        </h3>
        <div style={{ marginBottom: '24px' }}>
          {ZONES.map((z) => (
            <div key={z.id} style={{ marginBottom: '6px' }}>
              <span style={{ color: '#9ad4e8' }}>{z.name}</span>
              <span style={{ color: '#5a5a7e' }}> — grid {gridLabel(z.start)} to {gridLabel(z.end)}</span>
            </div>
          ))}
        </div>

        {/* Landmarks */}
        <h3 style={{ color: '#7a7a9e', fontSize: '12px', margin: '0 0 10px 0', borderBottom: '1px solid #1a1a2e', paddingBottom: '4px', letterSpacing: '1px' }}>
          KNOWN LANDMARKS
        </h3>
        <div style={{ marginBottom: '24px' }}>
          {LANDMARKS.map((l) => (
            <div key={l.id} style={{ marginBottom: '8px' }}>
              <span style={{ marginRight: '8px' }}>{l.symbol}</span>
              <span style={{ color: '#9ad4e8' }}>{l.name}</span>
              <span style={{ color: '#5a5a7e' }}> [{gridLabel(l.position)}]</span>
              <br />
              <span style={{ color: '#6a6a8e', fontSize: '11px', marginLeft: '28px' }}>{l.description}</span>
            </div>
          ))}
        </div>

        <div style={{ color: '#3a3a4e', fontSize: '10px', fontStyle: 'italic', marginTop: '12px' }}>
          Some pages are missing or illegible. Scan relay positions with radar to recover frequency data.
        </div>
      </div>

      <div style={{ padding: '8px', textAlign: 'center', color: '#3a3a4e', fontSize: '10px' }}>
        ESC to return to desk
      </div>
    </div>
  );
}
