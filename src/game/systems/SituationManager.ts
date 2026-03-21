/** Manages entities, their scripted paths, and position advancement over time */

import { EventBridge } from '../../shared/EventBridge.ts';
import { StateManager } from '../../shared/StateManager.ts';
import { ENTITY_MOVE_INTERVAL } from '../../shared/constants.ts';
import type { GridPosition, EntityState } from '../../shared/types.ts';

export interface EntityPath {
  id: string;
  situationId: string;
  type: 'survivor' | 'zombie';
  dayPath: GridPosition[];
  nightPath: GridPosition[];
  speed: number;
}

/**
 * Test entities for development — designed to make all systems easy to verify:
 * - Survivor starts AT Relay North (D3 = col:3,row:2, freq 91.5 MHz) → signal is live from second 0
 * - Survivor then walks toward Relay East (H7 = col:7,row:6, freq 97.3 MHz)
 * - Zombie crosses the survivor's path mid-journey for radar pressure test
 * Replace with real situation data in Milestone 5.
 */
export const TEST_ENTITIES: EntityPath[] = [
  {
    id: 'survivor_test',
    situationId: 'test',
    type: 'survivor',
    dayPath: [
      // Starts at Relay North — signal on 91.5 MHz immediately
      { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 },
      // Begins moving toward Relay East
      { col: 4, row: 3 }, { col: 5, row: 4 }, { col: 6, row: 5 },
      // Arrives at Relay East — signal switches to 97.3 MHz
      { col: 7, row: 6 }, { col: 7, row: 6 }, { col: 7, row: 6 },
    ],
    nightPath: [{ col: 7, row: 6 }, { col: 6, row: 7 }],
    speed: 1,
  },
  {
    id: 'zombie_test',
    situationId: 'test',
    type: 'zombie',
    dayPath: [
      { col: 7, row: 1 }, { col: 6, row: 2 }, { col: 5, row: 3 },
      { col: 5, row: 4 }, { col: 5, row: 5 }, { col: 5, row: 6 },
      { col: 4, row: 7 }, { col: 3, row: 8 },
    ],
    nightPath: [{ col: 3, row: 8 }, { col: 2, row: 9 }],
    speed: 1,
  },
];

export class SituationManager {
  private entityPaths: EntityPath[] = [];
  private moveTimer = 0;

  init(entities: EntityPath[]): void {
    this.entityPaths = entities;
    this.moveTimer = 0;

    // Initialize entity states from path starting positions
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
    let changed = false;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (!entity.alive) continue;

      const pathData = this.entityPaths.find((p) => p.id === entity.id);
      if (!pathData) continue;

      const path = pathData.dayPath;
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

    if (changed) {
      StateManager.setEntities(entities);
      EventBridge.emit('entities:moved');
    }
  }

  /** Advance entities along night paths — called during day transition */
  advanceNight(): void {
    const entities = [...StateManager.getState().entities];

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (!entity.alive) continue;

      const pathData = this.entityPaths.find((p) => p.id === entity.id);
      if (!pathData || pathData.nightPath.length === 0) continue;

      // Move to the end of the night path
      const nightEnd = pathData.nightPath[pathData.nightPath.length - 1];
      entities[i] = {
        ...entity,
        position: { ...nightEnd },
        // Reset path index for next day — find closest point on day path
        currentPathIndex: 0,
      };
    }

    StateManager.setEntities(entities);
  }

  getEntityPositions(): EntityState[] {
    return StateManager.getState().entities;
  }
}
