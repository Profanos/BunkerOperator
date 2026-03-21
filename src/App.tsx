/** Root component — manages game screens: menu → playing → game over */

import { useState, useEffect } from 'react';
import { MainMenu } from './ui/MainMenu.tsx';
import { PhaserGame } from './game/PhaserGame.tsx';
import { TimerDisplay } from './ui/TimerDisplay.tsx';
import { MapOverlay } from './ui/MapOverlay.tsx';
import { JournalPanel } from './ui/JournalPanel.tsx';
import { ManualPanel } from './ui/ManualPanel.tsx';
import { RadioPanel } from './ui/RadioPanel.tsx';
import { StateManager } from './shared/StateManager.ts';
import type { GameScreen, ToolId } from './shared/types.ts';

export function App() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);

  useEffect(() => {
    const unsub = StateManager.subscribe((state) => {
      setActiveTool(state.activeTool);
    });
    return unsub;
  }, []);

  const handleNewGame = () => {
    StateManager.reset();
    setScreen('playing');
  };

  if (screen === 'menu') {
    return <MainMenu onNewGame={handleNewGame} />;
  }

  if (screen === 'playing') {
    return (
      <div style={{ position: 'relative', width: '960px', height: '540px', margin: '0 auto' }}>
        <PhaserGame />
        <TimerDisplay />
        {activeTool === 'map' && <MapOverlay />}
        {activeTool === 'radar' && <div style={{ position: 'absolute', top: 0, left: 0, width: '960px', height: '540px', zIndex: 20, pointerEvents: 'none' }} />}
        {activeTool === 'radio' && <RadioPanel />}
        {activeTool === 'journal' && <JournalPanel />}
        {activeTool === 'manual' && <ManualPanel />}
      </div>
    );
  }

  return null;
}
