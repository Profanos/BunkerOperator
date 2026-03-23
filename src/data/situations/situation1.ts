/** Situation 1: Lone Good Survivor — "Mara"
 *
 * Mara is a vet who was sheltering in the Industrial District. She is trying
 * to reach safety and will trust the bunker operator if given reason to.
 *
 * Three days. The player must decide whether she is worth trusting and, at
 * the end, whether to reveal the bunker location.
 *
 * Investigation clues:
 *  Day 1 — She describes being "near the gas station" but radar shows her at
 *           the Relay North equipment (D3). Gas station is C4. Close but off.
 *           Explainable: she's using the gas station as a rough landmark.
 *  Day 2 — Morning message claims "near the water tower." Scanner shows her at
 *           H7 (Relay East equipment), not G8 (water tower). She mistook the
 *           relay antenna for the tower — consistent with Day 1 pattern.
 *  Day 3 — She describes a fortified structure to the southwest. That is the
 *           bunker. Her description is accurate. Player must decide.
 *
 * Path topology (nightPaths[N][last] == dayPaths[N+1][0]):
 *  Night 1 ends at H7 → Day 2 starts at H7
 *  Night 2 ends at H8 → Day 3 starts at H8
 */

import type { EntityPath, JournalEntry } from '../../shared/types.ts';
import type { DialogueSession, MorningMessage } from '../dialogue/types.ts';
import type { Situation } from './types.ts';

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

const SITUATION1_ENTITIES: EntityPath[] = [
  {
    id: 'survivor_test',
    situationId: 'situation1',
    type: 'survivor',
    dayPaths: {
      1: [
        // Linger at Relay North (D3) — player has time to detect zombie and warn her
        { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 },
        { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 },
        { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 },
        // Moves east — step 13 passes F5 (danger zone)
        { col: 4, row: 3 },
        { col: 5, row: 4 }, // ← COLLISION if zombie still here and no warning
        { col: 6, row: 5 },
        { col: 7, row: 6 }, // Relay East (H7)
      ],
      2: [
        // Starts at H7 (Relay East) — matches nightPaths[1] end
        { col: 7, row: 6 }, { col: 7, row: 6 }, { col: 7, row: 6 },
        { col: 7, row: 6 }, { col: 7, row: 6 }, { col: 7, row: 6 },
        // Moves west to explore the water tower
        { col: 6, row: 6 },
        { col: 6, row: 7 }, // Water tower (G8)
        { col: 6, row: 7 }, { col: 6, row: 7 },
        // Returns south of relay
        { col: 7, row: 7 }, // H8
        { col: 7, row: 7 },
        { col: 7, row: 6 }, // Back to relay
      ],
      3: [
        // Starts at H8 — matches nightPaths[2] end
        { col: 7, row: 7 }, { col: 7, row: 7 },
        // Explores south toward the bunker vicinity
        { col: 6, row: 7 }, // G8 — water tower
        { col: 6, row: 8 }, // G9 — moving south
        { col: 6, row: 8 },
        { col: 7, row: 7 }, // Returns to H8
        { col: 7, row: 7 },
        { col: 7, row: 6 }, // H7 — back at relay for final session
        { col: 7, row: 6 },
      ],
    },
    alternatePaths: {
      // Warning given via radio on Day 1 → safe northern route avoids F5
      'radio:survivor_warned': {
        1: [
          { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 },
          { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 },
          { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 }, { col: 3, row: 2 },
          { col: 4, row: 2 }, // Safe: stays north of F5
          { col: 5, row: 2 },
          { col: 6, row: 3 },
          { col: 7, row: 6 }, // Relay East (H7)
        ],
      },
    },
    nightPaths: {
      1: [{ col: 7, row: 6 }],       // stays at H7
      2: [{ col: 7, row: 7 }],       // moves to H8
      3: [{ col: 7, row: 6 }],       // game ends after day 3
    },
    speed: 1,
  },

  {
    id: 'zombie_test',
    situationId: 'situation1',
    type: 'zombie',
    dayPaths: {
      // Only active on Day 1 — Days 2-3 have no entry so it stays at night end
      1: [
        { col: 7, row: 1 }, // H2
        { col: 7, row: 2 }, // H3
        { col: 6, row: 2 }, // G3
        { col: 6, row: 3 }, // G4
        { col: 5, row: 3 }, // F4
        // Lingers at F5 (col:5, row:4) — collision zone
        { col: 5, row: 4 }, { col: 5, row: 4 }, { col: 5, row: 4 }, { col: 5, row: 4 },
        { col: 5, row: 4 }, { col: 5, row: 4 }, { col: 5, row: 4 }, { col: 5, row: 4 },
        { col: 5, row: 4 },
        // Continues south — away from the action
        { col: 5, row: 5 },
        { col: 4, row: 6 },
      ],
    },
    nightPaths: {
      1: [{ col: 4, row: 6 }, { col: 3, row: 7 }], // moves to D8
    },
    speed: 1,
  },
];

// ---------------------------------------------------------------------------
// Dialogue
// ---------------------------------------------------------------------------

const SESSION_1: DialogueSession = {
  id: 'situation1_session1',
  stationId: 'station_north',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      npcLine: '...hello? Is anyone out there? I\'ve been trying every frequency for two days.',
      options: [
        { id: 'opt_location', text: 'Yes. I can hear you. Where are you?', nextNodeId: 'location' },
        { id: 'opt_identity', text: 'Identify yourself.', nextNodeId: 'identity' },
      ],
    },
    location: {
      id: 'location',
      npcLine: 'Industrial district. Near an old gas station — I can see the collapsed canopy from here.',
      options: [
        {
          id: 'opt_scanner',
          text: 'I have you on my scanner.',
          requiredKeys: ['radar:seen_survivor_test'],
          hint: 'Pulse the scanner near this contact to track their position.',
          nextNodeId: 'scanner_confirm',
        },
        { id: 'opt_injured', text: 'Are you injured?', nextNodeId: 'status' },
      ],
    },
    identity: {
      id: 'identity',
      npcLine: 'Mara. I was working at a farmstead north of the district. What about you?',
      options: [
        { id: 'opt_alone', text: 'Someone who can help. Are you alone?', nextNodeId: 'alone' },
      ],
    },
    alone: {
      id: 'alone',
      npcLine: 'I think so. Haven\'t seen anyone since I left the farm. Three days ago.',
      options: [
        {
          id: 'opt_not_alone',
          text: 'My scanner says otherwise. There\'s something else nearby.',
          requiredKeys: ['radar:seen_zombie_test'],
          hint: 'Pulse the scanner near this contact to check for threats.',
          nextNodeId: 'zombie_warning',
        },
        { id: 'opt_destination', text: 'Good. Where are you headed?', nextNodeId: 'destination' },
      ],
    },
    scanner_confirm: {
      id: 'scanner_confirm',
      npcLine: 'You have working equipment? ...that\'s the first good news I\'ve had.',
      options: [
        {
          id: 'opt_threat',
          text: 'There\'s another signal near you. Not human.',
          requiredKeys: ['radar:seen_zombie_test'],
          hint: 'Pulse the scanner near this contact to check for threats.',
          nextNodeId: 'zombie_warning',
        },
        { id: 'opt_head_east', text: 'Start heading east when it\'s safe.', nextNodeId: 'destination' },
      ],
    },
    zombie_warning: {
      id: 'zombie_warning',
      npcLine: '...Something else? How close? Which direction?',
      options: [
        {
          id: 'opt_route',
          text: 'Northeast of your position, moving south. Head east now — stay north of the direct route.',
          nextNodeId: 'route_given',
          journalEffect: {
            key: 'radio:survivor_warned',
            text: 'You warned Mara about the approaching threat and directed her north.',
          },
        },
      ],
    },
    status: {
      id: 'status',
      npcLine: 'Not injured. Just hungry. I\'ve been rationing what I found in the station.',
      options: [
        {
          id: 'opt_supplies',
          text: 'Head east when you can. There may be supplies near the water tower.',
          nextNodeId: 'destination',
        },
      ],
    },
    destination: {
      id: 'destination',
      npcLine: 'The water tower... I\'ve heard that area might have supplies. Can you guide me?',
      options: [
        {
          id: 'opt_guide',
          text: 'I can monitor from here. Tune to 97.3 MHz when you\'re further east.',
          nextNodeId: 'session1_end',
        },
      ],
    },
    route_given: {
      id: 'route_given',
      npcLine: 'Okay. I\'m moving. Thank you. I\'ll try to reach you from the next relay.',
      options: [
        { id: 'opt_go', text: 'I\'ll be on 97.3. Go.', nextNodeId: null },
      ],
    },
    session1_end: {
      id: 'session1_end',
      npcLine: '97.3. Got it. I\'ll contact you when I reach the eastern area.',
      options: [
        { id: 'opt_goodbye', text: 'I\'ll be listening. Stay low.', nextNodeId: null },
      ],
    },
  },
};

const SESSION_2: DialogueSession = {
  id: 'situation1_session2',
  stationId: 'station_east',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      npcLine: 'It\'s Mara. I made it east. I can see relay equipment — thought it was a water tower at first. I\'m close to it now.',
      options: [
        {
          id: 'opt_scanner',
          text: 'I have you on scanner. You\'re at the relay, not the tower.',
          requiredKeys: ['radar:seen_survivor_test'],
          hint: 'Pulse the scanner to confirm her position.',
          nextNodeId: 'scanner_confirm',
        },
        { id: 'opt_status', text: 'What\'s your situation?', nextNodeId: 'status' },
      ],
    },
    scanner_confirm: {
      id: 'scanner_confirm',
      npcLine: 'The relay... right. I kept using the wrong landmark. You can see all of that from where you are?',
      options: [
        {
          id: 'opt_still_here',
          text: 'I can. The threat from the industrial district — it\'s moved south. Not tracking you.',
          requiredKeys: ['radar:seen_zombie_test'],
          hint: 'Pulse the scanner in this area to check for threats.',
          nextNodeId: 'threat_status',
        },
        {
          id: 'opt_looks_clear',
          text: 'That area looks clear. Check the building near the actual water tower.',
          nextNodeId: 'cache',
        },
      ],
    },
    status: {
      id: 'status',
      npcLine: 'Tired. Moving at night is harder than I thought. But I\'m intact. What\'s ahead of me?',
      options: [
        {
          id: 'opt_scanner_warn',
          text: 'I\'m tracking something south of your position.',
          requiredKeys: ['radar:seen_zombie_test'],
          hint: 'Pulse the scanner in this area to check for threats.',
          nextNodeId: 'threat_status',
        },
        { id: 'opt_head_to_tower', text: 'Check the building near the water tower. Then keep moving south.', nextNodeId: 'cache' },
      ],
    },
    threat_status: {
      id: 'threat_status',
      npcLine: 'South. Okay. So it didn\'t follow me here. That\'s something.',
      options: [
        { id: 'opt_stay_aware', text: 'Stay aware. Rest at the relay tonight, move south tomorrow.', nextNodeId: 'plan' },
      ],
    },
    cache: {
      id: 'cache',
      npcLine: 'The building near the tower — there\'s a door on the east face. Looks like it was used as storage.',
      options: [
        { id: 'opt_check', text: 'Check it carefully. Rest there tonight, move south tomorrow.', nextNodeId: 'plan' },
      ],
    },
    plan: {
      id: 'plan',
      npcLine: 'South. Is there anything down there worth reaching?',
      options: [
        {
          id: 'opt_hint',
          text: 'There might be. Keep moving and I\'ll guide you when you\'re closer.',
          nextNodeId: 'session2_end',
        },
        {
          id: 'opt_vague',
          text: 'Keep moving. I\'ll be in contact.',
          nextNodeId: 'session2_end',
        },
      ],
    },
    session2_end: {
      id: 'session2_end',
      npcLine: 'Understood. I\'ll move at first light. Thank you — whoever you are.',
      options: [
        { id: 'opt_stay_safe', text: 'Stay safe. I\'ll be watching.', nextNodeId: null },
      ],
    },
  },
};

const SESSION_3: DialogueSession = {
  id: 'situation1_session3',
  stationId: 'station_east',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      npcLine: 'Mara. I moved south like you said. There\'s something here — fortified, maintained. Ventilation running. Perimeter fence, access road from the east. Someone is operating this place. Is that you?',
      options: [
        {
          id: 'opt_verify',
          text: 'Describe your exact position.',
          requiredKeys: ['radar:seen_survivor_test'],
          hint: 'Pulse the scanner south of the relay to verify her position.',
          nextNodeId: 'verify',
        },
        {
          id: 'opt_confirm',
          text: 'Yes. I can guide you in.',
          nextNodeId: 'pre_reveal',
        },
        {
          id: 'opt_deflect',
          text: 'Keep moving. That location isn\'t safe.',
          nextNodeId: 'deflect',
        },
      ],
    },
    verify: {
      id: 'verify',
      npcLine: 'South of the relay. Past the water tower. There\'s an access road — runs east-west. I\'m just north of it, in the open.',
      options: [
        {
          id: 'opt_confirm_verified',
          text: 'I have you on scanner. That description checks out. I can guide you in.',
          nextNodeId: 'pre_reveal',
        },
        {
          id: 'opt_deflect_verified',
          text: 'Stay north of that road. The structure isn\'t accessible from outside.',
          nextNodeId: 'deflect',
        },
      ],
    },
    pre_reveal: {
      id: 'pre_reveal',
      npcLine: 'You\'ve been watching me since the industrial district, haven\'t you. The wrong landmark, the relay antenna — you knew.',
      options: [
        {
          id: 'opt_reveal',
          text: 'Since day one. That structure is my base. Come to the east entrance at dusk. I\'ll open it.',
          nextNodeId: 'reveal',
          journalEffect: {
            key: 'bunker:survivor_saved_mara',
            text: 'You revealed the bunker location to Mara and opened the gate.',
          },
        },
        {
          id: 'opt_stay_silent',
          text: 'I\'ve been trying to keep you alive. But I can\'t let you in. Too much risk.',
          nextNodeId: 'rejection',
        },
      ],
    },
    reveal: {
      id: 'reveal',
      npcLine: '...okay. East entrance at dusk. I\'ll be there. Thank you. I mean it.',
      options: [
        { id: 'opt_final', text: 'I\'ll be watching until then. Move carefully.', nextNodeId: null },
      ],
    },
    deflect: {
      id: 'deflect',
      npcLine: 'Then where? I don\'t have much left. Food is almost gone.',
      options: [
        {
          id: 'opt_cache',
          text: 'Follow the access road east. There\'s a supply cache three kilometers out. Enough to keep moving.',
          nextNodeId: 'deflect_end',
        },
        {
          id: 'opt_reconsider',
          text: 'Wait. Let me reconsider.',
          nextNodeId: 'pre_reveal',
        },
      ],
    },
    deflect_end: {
      id: 'deflect_end',
      npcLine: 'Three kilometers east. Alright. You\'ve kept me alive this long. I\'ll trust you on this.',
      options: [
        { id: 'opt_go', text: 'Good luck, Mara.', nextNodeId: null },
      ],
    },
    rejection: {
      id: 'rejection',
      npcLine: '...I understand. Thank you for keeping me alive this long. Wherever you are.',
      options: [
        { id: 'opt_farewell', text: 'Stay safe. Keep moving south.', nextNodeId: null },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Morning messages
// ---------------------------------------------------------------------------

const MORNING_MESSAGES: Record<number, MorningMessage[]> = {
  2: [
    {
      from: 'Mara',
      text: 'Moved east through the night. Lost whatever was behind me — haven\'t seen any sign of it since the industrial district. I\'m near the water tower now. Can see the relay antenna from here. Trying 97.3.',
      journalKey: 'morning:mara_day2',
      journalText: 'Morning transmission from Mara (Day 2): claims she\'s near the water tower, threat gone. Verify with scanner before trusting.',
    },
  ],
  3: [
    {
      from: 'Mara',
      text: 'Still in the east corridor. Moved south a little — looking for shelter but everything is exposed out here. There\'s something ahead to the southwest. Some kind of structure. Maintained. I\'m going to get closer. Still on 97.3.',
      journalKey: 'morning:mara_day3',
      journalText: 'Morning transmission from Mara (Day 3): moved south, investigating a maintained structure to the southwest. Verify scanner position before responding.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const SITUATION_1: Situation = {
  id: 'situation1',
  durationDays: 3,
  entities: SITUATION1_ENTITIES,
  getSession: (stationId: string, journal: JournalEntry[]) => {
    if (stationId === 'station_north') {
      return SESSION_1;
    }
    if (stationId === 'station_east') {
      // Mara only reaches station_east after completing session 1 on station_north
      const s1done = journal.some((e) => e.key === `radio:completed_${SESSION_1.id}`);
      if (!s1done) return undefined;
      const s2done = journal.some((e) => e.key === `radio:completed_${SESSION_2.id}`);
      return s2done ? SESSION_3 : SESSION_2;
    }
    return undefined;
  },
  getMorningMessages: (day: number) => MORNING_MESSAGES[day] ?? [],
};

/** Kept for RadioPanel — returns the next available session for a station */
export function getSessionForStation(
  stationId: string,
  journal: JournalEntry[]
): ReturnType<typeof SITUATION_1.getSession> {
  return SITUATION_1.getSession(stationId, journal);
}

/** Kept for App.tsx — returns morning messages for a given day */
export function getMorningMessagesForDay(day: number): MorningMessage[] {
  return SITUATION_1.getMorningMessages(day);
}
