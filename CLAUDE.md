# CLAUDE.md — Project Instructions

You are building Bunker Operator, a 2D browser game. Read GDD.md for
the game design. Read PLAN.md for the current task list. Follow the
rules below for all code in this project.

---

## Tech Stack

- Vite — dev server and bundler
- React — all UI: dialogue options, journal text, manual pages, timer, morning messages, menus
- TypeScript — strict mode, always
- Phaser 3 — all visuals: desk scene, radar, map, entity rendering, animations, transitions

---

## Architecture Rules

**Important:** The GDD describes a first-person bunker view where each
tool has its own close-up view with transitions. V1 uses a simplified
desk scene instead — all tools visible on one screen, one active at a
time. Always follow CLAUDE.md and PLAN.md for V1 implementation. The
first-person view is a future expansion listed at the bottom of PLAN.md.

### The Golden Rule

React and Phaser are separate. They never import from each other.

- `src/ui/` contains React components. No Phaser imports here.
- `src/game/` contains Phaser code. No React imports here.
- `src/shared/` is the only bridge. Both sides import from here.

### Rendering Split

- If the player LOOKS at it → Phaser draws it (desk, radar, map, visual effects)
- If the player READS or CLICKS it → React renders it (dialogue, journal, timer, messages)
- React overlays Phaser. Phaser is the bottom layer, React is transparent on top.

### Communication

React and Phaser communicate ONLY through EventBridge (`src/shared/EventBridge.ts`).

- `emit(eventName, data)` — send a message
- `on(eventName, callback)` — listen for a message
- `off(eventName, callback)` — stop listening (required for cleanup when React components unmount)

No direct function calls between React and Phaser. No shared mutable variables. Only events.

### State

All game state lives in StateManager (`src/shared/StateManager.ts`).

- Phaser updates state (entity positions, radar results, day progression)
- React reads state (timer, journal entries, dialogue availability)
- StateManager notifies listeners on change so React updates automatically
- StateManager uses a clean get/set interface — internals can be swapped for Zustand later without changing other files

---

## Folder Structure

```
bunker-operator/
├── CLAUDE.md                ← This file
├── GDD.md                   ← Game design document
├── PLAN.md                  ← Build tasks with checkboxes
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
│
├── src/
│   ├── main.tsx             ← Entry point: mounts React
│   ├── App.tsx              ← Root component: manages game screens
│   │
│   ├── ui/                  ← React components (text, interaction)
│   │   ├── RadioPanel.tsx       ← Frequency tuning + dialogue exchange
│   │   ├── JournalPanel.tsx     ← Scrollable log with category tabs
│   │   ├── ManualPanel.tsx      ← Static reference panel (territory data)
│   │   ├── MapOverlay.tsx       ← Grid map + sensor placement + entity markers
│   │   ├── MorningMessages.tsx  ← Day-start survivor messages
│   │   ├── EndScreen.tsx        ← End-of-game results screen
│   │   ├── MainMenu.tsx         ← Start screen (New Game / Continue)
│   │   ├── SplashScreen.tsx     ← HookDev Games splash on launch
│   │   ├── SettingsPanel.tsx    ← Volume control
│   │   └── DebugPanel.tsx       ← Debug controls (React side)
│   │
│   ├── game/                ← Phaser code (visuals, game world)
│   │   ├── PhaserGame.tsx   ← React component that mounts Phaser
│   │   ├── config.ts        ← Phaser config (960×540, scenes)
│   │   │
│   │   ├── scenes/
│   │   │   └── BunkerScene.ts    ← Main scene: desk, tool areas, navigation
│   │   │
│   │   ├── systems/
│   │   │   ├── SituationManager.ts  ← Manages entities, paths, positions, day/night progression
│   │   │   ├── RadarSystem.ts       ← Scanner panel: pulse logic, grid, readouts
│   │   │   ├── CoverageSystem.ts    ← Radio station coverage calculations
│   │   │   ├── AudioManager.ts      ← Sound effects and music
│   │   │   └── DebugManager.ts      ← FPS, event log, toggle with backtick
│   │   │
│   │   └── objects/
│   │       └── README.md    ← Empty — add game objects here as needed
│   │
│   ├── shared/              ← Used by BOTH React and Phaser
│   │   ├── EventBridge.ts   ← emit, on, off
│   │   ├── StateManager.ts  ← All game state
│   │   ├── SaveSystem.ts    ← Auto-save/load to localStorage
│   │   ├── constants.ts     ← Game config values (canvas size, timer duration, sensor range)
│   │   ├── types.ts         ← Shared TypeScript types
│   │   └── territory.ts     ← Territory data: grid, zones, stations, landmarks
│   │
│   ├── data/                ← Game content (dialogue, paths, messages)
│   │   ├── situations/
│   │   │   ├── types.ts         ← Situation data structure
│   │   │   ├── situation1.ts    ← Lone Good Survivor (Mara): paths, dialogue, messages
│   │   │   └── situation2.ts    ← Lone Hostile Survivor (Kael): paths, dialogue, messages
│   │   └── dialogue/
│   │       └── types.ts         ← Dialogue tree type definitions
│   │
│   └── server/              ← Multiplayer (future, currently empty)
│
└── public/
    └── assets/
        ├── sprites/         ← Panel art, desk surface, menu assets
        ├── audio/
        │   ├── sfx/
        │   └── music/
        └── fonts/
```

### Key Decisions in This Structure

- `src/data/` is NEW — not in the generic template. Game content (dialogue trees, entity paths, morning messages) lives here, separate from game systems. This keeps content editable without touching engine code.
- `territory.ts` is in `src/shared/` because both Phaser (map rendering, radar) and React (landmark references in dialogue) need it.
- `SituationManager` replaces the generic `EntityManager` from the template. It manages scripted situations with entities on fixed paths, not generic spawning/pooling.
- `CoverageSystem` is its own file because radio coverage is an independent system from the radar.

---

## Coding Standards

### TypeScript
- Strict mode always
- No `any` types — define proper types in `types.ts` or local to the file
- Export types from `src/shared/types.ts` when both React and Phaser need them
- Export content types from `src/data/dialogue/types.ts`

### Comments
- Comment the WHY, not the WHAT
- Bad: `// increment score` 
- Good: `// Score increases on pickup because we want immediate feedback`
- Every file starts with a brief header comment explaining its purpose

### Files
- One responsibility per file
- If a file grows past 200 lines, consider splitting it
- Name files by what they DO, not what they ARE (e.g. `CoverageSystem.ts` not `RadioHelper.ts`)

### Events
- Event names use colon-separated namespaces: `'radar:pulse'`, `'radio:signalActive'`, `'day:ended'`
- Always clean up listeners in React components using `off()` in useEffect cleanup

### Constants
- All game configuration values in `src/shared/constants.ts`
- No magic numbers in game logic
- Debug settings live in DebugManager, NOT in constants

---

## Game-Specific Rules

### Canvas
- Resolution: 960×540
- Scales to 2x on 1080p displays

### The Desk
- One scene (BunkerScene) renders the desk with all tool areas
- Tools: radar, map, radio, journal, manual (sensor placement is a map interaction, not a separate tool)
- One tool active at a time — active tool highlights, others dim
- Phaser handles desk visuals, React overlays text/interactive panels on the active tool

### Radar
- Player places sensor on map, then pulses radar
- Pulse checks entities within sensor range
- Binary range: in range or not (no distance zones in V1)
- Survivor echoes appear as green blips; zombie echoes appear as red blips
- Entity type is knowable from the radar — player uses this to decide whether to guide a survivor toward or away from a zombie
- Echoes fade after a few seconds
- All pulse results auto-log to journal

### Radio
- Player tunes frequency manually
- Signal activates when: player frequency matches a station frequency AND an entity is within that station's coverage radius
- Both sides can initiate contact
- Signal indicator visible from desk view (blinking light) even when radio tool is not active

### Dialogue
- Multiple-choice options
- Options can require specific journal entry keys to be available
- Missing requirements → option appears greyed out with hint
- Options reference landmarks, NEVER grid coordinates
- Landmark references must match the entity's current position on their path

### Journal
- Auto-records: radar pulse results, radio exchanges
- Each entry has a timestamp and a key for dialogue unlock matching
- Displayed as scrollable list (React)

### Entities
- Follow scripted paths (arrays of grid positions)
- Advance along paths over time
- Night transition advances them along separate night paths
- Managed by SituationManager

### Days
- Timer counts down from DAY_DURATION_SECONDS
- Day ends when timer hits 0
- Night transition: advance entities, increment day, auto-save
- Morning messages at start of each day (after day 1)

### Save System
- Auto-save to localStorage at start of each new day
- Save includes: day, entity states, journal, dialogue history, situation outcomes
- Load on game start: offer Continue or New Game

---

## Build Process

Follow PLAN.md task by task. For each task:

1. Read the task description and verify step
2. Build it
3. Run the verify step
4. Check that previous milestone features still work
5. Mark the task as [x] complete in PLAN.md

If a task is unclear, ask. Do not guess.
If you spot a problem with the plan, flag it before building on it.
Quality over speed. One thing at a time.

---

### Manual
- Static reference panel (React overlay) — not the full browsable/damaged version from GDD
- Shows: radio station frequencies, zone descriptions, landmark reference
- Content sourced from territory data — single source of truth
- Entries auto-log to journal when read (same as full version will)
- The full manual (browsable, partially damaged, multiple pages) is a future expansion

---

## V1 Alpha — Complete

V1 Alpha shipped 2026-03-23. Two situations (Mara + Kael), 3 days,
all endings, save/load, art-integrated panels. See git tag/commit.

## Current Phase: Beta

See PLAN.md for the full beta task list. Key additions over V1:
- Energy management system (tools cost power)
- Map rework: React overlay → Phaser layer with drag-and-drop
- Narrative onboarding (incipit, intro screens)
- Radio contact identity (question mark → face reveal)
- Audio implementation
- Art polish pass

## What NOT to Build (deferred past beta)

- Full Technical Manual (browsable, partially damaged, multiple pages)
- Distance Zones (Far/Mid/Near echo detail)
- Ambient Intercept (audio + text fragments in Near zone)
- Situations 3 and 4 (groups) — under discussion for beta
- Cross-Situation Dynamics
- First-Person Bunker View (separate close-up views with transitions)
- Progressive Game Over (3 hostiles knowing location)
