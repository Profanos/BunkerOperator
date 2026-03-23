/** HookDev Games splash — shown on launch, fades out after 3s or on click */

import { useState, useEffect } from 'react';

interface Props {
  onDone: () => void;
}

const HOLD_MS = 3000;
const FADE_MS = 400;

export function SplashScreen({ onDone }: Props) {
  const [opacity, setOpacity]     = useState(0);
  const [barWidth, setBarWidth]   = useState(0);
  const [fading, setFading]       = useState(false);

  useEffect(() => {
    // Fade in logo
    const fadeIn = setTimeout(() => setOpacity(1), 50);

    // Start bar fill slightly after fade-in settles
    const barStart = setTimeout(() => setBarWidth(100), 200);

    // Auto-dismiss
    const auto = setTimeout(() => dismiss(), HOLD_MS);

    return () => {
      clearTimeout(fadeIn);
      clearTimeout(barStart);
      clearTimeout(auto);
    };
  }, []);

  const dismiss = () => {
    if (fading) return;
    setFading(true);
    setOpacity(0);
    setTimeout(onDone, FADE_MS);
  };

  // Bar fill duration = hold time minus the 200ms start delay, minus fade-out
  const fillDuration = (HOLD_MS - 200 - FADE_MS) / 1000;

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'relative',
        width: '960px',
        height: '540px',
        margin: '0 auto',
        backgroundColor: '#000000',
        cursor: 'pointer',
        opacity,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <img
        src="/assets/sprites/splash_hookdev.png"
        alt="HookDev Games"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />

      {/* White fill overlay on the bar below "GAMES" */}
      {/* Position calibrated visually — adjust top/left/width to match your image */}
      <div style={{
        position: 'absolute',
        top: '377px',
        left: '380px',
        width: '199px',
        height: '1px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${barWidth}%`,
          backgroundColor: '#ffffff',
          transition: `width ${fillDuration}s linear`,
        }} />
      </div>
    </div>
  );
}
