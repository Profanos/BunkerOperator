/** Radio station coverage calculations — checks entity proximity to stations each tick */

import { StateManager } from '../../shared/StateManager.ts';
import { EventBridge } from '../../shared/EventBridge.ts';
import { RADIO_STATIONS, gridDistance } from '../../shared/territory.ts';

export class CoverageSystem {
  private wasSignalActive = false;

  /** Call every game tick — checks coverage and updates signal state */
  update(): void {
    const state = StateManager.getState();
    // Only survivors broadcast on radio — zombies don't use radios
    const entities = state.entities.filter((e) => e.alive && e.type === 'survivor');
    const playerFreq = state.radioFrequency;

    // Find the first station whose frequency matches AND has an entity in coverage
    let activeStationId: string | null = null;

    for (const station of RADIO_STATIONS) {
      const freqMatch = Math.abs(station.frequency - playerFreq) < 0.05;
      if (!freqMatch) continue;

      const entityInRange = entities.some(
        (e) => gridDistance(e.position, station.position) <= station.coverageRadius
      );

      if (entityInRange) {
        activeStationId = station.id;
        break;
      }
    }

    const signalActive = activeStationId !== null;
    if (signalActive !== this.wasSignalActive) {
      this.wasSignalActive = signalActive;
      // Pass station id so RadioPanel knows which dialogue session to load
      StateManager.setSignalActive(signalActive, activeStationId);
      EventBridge.emit(signalActive ? 'radio:signalActive' : 'radio:signalLost');
    }
  }
}
