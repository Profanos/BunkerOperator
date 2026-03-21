/** All game state lives here — Phaser updates, React reads, listeners get notified */

import type { GameState, ToolId, GridPosition, JournalEntry, EntityState } from './types.ts';
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
      debugMode: false,
    };
    this.notify();
  }
}

export const StateManager = new StateManagerClass();
