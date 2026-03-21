/** Day timer overlay — always visible during gameplay, changes color as time runs out */

import { useEffect, useState } from 'react';
import { StateManager } from '../shared/StateManager.ts';
import { TIMER_AMBER_THRESHOLD, TIMER_RED_THRESHOLD, formatGameTime } from '../shared/constants.ts';

export function TimerDisplay() {
  const [timeRemaining, setTimeRemaining] = useState(StateManager.getState().timeRemaining);
  const [currentDay, setCurrentDay] = useState(StateManager.getState().currentDay);

  useEffect(() => {
    const unsubscribe = StateManager.subscribe((state) => {
      setTimeRemaining(state.timeRemaining);
      setCurrentDay(state.currentDay);
    });
    return unsubscribe;
  }, []);

  let color = '#4ade80'; // green
  if (timeRemaining <= TIMER_RED_THRESHOLD) {
    color = '#ef4444';
  } else if (timeRemaining <= TIMER_AMBER_THRESHOLD) {
    color = '#f59e0b';
  }

  return (
    <div style={{
      position: 'absolute',
      top: '8px',
      right: '8px',
      color,
      fontFamily: 'monospace',
      fontSize: '24px',
      fontWeight: 'bold',
      textShadow: '0 0 8px rgba(0,0,0,0.8)',
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      DAY {currentDay} — {formatGameTime(timeRemaining)}
    </div>
  );
}
