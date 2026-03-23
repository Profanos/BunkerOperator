/** Debug manager — FPS counter and event capture for the debug panel — toggled with backtick key */

import Phaser from 'phaser';
import { EventBridge } from '../../shared/EventBridge.ts';
import { StateManager } from '../../shared/StateManager.ts';

export class DebugManager {
  private scene: Phaser.Scene;
  private visible = false;
  private fpsText: Phaser.GameObjects.Text;
  private handleKeyDown: (e: KeyboardEvent) => void;
  private anyCallback: (...args: unknown[]) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.fpsText = scene.add
      .text(8, 4, '', { fontSize: '11px', color: '#4aff4a', fontFamily: 'monospace' })
      .setDepth(1001)
      .setVisible(false);

    // Use onAny to capture all events — no monkey-patching, no restore needed
    this.anyCallback = (event: unknown) => {
      StateManager.addDebugLog(String(event));
    };
    EventBridge.onAny(this.anyCallback);

    this.handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Backquote') this.toggle();
    };
    window.addEventListener('keydown', this.handleKeyDown);
  }

  destroy(): void {
    EventBridge.offAny(this.anyCallback);
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private toggle(): void {
    this.visible = !this.visible;
    this.fpsText.setVisible(this.visible);
    StateManager.setDebugMode(this.visible);
  }

  update(): void {
    if (!this.visible) return;
    this.fpsText.setText(`FPS: ${Math.round(this.scene.game.loop.actualFps)}`);
  }
}
