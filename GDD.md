# GDD — Bunker Operator (Working Title)

---

## Concept

The player is a lone operator inside a post-apocalyptic bunker. In front
of them: a console. Outside: a dangerous territory and people trying to
survive with no idea where to go.

The player is the only one with information about that territory. Survivors
have no map, no compass — they depend entirely on the operator to move and
stay alive. But not everyone asking for help is safe.

The game is a progression of information: you detect something on the radar,
localize it, establish contact when it enters radio coverage, then accumulate
data that changes what you can say and do. Guiding a survivor and evaluating
their intentions are the same action — one does not exist without the other.

Expected playtime: 30–75 minutes per full run.

---

## Presentation and Interaction Model

### First-Person Perspective

The player sees the game from a fixed first-person viewpoint — sitting in
a chair at the bunker console. The bunker is a physical space: desk, walls,
tools mounted or placed at different positions around you.

### Click-to-Focus Navigation

The player does not freely rotate or move. Instead, they click to focus on
a specific tool. The view shifts to show that tool filling the screen —
a close-up of the radar CRT, the paper map on the wall, the radio unit,
etc. The rest of the bunker is out of frame while focused on a tool.

This is similar to the interaction model in Five Nights at Freddy's —
fixed seat, click to shift focus between different views — but designed
entirely around the bunker operator experience.

Only one tool can be interacted with at a time. This is a physical
constraint, not a UI limitation: you can't read the manual while looking
at the radar because they're in different places. While you watch one area,
another is blind. While you talk on the radio, you can't see the radar.
This creates real tension and forces prioritization.

### Art Style

Mid-resolution pixel art with a limited, cold color palette. Inspired by
Papers Please — muted, desaturated, utilitarian. Grays, dull greens,
amber CRT glow. Nothing colorful. Everything feels worn, functional, and
old. The bunker looks like it was built in the Cold War and hasn't been
maintained since.

### Rendering Split

Phaser renders everything visual — the bunker room, tools, map, radar,
transitions between views, atmospheric effects (CRT glow, lighting).
React renders everything text-based and interactive — dialogue options,
journal entries, manual pages, timer display. React panels overlay
Phaser's visual world.

Rule: if you LOOK at it → Phaser draws it. If you READ or CLICK it →
React renders it.

### Target Resolution

960×540 pixels. This is exactly half of 1080p — every pixel scales to
a clean 2×2 block on a full HD display, with no blurring. The chunky
pixel density reinforces the retro bunker aesthetic while providing
enough screen space for the console tools.

---

## Game Loop

Day start:
- Read morning messages from survivors (what they say happened overnight)
- Verify with radar whether it matches reality
- Reorient — positions have changed

During the day (10–15 real minutes):
- Position the sensor on the map to monitor an area with radar
- Identify echoes: survivors, zombies, entity interactions
- Consult the manual for information on locations, frequencies, territory
- Information read is automatically logged in the journal
- When a survivor enters a radio station's coverage range, the radio
  activates — you can communicate
- Guide the survivor by describing what they see and will see
- Warn them of threats visible on radar
- Decide if and when to reveal the bunker's location
- Manage time — you cannot do everything

End of day:
- The timer expires — the day ends automatically
- Time jumps to the next day
- The world has moved on without you

---

## Session Structure

Duration: 3–5 days, 10–15 real minutes each. Exact number determined
during balancing.

No hard blocks: the game never stops for mistakes or inaction. If a
situation goes wrong, the world keeps moving. No mandatory tutorials.
Everything happens in-game.

Diegetic tutorial: the bunker manual is the only entry point to the
rules — it is part of the setting, not a separate system.

End of day: the day ends when the timer runs out. The player does not
control when — they operate until time is up.

Save system: the game allows mid-run saves between days. Players can
stop and return later. Saving happens automatically at the start of
each new day.

---

## The Map and the Territory

The map is a physical, paper document on the console. It is not a digital
UI — it looks like something found in a bunker. Hand-drawn style with
worn edges, coffee stains, and faded zones.

Structure:
- The territory is divided into 4–5 zones with evocative names (e.g.
  Industrial District, East Residential Zone)
- Each zone occupies a section of the grid
- The grid uses letter + number coordinates (e.g. A1, B3, D5)
- Zones have rigid boundaries on the grid

What the map shows:
- Zone boundaries with their names
- Radio station positions marked with a graphic symbol
- Schematic drawings of buildings and visible landmarks
- Some symbols are readable, others are not — the manual is damaged and
  some information remains ambiguous throughout the entire game

What the map does NOT show:
- Radio station frequencies (those are only in the manual)
- The exact nature of all symbols (the manual is incomplete)

The sensor is a physical pointer the player places on the map. It must be
active and pointed at a specific area to activate the radar there.
Monitoring one area means leaving all others blind.

---

## The Console

The console is the entire game interface. Every element is physical and
visible within the bunker space. The player has no menu — they have tools.

Only one tool can be used at a time. Using one means not monitoring the
others. This constraint is deliberate — it creates real tension and forces
prioritization.

### Analog Radio

- Manual tuning to radio station frequencies
- Active only when a survivor is within range of a radio station — out of
  coverage: silence
- Both sides can initiate contact — the operator can call out, survivors
  can call in
- Multiple-choice dialogue — options reflect the journal
- Choices change outcomes — a wrong response can kill the survivor or make
  them suspicious

### Technical Manual

- Static territory database: radio station frequencies, zone descriptions,
  landmarks, known hazards
- Fact-checking tool: verifies whether a survivor's claims match geographic
  reality
- The manual is partially damaged — some entries are missing or illegible,
  creating permanent zones of uncertainty
- Everything read is automatically recorded in the journal

### Journal

- The player's operational memory
- Automatically collects: manual readings, survivor messages, relevant
  information obtained via radio
- Unlocks dialogue options when information is relevant to the active
  situation
- Missing options appear greyed out — the player knows they could have said
  something, but lacked the information. The regret is part of the game.

### Paper Map

- Physical document representing the territory
- Hand-drawn pixel art style
- Base on which the sensor is positioned
- Essential for anticipating radio coverage windows and planning where to
  monitor with the radar

### Mobile Sensor

- Physical pointer manually positioned on the map
- Must be active and pointed at an area to enable radar there — no active
  sensor means no radar
- Monitoring one area means leaving all others blind
- The zone it occupies determines which tools are available (see Two
  Independent Systems section)

### Radar Monitor (CRT)

- Displays echoes in the area covered by the active sensor
- Activated by manual pulses — the player clicks to pulse
- Shows movements, positions, interactions between entities and zombies
- Allows comparing a survivor's declared position with their actual
  position on the radar

---

## Two Independent Systems: Zones and Radio Coverage

These are two separate systems operating in parallel.

### Distance Zones (determined by the sensor)

The sensor's position on the map determines which tools are available in
that area. The three zones are concentric around the bunker:

| Zone | Available tools |
|---|---|
| Far | Radar only — generic movements |
| Mid | Radar + Radio (if survivor is also in station coverage) |
| Near | Radar + Radio + Ambient intercept |

Zones introduce mechanics gradually as survivors approach the bunker.

### Ambient Intercept (Near zone only)

When an entity is in the Near zone, the player picks up unfiltered ambient
information from that area — both audio and text:

- Ambient sounds: footsteps, muffled voices, environmental noise (wind,
  debris, distant movement). Played through the console speakers.
- Text fragments: partial, overheard phrases appear on screen — like
  hearing a conversation through a wall. These are things the survivor
  did NOT choose to share.

This is powerful for trust verification: a survivor might say "I'm alone"
over the radio, but ambient intercept reveals a second set of footsteps
or a whispered conversation. The player gets raw, unedited information
that can confirm or contradict what they've been told.

### Radio Coverage (determined by stations)

Regardless of zone, the radio works only when the survivor is within range
of a fixed radio station.

Stations are fixed points in the territory. The player knows their
positions from the map and their frequencies from the manual. Coverage
windows — when contact begins and ends — are predictable.

Example: a survivor in the far zone can communicate via radio if they are
near a station — but the player will only see generic movements on radar,
with no detail.

Natural consequence: if you fail to communicate the right information
before the survivor moves out of coverage, you watch them move on radar
with nothing you can do.

---

## Guidance Through Natural Language

Survivors have no map and no compass. The player cannot give coordinates —
they must describe the territory in terms the survivor can understand while
walking through it.

The player guides through visible landmarks:
- "Do you see the gas station on your left? Turn there."
- "There's something moving behind the warehouse wall — don't stop, keep
  going straight."
- "You're about to reach an intersection. Take the wider road."

Dialogue options are built on this principle — every choice is a contextual
description, not an abstract command.

The player translates what they see on the map and radar into language the
survivor can use in the field.

Tactical implication: a hostile might pretend to have no map to appear
vulnerable. The player can test this by giving a deliberately wrong
description and watching the reaction.

---

## Information Progression

Information accumulates over time. Each new piece of information can unlock
dialogue options that did not exist before.

| Source | Type of information |
|---|---|
| Radar | Real positions, movements, entity interactions, zombies |
| Radio | What the survivor declares (true or false) |
| Ambient intercept | What is happening in the area unfiltered |
| Technical manual | Locations, station frequencies, territory data |
| Morning messages | What survivors say they did overnight — to be verified |

Unlock examples:
- Read in the manual that a gas station exists → the option appears to
  communicate it as a landmark. Map coordinates are the player's internal
  reference — they are never communicated to the survivor.
- See zombies approaching on radar → the option appears to warn the
  survivor by describing what they see.
- Receive a morning message → new information enters the journal, new
  options become available.

System rule: the player operates in two languages. Coordinates and map →
internal reference, never communicated. Landmarks and descriptions → what
gets passed to the survivor. Complexity emerges from the narrative, not
from additional mechanics.

---

## Night Transition

The day ends when the timer expires. There is no interactive night phase —
time jumps automatically to the next day.

At the start of the next day:
- Messages arrive from active survivors — they describe what they did and
  where they moved during the night
- The information is subjective: what they want you to know
- The radar reveals objective truth — real positions
- The gap between message and radar is where the game lives

The world continues at night without the player — survivors and zombies
follow their scripted paths. A survivor may have been eliminated and
someone may have taken their place. You receive a message from the "good
group" but something on the radar does not add up.

---

## Time Pressure

Each day lasts 10–15 real minutes. There is not enough time to do
everything.

There is no energy bar. Pressure comes from:
- Time running out
- Radio coverage windows opening and closing
- The impossibility of monitoring multiple areas simultaneously
- Irreversible choices whose consequences only appear the next day

While you watch one area, another is blind. While you talk on the radio,
you cannot see the radar. While you read the manual, survivors are moving.

---

## The 4 Situations

Fixed, hand-written, scripted. Each entity has: starting position, spawn
time, predetermined path, fixed behaviors and dialogue.

The player's decisions — guide, warn, ignore, reveal — change outcomes in
irreversible ways. Entities are unaware of each other's existence unless
the player tells them. Hostile entities move independently of each other.

### Situation 1 — Lone Survivor (Good)

Base case. The player learns the system by guiding someone whose account
is verifiable and consistent with the radar and manual.

### Situation 2 — Lone Survivor (Hostile)

Same format as Situation 1. The same actions lead to disaster. Teaches
that no formula exists — every situation must be read for what it is.

### Situation 3 — Small Group (Good)

A pair. More voices, internal dynamic between members. Verifying
consistency requires cross-referencing different accounts.

### Situation 4 — Small Group (Hostile)

A small hostile group. If it approaches the good group and the player does
not intervene — by warning the good group or blocking the hostile one —
the good group is eliminated. The player is the only one who sees both
echoes on radar and knows what is about to happen.

---

## Zombies

Lethal environmental hazards present in the territory. Visible as echoes
on radar. Follow scripted paths.

They must be avoided — the player sees them on radar and can warn survivors
via radio when in coverage. They are not to be interpreted like people:
they are an environmental threat, not a moral puzzle.

They add tension to guidance without complicating the evaluation of human
intentions.

---

## Cross-Situation Dynamics

Situations are not isolated. The radar shows all entities in the area
covered by the sensor, regardless of which situation they belong to.

The player can choose to reveal or conceal the existence of one group to
another. There are no guarantees about how that information will be used.

---

## Final Decision Per Situation

1. Do nothing — the survivor follows their scripted path, survives or dies
   without intervention
2. Guide — descriptions and warnings during radio coverage windows
3. Reveal the bunker's location — irreversible, available as long as the
   survivor does not already know it
4. Open the bunker — only when the survivor is physically at the door

**Open design question:** What does "open the bunker" look like in the
first-person view? Is there a door behind the player? A button on the
console? A new view position to click on? To be decided during Milestone 5
or 6 when the full situation flow is being built.

---

## Trust

Not a visible number. No bar, no indicator.

The player infers reliability from the intersection of:
- What the survivor declares over radio
- What the radar shows about their actual position
- What ambient intercept reveals
- What the manual says about the declared zone
- What morning messages describe vs. what the radar shows at the start of
  the day

The game never confirms whether a read was correct. You find out only when
you are wrong.

---

## End-of-Game Conditions

### Immediate Game Over

A hostile enters the bunker.

### Progressive Game Over

Three hostiles outside the bunker know its location — the bunker is
compromised, game over.

### Narrative Endings (end of days)

The ending depends on choices made: how many situations resolved, who
survived, whether you revealed positions, who you lost. Specific endings
are defined during content production.

---

## Sound Design (to be defined)

Sound is critical to the bunker atmosphere. Areas to define:
- Bunker ambient (hum, distant drips, ventilation)
- CRT monitor buzz
- Radio static and crackle
- Signal acquisition/loss sounds
- Radar pulse audio feedback
- Timer warnings (approaching day end)
- Atmospheric tension cues

Details to be determined during production.

---

## V1 Scope

- 4 fixed hand-written situations
- 3–5 days, 10–15 real minutes each (finalized during balancing)
- ~40–60 total radio exchanges across all situations
- Each situation has 2–3 radio sessions distributed across days
- Some silent days to build tension
- No energy bar — pressure comes from time
- Mid-run auto-save between days
- Procedural survivor generator: out of scope

---

## What This Game Is NOT

- No direct combat
- No complex physics
- No energy bar
- No explicit confirmation of who was hostile
- No tutorial separate from the game
- No special skills per survivor
- Hostile entities do not coordinate with each other
- No coordinates communicated to survivors — landmarks only
- No free camera movement — fixed seat, click to focus

---

## Development Milestones

### Milestone 1: "The Skeleton"

You can sit in the bunker and look around. The space exists.

- Rough bunker layout in pixel art (placeholder quality, correct style)
- Click-to-focus navigation between 5 tool positions
- View transitions when switching between tools
- Day timer on screen
- No tool functionality yet — just the physical space

Test: click between all tools, transitions work, timer counts down.

### Milestone 2: "Radar and Map"

You can see the world outside.

- Paper map with grid, zones, radio station markers (hand-drawn style)
- Sensor placement by clicking on the map
- Radar CRT with manual pulse — shows echoes in sensor range
- One scripted survivor moving on a fixed path
- One scripted zombie moving on a fixed path
- Distance zones working (Far: generic blips, Mid: more detail, Near: clear)

Test: place sensor, pulse radar, watch entities move on different paths.

### Milestone 3: "Radio Hardware"

You can hear someone.

- Radio with manual frequency tuning
- Coverage system — signal activates when survivor is near a station
- Incoming/outgoing contact capability
- One simple radio exchange (proof of connection, not full dialogue)
- Signal indicator visible from other views

Test: survivor enters coverage → radio signal activates → you exchange
a message.

### Milestone 4: "The Core Loop"

The game exists. Observe → Contact → Guide.

- Full dialogue system with multiple-choice options
- Journal auto-records radar observations, radio exchanges, manual readings
- Landmark-based guidance in dialogue options
- The pressure test: see danger on radar → switch to radio → warn survivor
  using landmark descriptions

Test: watch survivor on radar approaching zombies, switch to radio, guide
them to safety using landmarks. If this moment feels tense, the game works.

### Milestone 5: "The Operator"

Information drives decisions.

- Technical manual — browsable, partially damaged, auto-logs to journal
- Journal entries unlock dialogue options
- Greyed-out options showing what you could have said with more information
- Morning messages at start of each day
- Morning message vs. radar verification
- Situation 1 (Lone Good Survivor) complete across 2–3 days
- Auto-save between days

Test: full operator experience for one situation across multiple days.
Read the manual, use what you learn in radio conversations, verify stories
against radar, guide through landmarks, experience morning message gaps.

### Milestone 6: "The Full Game"

Everything.

- All 4 situations active across 3–5 days
- Cross-situation dynamics on radar
- All final decisions per situation
- All end-of-game conditions
- Zombies as environmental hazard
- Ambient intercept in Near zone
- Narrative endings
- Art polish and full atmosphere (sound, lighting, CRT effects)

Test: play the complete game from start to finish. Multiple playthroughs
to test different paths and endings.
