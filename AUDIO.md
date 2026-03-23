# AUDIO.md — Bunker Operator Audio Inventory

Mood: Cold War military hardware. Isolated. Functional. Tense.
No music during active gameplay — silence is part of the atmosphere.
Everything heard is diegetic: the bunker, the machines, the radio.

---

## Priority 1 — Ambience (sets the room, plays always)

| Sound | Description | Trigger | Loop |
|---|---|---|---|
| Bunker hum | Low electrical hum, ventilation drone | Game start | Yes |
| CRT buzz | Subtle high-frequency monitor buzz | Game start | Yes |

---

## Priority 2 — Scanner SFX (core interaction loop)

| Sound | Description | Trigger |
|---|---|---|
| Pulse ping | Sonar-style ping, clean and sharp | SCAN pressed |
| Echo detected | Short blip/chirp per entity found | Entity appears on grid |
| No echo | Flat tone, brief | Pulse with no contacts |
| Recharging tick | Subtle mechanical clicking | During 6s cooldown |
| Ready click | Solid mechanical click | Cooldown complete, READY |

---

## Priority 3 — Radio SFX

| Sound | Description | Trigger |
|---|---|---|
| Static (idle) | White noise, low volume | Radio on, no signal |
| Signal lock | Clean tone rising, then stable | Signal acquired |
| Signal lost | Tone drops to static | Signal lost |
| Transmission crackle | Short crackle burst | Each dialogue line appears |
| Connect click | Button press sound | CONNECT pressed |
| Frequency tune | Small mechanical click | Each frequency step |

---

## Priority 4 — Day Transition

| Sound | Description | Trigger |
|---|---|---|
| Power down | Equipment shutting off, hum fades | Night fade starts |
| Night silence | Complete silence (no ambience) | Black screen |
| Power up | Equipment spinning back up | New day fade in |

---

## Priority 5 — Energy System

| Sound | Description | Trigger |
|---|---|---|
| Low power warning | Slow repeating beep | Energy ≤ 20% |
| Power depleted | Thud + silence (tool shuts off) | Tool goes dark |
| Solar trickle | Faint electrical charge sound | Scan cell while low energy |

---

## Priority 6 — Timer

| Sound | Description | Trigger |
|---|---|---|
| Timer warning | Subtle ticking begins | ≤ 60 seconds |
| Timer critical | Ticking faster | ≤ 30 seconds |
| Day end | Single tone | Timer hits zero |

---

## Priority 7 — Music

Music plays only at specific narrative moments — never during gameplay.

| Track | Mood | Trigger |
|---|---|---|
| Main menu theme | Cold, sparse, minimal | Menu screen |
| Incipit underscore | Tension building | New game intro sequence |
| Ending — saved | Quiet resolution | Good ending |
| Ending — lost | Hollow, empty | Bad ending |
| Ending — compromised | Sudden cut to silence | Bunker compromised |

---

## Implementation Notes

- All ambience loops: fade in on game start, fade out on transition
- Radio static and signal lock: crossfade between the two states
- No jump scares, no loud sudden sounds — everything is controlled
- All volumes tunable via the volume dial (wired in Layer 3)
- Files go in public/assets/audio/sfx/ and public/assets/audio/music/
