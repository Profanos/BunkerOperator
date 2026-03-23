/** All game state lives here — Phaser updates, React reads, listeners get notified */

import type { GameState, ToolId, GridPosition, JournalEntry, EntityState, RadarContact } from './types.ts';
import type { SaveData } from './SaveSystem.ts';
import { DAY_DURATION_SECONDS } from './constants.ts';

type StateListener = (state: GameState) => void;

class StateManagerClass {
  private state: GameState = {
    currentDay: 1,
    timeRemaining: DAY_DURATION_SECONDS,
    activeTool: null,
    sensorPosition: null,
    journal: [],
    entities: [],
    radioFrequency: 88.0,
    signalActive: false,
    activeStationId: null,
    debugMode: false,
    debugLog: [],
    radarContacts: [],
    discoveredLandmarks: [],
  };


  private listeners = new Set<StateListener>();

  getState(): Readonly<GameState> {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.state;
    this.listeners.forEach((fn) => fn(snapshot));
  }

  setActiveTool(tool: ToolId | null): void {
    this.state = { ...this.state, activeTool: tool };
    this.notify();
  }

  setTimeRemaining(seconds: number): void {
    this.state = { ...this.state, timeRemaining: seconds };
    this.notify();
  }

  setSensorPosition(pos: GridPosition | null): void {
    this.state = { ...this.state, sensorPosition: pos };
    this.notify();
  }

  addJournalEntry(entry: JournalEntry): void {
    // Deduplicate by key — StrictMode double-mount and retry paths can fire this twice
    if (this.state.journal.some((e) => e.key === entry.key)) return;
    this.state = { ...this.state, journal: [...this.state.journal, entry] };
    this.notify();
  }

  setEntities(entities: EntityState[]): void {
    this.state = { ...this.state, entities };
    this.notify();
  }

  setRadioFrequency(freq: number): void {
    this.state = { ...this.state, radioFrequency: freq };
    this.notify();
  }

  setSignalActive(active: boolean, stationId: string | null = null): void {
    this.state = { ...this.state, signalActive: active, activeStationId: stationId };
    this.notify();
  }

  setCurrentDay(day: number): void {
    this.state = { ...this.state, currentDay: day };
    this.notify();
  }

  setDebugMode(on: boolean): void {
    this.state = { ...this.state, debugMode: on };
    this.notify();
  }

  /** Upsert a radar contact — latest scan for each entity replaces any older contact */
  setRadarContact(contact: RadarContact): void {
    const contacts = this.state.radarContacts.filter((c) => c.entityId !== contact.entityId);
    this.state = { ...this.state, radarContacts: [...contacts, contact] };
    this.notify();
  }

  /** Append an event name to the debug log — only records when debug mode is active */
  addDebugLog(event: string): void {
    if (!this.state.debugMode) return;
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry = `[${time}] ${event}`;
    const log = [entry, ...this.state.debugLog].slice(0, 20);
    this.state = { ...this.state, debugLog: log };
    this.notify();
  }

  discoverLandmark(id: string): void {
    if (this.state.discoveredLandmarks.includes(id)) return;
    this.state = { ...this.state, discoveredLandmarks: [...this.state.discoveredLandmarks, id] };
    this.notify();
  }

  /** Restore state from a save — merges saved fields into a fresh state */
  applySave(save: SaveData): void {
    this.state = {
      currentDay: save.currentDay,
      timeRemaining: DAY_DURATION_SECONDS,
      activeTool: null,
      sensorPosition: save.sensorPosition,
      journal: save.journal,
      entities: save.entities,
      radioFrequency: save.radioFrequency,
      signalActive: false,
      activeStationId: null,
      debugMode: false,
      debugLog: [],
      radarContacts: save.radarContacts ?? [],
      discoveredLandmarks: save.discoveredLandmarks ?? [],
    };
    this.notify();
  }

  /** Reset state for a new game */
  reset(): void {
    this.state = {
      currentDay: 1,
      timeRemaining: DAY_DURATION_SECONDS,
      activeTool: null,
      sensorPosition: null,
      journal: [],
      entities: [],
      radioFrequency: 88.0,
      signalActive: false,
      activeStationId: null,
      debugMode: this.state.debugMode,
      debugLog: [],
      radarContacts: [],
      discoveredLandmarks: [],
    };
    this.notify();
  }
}

export const StateManager = new StateManagerClass();
