/** Radio panel — frequency tuning, signal detection, dialogue-driven contact exchange */

import { useState, useEffect, useCallback, useRef } from 'react';
import { StateManager } from '../shared/StateManager.ts';
import { RADIO_FREQ_MIN, RADIO_FREQ_MAX, formatGameTime } from '../shared/constants.ts';
import { RADIO_STATIONS } from '../shared/territory.ts';
import { getSessionForStation } from '../data/situations/situation1.ts';
import type { DialogueSession, DialogueOption } from '../data/dialogue/types.ts';
import type { JournalEntry } from '../shared/types.ts';

type ExchangeState = 'idle' | 'active' | 'done';

interface Message {
  from: 'them' | 'you';
  text: string;
}

function isOptionAvailable(option: DialogueOption, journal: JournalEntry[]): boolean {
  if (!option.requiredKeys || option.requiredKeys.length === 0) return true;
  return option.requiredKeys.every((key) => journal.some((e) => e.key === key));
}

export function RadioPanel() {
  const [freq, setFreq] = useState(StateManager.getState().radioFrequency);
  const [signalActive, setSignalActive] = useState(StateManager.getState().signalActive);
  const [activeStationId, setActiveStationId] = useState(StateManager.getState().activeStationId);
  const [journal, setJournal] = useState(StateManager.getState().journal);
  const [debugMode, setDebugMode] = useState(StateManager.getState().debugMode);

  const [exchange, setExchange] = useState<ExchangeState>('idle');
  const [session, setSession] = useState<DialogueSession | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  // Track completed session ids so a finished conversation doesn't reopen
  const [completedSessions, setCompletedSessions] = useState<string[]>([]);
  const messageLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = StateManager.subscribe((state) => {
      setFreq(state.radioFrequency);
      setSignalActive(state.signalActive);
      setActiveStationId(state.activeStationId);
      setJournal(state.journal);
      setDebugMode(state.debugMode);
    });
    return unsub;
  }, []);

  // Scroll message log to bottom whenever messages update
  useEffect(() => {
    if (messageLogRef.current) {
      messageLogRef.current.scrollTop = messageLogRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset exchange when signal is lost
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
    const loadedSession = getSessionForStation(activeStationId);
    if (!loadedSession) return;

    const startNode = loadedSession.nodes[loadedSession.startNodeId];
    setSession(loadedSession);
    setCurrentNodeId(loadedSession.startNodeId);
    setExchange('active');
    setMessages([{ from: 'them', text: startNode.npcLine }]);

    const state = StateManager.getState();
    StateManager.addJournalEntry({
      key: `radio:contact_${loadedSession.id}_${Date.now()}`,
      timestamp: Date.now(),
      day: state.currentDay,
      timeStr: formatGameTime(state.timeRemaining),
      text: `Radio contact on ${state.radioFrequency.toFixed(1)} MHz — "${startNode.npcLine}"`,
    });
  };

  const handleOption = (option: DialogueOption) => {
    if (!session) return;

    const newMessages: Message[] = [
      ...messages,
      { from: 'you', text: option.text },
    ];

    const state = StateManager.getState();
    const timeStr = formatGameTime(state.timeRemaining);

    // Log the player's choice
    StateManager.addJournalEntry({
      key: `radio:response_${Date.now()}`,
      timestamp: Date.now(),
      day: state.currentDay,
      timeStr,
      text: `You: "${option.text}"`,
    });

    if (option.nextNodeId === null) {
      // Conversation ends
      setMessages(newMessages);
      setExchange('done');
      setCompletedSessions((prev) => [...prev, session.id]);
      return;
    }

    const nextNode = session.nodes[option.nextNodeId];
    const withReply: Message[] = [...newMessages, { from: 'them', text: nextNode.npcLine }];
    setMessages(withReply);
    setCurrentNodeId(option.nextNodeId);

    StateManager.addJournalEntry({
      key: `radio:npc_${Date.now()}`,
      timestamp: Date.now(),
      day: state.currentDay,
      timeStr,
      text: `Mara: "${nextNode.npcLine}"`,
    });
  };

  const currentNode = session && exchange === 'active' ? session.nodes[currentNodeId] : null;
  const sessionAlreadyDone = activeStationId
    ? completedSessions.includes(getSessionForStation(activeStationId)?.id ?? '')
    : false;

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0,
      width: '960px', height: '540px',
      backgroundColor: '#0a0a14',
      color: '#b0b0c8',
      fontFamily: 'monospace',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid #1a1a2e', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h2 style={{ color: '#6a9fb5', fontSize: '14px', margin: 0, letterSpacing: '2px' }}>
          ▌ ANALOG RADIO
        </h2>
        <div style={{
          marginLeft: 'auto',
          fontSize: '11px',
          color: signalActive ? '#f59e0b' : '#3a3a5e',
          letterSpacing: '1px',
        }}>
          {signalActive ? '● SIGNAL DETECTED' : '○ NO SIGNAL'}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 0, minHeight: 0 }}>
        {/* Left — tuner */}
        <div style={{
          width: '280px',
          borderRight: '1px solid #1a1a2e',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#5a5a7e', fontSize: '10px', letterSpacing: '2px', marginBottom: '8px' }}>
              FREQUENCY
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: signalActive ? '#f59e0b' : '#9ad4e8',
              letterSpacing: '2px',
            }}>
              {freq.toFixed(1)}
            </div>
            <div style={{ color: '#4a4a6e', fontSize: '11px' }}>MHz</div>
          </div>

          {/* Tuning buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {[{ label: '−1.0', d: -1 }, { label: '−0.1', d: -0.1 }].map(({ label, d }) => (
                <button key={label} onClick={() => tune(d)} style={btnStyle}>
                  {label}
                </button>
              ))}
              {[{ label: '+0.1', d: 0.1 }, { label: '+1.0', d: 1 }].map(({ label, d }) => (
                <button key={label} onClick={() => tune(d)} style={btnStyle}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Range indicator */}
          <div style={{ position: 'relative', height: '4px', backgroundColor: '#1a1a2e', borderRadius: '2px' }}>
            <div style={{
              position: 'absolute',
              left: `${((freq - RADIO_FREQ_MIN) / (RADIO_FREQ_MAX - RADIO_FREQ_MIN)) * 100}%`,
              top: '-4px',
              width: '2px',
              height: '12px',
              backgroundColor: signalActive ? '#f59e0b' : '#6a9fb5',
              transform: 'translateX(-50%)',
            }} />
            <div style={{ position: 'absolute', bottom: '-14px', left: 0, color: '#3a3a5e', fontSize: '9px' }}>{RADIO_FREQ_MIN}</div>
            <div style={{ position: 'absolute', bottom: '-14px', right: 0, color: '#3a3a5e', fontSize: '9px' }}>{RADIO_FREQ_MAX}</div>
          </div>

          {/* Static lines — visual flavour */}
          <div style={{ marginTop: '20px' }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{
                height: '2px',
                marginBottom: '3px',
                backgroundColor: '#1a1a2e',
                width: `${30 + Math.sin(i * 1.7 + freq) * 20 + 20}%`,
                opacity: signalActive ? 0.3 : 0.6,
              }} />
            ))}
          </div>

          {/* Known frequencies — discovered via radar scan, or all shown in debug mode */}
          {(() => {
            const knownStations = RADIO_STATIONS.filter((s) =>
              debugMode || journal.some((e) => e.key === `radar:discovered_${s.id}`)
            );
            if (knownStations.length === 0) return null;
            return (
              <div style={{ borderTop: '1px solid #1a1a2e', paddingTop: '12px' }}>
                <div style={{ color: '#3a3a5e', fontSize: '9px', letterSpacing: '2px', marginBottom: '8px' }}>
                  {debugMode ? 'ALL STATIONS [DBG]' : 'KNOWN FREQUENCIES'}
                </div>
                {knownStations.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => StateManager.setRadioFrequency(s.frequency)}
                    style={{
                      ...btnStyle,
                      display: 'flex',
                      justifyContent: 'space-between',
                      width: '100%',
                      marginBottom: '4px',
                      padding: '5px 8px',
                      color: debugMode ? '#f59e0b' : '#6a9fb5',
                      borderColor: debugMode ? '#3a2a0a' : '#2a2a3e',
                    }}
                  >
                    <span style={{ fontSize: '10px' }}>{s.name}</span>
                    <span style={{ color: debugMode ? '#f59e0b' : '#4aff4a', fontSize: '11px', fontWeight: 'bold' }}>
                      {s.frequency.toFixed(1)}
                    </span>
                  </button>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Right — exchange area */}
        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* No signal */}
          {!signalActive && (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '8px', color: '#2a2a4e',
            }}>
              <div style={{ fontSize: '13px', letterSpacing: '2px' }}>SCANNING...</div>
              <div style={{ fontSize: '11px' }}>Tune to a station frequency to establish contact.</div>
            </div>
          )}

          {/* Signal active, no exchange started yet */}
          {signalActive && exchange === 'idle' && !sessionAlreadyDone && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button onClick={handleConnect} style={{
                ...btnStyle,
                padding: '12px 32px',
                fontSize: '14px',
                letterSpacing: '2px',
                color: '#f59e0b',
                borderColor: '#f59e0b',
              }}>
                CONNECT
              </button>
            </div>
          )}

          {/* Session already completed for this station */}
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
              {/* Message log */}
              <div ref={messageLogRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: msg.from === 'you' ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      maxWidth: '70%',
                      padding: '8px 12px',
                      backgroundColor: msg.from === 'you' ? '#1a2a3a' : '#1a1a2a',
                      border: `1px solid ${msg.from === 'you' ? '#2a4a5a' : '#2a2a4a'}`,
                      color: msg.from === 'you' ? '#9ad4e8' : '#b0b0c8',
                      fontSize: '12px',
                      lineHeight: '1.5',
                    }}>
                      <span style={{ color: msg.from === 'you' ? '#4a8aae' : '#6a6a8e', fontSize: '10px', display: 'block', marginBottom: '2px' }}>
                        {msg.from === 'you' ? 'YOU' : 'MARA'}
                      </span>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Response options — shown when conversation is still active */}
              {exchange === 'active' && currentNode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {currentNode.options.map((opt) => {
                    const available = isOptionAvailable(opt, journal);
                    return (
                      <div key={opt.id}>
                        <button
                          onClick={() => available && handleOption(opt)}
                          style={{
                            ...btnStyle,
                            textAlign: 'left',
                            padding: '8px 12px',
                            fontSize: '12px',
                            width: '100%',
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

              {/* Conversation ended */}
              {exchange === 'done' && (
                <div style={{ fontSize: '11px', color: '#3a4a3a', letterSpacing: '1px', textAlign: 'center', paddingTop: '8px' }}>
                  — TRANSMISSION ENDED —
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '8px', textAlign: 'center', color: '#3a3a4e', fontSize: '10px' }}>
        ESC to return to desk
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

