/** Map grid overlay — full-screen tool view showing territory, sensor placement */

import { useState, useEffect } from 'react';
import {
  ZONES, RADIO_STATIONS, LANDMARKS, BUNKER_POSITION,
  GRID_COLS, GRID_ROWS, gridLabel, getZoneAt,
} from '../shared/territory.ts';
import { StateManager } from '../shared/StateManager.ts';
import { EventBridge } from '../shared/EventBridge.ts';
import { SENSOR_RANGE } from '../shared/constants.ts';
import { SITUATION_1 } from '../data/situations/situation1.ts';
import { SITUATION_2 } from '../data/situations/situation2.ts';
import type { GridPosition, EntityState, RadarContact, JournalEntry, EntityPath } from '../shared/types.ts';

/** Entity debug colors — survivors green, zombie red, hostile amber */
const PATH_COLORS: Record<string, string> = {
  survivor_test: '#4aff4a',
  zombie_test:   '#ff4a4a',
  hostile_kael:  '#f59e0b',
};

/** Resolve the active path for the given day, respecting journal-driven alternates */
function getActivePath(ep: EntityPath, day: number, journal: JournalEntry[]): GridPosition[] {
  const base = ep.dayPaths[day] ?? [];
  if (!ep.alternatePaths) return base;
  for (const [key, dayMap] of Object.entries(ep.alternatePaths)) {
    if (journal.some((e) => e.key === key)) {
      const alt = dayMap[day];
      if (alt) return alt;
    }
  }
  return base;
}

/** Find cells where a survivor and zombie share the same step index on the current day */
function findCollisionCells(day: number, journal: JournalEntry[]): Set<string> {
  const all = [...SITUATION_1.entities, ...SITUATION_2.entities];
  const survivors = all.filter((e) => e.type === 'survivor');
  const zombies   = all.filter((e) => e.type === 'zombie');
  const cells = new Set<string>();
  for (const s of survivors) {
    const sp = getActivePath(s, day, journal);
    for (const z of zombies) {
      const zp = getActivePath(z, day, journal);
      const len = Math.min(sp.length, zp.length);
      for (let i = 0; i < len; i++) {
        if (sp[i].col === zp[i].col && sp[i].row === zp[i].row) {
          cells.add(`${sp[i].col},${sp[i].row}`);
        }
      }
    }
  }
  return cells;
}

const CELL_SIZE = 48;
const GRID_WIDTH = GRID_COLS * CELL_SIZE;
const GRID_HEIGHT = GRID_ROWS * CELL_SIZE;
const MAP_OFFSET_X = Math.floor((960 - GRID_WIDTH) / 2);
const MAP_OFFSET_Y = Math.floor((540 - GRID_HEIGHT) / 2) + 10;

function isInSensorRange(cell: GridPosition, sensor: GridPosition): boolean {
  const dx = cell.col - sensor.col;
  const dy = cell.row - sensor.row;
  return Math.sqrt(dx * dx + dy * dy) <= SENSOR_RANGE;
}

export function MapOverlay() {
  const [sensorPos, setSensorPos] = useState<GridPosition | null>(StateManager.getState().sensorPosition);
  const [entities, setEntities] = useState<EntityState[]>(StateManager.getState().entities);
  const [debugMode, setDebugMode] = useState(StateManager.getState().debugMode);
  const [radarContacts, setRadarContacts] = useState<RadarContact[]>(StateManager.getState().radarContacts);
  const [currentDay, setCurrentDay] = useState(StateManager.getState().currentDay);
  const [discoveredLandmarks, setDiscoveredLandmarks] = useState<string[]>(StateManager.getState().discoveredLandmarks);
  const [journal, setJournal] = useState<JournalEntry[]>(StateManager.getState().journal);

  useEffect(() => {
    const unsub = StateManager.subscribe((state) => {
      setSensorPos(state.sensorPosition);
      setEntities(state.entities);
      setDebugMode(state.debugMode);
      setRadarContacts(state.radarContacts);
      setCurrentDay(state.currentDay);
      setDiscoveredLandmarks(state.discoveredLandmarks);
      setJournal(state.journal);
    });
    return unsub;
  }, []);

  const handleCellClick = (e: React.MouseEvent, col: number, row: number) => {
    e.stopPropagation();
    const pos = { col, row };
    StateManager.setSensorPosition(pos);
    EventBridge.emit('sensor:placed', pos);
  };

  // Build lookup maps
  const stationMap = new Map<string, typeof RADIO_STATIONS[number]>();
  for (const s of RADIO_STATIONS) stationMap.set(`${s.position.col},${s.position.row}`, s);

  const landmarkMap = new Map<string, typeof LANDMARKS[number]>();
  for (const l of LANDMARKS) {
    if (discoveredLandmarks.includes(l.id)) {
      landmarkMap.set(`${l.position.col},${l.position.row}`, l);
    }
  }

  const isBunker = (col: number, row: number) =>
    col === BUNKER_POSITION.col && row === BUNKER_POSITION.row;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '960px',
      height: '540px',
      backgroundImage: 'url(/assets/sprites/panel_map.png)',
      backgroundSize: '960px 540px',
      zIndex: 20,
    }}>
      {/* Title — sits above column headers (col headers at MAP_OFFSET_Y-16 ≈ 24px) */}
      <div style={{
        position: 'absolute',
        top: '8px',
        left: MAP_OFFSET_X + 35,
        color: '#4a4a6e',
        fontFamily: 'monospace',
        fontSize: '11px',
        letterSpacing: '2px',
      }}>
        TERRITORY MAP — CLICK TO PLACE SENSOR
      </div>

      {/* Column headers */}
      {Array.from({ length: GRID_COLS }, (_, col) => (
        <div key={`col-${col}`} style={{
          position: 'absolute',
          left: MAP_OFFSET_X + col * CELL_SIZE + CELL_SIZE / 2,
          top: MAP_OFFSET_Y - 16,
          transform: 'translateX(-50%)',
          color: '#5a5a7e',
          fontFamily: 'monospace',
          fontSize: '11px',
        }}>
          {String.fromCharCode(65 + col)}
        </div>
      ))}

      {/* Row headers */}
      {Array.from({ length: GRID_ROWS }, (_, row) => (
        <div key={`row-${row}`} style={{
          position: 'absolute',
          left: MAP_OFFSET_X - 20,
          top: MAP_OFFSET_Y + row * CELL_SIZE + CELL_SIZE / 2,
          transform: 'translateY(-50%)',
          color: '#5a5a7e',
          fontFamily: 'monospace',
          fontSize: '11px',
          textAlign: 'right',
          width: '16px',
        }}>
          {row + 1}
        </div>
      ))}

      {/* Grid cells */}
      {Array.from({ length: GRID_ROWS }, (_, row) =>
        Array.from({ length: GRID_COLS }, (_, col) => {
          const key = `${col},${row}`;
          const zone = getZoneAt({ col, row });
          const station = stationMap.get(key);
          const landmark = landmarkMap.get(key);
          const bunker = isBunker(col, row);
          const inRange = sensorPos ? isInSensorRange({ col, row }, sensorPos) : false;
          const isSensor = sensorPos?.col === col && sensorPos?.row === row;

          let bgColor = zone?.color ?? '#111118';
          let borderColor = '#1e1e2e';
          if (inRange && !isSensor) { bgColor = '#162232'; borderColor = '#2a4a6a'; }
          if (isSensor) { bgColor = '#1a3a1a'; borderColor = '#4aff4a'; }

          // Thicker border on zone edges
          const rightNeighborZone = getZoneAt({ col: col + 1, row });
          const bottomNeighborZone = getZoneAt({ col, row: row + 1 });
          const borderRight = rightNeighborZone?.id !== zone?.id ? '#3a3a5e' : borderColor;
          const borderBottom = bottomNeighborZone?.id !== zone?.id ? '#3a3a5e' : borderColor;

          const hasIcon = bunker || station || (landmark && !station && !bunker);

          return (
            <div
              key={key}
              onClick={(e) => handleCellClick(e, col, row)}
              title={gridLabel({ col, row })}
              style={{
                position: 'absolute',
                left: MAP_OFFSET_X + col * CELL_SIZE,
                top: MAP_OFFSET_Y + row * CELL_SIZE,
                width: CELL_SIZE - 1,
                height: CELL_SIZE - 1,
                backgroundColor: bgColor,
                borderTop: `1px solid ${borderColor}`,
                borderLeft: `1px solid ${borderColor}`,
                borderRight: `1px solid ${borderRight}`,
                borderBottom: `1px solid ${borderBottom}`,
                cursor: 'crosshair',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              {hasIcon && (
                <span style={{
                  fontSize: bunker ? '16px' : '15px',
                  filter: inRange ? 'brightness(1.3)' : 'brightness(0.85)',
                  lineHeight: 1,
                }}>
                  {bunker ? '🔒' : station ? '📡' : landmark!.symbol}
                </span>
              )}
            </div>
          );
        })
      )}

      {/* Zone name labels */}
      {ZONES.map((z) => {
        const cx = MAP_OFFSET_X + ((z.start.col + z.end.col) / 2) * CELL_SIZE + CELL_SIZE / 2;
        const cy = MAP_OFFSET_Y + ((z.start.row + z.end.row) / 2) * CELL_SIZE + CELL_SIZE / 2;
        return (
          <div key={z.id} style={{
            position: 'absolute',
            left: cx,
            top: cy,
            transform: 'translate(-50%, -50%)',
            color: '#3a3a5e',
            fontFamily: 'monospace',
            fontSize: '9px',
            letterSpacing: '1px',
            pointerEvents: 'none',
            textTransform: 'uppercase',
            textShadow: '0 0 6px rgba(0,0,0,0.9)',
            whiteSpace: 'nowrap',
          }}>
            {z.name}
          </div>
        );
      })}

      {/* Radar contacts — last known positions from scanner scans */}
      {radarContacts.map((contact) => {
        const isStale = contact.day < currentDay;
        const color = contact.type === 'survivor' ? '#4aff4a' : '#ff4a4a';
        const dimColor = contact.type === 'survivor' ? '#1a5a1a' : '#5a1a1a';
        return (
          <div
            key={contact.entityId}
            title={`${contact.type} — last seen ${gridLabel(contact.position)} Day ${contact.day} ${contact.timeStr}`}
            style={{
              position: 'absolute',
              left: MAP_OFFSET_X + contact.position.col * CELL_SIZE + CELL_SIZE / 2,
              top: MAP_OFFSET_Y + contact.position.row * CELL_SIZE + CELL_SIZE / 2,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Hollow ring = last known position from scanner (not current truth) */}
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: 'transparent',
              border: `2px solid ${isStale ? dimColor : color}`,
              opacity: isStale ? 0.4 : 0.85,
              boxShadow: isStale ? 'none' : `0 0 4px ${color}`,
            }} />
            <div style={{
              fontSize: '8px',
              fontFamily: 'monospace',
              color: isStale ? '#3a3a4e' : (contact.type === 'survivor' ? '#2a6a2a' : '#6a2a2a'),
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
              marginTop: '1px',
            }}>
              D{contact.day} {contact.timeStr}
            </div>
          </div>
        );
      })}

      {/* Debug entity dots — visible only in debug mode */}
      {debugMode && entities.filter((e) => e.alive).map((entity) => (
        <div
          key={entity.id}
          title={`[DEBUG] ${entity.type} — ${gridLabel(entity.position)}`}
          style={{
            position: 'absolute',
            left: MAP_OFFSET_X + entity.position.col * CELL_SIZE + CELL_SIZE / 2,
            top: MAP_OFFSET_Y + entity.position.row * CELL_SIZE + CELL_SIZE / 2,
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: entity.type === 'survivor' ? '#4aff4a' : '#ff4a4a',
            border: '2px solid rgba(0,0,0,0.6)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: entity.type === 'survivor'
              ? '0 0 6px #4aff4a'
              : '0 0 6px #ff4a4a',
          }}
        />
      ))}

      {/* Debug path overlay — full-day routes + collision markers */}
      {debugMode && (() => {
        const allPaths = [...SITUATION_1.entities, ...SITUATION_2.entities];
        const toX = (col: number) => MAP_OFFSET_X + col * CELL_SIZE + CELL_SIZE / 2;
        const toY = (row: number) => MAP_OFFSET_Y + row * CELL_SIZE + CELL_SIZE / 2;
        const collisions = findCollisionCells(currentDay, journal);
        return (
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '960px', height: '540px', pointerEvents: 'none', zIndex: 9 }}>
            {allPaths.map((ep) => {
              const path = getActivePath(ep, currentDay, journal);
              if (path.length < 2) return null;
              const pts = path.map((p) => `${toX(p.col)},${toY(p.row)}`).join(' ');
              const color = PATH_COLORS[ep.id] ?? '#888';
              return (
                <polyline key={ep.id} points={pts} fill="none"
                  stroke={color} strokeWidth="1.5" strokeOpacity="0.4"
                  strokeDasharray={ep.type === 'zombie' ? '5,4' : undefined}
                />
              );
            })}
            {Array.from(collisions).map((key) => {
              const [col, row] = key.split(',').map(Number);
              const cx = toX(col); const cy = toY(row); const r = 7;
              return (
                <g key={key}>
                  <line x1={cx-r} y1={cy-r} x2={cx+r} y2={cy+r} stroke="#ff2020" strokeWidth="2.5" strokeOpacity="0.9" />
                  <line x1={cx+r} y1={cy-r} x2={cx-r} y2={cy+r} stroke="#ff2020" strokeWidth="2.5" strokeOpacity="0.9" />
                </g>
              );
            })}
          </svg>
        );
      })()}

      {/* SENSOR window — aligned to art window center (839, 96) */}
      <div style={{
        position: 'absolute',
        left: '735px',
        top: '59px',
        width: '208px',
        height: '74px',
        fontFamily: 'monospace',
        fontSize: '11px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
      }}>
        {sensorPos ? (
          <>
            <div style={{ color: '#4aff4a', fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px' }}>{gridLabel(sensorPos)}</div>
            <div style={{ color: '#2a6a2a', fontSize: '10px', letterSpacing: '1px' }}>RANGE {SENSOR_RANGE} CELLS</div>
          </>
        ) : (
          <div style={{ color: '#4a3a3a', fontSize: '10px', letterSpacing: '1px' }}>NO SENSOR</div>
        )}
      </div>

      {/* CONTACTS window — aligned to art window center (840, 228) */}
      <div style={{
        position: 'absolute',
        left: '739px',
        top: '172px',
        width: '202px',
        height: '113px',
        fontFamily: 'monospace',
        fontSize: '10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        color: '#5a6a5a',
        letterSpacing: '1px',
      }}>
        <div><span style={{ color: '#4aff4a' }}>● </span>SURVIVOR</div>
        <div><span style={{ color: '#ff4a4a' }}>● </span>HOSTILE</div>
        <div><span style={{ color: '#6a9fb5' }}>■ </span>SCAN RANGE</div>
        <div><span style={{ color: '#4aff4a', opacity: 0.4 }}>● </span><span style={{ color: '#3a4a3a' }}>STALE CONTACT</span></div>
        <div style={{ fontSize: '9px', color: '#2a3a2a', marginTop: '2px' }}>📡 RELAY  🔒 BUNKER</div>
      </div>

      {/* ESC hint */}
      <div style={{
        position: 'absolute',
        bottom: '6px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#3a3a4e',
        fontFamily: 'monospace',
        fontSize: '10px',
      }}>
        ESC to return to desk
      </div>
    </div>
  );
}
