/** Territory data: grid, zones, stations, landmarks — single source of truth for both Phaser and React */

import type { GridPosition } from './types.ts';

export interface Zone {
  id: string;
  name: string;
  /** Top-left corner of zone (inclusive) */
  start: GridPosition;
  /** Bottom-right corner of zone (inclusive) */
  end: GridPosition;
  color: string;
}

export interface RadioStation {
  id: string;
  name: string;
  position: GridPosition;
  frequency: number;
  coverageRadius: number;
}

export interface Landmark {
  id: string;
  name: string;
  position: GridPosition;
  symbol: string;
  description: string;
}

/** 10x10 grid — columns A-J, rows 1-10 */
export const GRID_COLS = 10;
export const GRID_ROWS = 10;

/** Bunker sits at center-bottom of territory */
export const BUNKER_POSITION: GridPosition = { col: 4, row: 9 };

export const ZONES: Zone[] = [
  {
    id: 'industrial',
    name: 'Industrial District',
    start: { col: 0, row: 0 },
    end: { col: 4, row: 4 },
    color: '#1e2a1a',   // dark green — overgrown industrial
  },
  {
    id: 'residential',
    name: 'East Residential',
    start: { col: 5, row: 0 },
    end: { col: 9, row: 4 },
    color: '#1a1e2e',   // dark blue — residential blocks
  },
  {
    id: 'outskirts',
    name: 'Southern Outskirts',
    start: { col: 0, row: 5 },
    end: { col: 4, row: 9 },
    color: '#2a1e16',   // dark brown — open outskirts
  },
  {
    id: 'corridor',
    name: 'East Corridor',
    start: { col: 5, row: 5 },
    end: { col: 9, row: 9 },
    color: '#1a1a20',   // near-black — narrow corridor
  },
];

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: 'station_north',
    name: 'Relay North',
    position: { col: 3, row: 2 },
    frequency: 91.5,
    coverageRadius: 3,
  },
  {
    id: 'station_east',
    name: 'Relay East',
    position: { col: 7, row: 6 },
    frequency: 97.3,
    coverageRadius: 3,
  },
];

export const LANDMARKS: Landmark[] = [
  {
    id: 'gas_station',
    name: 'Gas Station',
    position: { col: 2, row: 3 },
    symbol: '⛽',
    description: 'Abandoned fuel station with a collapsed canopy.',
  },
  {
    id: 'warehouse',
    name: 'Warehouse',
    position: { col: 1, row: 1 },
    symbol: '🏭',
    description: 'Large storage building, north wall caved in.',
  },
  {
    id: 'church',
    name: 'Church',
    position: { col: 7, row: 2 },
    symbol: '⛪',
    description: 'Stone church with a cracked bell tower.',
  },
  {
    id: 'water_tower',
    name: 'Water Tower',
    position: { col: 6, row: 7 },
    symbol: '🗼',
    description: 'Rusted water tower, visible from several grid squares.',
  },
];

/** Convert grid position to letter+number label (e.g. col 0 row 0 = "A1") */
export function gridLabel(pos: GridPosition): string {
  const letter = String.fromCharCode(65 + pos.col); // A=0, B=1, ...
  return `${letter}${pos.row + 1}`;
}

/** Find which zone contains a grid position */
export function getZoneAt(pos: GridPosition): Zone | undefined {
  return ZONES.find(
    (z) =>
      pos.col >= z.start.col &&
      pos.col <= z.end.col &&
      pos.row >= z.start.row &&
      pos.row <= z.end.row
  );
}

/** Find landmark at a grid position */
export function getLandmarkAt(pos: GridPosition): Landmark | undefined {
  return LANDMARKS.find((l) => l.position.col === pos.col && l.position.row === pos.row);
}

/** Calculate grid distance between two positions */
export function gridDistance(a: GridPosition, b: GridPosition): number {
  const dx = a.col - b.col;
  const dy = a.row - b.row;
  return Math.sqrt(dx * dx + dy * dy);
}
