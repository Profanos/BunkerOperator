/** Pulse logic, echo detection, range checking — renders CRT radar display */

import Phaser from 'phaser';
import { StateManager } from '../../shared/StateManager.ts';
import { EventBridge } from '../../shared/EventBridge.ts';
import { SENSOR_RANGE, CANVAS_WIDTH, CANVAS_HEIGHT, ECHO_FADE_MS, formatGameTime } from '../../shared/constants.ts';
import { gridLabel, gridDistance, RADIO_STATIONS, type RadioStation } from '../../shared/territory.ts';
import type { GridPosition, EntityState } from '../../shared/types.ts';

interface Echo {
  blip: Phaser.GameObjects.Arc;
  createdAt: number;
}

const RADAR_CENTER_X = CANVAS_WIDTH / 2;
const RADAR_CENTER_Y = CANVAS_HEIGHT / 2 - 20;
const RADAR_RADIUS = 180;
const PIXELS_PER_CELL = RADAR_RADIUS / SENSOR_RANGE;

export class RadarSystem {
  private scene: Phaser.Scene;
  /** Static background objects — shown/hidden as a group */
  private staticObjects: Phaser.GameObjects.GameObject[] = [];
  /** Dynamic objects — blips and pulse ring, managed separately */
  private echoes: Echo[] = [];
  private pulseGraphics: Phaser.GameObjects.Graphics;
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private pulseProgress = { t: 0 };
  private noEchoText: Phaser.GameObjects.Text;
  private pulseButton: Phaser.GameObjects.Text;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // CRT background circle
    const bg = scene.add.circle(RADAR_CENTER_X, RADAR_CENTER_Y, RADAR_RADIUS + 10, 0x0a1a0a)
      .setStrokeStyle(2, 0x2a4a2a).setDepth(50);
    this.staticObjects.push(bg);

    // Range rings
    for (let i = 1; i <= SENSOR_RANGE; i++) {
      const ring = scene.add.circle(RADAR_CENTER_X, RADAR_CENTER_Y, i * PIXELS_PER_CELL)
        .setStrokeStyle(1, 0x1a3a1a).setFillStyle().setDepth(50);
      this.staticObjects.push(ring);
    }

    // Crosshairs
    const hLine = scene.add.line(0, 0,
      RADAR_CENTER_X - RADAR_RADIUS, RADAR_CENTER_Y,
      RADAR_CENTER_X + RADAR_RADIUS, RADAR_CENTER_Y,
      0x1a3a1a
    ).setOrigin(0, 0).setDepth(50);
    const vLine = scene.add.line(0, 0,
      RADAR_CENTER_X, RADAR_CENTER_Y - RADAR_RADIUS,
      RADAR_CENTER_X, RADAR_CENTER_Y + RADAR_RADIUS,
      0x1a3a1a
    ).setOrigin(0, 0).setDepth(50);
    this.staticObjects.push(hLine, vLine);

    // Center dot
    const centerDot = scene.add.circle(RADAR_CENTER_X, RADAR_CENTER_Y, 3, 0x4aff4a).setDepth(51);
    this.staticObjects.push(centerDot);

    // Pulse ring — drawn via Graphics so we control radius manually
    this.pulseGraphics = scene.add.graphics().setDepth(52);
    this.staticObjects.push(this.pulseGraphics);

    // Status text
    this.noEchoText = scene.add.text(RADAR_CENTER_X, RADAR_CENTER_Y + RADAR_RADIUS + 28, '', {
      fontSize: '13px',
      color: '#4a8a4a',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(51);
    this.staticObjects.push(this.noEchoText);

    // Pulse button
    this.pulseButton = scene.add.text(
      RADAR_CENTER_X, RADAR_CENTER_Y + RADAR_RADIUS + 52,
      '[ PULSE ]',
      { fontSize: '16px', color: '#4aff4a', fontFamily: 'monospace', fontStyle: 'bold' }
    ).setOrigin(0.5).setDepth(51).setInteractive({ useHandCursor: true });
    this.pulseButton.on('pointerdown', () => this.pulse());
    this.pulseButton.on('pointerover', () => this.pulseButton.setColor('#8aff8a'));
    this.pulseButton.on('pointerout', () => this.pulseButton.setColor('#4aff4a'));
    this.staticObjects.push(this.pulseButton);

    // Start hidden
    this.setAllVisible(false);
  }

  show(): void {
    this.visible = true;
    this.setAllVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.setAllVisible(false);
    // Hide blips too
    for (const echo of this.echoes) echo.blip.setVisible(false);
  }

  private setAllVisible(v: boolean): void {
    for (const obj of this.staticObjects) {
      (obj as Phaser.GameObjects.GameObject & { setVisible: (v: boolean) => void }).setVisible(v);
    }
  }

  private pulse(): void {
    const sensorPos = StateManager.getState().sensorPosition;
    if (!sensorPos) {
      this.noEchoText.setText('NO SENSOR PLACED');
      return;
    }

    // Clear previous echoes
    this.clearEchoes();

    // Animate pulse ring
    this.animatePulse();

    // Detect entities in range
    const entities = StateManager.getState().entities;
    const inRange = entities.filter(
      (e) => e.alive && gridDistance(e.position, sensorPos) <= SENSOR_RANGE
    );

    // Check for newly discoverable stations before logging — needed for status text
    const currentJournal = StateManager.getState().journal;
    const newStations = RADIO_STATIONS.filter(
      (s) =>
        gridDistance(sensorPos, s.position) <= SENSOR_RANGE &&
        !currentJournal.some((e) => e.key === `radar:discovered_${s.id}`)
    );

    if (inRange.length === 0) {
      this.noEchoText.setText('NO ECHOES');
    } else {
      this.noEchoText.setText(`${inRange.length} ECHO${inRange.length > 1 ? 'ES' : ''} DETECTED`);
      for (const entity of inRange) {
        const bx = RADAR_CENTER_X + (entity.position.col - sensorPos.col) * PIXELS_PER_CELL;
        const by = RADAR_CENTER_Y + (entity.position.row - sensorPos.row) * PIXELS_PER_CELL;
        // Green for survivors, red for zombies — player needs type visibility to make guidance decisions
        const color = entity.type === 'survivor' ? 0x4aff4a : 0xff4a4a;
        const blip = this.scene.add.circle(bx, by, 5, color).setDepth(53);
        this.echoes.push({ blip, createdAt: Date.now() });
      }
    }

    this.logPulse(sensorPos, inRange, newStations);
    EventBridge.emit('radar:pulse', sensorPos);
  }

  private animatePulse(): void {
    // Stop any running tween
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
    this.pulseGraphics.clear();
    this.pulseProgress.t = 0;

    this.pulseTween = this.scene.tweens.add({
      targets: this.pulseProgress,
      t: 1,
      duration: 700,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        const r = this.pulseProgress.t * RADAR_RADIUS;
        const alpha = 1 - this.pulseProgress.t;
        this.pulseGraphics.clear();
        if (this.visible) {
          this.pulseGraphics.lineStyle(2, 0x4aff4a, alpha);
          this.pulseGraphics.strokeCircle(RADAR_CENTER_X, RADAR_CENTER_Y, r);
        }
      },
      onComplete: () => {
        this.pulseGraphics.clear();
        this.pulseTween = null;
      },
    });
  }

  private clearEchoes(): void {
    for (const echo of this.echoes) echo.blip.destroy();
    this.echoes = [];
    this.noEchoText.setText('');
  }

  update(): void {
    if (!this.visible) return;
    const now = Date.now();
    this.echoes = this.echoes.filter((echo) => {
      const age = now - echo.createdAt;
      if (age > ECHO_FADE_MS) {
        echo.blip.destroy();
        return false;
      }
      echo.blip.setAlpha(1 - age / ECHO_FADE_MS);
      return true;
    });
  }

  private logPulse(sensorPos: GridPosition, inRange: EntityState[], newStations: RadioStation[]): void {
    const state = StateManager.getState();
    const timeStr = formatGameTime(state.timeRemaining);
    const now = Date.now();

    if (inRange.length === 0) {
      StateManager.addJournalEntry({
        key: `radar:pulse_${now}`,
        timestamp: now,
        day: state.currentDay,
        timeStr,
        text: `Radar pulse at ${gridLabel(sensorPos)}: no echoes detected.`,
      });
    } else {
      // One entry per entity — key is radar:seen_<entityId> so dialogue can check
      // whether the player has ever detected a specific entity on radar
      for (const entity of inRange) {
        StateManager.addJournalEntry({
          key: `radar:seen_${entity.id}`,
          timestamp: now,
          day: state.currentDay,
          timeStr,
          text: `Radar pulse at ${gridLabel(sensorPos)}: ${entity.type} echo at ${gridLabel(entity.position)}.`,
        });
      }
    }

    // Log newly discovered stations — newStations already filtered to exclude prior discoveries
    for (const station of newStations) {
      StateManager.addJournalEntry({
        key: `radar:discovered_${station.id}`,
        timestamp: now,
        day: state.currentDay,
        timeStr,
        text: `Radar scan at ${gridLabel(sensorPos)}: relay equipment detected — ${station.name}, ${station.frequency.toFixed(1)} MHz.`,
      });
    }

    // Update status text to include relay acquisition feedback
    if (newStations.length > 0) {
      const names = newStations.map((s) => s.name).join(', ');
      const echoLine = inRange.length > 0
        ? `${inRange.length} ECHO${inRange.length > 1 ? 'ES' : ''} DETECTED`
        : 'NO ECHOES';
      this.noEchoText.setText(`${echoLine}\nRELAY ACQUIRED: ${names}`);
    }
  }
}

