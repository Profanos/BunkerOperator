/** Main scene: desk surface with tool areas, click to activate/deactivate */

import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, DAY_DURATION_SECONDS } from '../../shared/constants.ts';
import { EventBridge } from '../../shared/EventBridge.ts';
import { StateManager } from '../../shared/StateManager.ts';
import { DebugManager } from '../systems/DebugManager.ts';
import { SituationManager, TEST_ENTITIES } from '../systems/SituationManager.ts';
import { RadarSystem } from '../systems/RadarSystem.ts';
import { CoverageSystem } from '../systems/CoverageSystem.ts';
import type { ToolId } from '../../shared/types.ts';

interface ToolArea {
  id: ToolId;
  label: string;
  rect: Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
}

/** Desk layout — 5 tool areas arranged on the desk surface */
const TOOL_LAYOUT: Array<{ id: ToolId; label: string; x: number; y: number; w: number; h: number }> = [
  // Top row
  { id: 'map',     label: 'MAP',     x: 40,  y: 30,  w: 440, h: 230 },
  { id: 'radar',   label: 'RADAR',   x: 500, y: 30,  w: 420, h: 230 },
  // Bottom row
  { id: 'radio',   label: 'RADIO',   x: 40,  y: 290, w: 280, h: 220 },
  { id: 'journal', label: 'JOURNAL', x: 340, y: 290, w: 280, h: 220 },
  { id: 'manual',  label: 'MANUAL',  x: 640, y: 290, w: 280, h: 220 },
];

const COLOR_DESK = 0x2a2a3e;
const COLOR_TOOL_BG = 0x1a1a2e;
const COLOR_BORDER_INACTIVE = 0x3a3a5e;
const COLOR_TEXT_INACTIVE = 0x6a6a8e;

export class BunkerScene extends Phaser.Scene {
  private toolAreas: ToolArea[] = [];
  private debugManager!: DebugManager;
  private situationManager!: SituationManager;
  private radarSystem!: RadarSystem;
  private coverageSystem!: CoverageSystem;
  private timerElapsed = 0;
  private dayActive = true;
  private handleKeyDown!: (e: KeyboardEvent) => void;
  private unsubscribeState!: () => void;
  private lastActiveTool: ToolId | null = null;
  private signalLight!: Phaser.GameObjects.Arc;
  private signalBlinkTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super({ key: 'BunkerScene' });
  }

  create(): void {
    // Desk background
    this.add.rectangle(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2,
      CANVAS_WIDTH, CANVAS_HEIGHT,
      COLOR_DESK
    );

    // Create tool areas
    for (const layout of TOOL_LAYOUT) {
      const area = this.createToolArea(layout);
      this.toolAreas.push(area);
    }

    // Signal indicator light on the radio tool area (lower-left panel, x:40 y:290 w:280 h:220)
    // Position it in the top-right corner of the radio panel
    this.signalLight = this.add.circle(298, 298, 6, 0x1a1a1a)
      .setStrokeStyle(1, 0x3a3a5e)
      .setDepth(10);

    // Game systems
    this.debugManager = new DebugManager(this);
    this.situationManager = new SituationManager();
    this.situationManager.init(TEST_ENTITIES);
    this.radarSystem = new RadarSystem(this);
    this.coverageSystem = new CoverageSystem();

    // React to state changes — this is the single source of truth for visuals
    this.unsubscribeState = StateManager.subscribe((state) => {
      if (state.activeTool !== this.lastActiveTool) {
        this.lastActiveTool = state.activeTool;
        this.syncVisuals(state.activeTool);
      }
      this.syncSignalLight(state.signalActive, state.activeTool);
    });

    // Escape key deactivates active tool
    this.handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && StateManager.getState().activeTool) {
        StateManager.setActiveTool(null);
        EventBridge.emit('tool:deactivated');
      }
    };
    window.addEventListener('keydown', this.handleKeyDown);

    // Listen for day start
    EventBridge.on('day:start', this.onDayStart);

    // Initialize timer
    this.timerElapsed = 0;
    StateManager.setTimeRemaining(DAY_DURATION_SECONDS);

    // Starting intel — tells the player relay infrastructure exists without giving frequencies.
    // Frequencies must be discovered by scanning relay positions with the radar.
    StateManager.addJournalEntry({
      key: 'intel:day1_relays',
      timestamp: Date.now(),
      day: 1,
      timeStr: '08:00',
      text: 'Pre-mission notes: Two relay stations confirmed operational in the territory — one in the northern Industrial District, one in the East Corridor. Frequencies require field verification via scanner.',
    });
  }

  /** All visual updates happen here in response to state changes */
  private syncVisuals(activeTool: ToolId | null): void {
    const deskVisible = activeTool === null;
    for (const area of this.toolAreas) {
      area.rect.setVisible(deskVisible);
      area.border.setVisible(deskVisible);
      area.text.setVisible(deskVisible);
    }
    // Signal light only visible on the desk view
    this.signalLight.setVisible(deskVisible);

    if (activeTool === 'radar') {
      this.radarSystem.show();
    } else {
      this.radarSystem.hide();
    }
  }

  private lastSignalActive = false;

  private syncSignalLight(signalActive: boolean, activeTool: ToolId | null): void {
    if (signalActive === this.lastSignalActive) return;
    this.lastSignalActive = signalActive;

    if (this.signalBlinkTween) {
      this.signalBlinkTween.stop();
      this.signalBlinkTween = null;
    }

    if (signalActive) {
      // Blink amber when signal is active
      this.signalLight.setFillStyle(0xf59e0b);
      this.signalBlinkTween = this.tweens.add({
        targets: this.signalLight,
        alpha: { from: 1, to: 0.2 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      // Dark when no signal
      this.signalLight.setFillStyle(0x1a1a1a).setAlpha(1);
    }

    void activeTool; // signal light visibility is handled in syncVisuals
  }

  private createToolArea(layout: { id: ToolId; label: string; x: number; y: number; w: number; h: number }): ToolArea {
    const centerX = layout.x + layout.w / 2;
    const centerY = layout.y + layout.h / 2;

    const rect = this.add.rectangle(centerX, centerY, layout.w, layout.h, COLOR_TOOL_BG)
      .setInteractive({ useHandCursor: true });

    const border = this.add.rectangle(centerX, centerY, layout.w + 4, layout.h + 4)
      .setStrokeStyle(2, COLOR_BORDER_INACTIVE)
      .setFillStyle();

    const text = this.add.text(centerX, centerY, layout.label, {
      fontSize: '16px',
      color: `#${COLOR_TEXT_INACTIVE.toString(16).padStart(6, '0')}`,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Click only changes state — syncVisuals handles the rest
    rect.on('pointerdown', () => {
      const currentActive = StateManager.getState().activeTool;
      if (currentActive === layout.id) {
        StateManager.setActiveTool(null);
        EventBridge.emit('tool:deactivated');
      } else {
        StateManager.setActiveTool(layout.id);
        EventBridge.emit('tool:activated', layout.id);
      }
    });

    return { id: layout.id, label: layout.label, rect, border, text };
  }

  private onDayStart = (): void => {
    this.timerElapsed = 0;
    this.dayActive = true;
    StateManager.setTimeRemaining(DAY_DURATION_SECONDS);
  };

  update(_time: number, delta: number): void {
    this.debugManager.update();
    this.radarSystem.update();

    if (!this.dayActive) return;

    this.situationManager.update(delta / 1000);
    this.coverageSystem.update();

    this.timerElapsed += delta / 1000;
    const remaining = Math.max(0, DAY_DURATION_SECONDS - this.timerElapsed);
    StateManager.setTimeRemaining(remaining);

    if (remaining <= 0) {
      this.dayActive = false;
      EventBridge.emit('day:ended');
    }
  }

  shutdown(): void {
    this.unsubscribeState();
    EventBridge.off('day:start', this.onDayStart);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.debugManager.destroy();
  }
}
