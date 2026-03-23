/** Shared TypeScript types used by both React and Phaser */

export type ToolId = 'radar' | 'map' | 'radio' | 'journal' | 'manual';

export type GameScreen = 'splash' | 'menu' | 'playing' | 'gameOver';

export interface JournalEntry {
  key: string;
  timestamp: number;
  day: number;
  timeStr: string;
  text: string;
}

export interface GridPosition {
  col: number;
  row: number;
}

export interface EntityState {
  id: string;
  situationId: string;
  type: 'survivor' | 'zombie';
  position: GridPosition;
  currentPathIndex: number;
  alive: boolean;
}

export interface EntityPath {
  id: string;
  situationId: string;
  type: 'survivor' | 'zombie';
  /** Day paths keyed by day number (1-based).
   *  If the current day has no entry the entity stays put — use this for
   *  entities that only exist on certain days (e.g. a Day 1-only zombie). */
  dayPaths: Record<number, GridPosition[]>;
  /** Alternate day paths — keyed by journal entry then by day number.
   *  When a journal key is present and an alternate exists for the current day,
   *  it overrides dayPaths. First matching key wins. */
  alternatePaths?: Record<string, Record<number, GridPosition[]>>;
  /** Night paths keyed by day number.
   *  Entity jumps to the last position after each day ends.
   *  nightPaths[N][last] should equal dayPaths[N+1][0] for smooth continuity. */
  nightPaths: Record<number, GridPosition[]>;
  speed: number;
}

export interface RadarContact {
  entityId: string;
  type: 'survivor' | 'zombie';
  position: GridPosition;
  day: number;
  timeStr: string;
}

export interface GameState {
  currentDay: number;
  timeRemaining: number;
  activeTool: ToolId | null;
  sensorPosition: GridPosition | null;
  journal: JournalEntry[];
  entities: EntityState[];
  radioFrequency: number;
  signalActive: boolean;
  /** Which radio station is currently generating the signal — null when no signal */
  activeStationId: string | null;
  debugMode: boolean;
  /** Event names captured for the debug panel — cleared on reset */
  debugLog: string[];
  /** Last known positions from radar scans — persisted across panel opens */
  radarContacts: RadarContact[];
  /** Landmark ids confirmed by scanning — only these appear on the map */
  discoveredLandmarks: string[];
}
