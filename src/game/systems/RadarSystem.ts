/** Grid scanner — full-screen AN/VPS-1 panel with 6 readout windows */

import Phaser from 'phaser';
import { StateManager } from '../../shared/StateManager.ts';
import { EventBridge } from '../../shared/EventBridge.ts';
import { SENSOR_RANGE, ECHO_FADE_MS, formatGameTime } from '../../shared/constants.ts';
import { gridLabel, gridDistance, RADIO_STATIONS, LANDMARKS, GRID_COLS, GRID_ROWS, type RadioStation } from '../../shared/territory.ts';
import type { GridPosition, EntityState, RadarContact } from '../../shared/types.ts';

/** ─────────────────────────────────────────────────────────────────────────
 *  SCANNER CONFIG — all overlay positions for the AN/VPS-1 panel asset.
 *
 *  How to measure: open scanner_panel.png at native 960×540 (1:1 pixels).
 *  grid.x/y     = top-left corner of the 5×5 cell grid inside the scope
 *  readouts     = center of each dark readout window
 *  scanButton   = center + size of the SCAN button area
 *  ─────────────────────────────────────────────────────────────────────── */
const SCANNER_CONFIG = {
  /** Size of one grid cell in pixels — 5×5 grid total = cellSize*5 × cellSize*5.
   *  Scope radius=205, diameter=411, art grid fills ~80% → ~58px per cell. */
  cellSize: 54,

  /** Scope center=(289,267), outer radius≈201px, bezel ~6px → usable ≈195px.
   *  Corner distance = 135*√2 = 191px < 195px — fits cleanly.
   *  grid top-left = center - (cellSize*5/2) = (289-135, 267-135) */
  grid: { x: 154, y: 132 },

  /** Invisible hit zone over the art SCAN button. P3(699,480)→P2(932,524) */
  scanButton: { x: 816, y: 502, w: 233, h: 44 },

  /** Center of each dark readout window — all share center x=794.
   *  Y values evenly spaced from SENSOR top (y≈79) with ~68px per section. */
  readouts: {
    sensor:   { x: 795, y: 93  },
    friendly: { x: 795, y: 158 },
    hostile:  { x: 795, y: 220 },
    status:   { x: 795, y: 283 },
    lastScan: { x: 795, y: 346 },
    relay:    { x: 795, y: 409 },
  },
} as const;

// Cell color palette — tuned to sit on the dark green scope glass
const C_CELL_OOB       = 0x000000; // outside grid — fully black
const C_CELL_OUT_RANGE = 0x050a05; // corner cells outside scan radius
const C_CELL_IN_RANGE  = 0x070e07; // active scan cells — barely visible tint
const C_CELL_SENSOR    = 0x0d2010; // center cell — slightly brighter green
const C_CELL_FLASH     = 0x1a3a1a; // pulse flash — visible but not harsh
const C_BORDER         = 0x1a2a1a; // grid lines — faint green to match scope
const C_BORDER_SENSOR  = 0x4aff4a; // sensor cell border — bright green, stands out

interface ScanCell {
  relCol: number;
  relRow: number;
  inRange: boolean;
  bg: Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  gridPos: GridPosition | null;
}

interface Blip {
  circle: Phaser.GameObjects.Arc;
  createdAt: number;
}

export class RadarSystem {
  private scene: Phaser.Scene;
  private cells: ScanCell[] = [];
  private blips: Blip[] = [];
  private allObjects: Phaser.GameObjects.GameObject[] = [];
  private visible = false;
  private lastSensorPos: GridPosition | null = null;

  // Named readout text objects
  private roSensor!:   Phaser.GameObjects.Text;
  private roFriendly!: Phaser.GameObjects.Text;
  private roHostile!:  Phaser.GameObjects.Text;
  private roStatus!:   Phaser.GameObjects.Text;
  private roLastScan!: Phaser.GameObjects.Text;
  private roRelay!:    Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.buildUI();
    this.setAllVisible(false);
  }

  private buildUI(): void {
    const { grid, readouts, scanButton, cellSize } = SCANNER_CONFIG;

    // ── 5×5 grid cells ──────────────────────────────────────────────────
    for (let relRow = -SENSOR_RANGE; relRow <= SENSOR_RANGE; relRow++) {
      for (let relCol = -SENSOR_RANGE; relCol <= SENSOR_RANGE; relCol++) {
        const px = grid.x + (relCol + SENSOR_RANGE) * cellSize;
        const py = grid.y + (relRow + SENSOR_RANGE) * cellSize;
        const cx = px + cellSize / 2;
        const cy = py + cellSize / 2;

        const dist = Math.sqrt(relCol * relCol + relRow * relRow);
        const inRange = dist <= SENSOR_RANGE;

        const bg = this.scene.add.rectangle(cx, cy, cellSize - 1, cellSize - 1, C_CELL_OOB).setDepth(50);
        const border = this.scene.add.rectangle(cx, cy, cellSize, cellSize)
          .setStrokeStyle(1, C_BORDER).setFillStyle().setDepth(50);
        const label = this.scene.add.text(cx, cy, '', {
          fontSize: '10px', color: '#1a3a1a', fontFamily: 'monospace',
        }).setOrigin(0.5).setDepth(51);

        this.allObjects.push(bg, border, label);
        this.cells.push({ relCol, relRow, inRange, bg, border, label, gridPos: null });
      }
    }

    // ── Readout text objects ────────────────────────────────────────────
    const roStyle = { fontSize: '13px', color: '#4aff4a', fontFamily: 'monospace', fontStyle: 'bold' };
    const ro = readouts;

    this.roSensor   = this.scene.add.text(ro.sensor.x,   ro.sensor.y,   '—', roStyle).setOrigin(0.5).setDepth(51);
    this.roFriendly = this.scene.add.text(ro.friendly.x, ro.friendly.y, '—', roStyle).setOrigin(0.5).setDepth(51);
    this.roHostile  = this.scene.add.text(ro.hostile.x,  ro.hostile.y,  '—', roStyle).setOrigin(0.5).setDepth(51);
    this.roStatus   = this.scene.add.text(ro.status.x,   ro.status.y,   'READY', roStyle).setOrigin(0.5).setDepth(51);
    this.roLastScan = this.scene.add.text(ro.lastScan.x, ro.lastScan.y, '—', roStyle).setOrigin(0.5).setDepth(51);
    this.roRelay    = this.scene.add.text(ro.relay.x,    ro.relay.y,    'CLEAR', roStyle).setOrigin(0.5).setDepth(51);

    this.allObjects.push(
      this.roSensor, this.roFriendly, this.roHostile,
      this.roStatus, this.roLastScan, this.roRelay,
    );

    // ── Invisible SCAN button hit zone over the art button ──────────────
    const btn = this.scene.add.rectangle(
      scanButton.x, scanButton.y, scanButton.w, scanButton.h,
    ).setFillStyle(0x000000, 0).setDepth(51).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => this.pulse());
    btn.on('pointerover', () => btn.setFillStyle(0x4aff4a, 0.08));
    btn.on('pointerout',  () => btn.setFillStyle(0x000000, 0));
    this.allObjects.push(btn);
  }

  show(): void {
    this.visible = true;
    this.setAllVisible(true);
    this.lastSensorPos = null;
    this.rebuildCells();
    this.syncSensorReadout();
  }

  hide(): void {
    this.visible = false;
    this.setAllVisible(false);
    for (const blip of this.blips) blip.circle.setVisible(false);
  }

  private setAllVisible(v: boolean): void {
    for (const obj of this.allObjects) {
      (obj as Phaser.GameObjects.GameObject & { setVisible: (v: boolean) => void }).setVisible(v);
    }
    for (const blip of this.blips) blip.circle.setVisible(v);
  }

  private rebuildCells(): void {
    const sensorPos = StateManager.getState().sensorPosition;

    if (!sensorPos) {
      this.roSensor.setText('NO SENSOR');
      this.roStatus.setText('NO SENSOR');
      for (const cell of this.cells) {
        cell.bg.setFillStyle(C_CELL_OOB);
        cell.border.setStrokeStyle(1, C_BORDER);
        cell.label.setText('');
        cell.gridPos = null;
      }
      return;
    }

    this.syncSensorReadout();

    for (const cell of this.cells) {
      const absCol = sensorPos.col + cell.relCol;
      const absRow = sensorPos.row + cell.relRow;
      const inBounds = absCol >= 0 && absCol < GRID_COLS && absRow >= 0 && absRow < GRID_ROWS;

      if (!inBounds) {
        cell.gridPos = null;
        cell.bg.setFillStyle(C_CELL_OOB);
        cell.border.setStrokeStyle(1, C_BORDER);
        cell.label.setText('');
      } else if (cell.relCol === 0 && cell.relRow === 0) {
        cell.gridPos = { col: absCol, row: absRow };
        cell.bg.setFillStyle(C_CELL_SENSOR);
        cell.border.setStrokeStyle(2, C_BORDER_SENSOR);
        cell.label.setText(gridLabel({ col: absCol, row: absRow })).setColor('#4aff4a');
      } else if (cell.inRange) {
        cell.gridPos = { col: absCol, row: absRow };
        cell.bg.setFillStyle(C_CELL_IN_RANGE);
        cell.border.setStrokeStyle(1, C_BORDER);
        cell.label.setText(gridLabel({ col: absCol, row: absRow })).setColor('#1a3a1a');
      } else {
        cell.gridPos = { col: absCol, row: absRow };
        cell.bg.setFillStyle(C_CELL_OUT_RANGE);
        cell.border.setStrokeStyle(1, C_BORDER);
        cell.label.setText(gridLabel({ col: absCol, row: absRow })).setColor('#0d1a0d');
      }
    }
  }

  private syncSensorReadout(): void {
    const sensorPos = StateManager.getState().sensorPosition;
    if (!sensorPos) return;
    this.roSensor.setText(gridLabel(sensorPos));
  }

  private pulse(): void {
    const sensorPos = StateManager.getState().sensorPosition;
    if (!sensorPos) {
      this.roStatus.setText('NO SENSOR');
      return;
    }

    this.roStatus.setText('SCANNING...');
    this.clearBlips();
    this.flashInRangeCells();

    const entities = StateManager.getState().entities;
    const inRange  = entities.filter(
      (e) => e.alive && gridDistance(e.position, sensorPos) <= SENSOR_RANGE
    );

    const friendly = inRange.filter((e) => e.type === 'survivor');
    const hostile  = inRange.filter((e) => e.type === 'zombie');

    const currentJournal = StateManager.getState().journal;
    const newStations = RADIO_STATIONS.filter(
      (s) =>
        gridDistance(sensorPos, s.position) <= SENSOR_RANGE &&
        !currentJournal.some((e) => e.key === `radar:discovered_${s.id}`)
    );

    // Discover landmarks
    const discovered = StateManager.getState().discoveredLandmarks;
    const newLandmarks = LANDMARKS.filter(
      (l) =>
        gridDistance(sensorPos, l.position) <= SENSOR_RANGE &&
        !discovered.includes(l.id)
    );
    for (const l of newLandmarks) {
      StateManager.discoverLandmark(l.id);
      StateManager.addJournalEntry({
        key: `radar:landmark_${l.id}`,
        timestamp: Date.now(),
        day: StateManager.getState().currentDay,
        timeStr: formatGameTime(StateManager.getState().timeRemaining),
        text: `Scanner confirmed: ${l.name} at ${gridLabel(l.position)} — ${l.description}`,
      });
    }

    // Update readouts — these persist until next scan
    const timeStr = formatGameTime(StateManager.getState().timeRemaining);
    this.roFriendly.setText(friendly.length.toString().padStart(2, '0'));
    this.roHostile.setText(hostile.length.toString().padStart(2, '0'));
    this.roLastScan.setText(timeStr);
    this.roRelay.setText(newStations.length > 0 ? newStations.map((s) => s.name).join(' / ') : 'CLEAR');

    // Resolve status after flash
    this.scene.time.delayedCall(400, () => {
      if (inRange.length === 0) {
        this.roStatus.setText('NO CONTACTS');
      } else {
        this.roStatus.setText(`${inRange.length} CONTACT${inRange.length > 1 ? 'S' : ''}`);
      }
    });

    for (const entity of inRange) {
      this.spawnBlip(entity, sensorPos);
    }

    this.logPulse(sensorPos, inRange, newStations);
    EventBridge.emit('radar:pulse', sensorPos);
  }

  private flashInRangeCells(): void {
    for (const cell of this.cells) {
      if (!cell.inRange || cell.gridPos === null) continue;
      const base = cell.relCol === 0 && cell.relRow === 0 ? C_CELL_SENSOR : C_CELL_IN_RANGE;
      cell.bg.setFillStyle(C_CELL_FLASH);
      this.scene.time.delayedCall(350, () => {
        if (this.visible) cell.bg.setFillStyle(base);
      });
    }
  }

  private spawnBlip(entity: EntityState, sensorPos: GridPosition): void {
    const { grid } = SCANNER_CONFIG;
    const relCol = entity.position.col - sensorPos.col;
    const relRow = entity.position.row - sensorPos.row;
    const { cellSize } = SCANNER_CONFIG;
    const cx = grid.x + (relCol + SENSOR_RANGE) * cellSize + cellSize / 2;
    const cy = grid.y + (relRow + SENSOR_RANGE) * cellSize + cellSize / 2;

    const color = entity.type === 'survivor' ? 0x4aff4a : 0xff4a4a;
    const circle = this.scene.add.circle(cx, cy, 7, color).setDepth(53);
    this.blips.push({ circle, createdAt: Date.now() });

    const state = StateManager.getState();
    const contact: RadarContact = {
      entityId: entity.id,
      type: entity.type,
      position: { ...entity.position },
      day: state.currentDay,
      timeStr: formatGameTime(state.timeRemaining),
    };
    StateManager.setRadarContact(contact);
  }

  /** Only destroys blips — readout values persist until next scan */
  private clearBlips(): void {
    for (const blip of this.blips) blip.circle.destroy();
    this.blips = [];
  }

  update(): void {
    if (!this.visible) return;

    const sensorPos = StateManager.getState().sensorPosition;
    const changed =
      sensorPos !== this.lastSensorPos &&
      (sensorPos === null ||
        this.lastSensorPos === null ||
        sensorPos.col !== this.lastSensorPos.col ||
        sensorPos.row !== this.lastSensorPos.row);
    if (changed) {
      this.lastSensorPos = sensorPos;
      this.rebuildCells();
    }

    // Fade blips over ECHO_FADE_MS
    const now = Date.now();
    this.blips = this.blips.filter((blip) => {
      const age = now - blip.createdAt;
      if (age > ECHO_FADE_MS) { blip.circle.destroy(); return false; }
      blip.circle.setAlpha(1 - age / ECHO_FADE_MS);
      return true;
    });
  }

  private logPulse(sensorPos: GridPosition, inRange: EntityState[], newStations: RadioStation[]): void {
    const state   = StateManager.getState();
    const timeStr = formatGameTime(state.timeRemaining);
    const now     = Date.now();

    if (inRange.length === 0) {
      StateManager.addJournalEntry({
        key: `radar:pulse_${now}`,
        timestamp: now,
        day: state.currentDay,
        timeStr,
        text: `Scanner pulse at ${gridLabel(sensorPos)}: no contacts detected.`,
      });
    } else {
      for (const entity of inRange) {
        StateManager.addJournalEntry({
          key: `radar:seen_${entity.id}`,
          timestamp: now,
          day: state.currentDay,
          timeStr,
          text: `Scanner pulse at ${gridLabel(sensorPos)}: ${entity.type} contact at ${gridLabel(entity.position)}.`,
        });
      }
    }

    for (const station of newStations) {
      StateManager.addJournalEntry({
        key: `radar:discovered_${station.id}`,
        timestamp: now,
        day: state.currentDay,
        timeStr,
        text: `Scanner pulse at ${gridLabel(sensorPos)}: relay equipment detected — ${station.name}, ${station.frequency.toFixed(1)} MHz.`,
      });
    }
  }

  destroy(): void {
    for (const obj of this.allObjects) {
      (obj as Phaser.GameObjects.GameObject & { destroy: () => void }).destroy();
    }
    for (const blip of this.blips) blip.circle.destroy();
    this.blips = [];
  }
}
