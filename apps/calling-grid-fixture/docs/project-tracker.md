# Fluid Video Grid — Project Tracker

> Status key: ✅ Done · 🔄 In progress · 🔲 Not started · ⏸ Deferred

---

## Milestone 1 — Fixture App & Core Component

| # | Item | Status | Notes |
|---|---|---|---|
| 1.1 | Nx app scaffold (`calling-grid-fixture`) | ✅ | Webpack + Babel, port 5173 |
| 1.2 | `constants.ts` with HMR-friendly designer params | ✅ | |
| 1.3 | `mockData.ts` — 12 participants, Unsplash photos | ✅ | |
| 1.4 | `FluidVideoGrid.types.ts` — all shared types | ✅ | |
| 1.5 | `gridReducer.ts` — pure layout reducer | ✅ | |
| 1.6 | `gridReducer.test.ts` — 68 unit tests (no DOM) | ✅ | `nx run calling-grid-fixture:test` |
| 1.7 | `FluidVideoGrid.tsx` — useReducer + ResizeObserver | ✅ | |
| 1.8 | `GridTile.tsx` — full-size tile | ✅ | |
| 1.9 | `FractionalTile.tsx` — fractional tile (2/3/4/6 subtiles) | ✅ | |
| 1.10 | `SubTile.tsx` — subtile thumbnail | ✅ | |
| 1.11 | `OverflowTile.tsx` — "+N more" button | ✅ | |
| 1.12 | `useFixtureState.ts` — per-instance state | ✅ | |
| 1.13 | `FixtureInstance.tsx` — grid + controls panel | ✅ | |
| 1.14 | `App.tsx` — single viewport + dropdown | ✅ | State preserved on viewport switch |
| 1.15 | FLIP transitions via `framer-motion` | ✅ | `layout` + `AnimatePresence` |
| 1.16 | Camera-off: round avatar instead of full-bleed photo | ✅ | 84px, `border-radius: 50%` |

---

## Milestone 1b — Layout Model Rewrite

| # | Item | Status | Notes |
|---|---|---|---|
| 1b.1 | `'you'` tier — highest priority, reserved for local user | ✅ | Always slot 0; always first full tile |
| 1b.2 | `activatedAt` field on `GridParticipant` — drives recency ordering | ✅ | Auto-set by reducer on ADD and tier change |
| 1b.3 | Unified priority queue — all participants compete for full tiles | ✅ | Fractional tile only when nP > maxCols × maxRows |
| 1b.4 | Tile dimension invariant fix — `nCols × tileWidth ≤ usableW` | ✅ | Replaced aspect-ratio extrapolation with layout enumeration |
| 1b.5 | Layout enumeration — pick best (nRows, nCols) by `hasNaturalWidth` + area | ✅ | Prevents portrait tiles in wide containers |
| 1b.6 | Fractional tile capacities restricted to {2, 3, 4, 6} | ✅ | Replaces phase 2/3/4 system |
| 1b.7 | Permanent "You" participant in fixture (cannot be removed) | ✅ | Prepended to participants array; shown as distinct row in panel |
| 1b.8 | `now?` action parameter for deterministic test timestamps | ✅ | Used in ADD_PARTICIPANT and UPDATE_PARTICIPANT |
| 1b.9 | Test suite rewrite — 68 tests covering new layout semantics | ✅ | Replaces original 29 tests |

---

## Milestone 2 — Visual Polish (Figma alignment)

Reference: [Figma file](https://www.figma.com/design/wRATGU0AkeWGDIvBV961o8/Grid-view--Hackathon-) · `wire-call-grid-reference.html`

> **Prefer `wire-call-grid-reference-lite.html`** — the lite version is lighter and loads faster; use the full reference only if you need features not present in the lite version.

| # | Item | Status | Notes |
|---|---|---|---|
| 2.1 | Tile gap value — verify 4px vs 8px against Figma | 🔲 | Prototype uses `--gap: 8px` |
| 2.2 | Avatar size — scale relative to tile height for large tiles | 🔲 | 84px may feel small at 500px tile height |
| 2.3 | Active speaker ring values — verify `3px/6px` inset against Figma | 🔲 | |
| 2.4 | Name pill — verify font size, padding, border-radius against Figma | 🔲 | |
| 2.5 | Mute badge — verify size and icon against Figma | 🔲 | |
| 2.6 | Screen-share badge on `GridTile` | 🔲 | Not yet implemented |
| 2.7 | Overflow tile — verify stacked avatar sizes and offset against Figma | 🔲 | Currently 30px, 18px offset |
| 2.8 | FractionalTile sub-gap — verify 4px against Figma | 🔲 | |

---

## Milestone 3 — Production Integration

| # | Item | Status | Notes |
|---|---|---|---|
| 3.1 | `toGridParticipant` adapter in `apps/webapp/` | 🔲 | Bridges Knockout → `GridParticipant`; must include `isYou` flag |
| 3.2 | `speakingDuration` accumulator (timer while `isSpeaking`) | 🔲 | Needed for accurate fixture display; production adapter needs a timer |
| 3.3 | Attach `GridParticipant.renderVideo` to real `<video>` + media stream | 🔲 | |
| 3.4 | Wire `onViewAllParticipantsSelected` to existing participant list sidebar | 🔲 | Sidebar component already exists |
| 3.5 | Replace current call grid with `FluidVideoGrid` in call view | 🔲 | |
| 3.6 | E2E / smoke test for basic call with new grid | 🔲 | |

---

## Milestone 4 — Presenter Mode

> Deferred to second iteration per original plan.

| # | Item | Status | Notes |
|---|---|---|---|
| 4.1 | Define presenter mode layout spec | ⏸ | One tile maximised, others in sidebar strip |
| 4.2 | Add `presenterLayout` branch to reducer or separate component | ⏸ | |
| 4.3 | Toggle in fixture controls | ⏸ | |

---

## Milestone 5 — Mobile / Portrait

> Deferred per original plan.

| # | Item | Status | Notes |
|---|---|---|---|
| 5.1 | Define portrait layout spec | ⏸ | |
| 5.2 | Add `360×640` viewport to fixture and validate | ⏸ | Config exists in `VIEWPORT_CONFIGS` |
| 5.3 | Tune `MIN_ASPECT_RATIO` / breakpoints for portrait | ⏸ | |

---

## Known Bugs / Open Issues

| # | Description | Priority |
|---|---|---|
| B1 | Screen-share tile and camera tile use the same `renderVideo` render-prop; no visual distinction in fixture | Low |

---

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| Hackathon | Max subtiles per fractional tile = 6 (not 4) | Figma shows 3×2 grid; overrides original prompt |
| Hackathon | Fixture uses webpack + Jest, not Vite + Vitest | Monorepo already uses webpack/Jest; avoids new toolchain |
| Hackathon | FLIP via `framer-motion layout` prop | Simplest correct approach; production-grade from day one |
| Hackathon | Viewport dropdown (not multi-viewport canvas) | Preserves participant state across viewport switches; easier to focus on one layout at a time |
| Hackathon | `renderVideo` render prop for video content | Decouples component from media APIs; fixture uses `<img>`, production uses `<video>` |
| Hackathon | Presenter mode deferred | Out of scope for hackathon; needs separate layout branch |
| Post-hackathon | Rewrite layout model: unified priority queue + layout enumeration | Original phase-based split forced all passives to fractional tile even when space was available; column-count enumeration was needed to fix broken tile dimensions (`maxCols × tileWidth > usableW`) |
| Post-hackathon | `'you'` tier added as highest priority | Local user should always be visible and always in the first slot |
| Post-hackathon | Fractional tile capacities restricted to {2, 3, 4, 6} | Clean set covers all subtile subdivisions while avoiding awkward 5-cell layouts; replaces the phase 2/3/4 system |
| Post-hackathon | `activatedAt` for recency ordering within active tiers | Most recently promoted speaker should take the most visible slot; timestamp-based ordering is simpler and more predictable than `speakingDuration`-based eviction |
| Post-hackathon | Permanent "You" participant in fixture (not removable) | Matches production semantics where the local user is always present in the grid |
