# Fluid Modular Video Grid — Feature Spec

## Origin

> "I want to implement a new layout for the video grid. The idea behind it is to better use real estate available on the screen by giving certain participants more space — the participants that are actively participating in the conversation."

The current Wire call UI gives every participant equal space regardless of whether they are speaking, sharing their screen, or sitting silently. This spec describes a replacement: a fluid, priority-aware grid that maximises the screen area given to participants who are actually doing something, while keeping passive viewers visible as compact thumbnails.

---

## Problem

In a multi-person call the most useful thing on screen is the person speaking or presenting, yet today's grid treats a silent observer the same as a screenshare. Additionally the layout is static — it doesn't adapt when someone starts speaking, turns their camera on, or when a small laptop joins versus a large monitor.

Goals:
- Give the most screen real estate to active participants (screensharing > speaking with camera > speaking without camera).
- Keep passive participants visible as small thumbnails as long as there is space.
- Gracefully overflow to a "+N more" tile when the grid is full.
- Animate layout changes so the eye can follow who moved where.
- Make it easy for designers and engineers to tune constants without running a full call.

Non-goals (deferred):
- Presenter / spotlight mode (one participant maximised)
- Mobile portrait layout
- Integration with existing Knockout view model (adapter pattern described separately)

---

## Architecture

```
apps/calling-grid-fixture/
├── src/
│   ├── App.tsx                    viewport picker + single grid instance
│   ├── FixtureInstance.tsx        grid + fixture controls (add, toggle, remove)
│   ├── useFixtureState.ts         per-instance participant state
│   ├── constants.ts               designer-tunable constants (HMR-friendly)
│   ├── mockData.ts                12 dummy participants with Unsplash photos
│   └── components/
│       └── FluidVideoGrid/
│           ├── FluidVideoGrid.tsx       React wrapper (useReducer + ResizeObserver)
│           ├── FluidVideoGrid.types.ts  all shared types
│           ├── gridReducer.ts           pure reducer — all layout logic lives here
│           ├── gridReducer.test.ts      29 pure unit tests, no DOM
│           ├── GridTile.tsx             full-size active participant tile
│           ├── FractionalTile.tsx       passive participant mini-grid
│           ├── SubTile.tsx              single passive slot
│           └── OverflowTile.tsx         "+N more" button
```

The `FluidVideoGrid` component is fully decoupled from the Wire data model. It takes a plain array of `GridParticipant` objects and a handful of callbacks. The fixture drives it with mock data; the production adapter (not yet built) will bridge Knockout observables to the same interface.

---

## Data Model

### `ParticipantTier`

Tiers encode participation level and drive all priority decisions:

| Tier | Condition | Slot type |
|---|---|---|
| `screen-sharing` | participant is sharing their screen | active full tile |
| `active-camera` | speaking + camera on | active full tile |
| `active-no-camera` | speaking + camera off | active full tile |
| `passive-camera` | silent + camera on | subtile inside fractional tile |
| `passive-no-camera` | silent + camera off | subtile inside fractional tile |

Tier derivation is a pure function with no side effects:

```ts
function deriveParticipantTier(p: {
  isSharingScreen: boolean;
  isSpeaking: boolean;
  hasCamera: boolean;
}): ParticipantTier
```

### `GridParticipant`

```ts
interface GridParticipant {
  id: string;
  name: string;
  avatarUrl?: string;          // portrait photo URL; always present in fixture
  hue?: number;                // HSL hue 0–359 for gradient fallback (no photo)
  renderVideo?: () => ReactNode; // absent = camera off, present = camera on
  tier: ParticipantTier;
  isMuted: boolean;
  speakingDuration: number;    // seconds; used for stable-slot eviction
}
```

The `renderVideo` render prop is the signal for camera-on state. In the fixture it returns an `<img>` with an Unsplash URL. In production it will return a `<video>` element pointing at the participant's media stream. When absent the tile renders a round avatar instead of a video feed.

### `GridConfig`

All designer-tunable geometry lives in `constants.ts` and is passed as a `GridConfig`:

```ts
interface GridConfig {
  minTileHeight: number;       // px — tiles never shrink below this
  maxTileHeight: number;       // px — tiles never grow beyond this
  minAspectRatio: number;      // e.g. 0.67 portrait / 1.33 landscape
  maxAspectRatio: number;      // e.g. 1.78 (16:9)
  subtilesPhase2: number;      // subtiles per fractional cell in Phase 2 (2)
  subtilesPhase3: number;      // subtiles per fractional cell in Phase 3 (4)
  tileGap: number;             // px gap between tiles
}
```

Current defaults (edit `constants.ts`, HMR applies instantly):

| Constant | Value |
|---|---|
| `MIN_TILE_HEIGHT` | `120` px |
| `MAX_TILE_HEIGHT` | `600` px |
| `MIN_ASPECT_RATIO` | `0.67` |
| `MAX_ASPECT_RATIO` | `1.78` |
| `SUBTILES_PHASE_2` | `2` |
| `SUBTILES_PHASE_3` | `4` |
| `TILE_GAP` | `4` px |

---

## Speaker Debounce Layer

The fixture applies a debounce layer between raw speaking state and the tier that the grid component sees. This prevents coughs, brief interjections, or everyone-talking-at-once from causing a waterfall of tile swaps.

### Parameters

| Constant | Default | Fixture slider |
|---|---|---|
| `SPEAKING_DEBOUNCE_MS` | `1500` ms | "Promotion delay" — 0.5 s … 4 s |
| `PRIME_HOLD_MS` | `10 000` ms | "Front-page hold" — 3 s … 30 s |

### Promotion rule

A participant earns a prime (active) tile only after speaking **continuously** for ≥ `SPEAKING_DEBOUNCE_MS`. Momentary noise (< 1.5 s) is filtered out with no layout change.

Once promoted, the hold timer `PRIME_HOLD_MS` is reset **on every tick** while the participant is still speaking — so the hold counts down from when they **stop** talking, not from when they were first promoted. This means a participant who speaks for 5 minutes holds their tile for 10 s after going quiet.

A participant is **demoted** when both conditions are true:
- They are not speaking (raw `isSpeaking === false`)
- `PRIME_HOLD_MS` has fully elapsed since they last spoke

### Screen-sharing bypass

Participants with `isSharingScreen === true` are promoted immediately on every tick (no debounce). Their hold timer also resets every tick while sharing, so they remain in a prime tile for the full hold duration after they stop sharing.

### How this maps to the grid

`toGridParticipant` in `useFixtureState.ts` passes `promotedIds.has(p.id)` as the `isSpeaking` argument to `deriveParticipantTier`. The `FluidVideoGrid` component receives only the final `tier` — it has no knowledge of the debounce layer.

### Conversation simulation

The fixture includes a **simulate** toggle (🤖) that randomly fires speech events without manual interaction:

- Up to 3 concurrent speakers at any time
- Each speech event lasts 2.2 – 8.2 s (random)
- Inter-speech gap: 0.7 – 2.3 s (random)
- 80 % chance of scheduling a new speaker when the gap expires
- Muted and screen-sharing participants are excluded from selection

The simulation runs inside the same rAF tick loop as the debounce logic (`useFixtureState.ts`). Disabling the toggle immediately silences all simulation-started speakers.

---

## Layout Algorithm

All layout logic lives in the pure reducer (`gridReducer.ts`). No React, no DOM, no side effects — just state in, state out.

### Step 1 — Stable slot map

Every participant has a numeric slot index that persists across renders. This is what prevents tiles from jumping around when tier order changes.

Rules:
1. Participants are grouped by tier (`screen-sharing` first, `passive-no-camera` last).
2. Within each tier group, participants keep their relative slot order from the previous render.
3. New participants are appended at the end of their tier group.
4. Removed participants are compacted out; remaining relative order is preserved.

Tier *changes* (upgrades/downgrades) cause a participant to move to a new tier group. Within the new group they are a "new arrival" and land at the end until the next render cycle.

### Step 2 — Grid dimensions

The algorithm iterates `rows = 1..20` and for each:
1. Computes `tileH = (containerH − gap × (rows−1)) / rows`, clamped to `[minTileHeight, maxTileHeight]`.
2. Derives `cols = floor((containerW + gap) / (tileH × targetAspect + gap))` where `targetAspect = (minAspect + maxAspect) / 2`.
3. Computes `totalCells = rows × cols`.

Two candidates are tracked across the loop:
- **Best fit**: the `(rows, cols)` with the largest `tileH` such that `totalCells ≥ targetCells`. `targetCells` is the cell count required by the selected subtiling phase (see Step 3).
- **Fallback**: the `(rows, cols)` with the most cells overall (used when the container is too small to achieve `targetCells` within tile-height bounds; tiebreak: largest `tileH`).

### Step 3 — Subtiling phase selection

Grid cells are split into active cells and fractional cells:

```
activeCells     = min(activeParts.length, totalCells)
fractionalCells = totalCells − activeCells
```

The algorithm selects the lowest-numbered phase that can accommodate all passive participants.

#### Phase 1 — Full tiles for everyone

Used when the grid has enough cells to give every participant a full tile:

```
condition: totalParticipants ≤ totalCells
```

Every participant — active and passive alike — occupies a full-size tile. No fractional tiles exist. `targetCells = totalParticipants`.

#### Phase 2 — Half-width subtiles

Used when the total participant count exceeds the full-tile grid capacity:

```
condition: passiveParts.length ≤ fractionalCells × 2
```

Active participants keep their full tiles. Each remaining cell becomes a fractional tile split into **2 subtiles side by side** (each subtile is half the tile width). `targetCells = activeCells + ceil(passiveParts.length / 2)`.

#### Phase 3 — Quarter-width subtiles

Used when Phase 2 capacity is also exhausted:

```
condition: passiveParts.length ≤ fractionalCells × 4
```

Each fractional cell is split into **4 subtiles in a 2×2 grid** (each subtile is one quarter of the tile area). `targetCells = activeCells + ceil(passiveParts.length / 4)`.

#### Overflow

When passive participants still exceed Phase 3 capacity, the last subtile becomes the overflow tile:

```
passiveSlots    = fractionalCells × 4
visiblePassive  = passiveParts[0 .. passiveSlots−2]
overflowPassive = passiveParts[passiveSlots−1 ..]   // shown as "+N more"
```

**Invariant:** Within any single render, all full tiles are identical in size and all subtiles are identical in size. The phase never mixes subtile sizes — the entire passive area upgrades together from Phase 2 to Phase 3.

Cells array: active cells first (in slot order), then fractional cells, each containing subtiles according to the current phase.

---

## Component API

### `FluidVideoGrid`

```tsx
interface FluidVideoGridProps {
  participants: GridParticipant[];
  config: GridConfig;
  onViewAllParticipantsSelected?: () => void;
}
```

Internally wires together:
- `useReducer(createGridReducer(config), createInitialState({width:0, height:0}))`
- `ResizeObserver` on the container div → dispatches `SET_CONTAINER_SIZE`
- Diff effect on `participants` prop → dispatches `ADD_PARTICIPANT`, `REMOVE_PARTICIPANT`, `UPDATE_PARTICIPANT`

### Reducer actions

| Action | Payload |
|---|---|
| `ADD_PARTICIPANT` | `participant: GridParticipant` |
| `REMOVE_PARTICIPANT` | `id: string` |
| `UPDATE_PARTICIPANT` | `id: string; changes: Partial<GridParticipant>` |
| `SET_CONTAINER_SIZE` | `width: number; height: number` |

Every action recomputes both the slot map and the layout before returning the new state.

---

## Tile Visual Spec

### Common

| Property | Value |
|---|---|
| Background | `#34373D` |
| Border radius (outer tile) | `6px` |
| Border radius (subtile) | `4px` |
| Active speaker ring | `inset 0 0 0 3px #0667C8, inset 0 0 0 6px #fff` |
| Ring transition | `box-shadow 0.3s ease` |

### `GridTile` — full-size active tile

**Camera on (`renderVideo` present)**
- `renderVideo()` fills the tile absolutely (`position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover`)

**Camera off (`renderVideo` absent)**
- Centered round avatar, `84px × 84px`, `border-radius: 50%`
- Uses `avatarUrl` as portrait photo, or hue-gradient initials as fallback

**Name pill** (bottom-center, always shown)
- Background: `#000` normally, `#0667C8` when active speaker
- White text, `11px`, `font-weight: 500`, `letter-spacing: 0.4px`
- Padding `4px 6px`, `border-radius: 3px`
- Truncated at `calc(100% − 16px)`

**Mute badge** (bottom-left, shown when `isMuted`)
- White `22×22px` square, `border-radius: 4px`
- Red microphone-with-slash SVG (`#C20013`)

### `SubTile` — passive thumbnail

Same structure as `GridTile` at smaller scale:
- Avatar: `46px × 46px`
- Active speaker ring: `inset 0 0 0 2px #0667C8, inset 0 0 0 4px #fff`
- Name pill: `10px` font
- Mute badge: `18×18px`

### `FractionalTile` — passive mini-grid

Layout is fixed per phase — all fractional tiles in a given render use the same subdivision:

| Phase | Subtiles per tile | Layout |
|---|---|---|
| Phase 2 | 2 | 1 row of 2 side by side (`flex-direction: row`) |
| Phase 3 | 4 | 2×2 grid (`flex-direction: column`, each row `flex-direction: row`) |

Each subtile within a fractional tile occupies an equal share of the tile area. The last fractional tile may contain fewer subtiles than the phase maximum (e.g. a single passive participant in Phase 2), but each occupied slot is rendered at the same fixed size as all other subtiles — the tile does not stretch to fill empty slots.

Rendered with `gap: 4px` between subtiles in both axes.

### `OverflowTile` — "+N more"

- Background `#34373D`, hover `#3d4046`
- Up to 3 stacked overlapping avatar circles (`30×30px`, `border-radius: 50%`, offset `18px` each, `border: 2px solid #34373D`)
- White `+N more` label, `11px`, `font-weight: 600`
- `onClick` calls `onViewAllParticipantsSelected`

---

## Transitions

`framer-motion` is used for layout animations. Every tile wrapper is a `<motion.div layout>` inside `<AnimatePresence>`. Because tile keys are stable participant IDs, Framer automatically interpolates position/size between renders (FLIP). Enter/exit uses `opacity` + `scale` (`0.9 → 1`, `250ms`).

```tsx
<motion.div
  key={stableKey}
  layout
  initial={{opacity: 0, scale: 0.9}}
  animate={{opacity: 1, scale: 1}}
  exit={{opacity: 0, scale: 0.9}}
  transition={{duration: 0.25, ease: 'easeOut'}}
>
```

---

## Fixture App

The fixture is a standalone Nx app (`nx run calling-grid-fixture:serve`) for visual development and design review — no call required.

### Viewport picker

A dropdown in the header selects from `VIEWPORT_CONFIGS`. The single `FixtureInstance` resizes to match but never remounts, so participant state is preserved when switching viewports.

### Controls panel

Below the grid, for each participant:
- Name chip
- **Speak** toggle (makes them active speaker, increments `speakingDuration`)
- **Camera** toggle (sets `renderVideo` when on, clears it when off)
- **Screen** toggle (sets tier to `screen-sharing`)
- **×** remove button

An **Add participant** button picks the next mock from `mockData.ts` (12 participants with Unsplash portrait and screenshare URLs).

### Mock data

12 participants with:
- Stable Unsplash photo IDs (no rate-limit issues)
- Portrait URL: `?w=320&h=480&fit=crop&auto=format`
- Screenshare URL: `?w=1280&h=720&fit=crop&auto=format`
- Unique `hue` value (spaced 47° apart) for gradient fallback

---

## Unit Tests

`gridReducer.test.ts` — 29 pure tests, `testEnvironment: 'node'`, no DOM:

```
ADD_PARTICIPANT — adds, screen-sharing first, passive goes fractional
UPDATE_PARTICIPANT (upgrade) — passive→active, eviction by speakingDuration, non-evicted slots stable
UPDATE_PARTICIPANT (downgrade) — active→passive, vacated slot claimed by next passive
overflow — appears at threshold, correct count+avatars, adding one more increments count
SET_CONTAINER_SIZE — smaller reduces cols, tiles stay in bounds, slots unchanged on resize
stable slot assignment — unchanged tier keeps slot, two simultaneous upgrades resolved by speakingDuration
```

Run with: `nx run calling-grid-fixture:test`

---

## Future: Production Adapter

When integrating into the Wire webapp the adapter will bridge Knockout observables to `GridParticipant`. It will live in `apps/webapp/` and should not touch the `FluidVideoGrid` component itself.

```ts
function toGridParticipant(p: WireParticipant): GridParticipant {
  return {
    id: p.clientId,
    name: p.user.name(),
    avatarUrl: p.user.mediumPictureResource()?.generateUrl(),
    renderVideo: p.hasActiveVideo()
      ? () => <video ref={attachStream(p.videoStream())} autoPlay muted playsInline />
      : undefined,
    tier: deriveParticipantTier({
      isSharingScreen: p.sharesScreen(),
      isSpeaking: p.isActivelySpeaking(),
      hasCamera: p.sharesCamera(),
    }),
    isMuted: p.isMuted(),
    speakingDuration: p.speakingDurationMs() / 1000,
    hue: stableHueFromId(p.clientId),
  };
}
```

The adapter renders `<FluidVideoGrid participants={...} config={GRID_CONFIG} onViewAllParticipantsSelected={openParticipantList} />` in place of the current grid component.

---

## Open Questions / Known Gaps

- **Gap value**: prototype uses `8px`, current constant is `4px` — compare against Figma and update if needed.
- **Avatar size in large camera-off tiles**: `84px` may feel too small when the tile is `500px` tall; consider scaling avatar relative to tile size.
- **Presenter mode**: deferred — will need a separate `presenterLayout` branch in the reducer or a separate component.
- **Mobile portrait**: deferred — min/max aspect ratio constants are the main lever, but may need dedicated breakpoints.
- **Screen-share badge**: not yet rendered on `GridTile` (spec mentions it; not implemented).
- **`speakingDuration` tracking**: currently incremented manually in fixture; production adapter needs a timer that accumulates while `isSpeaking === true`.
