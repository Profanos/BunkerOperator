/** Situation 2: Lone Hostile Survivor — "Kael"
 *
 * Kael is an aggressive scavenger approaching from the east. He is moving
 * toward the bunker and will demand access. Unlike Mara, his landmark
 * claims don't match his radar position — and not because of honest
 * confusion. He lies to mask his approach vector.
 *
 * Three days. The player must recognise the deception and decide how
 * to handle him — refuse, mislead toward the zombie, or make the
 * mistake of letting him in.
 *
 * Investigation clues:
 *  Day 1 — Claims to be "near the water tower" (G8 = col:6, row:7).
 *           Radar shows him at H8 (col:7, row:7). Close but wrong
 *           direction — he's east of where he says, not west.
 *  Day 2 — Claims to still be "exploring the east corridor."
 *           Radar shows him at G9 (col:6, row:8), moving southwest
 *           toward the bunker. The claim is vague on purpose.
 *  Day 3 — Near F8 (col:5, row:7), clearly converging on the bunker.
 *           If the player has been scanning, the approach is obvious.
 *
 * Path topology (nightPaths[N][last] == dayPaths[N+1][0]):
 *  Night 1 ends at G9 (col:6, row:8) → Day 2 starts at G9
 *  Night 2 ends at F8 (col:5, row:7) → Day 3 starts at F8
 *
 * Radio contention: Kael uses station_east (97.3 MHz), the same
 * station as Mara's Day 2-3 sessions. His sessions have separate IDs
 * and the getSession function handles availability independently.
 */

import type { EntityPath, JournalEntry } from '../../shared/types.ts';
import type { DialogueSession, MorningMessage } from '../dialogue/types.ts';
import type { Situation } from './types.ts';

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

const SITUATION2_ENTITIES: EntityPath[] = [
  {
    id: 'hostile_kael',
    situationId: 'situation2',
    type: 'survivor',
    dayPaths: {
      1: [
        // Starts east, near Relay East area — H8 (col:7, row:7)
        // Claims to be at the water tower (G8) but is one cell east
        { col: 7, row: 7 }, { col: 7, row: 7 }, { col: 7, row: 7 },
        { col: 7, row: 7 }, { col: 7, row: 7 }, { col: 7, row: 7 },
        // Drifts slightly southwest during the day — scouting
        { col: 7, row: 7 }, { col: 7, row: 7 }, { col: 7, row: 7 },
        { col: 7, row: 7 }, { col: 7, row: 7 }, { col: 7, row: 7 },
        // Stays put — waits for radio contact
        { col: 7, row: 7 }, { col: 7, row: 7 }, { col: 7, row: 7 },
        { col: 7, row: 7 },
      ],
      2: [
        // Starts at G9 (col:6, row:8) — matches nightPaths[1] end
        // Claims to be "exploring the east corridor" but is moving toward bunker
        { col: 6, row: 8 }, { col: 6, row: 8 }, { col: 6, row: 8 },
        { col: 6, row: 8 }, { col: 6, row: 8 }, { col: 6, row: 8 },
        // Inches west — probing
        { col: 6, row: 8 }, { col: 6, row: 8 }, { col: 6, row: 8 },
        { col: 5, row: 8 }, // F9 — closer to bunker
        { col: 5, row: 8 }, { col: 5, row: 8 },
        // Returns to cover position
        { col: 6, row: 8 },
      ],
      3: [
        // Starts at F8 (col:5, row:7) — matches nightPaths[2] end
        // Close to bunker now — approach is undeniable on radar
        { col: 5, row: 7 }, { col: 5, row: 7 }, { col: 5, row: 7 },
        // Moves toward the bunker
        { col: 5, row: 8 }, // F9
        { col: 5, row: 8 },
        { col: 4, row: 8 }, // E9 — one cell from bunker at E10
        { col: 4, row: 8 },
        { col: 4, row: 8 }, { col: 4, row: 8 },
        // Lingers near bunker perimeter
        { col: 4, row: 8 }, { col: 4, row: 8 }, { col: 4, row: 8 },
      ],
    },
    alternatePaths: {
      // Player misleads Kael via radio — redirects him toward zombie at D8 (col:3, row:7)
      'radio:hostile_misdirected': {
        2: [
          // Starts at G9 (col:6, row:8) — same start as normal Day 2
          { col: 6, row: 8 }, { col: 6, row: 8 }, { col: 6, row: 8 },
          // Heads west-northwest toward "the structure" the player described
          { col: 5, row: 8 },
          { col: 5, row: 7 },
          { col: 4, row: 7 },
          // Enters zombie territory — D8 (col:3, row:7) is zombie position
          { col: 3, row: 7 }, // ← COLLISION with zombie_test if it's here
          { col: 3, row: 7 },
          { col: 3, row: 7 }, { col: 3, row: 7 }, { col: 3, row: 7 },
          { col: 3, row: 7 }, { col: 3, row: 7 },
        ],
        3: [
          // If somehow alive, stays at last position
          { col: 3, row: 7 }, { col: 3, row: 7 }, { col: 3, row: 7 },
          { col: 3, row: 7 }, { col: 3, row: 7 }, { col: 3, row: 7 },
          { col: 3, row: 7 }, { col: 3, row: 7 }, { col: 3, row: 7 },
          { col: 3, row: 7 }, { col: 3, row: 7 }, { col: 3, row: 7 },
        ],
      },
    },
    nightPaths: {
      1: [{ col: 7, row: 7 }, { col: 6, row: 8 }],  // H8 → G9
      2: [{ col: 6, row: 8 }, { col: 5, row: 7 }],   // G9 → F8
      3: [{ col: 4, row: 8 }],                         // game ends after day 3
    },
    speed: 1,
  },
];

// ---------------------------------------------------------------------------
// Dialogue
// ---------------------------------------------------------------------------

const SESSION_1: DialogueSession = {
  id: 'situation2_session1',
  stationId: 'station_east',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      npcLine: 'Hey. I know you\'re listening. Don\'t play games with me. I need shelter and I need it now.',
      options: [
        { id: 'opt_who', text: 'Who is this?', nextNodeId: 'identity' },
        { id: 'opt_location', text: 'Where are you?', nextNodeId: 'location' },
      ],
    },
    identity: {
      id: 'identity',
      npcLine: 'Name\'s Kael. Former supply runner. I know how infrastructure works — relays, bunkers, the whole grid. So don\'t pretend you\'re not operating out of something.',
      options: [
        { id: 'opt_what_want', text: 'What do you want?', nextNodeId: 'demands' },
        { id: 'opt_where', text: 'Where are you right now?', nextNodeId: 'location' },
      ],
    },
    location: {
      id: 'location',
      npcLine: 'Near the water tower. Took shelter in some rubble southwest of it. Injured my leg getting here.',
      options: [
        {
          id: 'opt_scanner',
          text: 'I have a scanner. You\'re not where you say you are.',
          requiredKeys: ['radar:seen_hostile_kael'],
          hint: 'Pulse the scanner near this contact to verify their position.',
          nextNodeId: 'scanner_challenge',
        },
        { id: 'opt_injury', text: 'How bad is the injury?', nextNodeId: 'injury' },
      ],
    },
    scanner_challenge: {
      id: 'scanner_challenge',
      npcLine: '...Close enough. I moved after I transmitted. You\'d do the same. Point is, I need somewhere solid. Tonight.',
      options: [
        { id: 'opt_no_room', text: 'I don\'t have room for anyone.', nextNodeId: 'pushback' },
        { id: 'opt_demands', text: 'What exactly are you looking for?', nextNodeId: 'demands' },
      ],
    },
    injury: {
      id: 'injury',
      npcLine: 'Bad enough that I can\'t outrun anything. Good enough that I can still walk. I need walls, not bandages.',
      options: [
        { id: 'opt_demands_from_injury', text: 'What are you asking for?', nextNodeId: 'demands' },
      ],
    },
    demands: {
      id: 'demands',
      npcLine: 'A roof. A lock. Something between me and what\'s out here. I know there are structures in this sector. Maintained ones. You\'re in one of them.',
      options: [
        { id: 'opt_deny', text: 'I\'m just a radio relay. Automated.', nextNodeId: 'denial_automated' },
        { id: 'opt_nothing', text: 'There\'s nothing like that here.', nextNodeId: 'denial_nothing' },
      ],
    },
    denial_automated: {
      id: 'denial_automated',
      npcLine: 'Sure. An automated relay that answers questions. Right. I\'ll keep looking. But I\'m going to find it.',
      options: [
        { id: 'opt_end', text: '[End transmission]', nextNodeId: null },
      ],
    },  
    denial_nothing: {
      id: 'denial_nothing',
      npcLine: 'Nothing. Right. Then why are you still on this frequency. I\'ll keep looking. But I\'m going to find it.',
      options: [
        { id: 'opt_end', text: '[End transmission]', nextNodeId: null },
      ],
    },
    pushback: {
      id: 'pushback',
      npcLine: 'Didn\'t ask for room. I asked for a direction. You going to help me or not?',
      options: [
        { id: 'opt_deny_push', text: 'I can\'t help you. Try the water tower for shelter.', nextNodeId: 'session1_end' },
      ],
    },
    session1_end: {
      id: 'session1_end',
      npcLine: 'The water tower. Yeah. I\'ll try that. But I\'m not done with you.',
      options: [
        { id: 'opt_goodbye', text: '[End transmission]', nextNodeId: null },
      ],
    },
  },
};

const SESSION_2: DialogueSession = {
  id: 'situation2_session2',
  stationId: 'station_east',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      npcLine: 'It\'s Kael. I know there\'s a structure southwest of here. Maintained. Fenced. Don\'t insult me by denying it again.',
      options: [
        { id: 'opt_deny_again', text: 'I don\'t know what you\'re talking about.', nextNodeId: 'deny' },
        {
          id: 'opt_challenge',
          text: 'You\'re moving toward it, aren\'t you. I can see you on the scanner.',
          requiredKeys: ['radar:seen_hostile_kael'],
          hint: 'Pulse the scanner to track this contact\'s movement.',
          nextNodeId: 'caught',
        },
      ],
    },
    deny: {
      id: 'deny',
      npcLine: 'Then explain the ventilation signature. The maintained road. I was a supply runner — I know what occupied infrastructure looks like.',
      options: [
        {
          id: 'opt_mislead',
          text: 'Fine. There is a structure. But it\'s northwest of your position, past the outskirts. I\'ll give you coordinates.',
          requiredKeys: ['radar:seen_zombie_test'],
          hint: 'Scan the area to locate threats you can use to your advantage.',
          nextNodeId: 'mislead',
        },
        { id: 'opt_refuse', text: 'Believe what you want. I can\'t help you.', nextNodeId: 'refuse' },
      ],
    },
    caught: {
      id: 'caught',
      npcLine: 'Yeah, I\'m moving toward it. What are you going to do about it? Lock me out? I\'ll find a way in.',
      options: [
        {
          id: 'opt_mislead_caught',
          text: 'You\'re heading the wrong way. The main entrance is northwest, past the outskirts. I can guide you there.',
          requiredKeys: ['radar:seen_zombie_test'],
          hint: 'Scan the area to locate threats you can use to your advantage.',
          nextNodeId: 'mislead',
        },
        { id: 'opt_threat', text: 'If you come here, you won\'t find what you\'re looking for.', nextNodeId: 'refuse' },
      ],
    },
    mislead: {
      id: 'mislead',
      npcLine: 'Northwest. Past the outskirts. You\'d better not be lying to me.',
      options: [
        {
          id: 'opt_confirm_mislead',
          text: 'Head northwest. You\'ll see the access road. Follow it to the structure.',
          nextNodeId: 'mislead_confirm',
          journalEffect: {
            key: 'radio:hostile_misdirected',
            text: 'You misdirected Kael northwest toward the zombie\'s last known position.',
          },
        },
        { id: 'opt_reconsider', text: 'Wait — forget it. I shouldn\'t have said anything.', nextNodeId: 'refuse' },
      ],
    },
    mislead_confirm: {
      id: 'mislead_confirm',
      npcLine: 'Northwest it is. If this is a trick, I\'ll remember. Moving out.',
      options: [
        { id: 'opt_end_mislead', text: '[End transmission]', nextNodeId: null },
      ],
    },
    refuse: {
      id: 'refuse',
      npcLine: 'Fine. Keep your silence. I\'ll find it on my own. Don\'t expect me to knock politely.',
      options: [
        { id: 'opt_end_refuse', text: '[End transmission]', nextNodeId: null },
      ],
    },
  },
};

const SESSION_3: DialogueSession = {
  id: 'situation2_session3',
  stationId: 'station_east',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      npcLine: 'I found it. I\'m right outside. Fenced perimeter, ventilation running, the whole thing. Open the door.',
      options: [
        {
          id: 'opt_scanner_verify',
          text: 'I can see you on the scanner. You\'re right on top of us.',
          requiredKeys: ['radar:seen_hostile_kael'],
          hint: 'Pulse the scanner to confirm his position near the bunker.',
          nextNodeId: 'at_door',
        },
        { id: 'opt_no', text: 'No.', nextNodeId: 'refuse_entry' },
        {
          id: 'opt_open',
          text: 'Alright. East entrance. I\'ll unlock it.',
          nextNodeId: 'open_door',
        },
      ],
    },
    at_door: {
      id: 'at_door',
      npcLine: 'Then you know I\'m not bluffing. Open it. I\'ve earned this.',
      options: [
        {
          id: 'opt_open_verified',
          text: 'East entrance. Coming to unlock it now.',
          nextNodeId: 'open_door',
        },
        { id: 'opt_refuse_verified', text: 'You haven\'t earned anything. Walk away.', nextNodeId: 'refuse_entry' },
      ],
    },
    open_door: {
      id: 'open_door',
      npcLine: 'Smart choice. I\'m coming in.',
      options: [
        {
          id: 'opt_let_in',
          text: '[Open the bunker door]',
          nextNodeId: null,
          journalEffect: {
            key: 'bunker:hostile_entered_kael',
            text: 'You opened the bunker to Kael. He forced his way inside.',
          },
        },
      ],
    },
    refuse_entry: {
      id: 'refuse_entry',
      npcLine: 'You\'re making a mistake. I will get in. One way or another.',
      options: [
        { id: 'opt_end_refuse', text: 'Try it. [End transmission]', nextNodeId: null },
        { id: 'opt_silence', text: '[End transmission]', nextNodeId: null },
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
      from: 'Kael',
      text: 'Still looking for that structure. I know it\'s out here. Whoever you are, you\'d better hope I don\'t find it before you decide to cooperate.',
      journalKey: 'morning:kael_day2',
      journalText: 'Morning transmission from Kael (Day 2): still searching for the bunker. Aggressive. Verify scanner position — is he moving toward us?',
    },
  ],
  3: [
    {
      from: 'Kael',
      text: 'I\'m close. I can feel it. The air smells different here — filtered. Mechanical. You\'re running out of time to do this the easy way.',
      journalKey: 'morning:kael_day3',
      journalText: 'Morning transmission from Kael (Day 3): claims he\'s close to the bunker. Threatening. Check scanner — he may be at our perimeter.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const SITUATION_2: Situation = {
  id: 'situation2',
  durationDays: 3,
  entities: SITUATION2_ENTITIES,
  getSession: (stationId: string, journal: JournalEntry[]) => {
    if (stationId !== 'station_east') return undefined;

    // If Kael was misdirected, no further sessions available
    const misdirected = journal.some((e) => e.key === 'radio:hostile_misdirected');
    if (misdirected) return undefined;

    // Session availability chains: 1 → 2 → 3
    const s1done = journal.some((e) => e.key === `radio:completed_${SESSION_1.id}`);
    if (!s1done) return SESSION_1;

    const s2done = journal.some((e) => e.key === `radio:completed_${SESSION_2.id}`);
    if (!s2done) return SESSION_2;

    return SESSION_3;
  },
  getMorningMessages: (day: number) => {
    // No morning messages if Kael was misdirected (he's dead or gone)
    // Caller should check journal for 'radio:hostile_misdirected' before displaying,
    // but we return the messages regardless — filtering is the caller's job
    // since getMorningMessages doesn't receive journal context.
    return MORNING_MESSAGES[day] ?? [];
  },
};

/** Returns the next available Kael session for a station */
export function getSessionForStation2(
  stationId: string,
  journal: JournalEntry[]
): ReturnType<typeof SITUATION_2.getSession> {
  return SITUATION_2.getSession(stationId, journal);
}

/** Returns Kael's morning messages for a given day */
export function getMorningMessagesForDay2(day: number): MorningMessage[] {
  return SITUATION_2.getMorningMessages(day);
}
