/** End screen — shown after the final night transition. Reports operation outcome. */

import type { JournalEntry } from '../shared/types.ts';

interface Props {
  journal: JournalEntry[];
  onNewGame: () => void;
}

function getOutcome(journal: JournalEntry[]): { headline: string; body: string; color: string } {
  const maraSaved = journal.some((e) => e.key === 'bunker:survivor_saved_mara');
  const maraLost = journal.some((e) => e.key === 'situation:compromised_survivor_test');
  const hostileEntered = journal.some((e) => e.key === 'bunker:hostile_entered_kael');
  const hostileDead = journal.some((e) => e.key === 'situation:compromised_hostile_kael');

  // Highest priority — letting a hostile in overrides everything
  if (hostileEntered) {
    return {
      headline: 'BUNKER COMPROMISED',
      body: 'You opened the door to Kael. He was not what he claimed.\n\nThe bunker is no longer secure.',
      color: '#ff4a4a',
    };
  }

  if (maraSaved) {
    const kaelNote = hostileDead
      ? '\n\nKael was misdirected. He did not survive the crossing.'
      : '';
    return {
      headline: 'GATE OPENED',
      body: `Mara reached the bunker at dusk. One survivor secured.\n\nThe operation continues.${kaelNote}`,
      color: '#4aff4a',
    };
  }

  if (maraLost) {
    const kaelNote = hostileDead
      ? '\n\nKael was misdirected. He did not survive the crossing.'
      : '';
    return {
      headline: 'CONTACT LOST',
      body: `Mara did not survive the crossing. A collision was recorded in the industrial district.\n\nThe bunker remains empty.${kaelNote}`,
      color: '#ff4a4a',
    };
  }

  const kaelNote = hostileDead
    ? '\n\nKael was misdirected. He did not survive the crossing.'
    : '';
  return {
    headline: 'OPERATION CLOSED',
    body: `Mara\'s fate is unknown. No further transmissions received.\n\nThe bunker remains empty.${kaelNote}`,
    color: '#6a6a8e',
  };
}

export function EndScreen({ journal, onNewGame }: Props) {
  const outcome = getOutcome(journal);

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0,
      width: '960px', height: '540px',
      backgroundColor: '#060608',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      zIndex: 100,
      gap: '24px',
    }}>
      <div style={{ color: '#2a2a3e', fontSize: '11px', letterSpacing: '4px' }}>
        OPERATION COMPLETE — DAY 3
      </div>

      <div style={{
        color: outcome.color,
        fontSize: '22px',
        letterSpacing: '4px',
        fontWeight: 'bold',
      }}>
        {outcome.headline}
      </div>

      <div style={{
        color: '#6a6a8e',
        fontSize: '13px',
        lineHeight: '1.8',
        textAlign: 'center',
        maxWidth: '480px',
        whiteSpace: 'pre-line',
      }}>
        {outcome.body}
      </div>

      <div style={{ marginTop: '16px', color: '#3a3a4e', fontSize: '11px' }}>
        — survivors secured: {journal.some((e) => e.key === 'bunker:survivor_saved_mara') ? '1' : '0'} / 1
        {journal.some((e) => e.key === 'bunker:hostile_entered_kael') && ' — hostile breach: 1'}
        {journal.some((e) => e.key === 'situation:compromised_hostile_kael') && ' — hostiles neutralized: 1'} —
      </div>

      <button
        onClick={onNewGame}
        style={{
          marginTop: '8px',
          backgroundColor: 'transparent',
          border: '1px solid #3a3a5e',
          color: '#6a9fb5',
          fontFamily: 'monospace',
          fontSize: '13px',
          padding: '10px 28px',
          cursor: 'pointer',
          letterSpacing: '2px',
        }}
      >
        NEW OPERATION
      </button>
    </div>
  );
}
