/** Manages entities, their scripted paths, and position advancement over time */

import { EventBridge } from '../../shared/EventBridge.ts';
import { StateManager } from '../../shared/StateManager.ts';
import { ENTITY_MOVE_INTERVAL, formatGameTime } from '../../shared/constants.ts';
import { gridLabel } from '../../shared/territory.ts';
import type { GridPosition, EntityState } from '../../shared/types.ts';

export interface EntityPath {
  id: string;
  situationId: string;
  type: 'survivor' | 'zombie';
  dayPath: GridPosition[];
  /** Optional safe route — used when radio:survivor_warned is in journal */
  safeDayPath?: GridPosition[];
  nightPath: GridPosition[];
  speed: number;
}

/**
 * Test entities for the pressure test scenario (Milestone 4.4):
 *
 * Survivor "Mara" lingers at Relay North (D3) for 12 steps, then walks
 * toward Relay East through F5 — which the zombie occupies from step 5–13.
 * Collision occurs at step 13 (t≈52s) if the player hasn't warned her.
 *
 * Warning: choose the zombie warning option in the radio dialogue →
 * writes radio:survivor_warned → survivor switches to safeDayPath (bypasses F5).
 *
 * Zombie lingers at F5 (col:5, row:4) from step 5 onward to create a
 * clear, detectable threat on radar.
 */
export const TEST_ENTITIES: EntityPath[] = [
  {
    id: 'survivor_test',
    situationId: 'test',
    type: 'survivor',
    dayPath: [
      // Linger at Relay North — player has time to detect zombie and radio a warning
      { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 },
      { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 },
      { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 },
      // Moves toward Relay East — step 13 passes through F5 (danger zone)
      { col: 4, row: 3 },
      { col: 5, row: 4 }, // ← COLLISION if zombie still here and no warning given
      { col: 6, row: 5 },
      { col: 7, row: 6 }, // Relay East
    ],
    safeDayPath: [
      // Same long linger
      { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 },
      { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 },
      { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 },
      // Safe northern route — avoids F5 entirely
      { col: 4, row: 2 },
      { col: 5, row: 2 },
      { col: 6, row: 3 },
      { col: 7, row: 6 }, // Relay East
    ],
    nightPath: [{ col: 7, row: 6 }, { col: 6, row: 7 }],
    speed: 1,
  },
  {
    id: 'zombie_test',
    situationId: 'test',
    type: 'zombie',
    dayPath: [
      // Approaches from northeast
      { col: 7, row: 1 },
      { col: 7, row: 2 },
      { col: 6, row: 2 },
      { col: 6, row: 3 },
      { col: 5, row: 3 },
      // Lingers at F5 (col:5, row:4) — step 5 through 13
      // Survivor arrives here at step 13 → collision if not warned
      { col: 5, row: 4 }, { col: 5, row: 4 }, { col: 5, row: 4 }, { col: 5, row: 4 },
      { col: 5, row: 4 }, { col: 5, row: 4 }, { col: 5, row: 4 }, { col: 5, row: 4 },
      { col: 5, row: 4 },
      // Continues south
      { col: 5, row: 5 },
      { col: 4, row: 6 },
    ],
    nightPath: [{ col: 4, row: 6 }, { col: 3, row: 7 }],
    speed: 1,
  },
];

export class SituationManager {
  private entityPaths: EntityPath[] = [];
  private moveTimer = 0;

  init(entities: EntityPath[]): void {
    this.entityPaths = entities;
    this.moveTimer = 0;

    const states: EntityState[] = entities.map((e) => ({
      id: e.id,
      situationId: e.situationId,
      type: e.type,
      position: { ...e.dayPath[0] },
      currentPathIndex: 0,
      alive: true,
    }));
    StateManager.setEntities(states);
  }

  /** Called each frame with delta in seconds */
  update(deltaSec: number): void {
    this.moveTimer += deltaSec;
    if (this.moveTimer < ENTITY_MOVE_INTERVAL) return;
    this.moveTimer -= ENTITY_MOVE_INTERVAL;
    this.advanceEntities();
  }

  private advanceEntities(): void {
    const entities = [...StateManager.getState().entities];
    const journal = StateManager.getState().journal;
    const warningGiven = journal.some((e) => e.key === 'radio:survivor_warned');
    let changed = false;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (!entity.alive) continue;

      const pathData = this.entityPaths.find((p) => p.id === entity.id);
      if (!pathData) continue;

      // Warned survivors switch to safe path if one exists
      const path =
        entity.type === 'survivor' && warningGiven && pathData.safeDayPath
          ? pathData.safeDayPath
          : pathData.dayPath;

      const nextIndex = entity.currentPathIndex + 1;
      if (nextIndex < path.length) {
        entities[i] = {
          ...entity,
          currentPathIndex: nextIndex,
          position: { ...path[nextIndex] },
        };
        changed = true;
      }
    }

    // Check for survivor/zombie collisions after moving
    changed = this.checkCollisions(entities) || changed;

    if (changed) {
      StateManager.setEntities(entities);
      EventBridge.emit('entities:moved');
    }
  }

  /** Returns true if any entity state was changed (e.g. survivor marked dead) */
  private checkCollisions(entities: EntityState[]): boolean {
    const survivors = entities.filter((e) => e.alive && e.type === 'survivor');
    const zombies = entities.filter((e) => e.alive && e.type === 'zombie');
    let changed = false;

    for (const survivor of survivors) {
      for (const zombie of zombies) {
        if (
          survivor.position.col === zombie.position.col &&
          survivor.position.row === zombie.position.row
        ) {
          const idx = entities.findIndex((e) => e.id === survivor.id);
          entities[idx] = { ...survivor, alive: false };
          changed = true;

          const state = StateManager.getState();
          StateManager.addJournalEntry({
            key: `situation:compromised_${survivor.id}`,
            timestamp: Date.now(),
            day: state.currentDay,
            timeStr: formatGameTime(state.timeRemaining),
            text: `CRITICAL — Contact with survivor lost at ${gridLabel(survivor.position)}. Presumed compromised.`,
          });

          EventBridge.emit('situation:survivor_compromised', survivor.id);
        }
      }
    }

    return changed;
  }

  /** Advance entities along night paths — called during day transition */
  advanceNight(): void {
    const entities = [...StateManager.getState().entities];

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (!entity.alive) continue;

      const pathData = this.entityPaths.find((p) => p.id === entity.id);
      if (!pathData || pathData.nightPath.length === 0) continue;

      const nightEnd = pathData.nightPath[pathData.nightPath.length - 1];
      entities[i] = {
        ...entity,
        position: { ...nightEnd },
        currentPathIndex: 0,
      };
    }

    StateManager.setEntities(entities);
  }

  getEntityPositions(): EntityState[] {
    return StateManager.getState().entities;
  }
}
