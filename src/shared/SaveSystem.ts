/** Save and load game state to/from localStorage */

import type { GameState, EntityState, GridPosition, JournalEntry, RadarContact } from './types.ts';

const SAVE_KEY = 'bunker_operator_save';
const SAVE_VERSION = 1;

export interface SaveData {
  version: typeof SAVE_VERSION;
  currentDay: number;
  entities: EntityState[];
  journal: JournalEntry[];
  radioFrequency: number;
  sensorPosition: GridPosition | null;
  radarContacts: RadarContact[];
  discoveredLandmarks: string[];
}

export function saveGame(state: GameState): void {
  const data: SaveData = {
    version: SAVE_VERSION,
    currentDay: state.currentDay,
    entities: state.entities,
    journal: state.journal,
    radioFrequency: state.radioFrequency,
    sensorPosition: state.sensorPosition,
    radarContacts: state.radarContacts,
    discoveredLandmarks: state.discoveredLandmarks,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadSave(): SaveData | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return loadSave() !== null;
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
