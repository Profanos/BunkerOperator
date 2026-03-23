/** Radio panel — frequency tuning, signal detection, dialogue-driven contact exchange.
 *  All controls positioned over panel_radio.png art windows. */

import { useState, useEffect, useCallback, useRef } from 'react';
import { StateManager } from '../shared/StateManager.ts';
import { RADIO_FREQ_MIN, RADIO_FREQ_MAX, formatGameTime } from '../shared/constants.ts';
import { RADIO_STATIONS } from '../shared/territory.ts';
import { getSessionForStation } from '../data/situations/situation1.ts';
import { getSessionForStation2 } from '../data/situations/situation2.ts';
import type { DialogueSession, DialogueOption } from '../data/dialogue/types.ts';
import type { JournalEntry } from '../shared/types.ts';

type ExchangeState = 'idle' | 'active' | 'done';

interface Message {
  from: 'them' | 'you';
  text: string;
}

/** All positions calibrated to panel_radio.png art windows */
const CFG = {
  freq:    { cx: 158, cy: 131 },          // center of FREQUENCY display window
  signal:  { x: 33,  y: 186, w: 250 },   // SIGNAL bar row
  station: { x: 30,  y: 232, w: 259 },   // STATION name row
  // Tuning buttons — invisible overlays, art has labels
  btn: {
    minusOne:  { left: 27,  top: 282, width: 115, height: 33 },
    plusOne:   { left: 171, top: 286, width: 109, height: 27 },
    minusTenth:{ left: 27,  top: 330, width: 115, height: 34 },
    plusTenth: { left: 169, top: 334, width: 115, height: 27 },
  },
  // Right content area
  right: { left: 345, top: 74, right: 943, bottom: 520 },
  // (known frequencies shown in right panel when scanning)
} as const;

function isOptionAvailable(option: DialogueOption, journal: JournalEntry[]): boolean {
  if (!option.requiredKeys || option.requiredKeys.length === 0) return true;
  return option.requiredKeys.every((key) => journal.some((e) => e.key === key));
}

function getSessionForAnyStation(
  stationId: string,
  journal: JournalEntry[]
): DialogueSession | undefined {
  const s1 = getSessionForStation(stationId, journal);
  if (s1 && !journal.some((e) => e.key === `radio:completed_${s1.id}`)) return s1;
  return getSessionForStation2(stationId, journal);
}

function getSpeakerName(session: DialogueSession): string {
  return session.id.startsWith('situation2') ? 'KAEL' : 'MARA';
}

export function RadioPanel() {
  const [freq, setFreq] = useState(StateManager.getState().radioFrequency);
  const [signalActive, setSignalActive] = useState(StateManager.getState().signalActive);
  const [activeStationId, setActiveStationId] = useState(StateManager.getState().activeStationId);
  const [journal, setJournal] = useState(StateManager.getState().journal);

  const [exchange, setExchange] = useState<ExchangeState>('idle');
  const [session, setSession] = useState<DialogueSession | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messageLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = StateManager.subscribe((state) => {
      setFreq(state.radioFrequency);
      setSignalActive(state.signalActive);
      setActiveStationId(state.activeStationId);
      setJournal(state.journal);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (messageLogRef.current)
      messageLogRef.current.scrollTop = messageLogRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!signalActive) {
      setExchange('idle');
      setSession(null);
      setMessages([]);
    }
  }, [signalActive]);

  const tune = useCallback((delta: number) => {
    const current = StateManager.getState().radioFrequency;
    const next = Math.min(RADIO_FREQ_MAX, Math.max(RADIO_FREQ_MIN,
      Math.round((current + delta) * 10) / 10
    ));
    StateManager.setRadioFrequency(next);
  }, []);

  const handleConnect = () => {
    if (!activeStationId) return;
    const loadedSession = getSessionForAnyStation(activeStationId, journal);
    if (!loadedSession) return;
    const startNode = loadedSession.nodes[loadedSession.startNodeId];
    setSession(loadedSession);
    setCurrentNodeId(loadedSession.startNodeId);
    setExchange('active');
    setMessages([{ from: 'them', text: startNode.npcLine }]);
    const state = StateManager.getState();
    StateManager.addJournalEntry({
      key: `radio:contact_${loadedSession.id}_${Date.now()}`,
      timestamp: Date.now(), day: state.currentDay,
      timeStr: formatGameTime(state.timeRemaining),
      text: `Radio contact on ${state.radioFrequency.toFixed(1)} MHz — "${startNode.npcLine}"`,
    });
  };

  const handleOption = (option: DialogueOption) => {
    if (!session) return;
    const newMessages: Message[] = [...messages, { from: 'you', text: option.text }];
    const state = StateManager.getState();
    const timeStr = formatGameTime(state.timeRemaining);
    StateManager.addJournalEntry({
      key: `radio:response_${Date.now()}`,
      timestamp: Date.now(), day: state.currentDay, timeStr,
      text: `You: "${option.text}"`,
    });
    if (option.journalEffect) {
      StateManager.addJournalEntry({
        key: option.journalEffect.key,
        timestamp: Date.now(), day: state.currentDay, timeStr,
        text: option.journalEffect.text,
      });
    }
    if (option.nextNodeId === null) {
      StateManager.addJournalEntry({
        key: `radio:completed_${session.id}`,
        timestamp: Date.now(), day: state.currentDay, timeStr,
        text: `Radio session closed: ${session.id}`,
      });
      setMessages(newMessages);
      setExchange('done');
      return;
    }
    const nextNode = session.nodes[option.nextNodeId];
    const withReply: Message[] = [...newMessages, { from: 'them', text: nextNode.npcLine }];
    setMessages(withReply);
    setCurrentNodeId(option.nextNodeId);
    const speaker = getSpeakerName(session);
    StateManager.addJournalEntry({
      key: `radio:npc_${Date.now()}`,
      timestamp: Date.now(), day: state.currentDay, timeStr,
      text: `${speaker === 'KAEL' ? 'Kael' : 'Mara'}: "${nextNode.npcLine}"`,
    });
  };

  const currentNode = session && exchange === 'active' ? session.nodes[currentNodeId] : null;
  const sessionAlreadyDone = activeStationId
    ? journal.some((e) => e.key === `radio:completed_${getSessionForAnyStation(activeStationId, journal)?.id ?? ''}`)
    : false;

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0,
      width: '960px', height: '540px',
      backgroundImage: 'url(/assets/sprites/panel_radio.png)',
      backgroundSize: '960px 540px',
      fontFamily: 'monospace',
      zIndex: 20,
    }}>

      {/* ── LEFT PANEL ──────────────────────────────────────── */}

      {/* Frequency value — centered in display window */}
      <div style={{
        position: 'absolute',
        left: CFG.freq.cx,
        top: CFG.freq.cy,
        transform: 'translate(-50%, -50%)',
        fontSize: '28px',
        fontWeight: 'bold',
        letterSpacing: '2px',
        color: signalActive ? '#f59e0b' : '#9ad4e8',
        pointerEvents: 'none',
      }}>
        {freq.toFixed(1)}
      </div>

      {/* Signal status */}
      <div style={{
        position: 'absolute',
        left: CFG.signal.x,
        top: CFG.signal.y,
        width: CFG.signal.w,
        fontSize: '10px',
        letterSpacing: '2px',
        color: signalActive ? '#f59e0b' : '#3a4a3a',
        pointerEvents: 'none',
      }}>
        {signalActive ? '● LOCKED' : '○ SEARCHING'}
      </div>

      {/* Active station name */}
      <div style={{
        position: 'absolute',
        left: CFG.station.x,
        top: CFG.station.y,
        width: CFG.station.w,
        fontSize: '10px',
        letterSpacing: '1px',
        color: signalActive ? '#9ad4e8' : '#2a3a2a',
        pointerEvents: 'none',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}>
        {signalActive && activeStationId
          ? (RADIO_STATIONS.find((s) => s.id === activeStationId)?.name ?? activeStationId)
          : '—'
        }
      </div>

      {/* Tuning buttons — invisible overlays, art provides labels */}
      <TuneBtn onClick={() => tune(-1)}   style={CFG.btn.minusOne} />
      <TuneBtn onClick={() => tune(1)}    style={CFG.btn.plusOne} />
      <TuneBtn onClick={() => tune(-0.1)} style={CFG.btn.minusTenth} />
      <TuneBtn onClick={() => tune(0.1)}  style={CFG.btn.plusTenth} />


      {/* ── RIGHT PANEL — exchange area ─────────────────────── */}
      <div style={{
        position: 'absolute',
        left: CFG.right.left,
        top: CFG.right.top,
        right: 960 - CFG.right.right,
        bottom: 540 - CFG.right.bottom,
        display: 'flex',
        flexDirection: 'column',
        color: '#b0b0c8',
      }}>

        {/* No signal */}
        {!signalActive && (() => {
          const known = RADIO_STATIONS.filter((s) =>
            journal.some((e) => e.key === `radar:discovered_${s.id}`)
          );
          return (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '8px', color: '#2a3a2a',
            }}>
              <div style={{ fontSize: '13px', letterSpacing: '2px' }}>SCANNING....</div>
              <div style={{ fontSize: '11px' }}>Tune to a station frequency to establish contact.</div>
              {known.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px', width: '100%', maxWidth: '260px' }}>
                  {known.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => StateManager.setRadioFrequency(s.frequency)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '4px 10px', backgroundColor: 'transparent',
                        border: '1px solid #2a3a2a', cursor: 'pointer', fontFamily: 'monospace',
                      }}
                    >
                      <span style={{ fontSize: '10px', color: '#3a5a3a' }}>{s.name}</span>
                      <span style={{ fontSize: '11px', color: '#4aff4a', fontWeight: 'bold' }}>{s.frequency.toFixed(1)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Signal active, no exchange */}
        {signalActive && exchange === 'idle' && !sessionAlreadyDone && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={handleConnect} style={{
              ...btnStyle, padding: '12px 32px', fontSize: '14px',
              letterSpacing: '2px', color: '#f59e0b', borderColor: '#f59e0b',
            }}>
              CONNECT
            </button>
          </div>
        )}

        {/* Session already done */}
        {signalActive && exchange === 'idle' && sessionAlreadyDone && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '8px', color: '#3a4a3a',
          }}>
            <div style={{ fontSize: '12px', letterSpacing: '2px' }}>● CONTACT CLOSED</div>
            <div style={{ fontSize: '11px', color: '#2a3a2a' }}>Signal active — no new contact available.</div>
          </div>
        )}

        {/* Active or done exchange */}
        {exchange !== 'idle' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, padding: '12px 0' }}>
            <div ref={messageLogRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'you' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '70%', padding: '8px 12px',
                    backgroundColor: msg.from === 'you' ? '#1a2a3a' : '#1a1a2a',
                    border: `1px solid ${msg.from === 'you' ? '#2a4a5a' : '#2a2a4a'}`,
                    color: msg.from === 'you' ? '#9ad4e8' : '#b0b0c8',
                    fontSize: '12px', lineHeight: '1.5',
                  }}>
                    <span style={{ color: msg.from === 'you' ? '#4a8aae' : '#6a6a8e', fontSize: '10px', display: 'block', marginBottom: '2px' }}>
                      {msg.from === 'you' ? 'YOU' : (session ? getSpeakerName(session) : 'UNKNOWN')}
                    </span>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {exchange === 'active' && currentNode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {currentNode.options.map((opt) => {
                  const available = isOptionAvailable(opt, journal);
                  return (
                    <div key={opt.id}>
                      <button
                        onClick={() => available && handleOption(opt)}
                        style={{
                          ...btnStyle, textAlign: 'left', padding: '8px 12px',
                          fontSize: '12px', width: '100%',
                          opacity: available ? 1 : 0.35,
                          cursor: available ? 'pointer' : 'default',
                          color: available ? '#6a9fb5' : '#4a4a6e',
                          borderColor: available ? '#3a3a5e' : '#2a2a3e',
                        }}
                      >
                        ▶ {opt.text}
                      </button>
                      {!available && opt.hint && (
                        <div style={{ fontSize: '10px', color: '#3a3a5e', paddingLeft: '12px', paddingTop: '2px' }}>
                          ⚠ {opt.hint}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {exchange === 'done' && (
              <div style={{ fontSize: '11px', color: '#3a4a3a', letterSpacing: '1px', textAlign: 'center', paddingTop: '8px' }}>
                — TRANSMISSION ENDED —
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: '1px solid #3a3a5e',
  color: '#6a9fb5',
  fontFamily: 'monospace',
  fontSize: '11px',
  padding: '6px 10px',
  cursor: 'pointer',
};


function TuneBtn({ onClick, style }: { onClick: () => void; style: { left: number; top: number; width: number; height: number } }) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        position: 'absolute',
        left: style.left,
        top: style.top,
        width: style.width,
        height: style.height,
        backgroundColor: active ? 'rgba(154,212,232,0.18)' : hover ? 'rgba(154,212,232,0.08)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.08s',
      }}
    />
  );
}
