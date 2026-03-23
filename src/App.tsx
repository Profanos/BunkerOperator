/** Root component — manages game screens: menu → playing → game over */

import { useState, useEffect, useRef } from 'react';
import { SplashScreen } from './ui/SplashScreen.tsx';
import { MainMenu } from './ui/MainMenu.tsx';
import { PhaserGame } from './game/PhaserGame.tsx';
import { MapOverlay } from './ui/MapOverlay.tsx';
import { JournalPanel } from './ui/JournalPanel.tsx';
import { ManualPanel } from './ui/ManualPanel.tsx';
import { RadioPanel } from './ui/RadioPanel.tsx';
import { MorningMessages } from './ui/MorningMessages.tsx';
import { DebugPanel } from './ui/DebugPanel.tsx';
import { SettingsPanel } from './ui/SettingsPanel.tsx';
import { EndScreen } from './ui/EndScreen.tsx';
import { StateManager } from './shared/StateManager.ts';
import { EventBridge } from './shared/EventBridge.ts';
import { getMorningMessagesForDay } from './data/situations/situation1.ts';
import { getMorningMessagesForDay2 } from './data/situations/situation2.ts';
import { hasSave, loadSave, clearSave } from './shared/SaveSystem.ts';
import type { GameScreen, ToolId, JournalEntry } from './shared/types.ts';
import type { MorningMessage } from './data/dialogue/types.ts';

interface PendingMorning {
  day: number;
  messages: MorningMessage[];
}

function getNotificationText(entry: JournalEntry): string | null {
  if (entry.key.startsWith('radar:seen_'))        return `SCAN — contact detected at ${entry.text.match(/at ([A-J]\d+)/)?.[1] ?? ''}`;
  if (entry.key.startsWith('radar:landmark_'))    return `SCAN — ${entry.text.split(':')[1]?.split('—')[0]?.trim() ?? 'landmark confirmed'}`;
  if (entry.key.startsWith('radar:discovered_'))  return `SCAN — relay station detected`;
  if (entry.key.startsWith('radio:contact_'))     return `COMMS — incoming transmission`;
  if (entry.key.startsWith('radio:completed_'))   return `COMMS — session closed`;
  if (entry.key.startsWith('situation:'))         return `CRITICAL — field event recorded`;
  return null;
}

export function App() {
  const [screen, setScreen] = useState<GameScreen>('splash');
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [pendingMorning, setPendingMorning] = useState<PendingMorning | null>(null);
  const [saveExists, setSaveExists] = useState(() => hasSave());
  const [endJournal, setEndJournal] = useState<JournalEntry[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [notifVisible, setNotifVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSettings = () => {
    setSettingsOpen(true);
    EventBridge.emit('input:disable');
  };
  const closeSettings = () => {
    setSettingsOpen(false);
    EventBridge.emit('input:enable');
  };
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNotifs = useRef<string[]>([]);
  const prevJournalLen = useRef(0);

  const showNotification = (msg: string) => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotification(msg);
    setNotifVisible(true);
    notifTimer.current = setTimeout(() => setNotifVisible(false), 4200);
  };

  useEffect(() => {
    const unsub = StateManager.subscribe((state) => {
      setActiveTool(state.activeTool);
      const journal = state.journal;
      if (journal.length > prevJournalLen.current) {
        const newEntries = journal.slice(prevJournalLen.current);
        for (const entry of newEntries) {
          const msg = getNotificationText(entry);
          if (msg) pendingNotifs.current.push(msg);
        }
        prevJournalLen.current = journal.length;

        // Debounce: wait for burst to settle, then show highest-priority message
        if (notifDebounce.current) clearTimeout(notifDebounce.current);
        notifDebounce.current = setTimeout(() => {
          const msgs = pendingNotifs.current;
          pendingNotifs.current = [];
          if (msgs.length === 0) return;
          const best =
            msgs.find((m) => m.startsWith('CRITICAL')) ??
            msgs.find((m) => m.includes('contact detected')) ??
            msgs.find((m) => m.includes('confirmed')) ??
            msgs.find((m) => m.includes('relay station')) ??
            msgs[0];
          showNotification(best);
        }, 80);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (screen !== 'playing' && screen !== 'gameOver') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setSettingsOpen((v) => {
          if (v) { EventBridge.emit('input:enable');  return false; }
          else    { EventBridge.emit('input:disable'); return true;  }
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen]);

  useEffect(() => {
    const onDayStart = () => {
      const state = StateManager.getState();
      if (state.currentDay > 1) {
        // Filter Kael's morning messages if he was misdirected (dead)
        const kaelDead = state.journal.some((e) => e.key === 'radio:hostile_misdirected');
        const kaelMessages = kaelDead ? [] : getMorningMessagesForDay2(state.currentDay);
        const messages = [...getMorningMessagesForDay(state.currentDay), ...kaelMessages];
        if (messages.length > 0) {
          setPendingMorning({ day: state.currentDay, messages });
        }
      }
    };
    const onGameEnded = () => {
      setEndJournal([...StateManager.getState().journal]);
      setScreen('gameOver');
    };
    EventBridge.on('day:start', onDayStart);
    EventBridge.on('game:ended', onGameEnded);
    return () => {
      EventBridge.off('day:start', onDayStart);
      EventBridge.off('game:ended', onGameEnded);
    };
  }, []);

  const handleNewGame = () => {
    clearSave();
    StateManager.reset();
    EventBridge.emit('game:newGame');
    setSaveExists(false);
    setScreen('playing');
  };

  const handleContinue = () => {
    const save = loadSave();
    if (!save) return;
    StateManager.applySave(save);
    // Show morning messages for the loaded day if not yet acknowledged
    if (save.currentDay > 1) {
      const kaelDead = save.journal.some((e) => e.key === 'radio:hostile_misdirected');
      const kaelMessages = kaelDead ? [] : getMorningMessagesForDay2(save.currentDay);
      const messages = [...getMorningMessagesForDay(save.currentDay), ...kaelMessages].filter(
        (m) => !save.journal.some((e) => e.key === m.journalKey)
      );
      if (messages.length > 0) {
        setPendingMorning({ day: save.currentDay, messages });
      }
    }
    setScreen('playing');
  };

  if (screen === 'splash') {
    return <SplashScreen onDone={() => setScreen('menu')} />;
  }

  if (screen === 'menu') {
    return (
      <MainMenu
        onNewGame={handleNewGame}
        onContinue={saveExists ? handleContinue : undefined}
      />
    );
  }

  if (screen === 'playing') {
    return (
      <div style={{ position: 'relative', width: '960px', height: '540px', margin: '0 auto' }}>
        <PhaserGame />
        {activeTool === 'map' && <MapOverlay />}
        {activeTool === 'radar' && <div style={{ position: 'absolute', top: 0, left: 0, width: '960px', height: '540px', zIndex: 20, pointerEvents: 'none' }} />}
        {activeTool === 'radio' && <RadioPanel />}
        {activeTool === 'journal' && <JournalPanel />}
        {activeTool === 'manual' && <ManualPanel />}
        {pendingMorning && (
          <MorningMessages
            day={pendingMorning.day}
            messages={pendingMorning.messages}
            onDismiss={() => setPendingMorning(null)}
          />
        )}
        {notification && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 50,
            backgroundColor: 'rgba(0,0,0,0.82)',
            border: '1px solid #4a6a3a',
            padding: '6px 14px',
            fontFamily: 'monospace',
            fontSize: '11px',
            letterSpacing: '2px',
            color: '#8abf6a',
            pointerEvents: 'none',
            opacity: notifVisible ? 1 : 0,
            transition: 'opacity 0.8s ease',
          }}>
            ▌ {notification}
          </div>
        )}
        <DebugPanel />
        {settingsOpen && <SettingsPanel onClose={closeSettings} />}
      </div>
    );
  }

  if (screen === 'gameOver') {
    return (
      <div style={{ position: 'relative', width: '960px', height: '540px', margin: '0 auto' }}>
        <PhaserGame />
        <EndScreen journal={endJournal} onNewGame={handleNewGame} />
        <DebugPanel />
        {settingsOpen && <SettingsPanel onClose={closeSettings} />}
      </div>
    );
  }

  return null;
}
