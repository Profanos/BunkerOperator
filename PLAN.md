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
- [ ] Verify all panel overlays align with art at 960×540

### 1.2 Dead Code Cleanup
- [x] Delete orphaned `TimerDisplay.tsx`
- [x] Remove duplicate `GRID_COLS`/`GRID_ROWS` from `constants.ts`
- [x] Update CLAUDE.md folder structure to match actual files

### 1.3 Dev Tooling
- [ ] Add coordinate overlay to debug mode — live mouse x,y on Phaser canvas when debug is active
- [ ] Verify scenario injection works (debug skip day, debug reset)

### 1.4 Audio Inventory
- [ ] Document every sound the game needs: ambience, SFX, music
- [ ] Define mood, trigger conditions, and priority for each sound
- [ ] This is a planning document, not implementation

### 1.5 Design Bible
- [ ] Screenshot every panel and the desk view
- [ ] Catalogue every piece of text and button visible in the art
- [ ] For each element: is it functional? Should it be? What happens on interaction?
- [ ] Define the rules: if it's in the art, it must be meaningful or removed
- [ ] This document drives ALL Phase 2 art work

### 1.6 Performance
- [ ] Verify 60fps throughout full playthrough
- [ ] Profile any frame drops during transitions or heavy scenes

### Phase 1 Checklist
- [ ] All bugs fixed
- [ ] No dead code
- [ ] Dev tooling ready
- [ ] Audio inventory written
- [ ] Design bible complete
- [ ] 60fps confirmed

---

## Phase 2: The Real Game

Three layers, built bottom-up. Each layer depends on the one below it.

### Layer 1: Narrative Frame

Story and onboarding. No art dependencies — can start immediately
after Phase 1.

#### L1.1 Narrative Premise (Incipit)
- [ ] Design the story frame that explains why the player is here
- [ ] Write the incipit text/sequence
- [ ] The player should understand scan → contact → decide within 90 seconds
- [ ] Priority: player discovers things on their own, minimal hand-holding

#### L1.2 New Game Intro Screen
- [ ] Design the intro sequence for new games
- [ ] Present the premise, establish stakes
- [ ] Implement as React overlay sequence before gameplay starts

#### L1.3 Continue Screen
- [ ] Design progress summary for returning players
- [ ] Show: current day, contacts made, key decisions
- [ ] Implement as React overlay before gameplay resumes

#### L1.4 Story Improvements
- [ ] Review and deepen Mara arc (dialogue pacing, ambiguity)
- [ ] Review and deepen Kael arc (subtle inconsistencies)
- [ ] Assess whether Situations 3 & 4 belong in beta or post-beta

### Layer 2: Systems

Foundational mechanics that all art depends on. These must be built
before Layer 3 — you can't design panel art without knowing the
energy states.

#### L2.1 Energy Management System
- [ ] Add energy budget to StateManager (finite per day, resets at dawn)
- [ ] Each tool costs energy to power on
- [ ] Player chooses what's active — can't run everything at once
- [ ] Energy state exposed to both Phaser (panel visuals) and React (UI indicators)
- [ ] Define energy costs per tool and daily budget

#### L2.2 Map Rework
- [ ] Move map from React overlay to Phaser layer
- [ ] Implement drag-and-drop sensor token (replaces click-to-place)
- [ ] Implement drag-and-drop miniatures for marking positions
- [ ] Map only visible when powered (energy system integration)
- [ ] Map goes dark/inactive when unpowered

#### L2.3 Radio Contact Identity
- [ ] New UI element on radio panel showing contact status
- [ ] Unknown contact: question mark silhouette
- [ ] During conversation: details gradually revealed
- [ ] After trust established (or broken): face / identity shown
- [ ] Connects to the trust/deception core mechanic

### Layer 3: Identity

Art, audio, and character. Built on top of working systems from
Layer 2. Only start this when Layer 2 is solid.

#### L3.1 Design Audit & Flavour
- [ ] Apply design bible rules from Phase 1
- [ ] Add flavour touches: marker annotations (e.g. exclamation on Friendly tab),
      handwritten notes, coffee stains, wear marks
- [ ] Every visible element either does something or tells the player something
- [ ] Remove any art text/buttons that aren't functional

#### L3.2 Main Menu Rework
- [ ] New menu art (replace current AI-looking asset)
- [ ] Credits: Francesco Bacocco, HookDev Games
- [ ] Clean, intentional design matching bunker aesthetic

#### L3.3 Opening Screen & Splash
- [ ] HookDev Games hook animation on boot
- [ ] Transition from splash → main menu
- [ ] Update existing SplashScreen.tsx

#### L3.4 Panel Art Rework
- [ ] Every panel redesigned around energy states (on / off / low power)
- [ ] Consistent Cold War bunker aesthetic across all panels
- [ ] Off state: dark, inactive, physically powered down
- [ ] On state: lit, functional, equipment hum

#### L3.5 Scanner Visual Rework
- [ ] Rotating sweep line (sonar-style)
- [ ] CRT phosphor glow effect
- [ ] Subtle scanlines
- [ ] Must feel like Cold War military hardware

#### L3.6 Paper Map Art
- [ ] Hand-drawn pixel art textures for the Phaser map layer
- [ ] Worn edges, faded zones, handwritten font for zone names
- [ ] Landmarks as sketched icons
- [ ] Physical document feel — not a UI element

#### L3.7 Audio Implementation
- [ ] Background ambience: bunker hum, ventilation, distant drips
- [ ] Radar: sonar ping on pulse
- [ ] Radio: static when scanning, clean tone on signal lock, crackle on dialogue
- [ ] Timer: subtle tick, warning tone approaching day end
- [ ] Day transition: power-down / startup sounds
- [ ] Music: tension tracks, quiet moments

### Phase 2 Checklist
- [ ] Narrative intro plays on new game — player understands the situation
- [ ] Continue screen shows progress summary
- [ ] Energy system forces meaningful tool choices
- [ ] Map is a Phaser layer with drag-and-drop tokens
- [ ] Radio shows contact identity progression
- [ ] All art consistent and meaningful
- [ ] Audio reinforces atmosphere
- [ ] Full playthrough with both situations — no bugs

---

## Future Expansions (Post-Beta)

- [ ] **Full Technical Manual** — browsable, multi-page, partially damaged entries
- [ ] **Distance Zones (Far/Mid/Near)** — radar echo detail varies by distance
- [ ] **Ambient Intercept** — audio + text fragments when entity is in Near zone
- [ ] **Situation 3: Small Good Group** — pair with internal dynamics
- [ ] **Situation 4: Small Hostile Group** — can eliminate good group
- [ ] **Cross-Situation Dynamics** — radar shows all entities, player reveals/conceals
- [ ] **First-Person Bunker View** — upgrade desk to full first-person perspective
- [ ] **3-5 Day Campaigns** — extend from 3 days to full length
- [ ] **Progressive Game Over** — three hostiles knowing location = compromised
