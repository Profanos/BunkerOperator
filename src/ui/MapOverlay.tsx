/** Map grid overlay — full-screen tool view showing territory, sensor placement */

import { useState, useEffect } from 'react';
import {
  ZONES, RADIO_STATIONS, LANDMARKS, BUNKER_POSITION,
  GRID_COLS, GRID_ROWS, gridLabel, getZoneAt,
} from '../shared/territory.ts';
import { StateManager } from '../shared/StateManager.ts';
import { EventBridge } from '../shared/EventBridge.ts';
import { SENSOR_RANGE } from '../shared/constants.ts';
import type { GridPosition, EntityState } from '../shared/types.ts';

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

  useEffect(() => {
    const unsub = StateManager.subscribe((state) => {
      setSensorPos(state.sensorPosition);
      setEntities(state.entities);
      setDebugMode(state.debugMode);
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
  for (const l of LANDMARKS) landmarkMap.set(`${l.position.col},${l.position.row}`, l);

  const isBunker = (col: number, row: number) =>
    col === BUNKER_POSITION.col && row === BUNKER_POSITION.row;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '960px',
      height: '540px',
      backgroundColor: '#0a0a14',
      zIndex: 20,
    }}>
      {/* Title */}
      <div style={{
        position: 'absolute',
        top: '6px',
        left: MAP_OFFSET_X,
        color: '#4a4a6e',
        fontFamily: 'monospace',
        fontSize: '12px',
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

      {/* Right sidebar — sensor info + legend */}
      <div style={{
        position: 'absolute',
        right: '20px',
        top: MAP_OFFSET_Y,
        width: '130px',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#6a6a8e',
      }}>
        {sensorPos ? (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#4aff4a', fontSize: '12px', marginBottom: '4px' }}>SENSOR</div>
            <div style={{ color: '#6aff6a' }}>{gridLabel(sensorPos)}</div>
            <div style={{ color: '#3a6a3a', fontSize: '10px' }}>Range: {SENSOR_RANGE} cells</div>
          </div>
        ) : (
          <div style={{ color: '#6a4a4a', fontSize: '11px', marginBottom: '16px' }}>
            NO SENSOR PLACED
          </div>
        )}
        <div style={{ borderTop: '1px solid #2a2a3e', paddingTop: '8px', fontSize: '10px', lineHeight: '1.8' }}>
          <div>📡 Radio Station</div>
          <div>🔒 Bunker</div>
          <div><span style={{ color: '#4aff4a' }}>■</span> Sensor</div>
          <div><span style={{ color: '#2a4a5a' }}>■</span> Scan Range</div>
        </div>
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
