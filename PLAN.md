# PLAN.md — Bunker Operator Build Plan (Lean V1)

This is the build plan for the lean first version of Bunker Operator.
The full vision is in GDD.md. This plan delivers the core experience —
radar, radio, trust — in the smallest buildable form. Everything cut
from V1 is listed at the bottom as future expansion.

Read GDD.md for the full game design. Read CLAUDE.md for architecture
rules and coding standards.

---

## Status Key

- [ ] Not started
- [x] Complete
- [!] Blocked or needs decision

---

## V1 Scope Summary

- 2 situations: Lone Good Survivor + Lone Hostile Survivor
- 2-3 days, 10-15 real minutes each
- One desk scene (all tools visible, one active at a time)
- Radar with pulse (binary: in range / not in range, no distance zones)
- Radio with frequency tuning and coverage system
- Journal auto-records radar + radio + manual readings
- Dialogue with journal-driven unlocks and greyed-out options
- Morning messages between days
- Auto-save between days
- Simplified manual: static reference panel with station frequencies,
  zone descriptions, landmark info (full browsable/damaged manual is
  future expansion)
- No ambient intercept, no distance zones, no cross-situation dynamics
  — these are future expansions

---

## Milestone 1: "The Skeleton"

**Goal:** The desk exists. You can interact with tool positions. Timer
counts down. All infrastructure works.

### 1.1 Project Setup
- [x] Initialize project: Vite + React + TypeScript
- [x] Install Phaser 3
- [x] Configure TypeScript strict mode
- [x] Create folder structure
- [x] Verify `npm run dev` runs with no errors

### 1.2 Phaser + React Integration
- [x] Create Phaser config (960×540 canvas)
- [x] Create PhaserGame.tsx — React component that mounts Phaser
- [x] Create BunkerScene — solid dark background placeholder
- [x] Wire into App.tsx
- [x] Verify: canvas appears at 960×540, no errors

### 1.3 EventBridge + StateManager + Debug
- [x] Implement EventBridge (emit, on, off)
- [x] Implement StateManager: currentDay, timeRemaining, activeTool
- [x] Implement basic DebugManager: event log + FPS counter, toggle with backtick key
- [x] Verify: events fire and log in debug overlay

### 1.4 Desk Scene Layout
- [x] Create desk background: simple pixel art rectangle layout with dark cold palette — a desk surface with areas for each tool
- [x] Define 5 tool areas on the desk: map (upper left), radar (upper right), radio (lower left), journal (lower center), manual (lower right) — sensor placement is part of the map
- [x] Each tool area is a labeled rectangle with a border — functional, not pretty
- [x] One tool area can be "active" — it visually highlights (brighter border, slight enlargement or overlay panel opens)
- [x] Clicking a tool area makes it active, dims the others
- [x] Clicking the active tool or pressing Escape deactivates it (returns to full desk view)
- [x] Verify: click each tool area — it activates, others dim, click again — deactivates

### 1.5 Day Timer
- [x] Add DAY_DURATION_SECONDS to constants (180 for testing, target 600-900)
- [x] Timer counts down in StateManager
- [x] Timer displayed as React overlay — visible in all states
- [x] Color changes: green → amber at 60s → red at 30s
- [x] Timer reaching 0 emits 'day:ended' via EventBridge
- [x] Verify: timer counts down, changes color, event fires

### 1.6 Main Menu
- [x] Create MainMenu.tsx — simple start screen with "New Game" button
- [x] App.tsx manages screen state: menu → playing → game over
- [x] Clicking "New Game" transitions to the desk scene
- [ ] "Continue" button added later in Milestone 5 when save system exists
- [x] Verify: game opens to main menu → click New Game → desk appears

### Milestone 1 Checklist
- [x] Main menu appears on launch with New Game button
- [x] Desk renders at 960×540 with all 5 tool areas
- [x] Click to activate/deactivate tools works
- [x] Timer counts down and fires event
- [x] EventBridge, StateManager, DebugManager working
- [x] Debug overlay toggles with backtick key
- [x] No console errors

---

## Milestone 2: "Radar and Map"

**Goal:** You can see the world outside.

### 2.1 Territory Data
- [x] Create territory data file with default values:
  - Grid: 10×10
  - 4 zones with names and grid boundaries
  - Bunker position: center-bottom of grid
  - 2 radio stations with positions, frequencies, coverage radii
  - Key landmarks per zone (3-4 total: gas station, warehouse, church, water tower)
- [x] All territory data in one TypeScript data file — easy to adjust later
- [x] Verify: data file imports cleanly, no type errors

### 2.2 Manual Panel
- [x] When manual tool is active: show static reference panel (React overlay)
- [x] Panel displays: radio station names, positions, and frequencies
- [x] Panel displays: zone names and brief descriptions
- [x] Panel displays: landmark names and locations
- [x] Content sourced from territory data file — not duplicated
- [x] Reading any section auto-logs that info to journal (creates journal entry with key)
- [x] Style: plain text on dark background, monospaced — functional, not pretty (art polish is Milestone 6)
- [x] Verify: open manual → read station frequencies → check journal → entry appeared with correct frequency data

### 2.3 Map Display
- [x] When map tool is active: show a grid overlay representing the territory
- [x] Grid cells colored by zone
- [x] Zone names displayed
- [x] Radio station symbols on correct cells
- [x] Landmark symbols on correct cells
- [x] Bunker position marked
- [x] Grid coordinates visible (A1, B3, etc.)
- [x] Style: functional grid with cold color palette, pixel art borders — not hand-drawn yet (art polish is Milestone 6)
- [x] Verify: map is readable, all data from territory file is displayed correctly

### 2.4 Sensor Placement
- [x] Player clicks a grid cell on the map to place the sensor
- [x] Sensor position highlighted with a distinct marker
- [x] Sensor range area shown (circle or highlighted cells around sensor position)
- [x] Sensor position stored in StateManager
- [x] Moving sensor clears previous radar echoes
- [x] Verify: click cell → sensor moves → range area updates → old echoes clear

### 2.5 Scripted Entities
- [x] Create SituationManager: tracks all entities, their paths, and current positions
- [x] Entity data structure: id, situationId, type (survivor/zombie), path (array of grid positions), speed, currentPathIndex
- [x] Implement one survivor on a scripted path
- [x] Implement one zombie on a different scripted path
- [x] Entities advance along paths over time (every N seconds, move to next path point)
- [x] Entity positions accessible to radar system
- [x] Verify: entities move along their paths, positions update in SituationManager

### 2.6 Radar Display
- [x] When radar tool is active: show circular CRT-style display (Phaser)
- [x] Radar is centered on the sensor position
- [x] "PULSE" interaction — player clicks to pulse
- [x] Pulse visual: expanding ring animation
- [x] After pulse: check which entities are within sensor range
- [x] Entities in range appear as blips at correct relative positions
- [x] Blips appear after pulse — color-coded by type in 4.0 (initially identical placeholders)
- [x] Blips fade after a few seconds (snapshot, not live tracking)
- [x] If no entities in range: "NO ECHOES" message
- [x] All pulse results auto-logged to journal (see 2.7)
- [x] Verify: place sensor near entity, pulse, see blip. Move sensor away, pulse, no blip.

### 2.7 Journal Foundation
- [x] Create journal: array of timestamped entries in StateManager
- [x] When journal tool is active: display scrollable entry list (React overlay)
- [x] Radar pulse results auto-log: "Radar pulse at [grid ref]: Echo detected at [grid ref], single entity moving" or "No echoes detected"
- [x] Manual readings auto-log when player views a section (see 2.2)
- [x] Verify: pulse radar → check journal → entry appeared

### Milestone 2 Checklist
- [x] Manual shows station frequencies, zones, landmarks
- [x] Manual readings log to journal
- [x] Map displays territory correctly
- [x] Sensor can be placed on map
- [x] Entities move on scripted paths
- [x] Radar pulse shows echoes for entities in range
- [x] Journal records radar observations and manual readings
- [x] All Milestone 1 features still work

---

## Milestone 3: "First Contact"

**Goal:** You can hear someone outside and respond.

### 3.1 Radio Display
- [x] When radio tool is active: show radio panel with frequency display and tuning control
- [x] Frequency tuner: React slider or buttons overlaying Phaser radio visual
- [x] Current frequency displayed prominently
- [x] Signal status indicator: "NO SIGNAL" / "SIGNAL DETECTED"
- [x] Verify: tuner changes frequency, display updates

### 3.2 Coverage System
- [x] Each frame: check if any entity is within any radio station's coverage radius
- [x] When entity is in coverage: store which station and frequency
- [x] When player's frequency matches a station that has an entity in coverage → signal active
- [x] Signal status updates in StateManager, emits 'radio:signalActive' / 'radio:signalLost'
- [x] Verify: entity walks into station range, player tunes to correct frequency → signal activates

### 3.3 Signal Indicator on Desk
- [x] When signal is active: subtle visual indicator visible on the desk view even when radio is not the active tool
- [x] Small blinking light on the radio area of the desk
- [x] Player knows contact is possible without staring at the radio
- [x] Verify: signal activates → blinking light visible from desk view

### 3.4 Basic Radio Test
- [x] When signal is active and radio tool is active: show "CONNECT" button
- [x] On connect: one hardcoded incoming message appears ("...hello? Can anyone hear me?")
- [x] Two hardcoded response options appear
- [x] Player clicks a response → it displays as sent → one hardcoded reply appears
- [x] Exchange logged to journal
- [x] This is throwaway test content — replaced by real dialogue system in Milestone 4
- [x] Verify: signal → connect → message → respond → reply → journal entry

### Milestone 3 Checklist
- [x] Frequency tuning works
- [x] Signal activates when frequency + coverage align
- [x] Signal indicator visible from desk view
- [x] Basic radio exchange completes end-to-end
- [x] Journal records radio exchanges
- [x] All Milestone 1-2 features still work

---

## Milestone 4: "The Core Loop"

**Goal:** Observe → Contact → Guide under pressure. The game exists.

### 4.0 Zombie Color on Radar
- [x] Survivors appear as green blips on the radar
- [x] Zombies appear as red blips on the radar
- [x] Entity type is passed through to RadarSystem when building blips after a pulse
- [x] Verify: pulse radar near both entity types — survivor is green, zombie is red

### 4.1 Dialogue System
- [x] Replace hardcoded radio test with dialogue system
- [x] Dialogue data structure: per situation, per radio session → conversation tree
- [x] Each node: NPC line + array of player options
- [x] Each option has: display text, required journal entry keys (if any), next node id, state effects
- [x] Options requiring missing journal entries appear greyed out with hint text
- [x] Player sees what they could say if they knew more
- [x] Situation 1 dialogue: Mara across 2 sessions, 4 locked options requiring radar evidence
- [x] Verify: dialogue flows correctly, greyed options appear, unlocked options work when journal has the right entries

### 4.2 Landmark-Based Guidance
- [x] Dialogue options reference landmarks from the territory data, not grid coordinates
- [x] Mara's session 1 references the gas station; session 2 references the water tower — matches actual path positions
- [x] Covered by situation content — dynamic position-checking is over-engineering for V1

### 4.3 Journal-Driven Unlocks
- [x] Radar observations create journal entries with semantic keys (radar:seen_<entityId>)
- [x] Station discovery creates journal entries (radar:discovered_<stationId>)
- [x] Dialogue options check requiredKeys against journal — greyed with hint when locked
- [x] Verified working: pulse radar → journal entry → dialogue option unlocks

### 4.4 The Pressure Test
- [x] Survivor lingers at Relay North (12 steps), zombie lingers at F5 (steps 5–13)
- [x] Collision occurs at step 13 if player hasn't warned Mara in time
- [x] Warning via dialogue (zombie_warning node) writes radio:survivor_warned to journal
- [x] SituationManager detects key and switches survivor to safe northern route
- [x] Collision detection marks survivor dead, logs CRITICAL journal entry, emits event
- [x] Zombies excluded from radio coverage — dead survivor can't be called after compromise
- [x] Verify: pressure test playable both ways — warn in time (safe route) or don't (survivor lost)

### 4.5 Debug Testing Tools
- [x] Entity positions visible on map overlay as colored dots (green/red) in debug mode
- [x] Phaser debug panel shows live station coverage with entity types
- [x] Debug mode shows all radio stations with one-click tuning
- [x] All debug visuals hidden in normal play
- [x] Toggled with backtick key
- [x] Verify: toggle debug → entity dots and coverage panel appear → toggle off → gone

### Milestone 4 Checklist
- [x] Dialogue system works with conditional unlocks
- [x] Greyed-out options visible with hints
- [x] Landmark-based guidance makes sense
- [x] Journal entries drive dialogue availability
- [x] Pressure test scenario is tense — warn or lose Mara
- [x] Debug tools show entity positions on map and radio station status
- [x] All previous milestone features still work

---

## Milestone 5: "The Operator"

**Goal:** Full experience for Situation 1 across multiple days.

### 5.1 Day Transition
- [ ] When timer expires: fade to black, brief "Night passes..." text
- [ ] During transition: advance entity positions along night movement paths
- [ ] Increment day counter
- [ ] Fade in to new day
- [ ] Verify: day ends → transition plays → new day starts with updated entity positions

### 5.2 Morning Messages
- [ ] At start of each day (after day 1): display messages from active survivors
- [ ] Messages appear as a React overlay before the player can act
- [ ] Messages describe what the survivor claims happened overnight
- [ ] Messages auto-log to journal
- [ ] After dismissing messages: player can pulse radar to verify actual positions
- [ ] Verify: day 2 starts → message appears → dismiss → pulse radar → positions may not match message

### 5.3 Auto-Save
- [ ] Save game state to browser localStorage at start of each new day
- [ ] State includes: day number, all entity positions and path progress, journal entries, dialogue history, situation outcomes
- [ ] On game start: check for existing save
- [ ] If save exists: add "Continue" button to MainMenu.tsx alongside "New Game"
- [ ] New Game clears the save
- [ ] Verify: play day 1 → night transition → day 2 starts → close browser → reopen → Continue loads day 2 state correctly

### 5.4 Situation 1: Lone Good Survivor (Complete Content)
- [ ] Write survivor's full scripted path across 2-3 days (day paths + night movements)
- [ ] Write 2-3 radio sessions distributed across days
- [ ] Write full dialogue trees for each radio session (8-12 exchanges total)
- [ ] Include dialogue options that unlock based on radar observations
- [ ] Include deliberately tricky moments where information is ambiguous
- [ ] Write morning messages for each day transition
- [ ] Define landmarks along this survivor's path
- [ ] Final decision available: guide to safety / reveal bunker / do nothing
- [ ] Verify: play Situation 1 from day 1 to final day — all systems working together, story flows

### Milestone 5 Checklist
- [ ] Day transition works with night entity movement
- [ ] Morning messages arrive and can be verified
- [ ] Auto-save and load working
- [ ] Situation 1 fully playable across multiple days
- [ ] All previous milestone features still work

---

## Milestone 6: "Trust No One"

**Goal:** Two situations. The game's thesis: no formula exists.

### 6.1 Situation 2: Lone Hostile Survivor (Complete Content)
- [ ] Write hostile survivor's full scripted path across days
- [ ] Path designed to overlap with Situation 1 timing — both survivors active on different days or overlapping
- [ ] Write radio sessions that FEEL identical to Situation 1 at first
- [ ] Include subtle inconsistencies that radar can reveal
- [ ] Write morning messages that contain lies verifiable against radar
- [ ] Final decision: if player reveals bunker → hostile knows location
- [ ] If player opens bunker for hostile → immediate game over
- [ ] Verify: play Situation 2 — feels like Situation 1 until details don't add up

### 6.2 End-of-Game Conditions
- [ ] Immediate game over: hostile enters bunker → game over screen
- [ ] Narrative endings at end of final day based on outcomes:
  - Good survivor saved + hostile stopped → best ending
  - Good survivor saved + hostile knows bunker location → tense ending
  - Good survivor lost → somber ending
  - Both lost → bleakest ending
- [ ] End screen: brief text describing what happened (React overlay)
- [ ] Option to start new game from end screen
- [ ] Verify: trigger each ending condition, confirm correct text displays

### 6.3 Art Polish
- [ ] Replace placeholder desk background with final pixel art
- [ ] Style all tool panels with consistent cold bunker aesthetic
- [ ] Map: add worn textures, faded zones, hand-drawn character
- [ ] Radar: CRT glow effect, subtle scan lines
- [ ] Radio: detailed frequency display, signal light
- [ ] Journal: notebook-style background
- [ ] Verify: entire game has consistent visual style

### 6.4 Sound Design
- [ ] Bunker ambient: low hum, ventilation (loops continuously)
- [ ] Radar pulse: sonar-style ping
- [ ] Radio: static when scanning, clean tone when signal locks
- [ ] Radio speech: crackle effect on dialogue text appearance
- [ ] Timer: subtle tick, warning tone when low
- [ ] Day transition: power-down / startup sounds
- [ ] Verify: play full game with sound — audio reinforces tension

### 6.5 Final Testing
- [ ] Full playthrough with both situations across all days
- [ ] Test all ending conditions
- [ ] Test save/load across multiple days
- [ ] Test all dialogue branches
- [ ] Verify morning message / radar gaps work for both situations
- [ ] Performance check: 60fps throughout
- [ ] Strip debug tools from production build
- [ ] Verify: game is playable start to finish with no bugs

### Milestone 6 Checklist
- [ ] Both situations fully playable
- [ ] All end conditions trigger correctly
- [ ] Art polished and consistent
- [ ] Sound design complete
- [ ] Save/load stable
- [ ] Game playable start to finish

---

## Future Expansions (Post-V1)

- [ ] **Physical Map Items (Miniatures)** — Replace click-to-place sensor with a draggable physical token the player drags from a tray onto the map. Expand to multiple placeable items (sensor, markers, pins) so the player can annotate the map and track things across days. Ties into the physical bunker aesthetic.
- [ ] **Paper Map Rework** — Replace the functional grid overlay with a proper paper map rendered in Phaser. Hand-drawn pixel art style: worn edges, zone names in handwritten font, landmarks as sketched icons, coffee stains, grid lines faint and irregular. The map must feel like a physical document found in a bunker, not a UI element.
- [ ] **Scanner Rework** — Replace the CRT radar circle with a proper physical scanner: rotating sweep line (sonar-style), echoes appear as the sweep passes over them, CRT phosphor glow effect, subtle scanlines, amber/green color theme. Must feel like a piece of Cold War military hardware.

These features are in the full GDD but cut from V1. The architecture
should not block any of them — when adding these, no existing system
should need to be rewritten.

- [ ] **Full Technical Manual** — upgrade static reference panel to browsable, multi-page manual with partially damaged/illegible entries creating permanent uncertainty.
- [ ] **Distance Zones (Far/Mid/Near)** — radar echo detail varies by distance from bunker.
- [ ] **Ambient Intercept** — audio + text fragments when entity is in Near zone.
- [ ] **Situation 3: Small Good Group** — pair with internal dynamics, cross-referencing accounts.
- [ ] **Situation 4: Small Hostile Group** — can eliminate good group if player doesn't intervene.
- [ ] **Cross-Situation Dynamics** — radar shows all entities regardless of situation, player can reveal/conceal groups.
- [ ] **First-Person Bunker View** — upgrade desk scene to full first-person perspective with close-up views and transitions.
- [ ] **Hand-Drawn Map Art** — upgrade functional grid map to full hand-drawn pixel art paper map.
- [ ] **3-5 Day Campaigns** — extend from 2-3 days to full length.
- [ ] **Progressive Game Over** — three hostiles knowing location triggers compromise.
