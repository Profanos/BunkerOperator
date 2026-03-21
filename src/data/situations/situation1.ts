/** Situation 1: Lone Good Survivor — "Mara"
 *
 * Mara is a vet who was sheltering in the Industrial District when the collapse
 * happened. She's trying to reach the East Corridor where she believes there's
 * a supply cache near the water tower.
 *
 * Session 1: Relay North (91.5 MHz) — Mara is near the Gas Station
 * Session 2: Relay East (97.3 MHz) — Mara has reached the Water Tower area
 *
 * Locked options require radar evidence before they unlock:
 * - Confirming you can track her: radar:seen_survivor_test
 * - Warning about the zombie: radar:seen_zombie_test
 */

import type { DialogueSession } from '../dialogue/types.ts';

const SESSION_1: DialogueSession = {
  id: 'situation1_session1',
  stationId: 'station_north',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      npcLine: '...hello? Is anyone out there? I\'ve been trying every frequency for two days.',
      options: [
        {
          id: 'opt_location',
          text: 'Yes. I can hear you. Where are you?',
          nextNodeId: 'location',
        },
        {
          id: 'opt_identity',
          text: 'Identify yourself.',
          nextNodeId: 'identity',
        },
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
          hint: 'Pulse the radar near this contact to track their position.',
          nextNodeId: 'scanner_confirm',
        },
        {
          id: 'opt_injured',
          text: 'Are you injured?',
          nextNodeId: 'status',
        },
      ],
    },

    identity: {
      id: 'identity',
      npcLine: 'Mara. I was working at a farmstead north of the district. What about you?',
      options: [
        {
          id: 'opt_alone',
          text: 'Someone who can help. Are you alone?',
          nextNodeId: 'alone',
        },
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
          hint: 'Pulse the radar near this contact to check for threats.',
          nextNodeId: 'zombie_warning',
        },
        {
          id: 'opt_destination',
          text: 'Good. Where are you headed?',
          nextNodeId: 'destination',
        },
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
          hint: 'Pulse the radar near this contact to check for threats.',
          nextNodeId: 'zombie_warning',
        },
        {
          id: 'opt_head_east',
          text: 'Start heading east when it\'s safe.',
          nextNodeId: 'destination',
        },
      ],
    },

    zombie_warning: {
      id: 'zombie_warning',
      npcLine: '...Something else? How close? Which direction?',
      options: [
        {
          id: 'opt_route',
          text: 'Northeast of your position, moving south. Head east now.',
          nextNodeId: 'route_given',
          // This key is checked by SituationManager to switch Mara to the safe path
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
        {
          id: 'opt_go',
          text: 'I\'ll be on 97.3. Go.',
          nextNodeId: null,
        },
      ],
    },

    session1_end: {
      id: 'session1_end',
      npcLine: '97.3. Got it. I\'ll contact you when I reach the eastern area.',
      options: [
        {
          id: 'opt_goodbye',
          text: 'I\'ll be listening. Stay low.',
          nextNodeId: null,
        },
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
      npcLine: 'It\'s Mara. I made it. I can see the water tower from here.',
      options: [
        {
          id: 'opt_scanner',
          text: 'Good. I have you on scanner.',
          requiredKeys: ['radar:seen_survivor_test'],
          hint: 'Pulse the radar to confirm this contact\'s new position.',
          nextNodeId: 'scanner_confirm',
        },
        {
          id: 'opt_status',
          text: 'What\'s your situation?',
          nextNodeId: 'status',
        },
      ],
    },

    scanner_confirm: {
      id: 'scanner_confirm',
      npcLine: 'Reassuring. I had a feeling something was following me from the industrial district.',
      options: [
        {
          id: 'opt_still_here',
          text: 'It might still be nearby.',
          requiredKeys: ['radar:seen_zombie_test'],
          hint: 'Pulse the radar in this area to check for threats.',
          nextNodeId: 'zombie_nearby',
        },
        {
          id: 'opt_cache',
          text: 'You seem clear. Check the building near the tower.',
          nextNodeId: 'cache',
        },
      ],
    },

    status: {
      id: 'status',
      npcLine: 'Tired. I think I lost whatever was tracking me. The east corridor seems quiet.',
      options: [
        {
          id: 'opt_scanner_warn',
          text: 'My scanner says otherwise.',
          requiredKeys: ['radar:seen_zombie_test'],
          hint: 'Pulse the radar in this area to check for threats.',
          nextNodeId: 'zombie_nearby',
        },
        {
          id: 'opt_head_to_tower',
          text: 'It may be clear. Head toward the tower.',
          nextNodeId: 'cache',
        },
      ],
    },

    zombie_nearby: {
      id: 'zombie_nearby',
      npcLine: 'Still? It followed me all this way? What do I do?',
      options: [
        {
          id: 'opt_stay_north',
          text: 'Stay north of the tower. The threat is south of your position.',
          nextNodeId: 'final',
        },
      ],
    },

    cache: {
      id: 'cache',
      npcLine: 'I see a building near the tower — looks intact. Could be supplies.',
      options: [
        {
          id: 'opt_check',
          text: 'Check it carefully. We\'ll talk again tomorrow.',
          nextNodeId: 'final',
        },
      ],
    },

    final: {
      id: 'final',
      npcLine: 'Thank you. I don\'t know where I\'d be without this. I\'ll shelter here tonight.',
      options: [
        {
          id: 'opt_safe',
          text: 'Stay safe, Mara. I\'ll be monitoring.',
          nextNodeId: null,
        },
      ],
    },
  },
};

export const SITUATION1_SESSIONS: DialogueSession[] = [SESSION_1, SESSION_2];

export function getSessionForStation(stationId: string): DialogueSession | undefined {
  return SITUATION1_SESSIONS.find((s) => s.stationId === stationId);
}
