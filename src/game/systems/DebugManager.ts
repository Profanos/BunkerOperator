/** Debug overlay — FPS counter, event log, station coverage — toggled with backtick key */

import Phaser from 'phaser';
import { EventBridge } from '../../shared/EventBridge.ts';
import { StateManager } from '../../shared/StateManager.ts';
import { RADIO_STATIONS, gridDistance } from '../../shared/territory.ts';

const MAX_LOG_LINES = 10;
const PANEL_WIDTH = 300;
const PANEL_HEIGHT = 290;

export class DebugManager {
  private scene: Phaser.Scene;
  private visible = false;
  private fpsText: Phaser.GameObjects.Text;
  private logText: Phaser.GameObjects.Text;
  private coverageText: Phaser.GameObjects.Text;
  private background: Phaser.GameObjects.Rectangle;
  private divider: Phaser.GameObjects.Line;
  private logLines: string[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.background = scene.add.rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x000000, 0.75)
      .setOrigin(0, 0)
      .setDepth(1000)
      .setVisible(false);

    this.fpsText = scene.add.text(8, 4, 'FPS: --', {
      fontSize: '12px',
      color: '#00ff00',
      fontFamily: 'monospace',
    }).setDepth(1001).setVisible(false);

    this.logText = scene.add.text(8, 22, '', {
      fontSize: '10px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
      wordWrap: { width: PANEL_WIDTH - 16 },
    }).setDepth(1001).setVisible(false);

    // Divider between event log and coverage panel
    this.divider = scene.add.line(0, 0, 8, 172, PANEL_WIDTH - 8, 172, 0x333333)
      .setOrigin(0, 0).setDepth(1001).setVisible(false);

    this.coverageText = scene.add.text(8, 178, '', {
      fontSize: '10px',
      color: '#88aaff',
      fontFamily: 'monospace',
      wordWrap: { width: PANEL_WIDTH - 16 },
    }).setDepth(1001).setVisible(false);

    // Intercept EventBridge.emit to log all events
    const originalEmit = EventBridge.emit.bind(EventBridge);
    EventBridge.emit = (event: string, ...args: unknown[]) => {
      this.addLog(event);
      originalEmit(event, ...args);
    };

    this.handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Backquote') this.toggle();
    };
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown: (e: KeyboardEvent) => void;

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private toggle(): void {
    this.visible = !this.visible;
    this.background.setVisible(this.visible);
    this.fpsText.setVisible(this.visible);
    this.logText.setVisible(this.visible);
    this.divider.setVisible(this.visible);
    this.coverageText.setVisible(this.visible);
    // Notify React so MapOverlay can show entity dots
    StateManager.setDebugMode(this.visible);
  }

  private addLog(message: string): void {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    this.logLines.unshift(`[${time}] ${message}`);
    if (this.logLines.length > MAX_LOG_LINES) this.logLines.pop();
  }

  update(): void {
    if (!this.visible) return;

    this.fpsText.setText(`FPS: ${Math.round(this.scene.game.loop.actualFps)}`);
    this.logText.setText(this.logLines.join('\n'));

    // Station coverage — computed fresh each frame so it reflects live entity positions
    const state = StateManager.getState();
    const entities = state.entities.filter((e) => e.alive);
    const lines: string[] = ['COVERAGE:'];
    for (const station of RADIO_STATIONS) {
      const inRange = entities.filter(
        (e) => gridDistance(e.position, station.position) <= station.coverageRadius
      );
      const status = inRange.length > 0
        ? inRange.map((e) => e.type === 'survivor' ? '● survivor' : '● zombie').join(' ')
        : '○ clear';
      lines.push(`${station.frequency} MHz  ${status}`);
    }
    this.coverageText.setText(lines.join('\n'));
  }
}
