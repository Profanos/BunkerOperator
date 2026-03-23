/** Situation type — bundles all content for one playable scenario */

import type { EntityPath, JournalEntry } from '../../shared/types.ts';
import type { DialogueSession, MorningMessage } from '../dialogue/types.ts';

export interface Situation {
  id: string;
  /** How many days this situation runs before the game ends */
  durationDays: number;
  entities: EntityPath[];
  /** Return the next available dialogue session for a station, given the current journal.
   *  Journal context allows returning different sessions as the story progresses. */
  getSession: (stationId: string, journal: JournalEntry[]) => DialogueSession | undefined;
  getMorningMessages: (day: number) => MorningMessage[];
}
