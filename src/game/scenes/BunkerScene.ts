/** Main scene: desk surface with tool areas, click to activate/deactivate */

import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, DAY_DURATION_SECONDS, TIMER_AMBER_THRESHOLD, TIMER_RED_THRESHOLD, formatGameTime, formatCountdown } from '../../shared/constants.ts';
import { EventBridge } from '../../shared/EventBridge.ts';
import { StateManager } from '../../shared/StateManager.ts';
import { saveGame } from '../../shared/SaveSystem.ts';
import { DebugManager } from '../systems/DebugManager.ts';
import { SituationManager } from '../systems/SituationManager.ts';
import { SITUATION_1 } from '../../data/situations/situation1.ts';
import { SITUATION_2 } from '../../data/situations/situation2.ts';
import { RadarSystem } from '../systems/RadarSystem.ts';
import { CoverageSystem } from '../systems/CoverageSystem.ts';
import { AudioManager } from '../systems/AudioManager.ts';
import { RADIO_STATIONS } from '../../shared/territory.ts';
import type { ToolId } from '../../shared/types.ts';

interface ToolArea {
  id: ToolId;
  label: string;
  highlight: Phaser.GameObjects.Rectangle;
}

/** ─────────────────────────────────────────────────────────────────────────
 *  DESK CONFIG — single place to calibrate ALL overlay positions.
 *
 *  When the desk image is updated, measure the new coordinates and update
 *  only this object. Nothing else in the file needs to change.
 *
 *  How to measure:
 *    Open the PNG in a pixel editor or browser devtools at 960×540 (1:1).
 *    All values are in canvas pixels (not screen/CSS pixels).
 *  ─────────────────────────────────────────────────────────────────────── */
const DESK_CONFIG = {
  /** Click zones for each tool panel — top-left origin, w×h in canvas px */
  tools: [
    { id: 'map'     as ToolId, label: 'MAP',     x: 8,   y: 8,   w: 427, h: 254 },
    { id: 'radar'   as ToolId, label: 'RADAR',   x: 478, y: 13,  w: 464, h: 282 },
    { id: 'radio'   as ToolId, label: 'RADIO',   x: 14,  y: 310, w: 300, h: 210 },
    { id: 'journal' as ToolId, label: 'JOURNAL', x: 341, y: 315, w: 203, h: 204 },
    { id: 'manual'  as ToolId, label: 'MANUAL',  x: 567, y: 312, w: 375, h: 211 },
  ],

  /** Signal + Station — two rows matching art labels */
  signalText: { x: 28, y: 390, stationY: 417 },

  /** Day/Time counter — sprite center, then text offsets within the sprite.
   *  The daytime.png sprite is 200×56; text sits at image-local x:51 (day)
   *  and x:149 (time), both at image-local y:33. */
  daytime: {
    spriteX: 478,
    spriteY: 517,
    /** Canvas x of the left edge of the sprite  = spriteX - 100 */
    dayOffsetX:  51,   // image-local x of DAY cell center
    timeOffsetX: 149,  // image-local x of TIME cell center
    textOffsetY: 33,   // image-local y of both text cells
  },

  /** FREQUENCY MHz display window — 6 digit cells + decimal dot.
   *  cellX: canvas x of each cell's center (left-to-right: [int3 int2 int1 . dec1 dec2])
   *  dotX:  canvas x of the decimal point character
   *  y:     canvas y (shared by all cells and dot) */
  frequency: {
    //  6 digit cells: [ d1  d2  d3  d4  d5  d6 ]  e.g. "0 9 7 . 3 0"
    cellX: [32, 54, 76, 102, 124, 146],
    dotX:  89,
    y:     361,   // vertical center of the FREQUENCY window in the radio panel
  },

} as const;


export class BunkerScene extends Phaser.Scene {
  private toolAreas: ToolArea[] = [];
  private debugManager!: DebugManager;
  private situationManager!: SituationManager;
  private radarSystem!: RadarSystem;
  private coverageSystem!: CoverageSystem;
  private timerElapsed = 0;
  private dayActive = true;
  private transitionInProgress = false;
  private nightOverlay: Phaser.GameObjects.Rectangle | null = null;
  private nightText: Phaser.GameObjects.Text | null = null;
  private handleKeyDown!: (e: KeyboardEvent) => void;
  private unsubscribeState!: () => void;
  private lastActiveTool: ToolId | null = null;
  private signalText!: Phaser.GameObjects.Text;
  private stationText!: Phaser.GameObjects.Text;
  private signalBlinkTween: Phaser.Tweens.Tween | null = null;
  private freqCells: Phaser.GameObjects.Text[] = [];
  private freqDotObj!: Phaser.GameObjects.Text;
  private daytimeSprite!: Phaser.GameObjects.Image;
  private dayText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private scannerPanel!: Phaser.GameObjects.Image;
  private deskImage!: Phaser.GameObjects.Image;
  private audioManager!: AudioManager;

  constructor() {
    super({ key: 'BunkerScene' });
  }

  preload(): void {
    this.load.image('desk_surface',   '/assets/sprites/desk_surface.png');
    this.load.image('scanner_panel',  '/assets/sprites/panel_scanner.png');
    this.load.image('daytime',        '/assets/sprites/daytime.png');
  }

  create(): void {
    // Desk background — hidden when scanner is active
    this.deskImage = this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'desk_surface');

    // Scanner panel — full-screen, shown only when radar tool is active
    this.scannerPanel = this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'scanner_panel')
      .setDepth(3)
      .setVisible(false);

    // Create tool areas
    for (const layout of DESK_CONFIG.tools) {
      const area = this.createToolArea(layout);
      this.toolAreas.push(area);
    }

    // Signal + Station — two rows matching SIGNAL / STATION art labels
    const st = DESK_CONFIG.signalText;
    const sigStyle = { fontSize: '8px', fontFamily: 'monospace' };
    this.signalText  = this.add.text(st.x, st.y,        'SEARCHING...', { ...sigStyle, color: '#4a6a4a' }).setDepth(10);
    this.stationText = this.add.text(st.x, st.stationY,  '',            { ...sigStyle, color: '#2a3a2a' }).setDepth(10);

    // Day/time counter
    const dt = DESK_CONFIG.daytime;
    this.daytimeSprite = this.add.image(dt.spriteX, dt.spriteY, 'daytime').setDepth(5);
    const dtLeft = dt.spriteX - 100;
    const dtTop  = dt.spriteY - 28;
    const cellStyle2 = { fontSize: '14px', color: '#c8a040', fontFamily: 'monospace', fontStyle: 'bold' };
    this.dayText  = this.add.text(dtLeft + dt.dayOffsetX,  dtTop + dt.textOffsetY, '01',    cellStyle2).setOrigin(0.5).setDepth(6);
    this.timeText = this.add.text(dtLeft + dt.timeOffsetX, dtTop + dt.textOffsetY, '08:00', cellStyle2).setOrigin(0.5).setDepth(6);

    // Live frequency display
    const fq = DESK_CONFIG.frequency;
    const cellStyle = { fontSize: '14px', color: '#c8a040', fontFamily: 'monospace', fontStyle: 'bold' };
    for (let i = 0; i < 6; i++) {
      this.freqCells.push(
        this.add.text(fq.cellX[i], fq.y, '', cellStyle).setOrigin(0.5).setDepth(11)
      );
    }
    this.freqDotObj = this.add.text(fq.dotX, fq.y, '.', cellStyle).setOrigin(0.5).setDepth(11);
    this.updateFreqDisplay(88.0);

    // CRT scanline overlay — drawn once, sits above all desk content
    const scanlines = this.add.graphics().setDepth(90).setAlpha(0.06);
    for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
      scanlines.lineStyle(1, 0x000000, 1);
      scanlines.beginPath();
      scanlines.moveTo(0, y);
      scanlines.lineTo(CANVAS_WIDTH, y);
      scanlines.strokePath();
    }

    // Vignette — gradient strips from each edge inward, center untouched
    const vignette = this.add.graphics().setDepth(89);
    const steps = 24;
    const stripW = 6;
    const maxAlpha = 0.35;
    for (let i = 0; i < steps; i++) {
      const alpha = ((steps - i) / steps) * maxAlpha;
      vignette.fillStyle(0x000000, alpha);
      // Top / bottom strips
      vignette.fillRect(0, i * stripW, CANVAS_WIDTH, stripW);
      vignette.fillRect(0, CANVAS_HEIGHT - (i + 1) * stripW, CANVAS_WIDTH, stripW);
      // Left / right strips
      vignette.fillRect(i * stripW, 0, stripW, CANVAS_HEIGHT);
      vignette.fillRect(CANVAS_WIDTH - (i + 1) * stripW, 0, stripW, CANVAS_HEIGHT);
    }

    // Game systems
    this.debugManager = new DebugManager(this);
    this.situationManager = new SituationManager();

    // Combine entities from all active situations
    const allEntities = [...SITUATION_1.entities, ...SITUATION_2.entities];

    // If entities already exist in state (loaded from save), restore paths without resetting positions
    const savedEntities = StateManager.getState().entities;
    if (savedEntities.length > 0) {
      this.situationManager.restore(allEntities, savedEntities);
    } else {
      this.situationManager.init(allEntities);
    }

    this.radarSystem = new RadarSystem(this);
    this.coverageSystem = new CoverageSystem();
    this.audioManager = new AudioManager();

    // React to state changes — this is the single source of truth for visuals
    this.unsubscribeState = StateManager.subscribe((state) => {
      if (state.activeTool !== this.lastActiveTool) {
        this.lastActiveTool = state.activeTool;
        this.syncVisuals(state.activeTool);
      }
      this.syncSignalLight(state.signalActive, state.activeTool);
      this.updateFreqDisplay(state.radioFrequency);
      this.updateDayTimeDisplay(state.currentDay, state.timeRemaining);
    });

    // Escape key deactivates active tool
    this.handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && StateManager.getState().activeTool) {
        StateManager.setActiveTool(null);
        EventBridge.emit('tool:deactivated');
      }
    };
    window.addEventListener('keydown', this.handleKeyDown);

    // Listen for day start and debug actions
    EventBridge.on('game:newGame', this.onNewGame);
    EventBridge.on('day:start', this.onDayStart);
    EventBridge.on('debug:skipDay', this.onDebugSkipDay);
    EventBridge.on('debug:reset', this.onDebugReset);
    EventBridge.on('input:disable', this.onInputDisable);
    EventBridge.on('input:enable',  this.onInputEnable);

    // Phaser calls destroy but not shutdown when game.destroy() is used (e.g. React StrictMode).
    // Ensure cleanup runs in both cases to prevent stale listeners on remount.
    this.events.once('destroy', () => this.shutdown());

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
    const radarActive = activeTool === 'radar';
    const deskVisible = activeTool === null;

    // Swap desk ↔ scanner panel background
    this.deskImage.setVisible(!radarActive);
    this.scannerPanel.setVisible(radarActive);

    // Desk overlays only visible when no tool is open
    for (const area of this.toolAreas) area.highlight.setVisible(deskVisible);
    this.signalText.setVisible(deskVisible);
    this.stationText.setVisible(deskVisible);
    for (const cell of this.freqCells) cell.setVisible(deskVisible);
    this.freqDotObj.setVisible(deskVisible);
    this.daytimeSprite.setVisible(deskVisible);
    this.dayText.setVisible(deskVisible);
    this.timeText.setVisible(deskVisible);

    if (radarActive) {
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
      const state = StateManager.getState();
      const station = RADIO_STATIONS.find((s) => s.id === state.activeStationId);
      const stationName = station?.name ?? state.activeStationId ?? '';

      this.signalText.setText('LOCKED').setColor('#f59e0b').setAlpha(1);
      this.stationText.setText(stationName).setColor('#9ad4e8').setAlpha(1);

      // Blink the signal text
      this.signalBlinkTween = this.tweens.add({
        targets: this.signalText,
        alpha: { from: 1, to: 0.3 },
        duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // Frequency display turns green on signal lock
      for (const cell of this.freqCells) cell.setColor('#4aff4a');
      if (this.freqDotObj) this.freqDotObj.setColor('#4aff4a');
    } else {
      this.signalText.setText('SEARCHING...').setColor('#4a6a4a').setAlpha(1);
      this.stationText.setText('').setColor('#2a3a2a').setAlpha(1);

      // Frequency display back to amber
      for (const cell of this.freqCells) cell.setColor('#c8a040');
      if (this.freqDotObj) this.freqDotObj.setColor('#c8a040');
    }

    void activeTool; // text visibility handled in syncVisuals
  }

  private updateFreqDisplay(freq: number): void {
    const [intPart, decPart] = freq.toFixed(1).split('.');
    // Right-align integer into cells 0-2
    const intDigits = intPart.padStart(3, ' ').split('');
    for (let i = 0; i < 3; i++) this.freqCells[i].setText(intDigits[i].trim());
    // Left-align decimal into cells 3-5
    const decDigits = (decPart ?? '0').padEnd(3, ' ').split('');
    for (let i = 0; i < 3; i++) this.freqCells[i + 3].setText(decDigits[i].trim());
  }

  private updateDayTimeDisplay(day: number, timeRemaining: number): void {
    this.dayText.setText(day.toString().padStart(2, '0'));
    this.timeText.setText(formatCountdown(timeRemaining));
    // Color shifts with timer urgency
    const color = timeRemaining <= TIMER_RED_THRESHOLD
      ? '#ef4444'
      : timeRemaining <= TIMER_AMBER_THRESHOLD
        ? '#f59e0b'
        : '#c8a040';
    this.dayText.setColor(color);
    this.timeText.setColor(color);
  }

  private createToolArea(layout: { id: ToolId; label: string; x: number; y: number; w: number; h: number }): ToolArea {
    const centerX = layout.x + layout.w / 2;
    const centerY = layout.y + layout.h / 2;

    // Invisible hit zone — artwork lives in desk_surface, this only handles interaction
    const highlight = this.add.rectangle(centerX, centerY, layout.w, layout.h)
      .setFillStyle(0x4aff4a, 0)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    highlight.on('pointerover', () => highlight.setFillStyle(0x4aff4a, 0.07));
    highlight.on('pointerout',  () => highlight.setFillStyle(0x4aff4a, 0));

    highlight.on('pointerdown', () => {
      const currentActive = StateManager.getState().activeTool;
      if (currentActive === layout.id) {
        StateManager.setActiveTool(null);
        EventBridge.emit('tool:deactivated');
      } else {
        StateManager.setActiveTool(layout.id);
        EventBridge.emit('tool:activated', layout.id);
      }
    });

    return { id: layout.id, label: layout.label, highlight };
  }

  private onDayStart = (): void => {
    this.timerElapsed = 0;
    this.dayActive = true;
    StateManager.setTimeRemaining(DAY_DURATION_SECONDS);
    // Auto-save at the start of each new day so Continue resumes here
    saveGame(StateManager.getState());
  };

  private onNewGame = (): void => {
    this.tweens.killAll();
    this.nightOverlay?.destroy();
    this.nightOverlay = null;
    this.nightText?.destroy();
    this.nightText = null;
    this.transitionInProgress = false;
    this.timerElapsed = 0;
    this.dayActive = true;
    this.situationManager.init([...SITUATION_1.entities, ...SITUATION_2.entities]);
    if (StateManager.getState().activeTool) EventBridge.emit('tool:deactivated');
  };

  private onDebugSkipDay = (): void => {
    if (this.transitionInProgress) return;
    this.dayActive = false;
    this.startNightTransition();
  };

  private onInputDisable = (): void => { this.input.enabled = false; };
  private onInputEnable  = (): void => { this.input.enabled = true;  };

  private onDebugReset = (): void => {
    // Cancel any running transition
    this.tweens.killAll();
    this.nightOverlay?.destroy();
    this.nightOverlay = null;
    this.nightText?.destroy();
    this.nightText = null;
    this.transitionInProgress = false;

    StateManager.reset();
    this.situationManager.init([...SITUATION_1.entities, ...SITUATION_2.entities]);

    if (StateManager.getState().activeTool) {
      EventBridge.emit('tool:deactivated');
    }

    this.timerElapsed = 0;
    this.dayActive = true;
  };

  update(_time: number, delta: number): void {
    this.debugManager.update();
    this.radarSystem.update();

    if (!this.dayActive || this.transitionInProgress) return;

    this.situationManager.update(delta / 1000);
    this.coverageSystem.update();

    this.timerElapsed += delta / 1000;
    const remaining = Math.max(0, DAY_DURATION_SECONDS - this.timerElapsed);
    StateManager.setTimeRemaining(remaining);

    if (remaining <= 0) {
      this.dayActive = false;
      EventBridge.emit('day:ended');
      this.startNightTransition();
    }
  }

  private startNightTransition(): void {
    this.transitionInProgress = true;

    // Close any open tool so React overlays don't sit on the black screen
    if (StateManager.getState().activeTool) {
      StateManager.setActiveTool(null);
      EventBridge.emit('tool:deactivated');
    }

    this.nightOverlay = this.add
      .rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000)
      .setAlpha(0)
      .setDepth(50);

    this.tweens.add({
      targets: this.nightOverlay,
      alpha: 1,
      duration: 1000,
      ease: 'Linear',
      onComplete: () => this.onFadedToBlack(),
    });
  }

  private onFadedToBlack(): void {
    this.situationManager.advanceNight();
    const newDay = StateManager.getState().currentDay + 1;
    const isLastDay = newDay > Math.max(SITUATION_1.durationDays, SITUATION_2.durationDays);

    if (!isLastDay) {
      StateManager.setCurrentDay(newDay);
    }

    const nightMsg = isLastDay
      ? '— NIGHT —\nThe operation concludes at dawn'
      : `— NIGHT —\nDay ${newDay} begins at dawn`;

    this.nightText = this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, nightMsg, {
        fontSize: '20px',
        color: '#6a9fb5',
        fontFamily: 'monospace',
        align: 'center',
        lineSpacing: 12,
      })
      .setOrigin(0.5)
      .setDepth(51)
      .setAlpha(0);

    this.tweens.add({ targets: this.nightText, alpha: 1, duration: 500, ease: 'Linear' });

    this.time.delayedCall(2500, () => {
      if (isLastDay) {
        this.endOperation();
      } else {
        this.fadeInNewDay();
      }
    });
  }

  private fadeInNewDay(): void {
    this.tweens.add({ targets: this.nightText, alpha: 0, duration: 500, ease: 'Linear' });
    this.tweens.add({
      targets: this.nightOverlay,
      alpha: 0,
      duration: 1000,
      ease: 'Linear',
      onComplete: () => {
        this.nightOverlay?.destroy();
        this.nightOverlay = null;
        this.nightText?.destroy();
        this.nightText = null;
        this.transitionInProgress = false;
        EventBridge.emit('day:start');
      },
    });
  }

  /** Called after the final night — fades out and hands off to React ending screen */
  private endOperation(): void {
    this.tweens.add({ targets: this.nightText, alpha: 0, duration: 500, ease: 'Linear' });
    this.tweens.add({
      targets: this.nightOverlay,
      alpha: 0,
      duration: 1000,
      ease: 'Linear',
      onComplete: () => {
        this.nightOverlay?.destroy();
        this.nightOverlay = null;
        this.nightText?.destroy();
        this.nightText = null;
        this.transitionInProgress = false;
        EventBridge.emit('game:ended');
      },
    });
  }

  shutdown(): void {
    this.unsubscribeState();
    EventBridge.off('game:newGame', this.onNewGame);
    EventBridge.off('day:start', this.onDayStart);
    EventBridge.off('debug:skipDay', this.onDebugSkipDay);
    EventBridge.off('debug:reset', this.onDebugReset);
    EventBridge.off('input:disable', this.onInputDisable);
    EventBridge.off('input:enable',  this.onInputEnable);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.debugManager.destroy();
    this.situationManager.destroy();
    this.radarSystem.destroy();
    this.audioManager.destroy();
  }
}
