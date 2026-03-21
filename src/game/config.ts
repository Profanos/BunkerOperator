/** Phaser game configuration */

import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../shared/constants.ts';
import { BunkerScene } from './scenes/BunkerScene.ts';

export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  parent: 'phaser-container',
  backgroundColor: '#1a1a2e',
  scene: [BunkerScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Pixel art rendering — no antialiasing
  pixelArt: true,
};
