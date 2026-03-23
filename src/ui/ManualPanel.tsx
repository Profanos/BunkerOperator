/** Technical Manual — full-screen reference panel positioned over panel_manual.png art.
 *  All positions calibrated to art windows. Right column (x>598) is decorative art only. */

import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { ZONES, RADIO_STATIONS, LANDMARKS, gridLabel } from '../shared/territory.ts';
import { StateManager } from '../shared/StateManager.ts';
import type { JournalEntry } from '../shared/types.ts';

/** Single place to calibrate all text positions against panel_manual.png.
 *  Measured from pixel inspector — update only this object when art changes. */
const CFG = {
  radio: {
    col: { station: 14, freq: 162, position: 262, range: 409 },
    headerY: 115,
    rowY: [118, 160],   // P39/P41: measured row centers
  },
  zones: {
    col: { zone: 14, status: 162, threat: 294, notes: 415 },
    headerY: 255,
    firstRowY: 248,     // P43: first data row
    rowStep: 20,        // compact — keeps all 4 rows within section bounds
  },
  landmarks: {
    col: { name: 13, gridRef: 165, type: 293, notes: 411 },
    headerY: 395,
    firstRowY: 389,     // P51: first row — sits near top of section
    rowStep: 60,        // P55: second row at ~449
  },
} as const;

const BASE: CSSProperties = {
  position: 'absolute',
  fontFamily: 'monospace',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
};

const C = {
  header:    '#6a8a6a',
  data:      '#9ad4e8',
  dim:       '#4a5a4a',
  amber:     '#f59e0b',
  illegible: '#2a2a3e',
  active:    '#4aaa6a',
  desc:      '#3a5a3a',
};

function isDiscovered(stationId: string, journal: JournalEntry[]): boolean {
  return journal.some((e) => e.key === `radar:discovered_${stationId}`);
}

export function ManualPanel() {
  const [journal, setJournal] = useState(StateManager.getState().journal);

  useEffect(() => {
    const unsub = StateManager.subscribe((state) => setJournal(state.journal));
    return unsub;
  }, []);

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0,
      width: '960px', height: '540px',
      backgroundImage: 'url(/assets/sprites/panel_manual.png)',
      backgroundSize: '960px 540px',
      backgroundColor: '#0a0a14',
      zIndex: 20,
    }}>

      {/* ── RADIO STATIONS ───────────────────────────────────────── */}
      {/* Column headers are baked into the art — only render data rows */}

      {RADIO_STATIONS.map((s, i) => {
        const discovered = isDiscovered(s.id, journal);
        const y = CFG.radio.rowY[i] ?? CFG.radio.rowY.at(-1)! + (i - CFG.radio.rowY.length + 1) * 36;
        return (
          <div key={s.id}>
            <div style={{ ...BASE, left: CFG.radio.col.station,  top: y, fontSize: '11px', color: C.data }}>
              {s.name}
            </div>
            <div style={{ ...BASE, left: CFG.radio.col.freq,     top: y, fontSize: '11px', color: discovered ? C.amber : C.illegible, fontWeight: 'bold' }}>
              {discovered ? s.frequency.toFixed(1) : '[ILLEGIBLE]'}
            </div>
            <div style={{ ...BASE, left: CFG.radio.col.position, top: y, fontSize: '11px', color: C.dim }}>
              {gridLabel(s.position)}
            </div>
            <div style={{ ...BASE, left: CFG.radio.col.range,    top: y, fontSize: '11px', color: C.dim }}>
              {s.coverageRadius} cells
            </div>
          </div>
        );
      })}

      {/* ── TERRITORY ZONES ──────────────────────────────────────── */}
      {/* Column headers are baked into the art — only render data rows */}

      {ZONES.map((z, i) => {
        const y = CFG.zones.firstRowY + i * CFG.zones.rowStep;
        return (
          <div key={z.id}>
            <div style={{ ...BASE, left: CFG.zones.col.zone,   top: y, fontSize: '10px', color: C.data }}>{z.name}</div>
            <div style={{ ...BASE, left: CFG.zones.col.status, top: y, fontSize: '10px', color: C.active }}>ACTIVE</div>
            <div style={{ ...BASE, left: CFG.zones.col.threat, top: y, fontSize: '10px', color: C.dim }}>—</div>
            <div style={{ ...BASE, left: CFG.zones.col.notes,  top: y, fontSize: '10px', color: C.dim }}>
              {gridLabel(z.start)}–{gridLabel(z.end)}
            </div>
          </div>
        );
      })}

      {/* ── KNOWN LANDMARKS ──────────────────────────────────────── */}
      {/* Column headers are baked into the art — only render data rows */}

      {LANDMARKS.map((l, i) => {
        const y = CFG.landmarks.firstRowY + i * CFG.landmarks.rowStep;
        // Truncate description to one line — full text on hover via title
        const shortDesc = l.description.length > 28 ? l.description.slice(0, 28) + '…' : l.description;
        return (
          <div key={l.id}>
            <div style={{ ...BASE, left: CFG.landmarks.col.name,    top: y, fontSize: '10px', color: C.data }}>
              {l.symbol} {l.name}
            </div>
            <div style={{ ...BASE, left: CFG.landmarks.col.gridRef, top: y, fontSize: '10px', color: C.dim }}>
              {gridLabel(l.position)}
            </div>
            <div style={{ ...BASE, left: CFG.landmarks.col.type,    top: y, fontSize: '10px', color: C.dim }}>
              STRUCTURE
            </div>
            <div title={l.description} style={{ ...BASE, left: CFG.landmarks.col.notes, top: y, fontSize: '10px', color: C.dim }}>
              {shortDesc}
            </div>
          </div>
        );
      })}

    </div>
  );
}
