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
│           ├── gridReducer.test.ts      68 pure unit tests, no DOM
│           ├── GridTile.tsx             full-size tile
│           ├── FractionalTile.tsx       fractional tile (2/3/4/6 subtiles)
│           ├── SubTile.tsx              single subtile
│           └── OverflowTile.tsx         "+N more" button
```

The `FluidVideoGrid` component is fully decoupled from the Wire data model. It takes a plain array of `GridParticipant` objects and a handful of callbacks. The fixture drives it with mock data; the production adapter (not yet built) will bridge Knockout observables to the same interface.

---

## Data Model

### `ParticipantTier`

Tiers encode participation level and drive all priority decisions. The `'you'` tier is always the highest priority and is reserved for the local user's own video.

| Tier | Condition | Priority |
|---|---|---|
| `you` | local user's own video (always present) | 0 — highest |
| `screen-sharing` | participant is sharing their screen | 1 |
| `active-camera` | speaking + camera on | 2 |
| `active-no-camera` | speaking + camera off | 3 |
| `passive-camera` | silent + camera on | 4 |
| `passive-no-camera` | silent + camera off | 5 — lowest |

All six tiers compete for the same pool of full tiles. The fractional tile only appears when the total participant count exceeds the grid's capacity; there is no hard split between "active" and "passive" participants.

Tier derivation is a pure function with no side effects:

```ts
function deriveParticipantTier(p: {
  isYou: boolean;
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
  avatarUrl?: string;          // portrait photo URL
  hue?: number;                // HSL hue 0–359 for gradient fallback (no photo)
  renderVideo?: () => ReactNode; // absent = camera off, present = camera on
  tier: ParticipantTier;
  isMuted: boolean;
  speakingDuration: number;    // accumulated speaking time in seconds
  activatedAt?: number;        // ms timestamp when this tier was entered; drives recency ordering within active tiers
}
```

`activatedAt` is set automatically by the reducer when a participant is added with an active tier or when their tier changes. Passing `now` explicitly in an action makes tests deterministic.

The `renderVideo` render prop is the signal for camera-on state. In the fixture it returns an `<img>` with an Unsplash URL. In production it will return a `<video>` element pointing at the participant's media stream. When absent the tile renders a round avatar instead of a video feed.

### `GridConfig`

All designer-tunable geometry lives in `constants.ts` and is passed as a `GridConfig`:

```ts
interface GridConfig {
  minTileHeight: number;       // px — tiles never shrink below this
  maxTileHeight: number;       // px — tiles never grow beyond this
  minAspectRatio: number;      // e.g. 0.67 portrait
  maxAspectRatio: number;      // e.g. 1.78 (16:9)
  tileGap: number;             // px gap between tiles and between subtiles
}
```

Current defaults (edit `constants.ts`, HMR applies instantly):

| Constant | Value |
|---|---|
| `MIN_TILE_HEIGHT` | `120` px |
| `MAX_TILE_HEIGHT` | `600` px |
| `MIN_ASPECT_RATIO` | `0.67` |
| `MAX_ASPECT_RATIO` | `1.78` |
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

The fixture includes a **simulate** toggle that randomly fires speech events without manual interaction:

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

Every participant has a numeric slot index (lower = rendered earlier) that persists across renders, preventing tiles from jumping around when tier or state changes.

Participants are grouped into six tiers in priority order. Within each group the sort rule differs:

- **Active tiers** (`you`, `screen-sharing`, `active-camera`, `active-no-camera`): sorted by `activatedAt` **descending** — the most recently activated participant gets the lowest slot (front of queue). Ties fall back to the previous slot map (stable).
- **Passive tiers** (`passive-camera`, `passive-no-camera`): stable sort by previous slot map — add order preserved, new arrivals go last.

When a participant's tier changes, the reducer sets `activatedAt = now` on the participant. This means an upgrade is always treated as the most recent arrival in the new tier group, placing that participant at the front of their group.

### Step 2 — Grid capacity bounds

```
usableW = containerW - 2 * gap
usableH = containerH - 2 * gap
minTileWidth = minTileHeight * minAspectRatio

maxCols = floor((usableW + gap) / (minTileWidth + gap))
maxRows = floor((usableH + gap) / (minTileHeight + gap))
capacity = maxCols * maxRows
```

`maxCols` and `maxRows` represent the absolute maximum columns/rows before tiles shrink below `minTileHeight × minAspectRatio`. The actual layout will use ≤ these values.

### Step 3 — Tile counts

All participants compete for the same pool of grid slots, sorted by slot index from Step 1:

```
if nParticipants ≤ capacity:
    nFullTiles = nParticipants
    hasFractional = false
else:
    nFullTiles = capacity - 1    // last slot becomes the fractional tile
    hasFractional = true
nTiles = nFullTiles + (hasFractional ? 1 : 0)
```

The fractional tile only exists when the total participant count exceeds the grid capacity. There is no concept of "active" vs "passive" tiles — any participant can occupy a full tile based purely on their priority.

### Step 4 — Optimal (nRows, nCols) for nTiles

Enumerate `nCols` from `1` to `maxCols`. For each, compute `nRows = ceil(nTiles / nCols)`. Skip if `nRows > maxRows`. Compute tile dimensions and score; pick the highest-scoring layout:

```
tileH_raw = (usableH - gap * (nRows - 1)) / nRows
tileH = clamp(tileH_raw, minTileHeight, maxTileHeight)
tileW_raw = (usableW - gap * (nCols - 1)) / nCols
tileW = clamp(tileW_raw, tileH * minAR, tileH * maxAR)

hasNaturalWidth = tileW_raw >= tileH * minAspectRatio
score = (hasNaturalWidth ? 1e9 : 0) + tileW * tileH
```

The `hasNaturalWidth` bonus strongly prefers layouts where the container width is naturally wide enough — this avoids portrait tiles in wide containers where a fewer-column layout would require artificially expanding tile width. Among layouts with equal natural-width status, area (`tileW × tileH`) is maximised.

**Invariant:** `nActualCols * tileWidth + (nActualCols-1) * gap ≤ usableW` is satisfied by construction (not just in capacity terms but for the actual rendered tile dimensions).

### Step 5 — Fractional tile

When `hasFractional` is true, participants `sorted[nFullTiles..]` go into the fractional tile. The fractional tile is subdivided into a fixed grid of subtiles. Capacities are restricted to `{2, 3, 4, 6}`:

| subRows | subCols | Capacity |
|---|---|---|
| 1 | 2 | 2 |
| 2 | 1 | 2 |
| 1 | 3 | 3 |
| 3 | 1 | 3 |
| 2 | 2 | 4 |
| 2 | 3 | 6 |
| 3 | 2 | 6 |

Selection criteria:
1. Filter out candidates where subtile dimensions fall below the minimum size (`minTileHeight / 2` height; `(minTileHeight / 2) * minAspectRatio` width).
2. If subtile participants fit within capacity: pick **smallest** capacity (minimise empty slots). Tie-break: subtile AR closest to tile AR.
3. If no capacity fits all subtile participants (overflow): pick **largest** capacity (maximise visible subtiles before overflow badge).

The last subtile slot becomes an overflow tile (`type: 'overflow'`) when the subtile count exceeds the fractional capacity.

### Step 6 — Build rows

Full tile participants are laid out row by row, `nCols` tiles per row. The fractional tile occupies the last position when present. Overflow tile is the last subtile within the fractional tile when present.

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
| `ADD_PARTICIPANT` | `participant: GridParticipant; now?: number` |
| `REMOVE_PARTICIPANT` | `id: string` |
| `UPDATE_PARTICIPANT` | `id: string; changes: Partial<GridParticipant>; now?: number` |
| `SET_CONTAINER_SIZE` | `width: number; height: number` |

The optional `now` parameter overrides `Date.now()` for `activatedAt` assignment. This is used in tests to make recency ordering deterministic.

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

### `GridTile` — full-size tile

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

### `SubTile` — subtile inside fractional tile

Same structure as `GridTile` at smaller scale:
- Avatar: `46px × 46px`
- Active speaker ring: `inset 0 0 0 2px #0667C8, inset 0 0 0 4px #fff`
- Name pill: `10px` font
- Mute badge: `18×18px`

### `FractionalTile` — subtile grid

The (subRows × subCols) layout is chosen by `selectFractionalLayout` at render time. Subtiles fill the fractional tile with `gap: 4px` in both axes. Each subtile occupies an equal share of the tile area regardless of how many participants are present.

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

A permanent **You** row at the top of the participants panel represents the local user's own video (tier `'you'`). It cannot be removed and has no speak or share controls. Below that, other participants can be added, removed, and toggled individually.

Per participant controls:
- **Camera** toggle
- **Mic** toggle
- **Share** toggle (sets tier to `screen-sharing`)
- **Talk** toggle (triggers the debounce/promotion layer)
- **×** remove button (not shown for the You row)

An **Add participant** / slider picks mock participants from `mockData.ts`. The minimum is 0 other participants (just You alone), and the maximum is all 12 mock participants.

### Mock data

12 participants with:
- Stable Unsplash photo IDs (no rate-limit issues)
- Portrait URL: `?w=320&h=480&fit=crop&auto=format`
- Screenshare URL: `?w=1280&h=720&fit=crop&auto=format`
- Unique `hue` value (spaced 47° apart) for gradient fallback

---

## Unit Tests

`gridReducer.test.ts` — 68 pure tests, `testEnvironment: 'node'`, no DOM:

```
Tile dimension invariants       — maxCols × tileWidth ≤ usableW; maxRows × tileHeight ≤ usableH; 6P in 960×540 = 2 rows
'you' tier                      — always slot 0; always first full tile
Unified priority queue          — passive gets full tile when capacity allows; fractional only when grid full
Recency ordering                — most recently activated active participant gets lowest slot
activatedAt auto-management     — set on ADD if active tier; updated on tier change; preserved otherwise
Fractional tile trigger         — no fractional tile until nP > capacity; appears at capacity+1
Fractional capacity {2,3,4,6}  — subRows * subCols always in {2,3,4,6}
Overflow                        — appears at threshold; correct count + avatars; increments correctly
ADD_PARTICIPANT                 — idempotency; single tile; screen-sharing priority
REMOVE_PARTICIPANT              — removal; slot cleanup; fractional cleanup
UPDATE_PARTICIPANT              — tier upgrade/downgrade; activatedAt handling
SET_CONTAINER_SIZE              — slots unchanged; tile bounds respected; very small container safe
Stable slot assignment          — non-tier changes don't move slot; passive tier relative order preserved
```

Run with: `nx run calling-grid-fixture:test`

---

## Future: Production Adapter

When integrating into the Wire webapp the adapter will bridge Knockout observables to `GridParticipant`. It will live in `apps/webapp/` and should not touch the `FluidVideoGrid` component itself.

```ts
function toGridParticipant(p: WireParticipant, isLocalUser: boolean): GridParticipant {
  return {
    id: p.clientId,
    name: p.user.name(),
    avatarUrl: p.user.mediumPictureResource()?.generateUrl(),
    renderVideo: p.hasActiveVideo()
      ? () => <video ref={attachStream(p.videoStream())} autoPlay muted playsInline />
      : undefined,
    tier: deriveParticipantTier({
      isYou: isLocalUser,
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

The local user's participant should always be included in the array (tier `'you'`). The adapter renders `<FluidVideoGrid participants={[localUser, ...others]} config={GRID_CONFIG} onViewAllParticipantsSelected={openParticipantList} />` in place of the current grid component.

---

## Open Questions / Known Gaps

- **Gap value**: prototype uses `8px`, current constant is `4px` — compare against Figma and update if needed.
- **Avatar size in large camera-off tiles**: `84px` may feel too small when the tile is `500px` tall; consider scaling avatar relative to tile size.
- **Presenter mode**: deferred — will need a separate `presenterLayout` branch in the reducer or a separate component.
- **Mobile portrait**: deferred — min/max aspect ratio constants are the main lever, but may need dedicated breakpoints.
- **Screen-share badge**: not yet rendered on `GridTile` (spec mentions it; not implemented).
- **`speakingDuration` tracking**: currently incremented manually in fixture; production adapter needs a timer that accumulates while `isSpeaking === true`.
