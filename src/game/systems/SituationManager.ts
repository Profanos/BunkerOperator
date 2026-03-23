/** Situation engine — advances entities along day-indexed scripted paths, checks collisions */

import { EventBridge } from '../../shared/EventBridge.ts';
import { StateManager } from '../../shared/StateManager.ts';
import { ENTITY_MOVE_INTERVAL, formatGameTime } from '../../shared/constants.ts';
import { gridLabel } from '../../shared/territory.ts';
import type { EntityPath, EntityState } from '../../shared/types.ts';

export class SituationManager {
  private entityPaths: EntityPath[] = [];
  private moveTimer = 0;

  /** Start a new run — positions entities at dayPaths[1][0] */
  init(entities: EntityPath[]): void {
    this.entityPaths = entities;
    this.moveTimer = 0;
    EventBridge.on('debug:step', this.onDebugStep);

    const states: EntityState[] = entities.map((e) => ({
      id: e.id,
      situationId: e.situationId,
      type: e.type,
      position: { ...e.dayPaths[1][0] },
      currentPathIndex: 0,
      alive: true,
    }));
    StateManager.setEntities(states);
  }

  /** Restore from a save — uses saved positions instead of resetting to path start */
  restore(entities: EntityPath[], savedStates: EntityState[]): void {
    this.entityPaths = entities;
    this.moveTimer = 0;
    EventBridge.on('debug:step', this.onDebugStep);
    StateManager.setEntities(savedStates);
  }

  update(deltaSec: number): void {
    this.moveTimer += deltaSec;
    if (this.moveTimer < ENTITY_MOVE_INTERVAL) return;
    this.moveTimer -= ENTITY_MOVE_INTERVAL;
    this.advanceEntities();
  }

  private advanceEntities(): void {
    const state = StateManager.getState();
    const entities = [...state.entities];
    const journal = state.journal;
    const currentDay = state.currentDay;
    let changed = false;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (!entity.alive) continue;

      const pathData = this.entityPaths.find((p) => p.id === entity.id);
      if (!pathData) continue;

      // No path defined for this day — entity stays put
      const basePath = pathData.dayPaths[currentDay];
      if (!basePath) continue;

      // Check alternatePaths — first journal key match with a day entry wins
      let activePath = basePath;
      if (pathData.alternatePaths) {
        for (const [key, dayMap] of Object.entries(pathData.alternatePaths)) {
          if (journal.some((e) => e.key === key)) {
            const altPath = dayMap[currentDay];
            if (altPath) {
              activePath = altPath;
              break;
            }
          }
        }
      }

      const nextIndex = entity.currentPathIndex + 1;
      if (nextIndex < activePath.length) {
        entities[i] = {
          ...entity,
          currentPathIndex: nextIndex,
          position: { ...activePath[nextIndex] },
        };
        changed = true;
      }
    }

    changed = this.checkCollisions(entities) || changed;

    if (changed) {
      StateManager.setEntities(entities);
      EventBridge.emit('entities:moved');
    }
  }

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

  /** Advance entities by exactly one tick — wired directly to debug:step event */
  private readonly onDebugStep = (): void => {
    this.advanceEntities();
  };

  destroy(): void {
    EventBridge.off('debug:step', this.onDebugStep);
  }

  /** Move entities to end of their night path for the current day */
  advanceNight(): void {
    const entities = [...StateManager.getState().entities];
    const currentDay = StateManager.getState().currentDay;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (!entity.alive) continue;

      const pathData = this.entityPaths.find((p) => p.id === entity.id);
      if (!pathData) continue;

      const nightPath = pathData.nightPaths[currentDay];
      if (!nightPath || nightPath.length === 0) continue;

      entities[i] = {
        ...entity,
        position: { ...nightPath[nightPath.length - 1] },
        currentPathIndex: 0,
      };
    }

    StateManager.setEntities(entities);
  }
}
