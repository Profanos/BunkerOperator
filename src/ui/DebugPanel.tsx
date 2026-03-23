/** Debug panel — structured testing tools shown when debug mode is active (backtick key) */

import { useState, useEffect } from 'react';
import { StateManager } from '../shared/StateManager.ts';
import { EventBridge } from '../shared/EventBridge.ts';
import { RADIO_STATIONS } from '../shared/territory.ts';
import { gridLabel } from '../shared/territory.ts';
import { formatGameTime } from '../shared/constants.ts';
import type { JournalEntry } from '../shared/types.ts';

/** Keys that drive gameplay outcomes — shown explicitly so test results are readable at a glance */
const KEY_DECISIONS = [
  { key: 'radio:survivor_warned',             label: 'Mara warned about zombie' },
  { key: 'bunker:survivor_saved_mara',        label: 'Bunker revealed to Mara' },
  { key: 'situation:compromised_survivor_test', label: 'Mara compromised (dead)' },
  { key: 'morning:mara_day2',                 label: 'Day 2 morning message shown' },
  { key: 'morning:mara_day3',                 label: 'Day 3 morning message shown' },
  { key: 'radar:seen_survivor_test',          label: 'Mara detected on scanner' },
  { key: 'radar:seen_zombie_test',            label: 'Zombie detected on scanner' },
  { key: 'radar:discovered_station_north',    label: 'Relay North discovered' },
  { key: 'radar:discovered_station_east',     label: 'Relay East discovered' },
  { key: 'radio:completed_situation1_session1', label: 'Session 1 completed' },
  { key: 'radio:completed_situation1_session2', label: 'Session 2 completed' },
  { key: 'radio:completed_situation1_session3', label: 'Session 3 completed' },
  { key: 'radar:seen_hostile_kael', label: 'Kael detected on scanner' },
  { key: 'radio:hostile_misdirected', label: 'Kael misdirected toward zombie' },
  { key: 'situation:compromised_hostile_kael', label: 'Kael compromised (dead)' },
  { key: 'bunker:hostile_entered_kael', label: 'Kael entered bunker (BAD)' },
  { key: 'morning:kael_day2', label: 'Kael Day 2 morning msg shown' },
  { key: 'morning:kael_day3', label: 'Kael Day 3 morning msg shown' },
  { key: 'radio:completed_situation2_session1', label: 'Kael Session 1 completed' },
  { key: 'radio:completed_situation2_session2', label: 'Kael Session 2 completed' },
  { key: 'radio:completed_situation2_session3', label: 'Kael Session 3 completed' },
];

function buildSnapshot(state: ReturnType<typeof StateManager.getState>): string {
  const { currentDay, timeRemaining, signalActive, activeStationId, entities, journal, debugLog, radarContacts } = state;

  const flag = (key: string) => journal.some((e) => e.key === key) ? '✓' : '✗';

  const lines: string[] = [
    '=== BUNKER OPERATOR TEST LOG ===',
    `Day ${currentDay} — ${formatGameTime(timeRemaining)}`,
    `Signal: ${signalActive ? `ACTIVE (${activeStationId})` : 'none'}`,
    '',
    'ENTITIES:',
    ...entities.map((e) =>
      `  ${e.type === 'survivor' ? '▲' : '▼'} ${e.id}  pos:${gridLabel(e.position)}  idx:${e.currentPathIndex}  ${e.alive ? 'alive' : 'DEAD'}`
    ),
    '',
    'RADAR CONTACTS:',
    ...(radarContacts.length === 0
      ? ['  (none)']
      : radarContacts.map((c) =>
          `  ${c.type === 'survivor' ? '▲' : '▼'} ${c.entityId}  last:${gridLabel(c.position)}  D${c.day} ${c.timeStr}`
        )
    ),
    '',
    'KEY DECISIONS:',
    ...KEY_DECISIONS.map((d) => `  ${flag(d.key)} ${d.label}`),
    '',
    'FULL JOURNAL:',
    ...journal.map((e) => `  [D${e.day} ${e.timeStr}] ${e.key}`),
    '',
    'RECENT EVENTS:',
    ...debugLog.map((l) => `  ${l}`),
    '================================',
  ];
  return lines.join('\n');
}

export function DebugPanel() {
  const [state, setState] = useState(StateManager.getState());
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const unsub = StateManager.subscribe(setState);
    return unsub;
  }, []);

  if (!state.debugMode) return null;

  const { currentDay, timeRemaining, signalActive, entities, debugLog } = state;

  const handleCopyState = () => {
    const snapshot = buildSnapshot(state);
    navigator.clipboard.writeText(snapshot).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        width: '260px',
        backgroundColor: 'rgba(0, 8, 0, 0.9)',
        border: '1px solid #2a4a2a',
        color: '#88cc88',
        fontFamily: 'monospace',
        fontSize: '10px',
        zIndex: 100,
        pointerEvents: 'auto',
      }}
      // Stop clicks from bubbling to window — Phaser listens at window level for both event types
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header — click to collapse/expand */}
      <div
        onClick={() => setCollapsed((c) => !c)}
        style={{ padding: '4px 8px', backgroundColor: '#0a140a', borderBottom: '1px solid #2a4a2a', fontSize: '11px', letterSpacing: '2px', color: '#4aff4a', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
      >
        <span>▌ DEBUG MODE</span>
        <span style={{ fontSize: '10px', color: '#2a6a2a' }}>{collapsed ? '▼' : '▲'}</span>
      </div>

      {!collapsed && <>
        <Section label="STATUS">
          <div>Day {currentDay} — {formatGameTime(timeRemaining)}</div>
          <div style={{ color: signalActive ? '#f59e0b' : '#3a5a3a', marginTop: '2px' }}>
            Signal: {signalActive ? '● active' : '○ none'}
          </div>
          <div style={{ marginTop: '4px' }}>
            {entities.map((e) => (
              <div key={e.id} style={{ color: e.alive ? (e.type === 'survivor' ? '#4aff4a' : '#ff6a6a') : '#3a4a3a' }}>
                {e.type === 'survivor' ? '▲' : '▼'} {e.id}{'  '}
                {gridLabel(e.position)}{'  '}
                <span style={{ color: '#4a7a4a' }}>idx:{e.currentPathIndex}</span>
                {'  '}{e.alive ? '●' : '✕'}
              </div>
            ))}
          </div>
        </Section>

        <Section label="ACTIONS">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => EventBridge.emit('debug:step')} style={btnStyle}>
              Step ▶
            </button>
            <button onClick={() => EventBridge.emit('debug:skipDay')} style={btnStyle}>
              Skip Day
            </button>
            <button
              onClick={handleCopyState}
              style={{ ...btnStyle, color: copied ? '#ffffff' : '#4aff4a', borderColor: copied ? '#4a8a4a' : '#2a4a2a' }}
            >
              {copied ? 'Copied!' : 'Copy Log'}
            </button>
          </div>
          <ResetBtn />
        </Section>

        <Section label="STATIONS">
          {RADIO_STATIONS.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <span style={{ color: '#6aaa6a' }}>{s.name}</span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ color: '#f59e0b' }}>{s.frequency.toFixed(1)}</span>
                <button
                  onClick={() => StateManager.setRadioFrequency(s.frequency)}
                  style={{ ...btnStyle, padding: '1px 6px', fontSize: '9px' }}
                >
                  tune
                </button>
              </div>
            </div>
          ))}
        </Section>

        <Section label="SCENARIOS">
          <div style={{ fontSize: '9px', color: '#3a5a3a', marginBottom: '6px' }}>
            inject state — Copy Log after each
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <ScenarioBtn label="Scan Evidence" onClick={() => injectScanEvidence()} />
            <ScenarioBtn label="Warn Mara" onClick={() => injectKey('radio:survivor_warned', 'Warned Mara about zombie threat')} />
            <ScenarioBtn label="S1 Done" onClick={() => injectKey('radio:completed_situation1_session1', 'Session 1 completed')} />
            <ScenarioBtn label="S2 Done" onClick={() => injectKey('radio:completed_situation1_session2', 'Session 2 completed')} />
            <ScenarioBtn label="Kill Mara" color="#ff6a6a" onClick={() => injectCollision()} />
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
            <ScenarioBtn label="End: Saved" color="#4aff4a" onClick={() => injectEndSaved()} />
            <ScenarioBtn label="End: Lost" color="#ff4a4a" onClick={() => injectEndLost()} />
            <ScenarioBtn label="End: Neutral" color="#6a6a8e" onClick={() => EventBridge.emit('game:ended')} />
          </div>
          <div style={{ fontSize: '9px', color: '#3a5a3a', marginTop: '8px', marginBottom: '4px' }}>
            KAEL (hostile)
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <ScenarioBtn label="Scan Kael" onClick={() => injectScanKael()} />
            <ScenarioBtn label="Kael S1" onClick={() => injectKey('radio:completed_situation2_session1', 'Kael Session 1 completed')} />
            <ScenarioBtn label="Kael S2" onClick={() => injectKey('radio:completed_situation2_session2', 'Kael Session 2 completed')} />
            <ScenarioBtn label="Mislead Kael" color="#ff6a6a" onClick={() => injectMisleadKael()} />
          </div>
        </Section>

        <Section label="EVENT LOG" noBorder>
          <div style={{ maxHeight: '80px', overflowY: 'auto' }}>
            {debugLog.length === 0
              ? <span style={{ color: '#2a4a2a' }}>— no events yet —</span>
              : debugLog.map((line, i) => (
                <div key={i} style={{ color: '#3a6a3a', marginBottom: '1px' }}>{line}</div>
              ))
            }
          </div>
        </Section>
      </>}
    </div>
  );
}

function Section({ label, children, noBorder }: { label: string; children: React.ReactNode; noBorder?: boolean }) {
  return (
    <div style={{ padding: '6px 8px', borderBottom: noBorder ? 'none' : '1px solid #1a2a1a' }}>
      <div style={{ color: '#3a7a3a', fontSize: '9px', letterSpacing: '1px', marginBottom: '4px' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scenario helpers — inject state without playing through manually
// ---------------------------------------------------------------------------

function makeEntry(key: string, text: string): JournalEntry {
  const state = StateManager.getState();
  return { key, timestamp: Date.now(), day: state.currentDay, timeStr: formatGameTime(state.timeRemaining), text: `[TEST] ${text}` };
}

function injectKey(key: string, text: string): void {
  StateManager.addJournalEntry(makeEntry(key, text));
  StateManager.addDebugLog(`[SCENARIO] ${key}`);
}

function injectScanEvidence(): void {
  const state = StateManager.getState();
  const timeStr = formatGameTime(state.timeRemaining);
  StateManager.addJournalEntry(makeEntry('radar:seen_survivor_test', 'Scanner: survivor detected'));
  StateManager.addJournalEntry(makeEntry('radar:seen_zombie_test', 'Scanner: zombie detected'));
  StateManager.setRadarContact({ entityId: 'survivor_test', type: 'survivor', position: { col: 3, row: 2 }, day: state.currentDay, timeStr });
  StateManager.setRadarContact({ entityId: 'zombie_test', type: 'zombie', position: { col: 5, row: 4 }, day: state.currentDay, timeStr });
  StateManager.addDebugLog('[SCENARIO] scan evidence injected');
}

function injectCollision(): void {
  const state = StateManager.getState();
  const entities = state.entities.map((e) =>
    e.type === 'survivor' ? { ...e, alive: false } : e
  );
  StateManager.setEntities(entities);
  StateManager.addJournalEntry(makeEntry('situation:compromised_survivor_test', 'Mara compromised — collision forced'));
  StateManager.addDebugLog('[SCENARIO] collision forced — Mara killed');
}

function injectEndSaved(): void {
  StateManager.addJournalEntry(makeEntry('bunker:survivor_saved_mara', 'Bunker revealed to Mara, gate opened'));
  StateManager.addDebugLog('[SCENARIO] end:saved → game:ended');
  EventBridge.emit('game:ended');
}

function injectEndLost(): void {
  StateManager.addJournalEntry(makeEntry('situation:compromised_survivor_test', 'Mara compromised — collision recorded'));
  StateManager.addDebugLog('[SCENARIO] end:lost → game:ended');
  EventBridge.emit('game:ended');
}

function injectScanKael(): void {
  const state = StateManager.getState();
  const timeStr = formatGameTime(state.timeRemaining);
  StateManager.addJournalEntry(makeEntry('radar:seen_hostile_kael', 'Scanner: hostile survivor detected'));
  StateManager.setRadarContact({ entityId: 'hostile_kael', type: 'survivor', position: { col: 7, row: 7 }, day: state.currentDay, timeStr });
  StateManager.addDebugLog('[SCENARIO] Kael scan evidence injected');
}

function injectMisleadKael(): void {
  StateManager.addJournalEntry(makeEntry('radio:hostile_misdirected', 'Misdirected Kael toward zombie territory'));
  StateManager.addDebugLog('[SCENARIO] Kael misdirected');
}

function ResetBtn() {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <div style={{ display: 'flex', gap: '4px', marginTop: '6px', alignItems: 'center' }}>
      <span style={{ fontSize: '9px', color: '#ff4a4a' }}>Sure?</span>
      <button
        onClick={() => { EventBridge.emit('debug:reset'); setConfirm(false); }}
        style={{ ...btnStyle, fontSize: '9px', padding: '2px 8px', color: '#ff4a4a', borderColor: '#4a1a1a' }}
      >
        Yes, reset
      </button>
      <button
        onClick={() => setConfirm(false)}
        style={{ ...btnStyle, fontSize: '9px', padding: '2px 8px' }}
      >
        Cancel
      </button>
    </div>
  ) : (
    <button
      onClick={() => setConfirm(true)}
      style={{ ...btnStyle, marginTop: '6px', fontSize: '9px', color: '#6a3a3a', borderColor: '#3a1a1a' }}
    >
      Reset Game
    </button>
  );
}

function ScenarioBtn({ label, onClick, color }: { label: string; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{ ...btnStyle, fontSize: '9px', padding: '2px 6px', color: color ?? '#88cc88', borderColor: color ? `${color}55` : '#2a4a2a' }}
    >
      {label}
    </button>
  );
}

const btnStyle: React.CSSProperties = {
  backgroundColor: '#0a140a',
  border: '1px solid #2a4a2a',
  color: '#4aff4a',
  fontFamily: 'monospace',
  fontSize: '10px',
  padding: '3px 8px',
  cursor: 'pointer',
};
