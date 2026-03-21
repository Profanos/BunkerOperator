/** Shared TypeScript types used by both React and Phaser */

export type ToolId = 'radar' | 'map' | 'radio' | 'journal' | 'manual';

export type GameScreen = 'menu' | 'playing' | 'gameOver';

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
}
