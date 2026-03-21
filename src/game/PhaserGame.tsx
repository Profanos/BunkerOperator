/** React component that mounts and unmounts the Phaser game instance */

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { phaserConfig } from './config.ts';

export function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;
    gameRef.current = new Phaser.Game(phaserConfig);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div id="phaser-container" />;
}
