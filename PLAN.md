# PLAN.md — Bunker Operator Build Plan

Read GDD.md for the full game design. Read CLAUDE.md for architecture
rules and coding standards.

---

## Status Key

- [ ] Not started
- [x] Complete
- [!] Blocked or needs decision

---

## V1 Alpha — Complete (2026-03-23)

All 6 milestones shipped. Two situations (Mara + Kael), 3 days,
all endings, save/load, art-integrated panels, scanner/radio/journal/
manual/map fully playable. Pushed to GitHub: Profanos/BunkerOperator.

---

## Phase 1: Stabilize & Prepare

No new features. No new art. Get the foundation ready for beta.

### 1.1 Bug Fixes
- [x] Scanner SCAN button hover zone misaligned with art
- [x] Signal/station text positions on desk calibrated

### 1.2 Dead Code Cleanup
- [x] Delete orphaned TimerDisplay.tsx
- [x] Remove duplicate GRID_COLS/GRID_ROWS from constants.ts
- [x] Remove unused DIAMETER from RadarSystem.ts
- [x] Update CLAUDE.md folder structure to match actual files

### 1.3 Dev Tooling
- [ ] Add coordinate overlay to debug mode — live mouse x,y on Phaser
      canvas when debug is active. Replaces external pixel inspector.

### 1.4 Design Bible
- [ ] Screenshot every panel and the desk view
- [ ] Catalogue every piece of text and button visible in the art
- [ ] For each: is it functional? Should it be? What happens on interaction?
- [ ] Define physical controls per tool (what can be operated from desk)
- [ ] This document drives ALL Phase 2 art work — do not skip

### 1.5 Audio Inventory
- [ ] List every sound the game needs (ambience, SFX, music)
- [ ] Define mood, trigger condition, and priority for each
- [ ] Planning document only — no implementation

### 1.6 Performance
- [ ] Verify 60fps throughout full playthrough

### Phase 1 Checklist
- [ ] All bugs fixed
- [ ] No dead code
- [ ] Coordinate overlay working in debug mode
- [ ] Design bible complete
- [ ] Audio inventory written
- [ ] 60fps confirmed

---

## Phase 2: The Real Game

Three layers, bottom-up. Do not start a layer before the previous is solid.

**Tool interaction principle (applies everywhere):**
- Desk level: physical state visible + basic controls (on/off, frequency dial,
  sensor position). Art must show this.
- Panel level: reading and depth. Dialogue, journal, map detail, manual pages.
  No duplicate controls — except map drag-drop (manipulation, not reading).

---

### Layer 1: Narrative Frame

No art or system dependencies. Can start immediately after Phase 1.

#### L1.1 Incipit / New Game Intro
- [ ] Text sequence shown on new game start (same format as morning messages)
- [ ] Establishes: who the player is, why they're here, what the tools are
- [ ] Tone: operator briefing, cold and functional — not a tutorial
- [ ] Player discovers energy system on their own — do not mention it here
- [ ] Write the sequence text

#### L1.2 Continue Screen
- [ ] Text overlay shown when continuing a saved game
- [ ] Shows: current day, situations active, key decisions made so far
- [ ] Orients the returning player without replaying the intro

#### L1.3 Kael Energy Hint
- [ ] New dialogue thread in situation2.ts
- [ ] Triggers after player first runs low on energy (new journal key)
- [ ] Kael mentions the solar collector on the scanner in passing
- [ ] Line must feel natural — useful information from a dangerous source
- [ ] This is the only in-game explanation of solar energy recovery

---

### Layer 2: Systems

These are foundational. All art in Layer 3 depends on knowing the energy
states. Build in this exact order.

#### L2.1 Energy System

**Rules:**
- Fixed daily budget, resets to 100% at dawn
- Map drains energy while on (constant)
- Radio drains energy while on (constant, slower)
- Scanner pulse costs a flat amount per pulse
- Each cell scanned recovers a small amount (solar collector on sensor)
- At zero energy: draining tools go dark, scanner still works (solar recovery)

**Constants to add to constants.ts:**
```
ENERGY_MAX          = 100
ENERGY_DRAIN_MAP    = 0.8   per second
ENERGY_DRAIN_RADIO  = 0.3   per second
ENERGY_COST_PULSE   = 2.0   one-time per pulse
ENERGY_RECOVER_SCAN = 1.5   per cell scanned
ENERGY_RECHARGE_DAY = 100   full recharge at dawn
```

**Implementation:**
- [ ] Add energy to StateManager (current level, drain/recover methods)
- [ ] Emit events: energy:low (≤20%), energy:depleted, energy:recharged
- [ ] Add energy constants to constants.ts
- [ ] BunkerScene: energy drains in update() loop when tools are on
- [ ] BunkerScene: energy recovers on radar:pulse event (cells scanned × rate)
- [ ] Desk display: PWR percentage + segmented bar as Phaser text objects
      (positioned over desk art — new art in Layer 3 will have screen baked in)
- [ ] Day transition: recharge to 100% at dawn

#### L2.2 Desk-Level Tool Controls

The desk is a physical console. Tools must be operable without opening panels.

- [ ] Map: on/off toggle from desk (click map area when no panel open)
- [ ] Radio: on/off toggle + frequency ±1 / ±0.1 from desk
      (small invisible hit zones over art buttons — same pattern as existing
      frequency display)
- [ ] Scanner: already operable from desk (SCAN button visible, pulse works)
- [ ] All desk controls respect energy — toggling on a drained tool does nothing
- [ ] Panel state persists on close: radio tuned to 97.3 stays at 97.3 on desk

#### L2.3 Scanner Rework

**Cooldown:**
- [ ] 6-second cooldown between pulses
- [ ] SCAN button states:
      - Ready: button lit normally
      - Cooldown: button dims, LAST SCAN readout shows `RECHARGING... ██░░░`
        filling progressively, then `READY` when available
- [ ] Cooldown is diegetic — no UI bar, lives in the existing readout window
- [ ] Pulse costs energy (ENERGY_COST_PULSE constant)

**Live tracking window:**
- [ ] After a pulse detects an entity, a 20-second tracking window opens
- [ ] During this window: if the entity moves, its position updates in real time
      on both the scanner grid AND the map (if map is powered on)
- [ ] After 20 seconds: marker locks to last known position, goes static
- [ ] Tracking window visible in STATUS readout: `TRACKING 00:18` counting down
- [ ] Multiple entities can be in tracking windows simultaneously

**Map icon categories (appear when map is on, persist across sessions):**
- Zone boundaries + labels — always visible when map powered on
- Relay station — appears when scanner pulse detects it
- Relay station (active) — updates when frequency discovered
- Landmark — appears when scanner pulse covers that cell
- Unknown contact (?) — first scan of any entity
- Survivor — upgrades from ? after radio contact established
- Hostile — upgrades from ? only after confirmed hostile
- Threat/zombie — appears on scan, marked with hazard symbol
- All contact markers show timestamp of last scan

#### L2.4 Map Rework

- [ ] Move map from React overlay to Phaser layer
- [ ] Off state: paper map art visible, no grid, no contacts — but miniatures visible
- [ ] On state: grid lights up over paper, all discovered icons appear
- [ ] Drag-and-drop sensor token (replaces click-to-place)
- [ ] Drag-and-drop miniatures: pin, ?, skull — player annotations
      Miniatures are physical tokens on the paper — always visible, powered or not
- [ ] Map interactivity (drag-drop) only works when powered on
- [ ] Turning map on costs energy (starts draining immediately)

#### L2.5 Radio Contact Identity

- [ ] New state in StateManager: contact identity level per station
      (unknown → partial → revealed)
- [ ] Radio panel shows contact panel:
      - No contact: empty/static
      - First contact: question mark silhouette
      - Mid-conversation: details emerge (name, partial face)
      - Trust established or broken: full face revealed
- [ ] Identity level advances based on dialogue nodes reached
- [ ] Hostile contact (Kael) reveals differently — ambiguous longer

---

### Layer 3: Identity

Only start after Layer 2 is complete and tested.

#### L3.1 Design Audit & Flavour
- [ ] Apply design bible from Phase 1
- [ ] Every visible art element is functional or removed
- [ ] Flavour: marker annotations (exclamation on FRIENDLY tab), handwritten
      notes, wear marks, coffee stains — each one meaningful
- [ ] Audit all panel button labels — if it's in the art, it must do something

#### L3.2 Map Art
- [ ] Off state: physical paper map look — worn edges, faded ink, beautiful cold
- [ ] On state: grid illuminates over the paper, zone overlays appear
- [ ] Single Phaser asset with two visual modes
- [ ] Must look intentional and atmospheric even when off

#### L3.3 Panel Art Rework
- [ ] All panels redesigned around three states: on, off, low-power
- [ ] Off: dark, physically powered down
- [ ] Low-power: flickering or dim indicators
- [ ] On: fully lit, functional
- [ ] Desk surface updated with battery/power screen area

#### L3.4 Main Menu & Opening
- [ ] New menu art (current asset too AI-looking)
- [ ] HookDev Games hook animation on boot
- [ ] Credits: Francesco Bacocco / HookDev Games
- [ ] Transition: splash → menu

#### L3.5 Scanner Visual Rework
- [ ] Rotating sweep line (sonar-style)
- [ ] CRT phosphor glow effect
- [ ] Scanlines
- [ ] Cold War military hardware feel

#### L3.6 Audio Implementation
- [ ] From Phase 1 inventory — implement in priority order
- [ ] Ambience first (sets the room), SFX second, music last

### Phase 2 Checklist
- [ ] Incipit plays on new game
- [ ] Continue screen shows correct progress
- [ ] Energy system forces real choices — map vs radio tradeoff is felt
- [ ] Solar recovery works and Kael's hint makes sense in context
- [ ] Desk controls work for all tools
- [ ] Map is Phaser layer with drag-drop tokens
- [ ] Radio shows contact identity progression
- [ ] All art consistent, meaningful, no dead buttons
- [ ] Audio reinforces atmosphere
- [ ] Full playthrough — no bugs

---

## Future Expansions (Post-Beta)

- [ ] **Full Technical Manual** — browsable, multi-page, partially damaged
- [ ] **Distance Zones (Far/Mid/Near)** — radar echo detail by distance
- [ ] **Ambient Intercept** — audio + text in Near zone
- [ ] **Situations 3 & 4** — groups, cross-referencing accounts
- [ ] **Cross-Situation Dynamics** — all entities visible on radar
- [ ] **First-Person Bunker View** — full perspective with transitions
- [ ] **Battery Room** — physical room behind player, visible by turning back
- [ ] **Progressive Game Over** — three hostiles = bunker compromised
- [ ] **3-5 Day Campaigns**
