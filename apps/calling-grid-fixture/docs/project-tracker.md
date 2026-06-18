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
| 1.6 | `gridReducer.test.ts` — 29 unit tests (no DOM) | ✅ | `nx run calling-grid-fixture:test` |
| 1.7 | `FluidVideoGrid.tsx` — useReducer + ResizeObserver | ✅ | |
| 1.8 | `GridTile.tsx` — full-size active tile | ✅ | |
| 1.9 | `FractionalTile.tsx` — passive mini-grid | ✅ | |
| 1.10 | `SubTile.tsx` — passive thumbnail | ✅ | |
| 1.11 | `OverflowTile.tsx` — "+N more" button | ✅ | |
| 1.12 | `useFixtureState.ts` — per-instance state | ✅ | |
| 1.13 | `FixtureInstance.tsx` — grid + controls panel | ✅ | |
| 1.14 | `App.tsx` — single viewport + dropdown | ✅ | State preserved on viewport switch |
| 1.15 | FLIP transitions via `framer-motion` | ✅ | `layout` + `AnimatePresence` |
| 1.16 | Camera-off: round avatar instead of full-bleed photo | ✅ | 84px, `border-radius: 50%` |

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
| 2.6 | Screen-share badge on `GridTile` | 🔲 | Spec mentions it; not yet implemented |
| 2.7 | Overflow tile — verify stacked avatar sizes and offset against Figma | 🔲 | Currently 30px, 18px offset |
| 2.8 | FractionalTile sub-gap — verify 4px against Figma | 🔲 | |

---

## Milestone 3 — Production Integration

| # | Item | Status | Notes |
|---|---|---|---|
| 3.1 | `toGridParticipant` adapter in `apps/webapp/` | 🔲 | Bridges Knockout → `GridParticipant` |
| 3.2 | `speakingDuration` accumulator (timer while `isSpeaking`) | 🔲 | Needed for stable slot eviction in prod |
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
| B1 | Layout fallback for very small containers maximises cell count over tile size — may produce tiles shorter than `MIN_TILE_HEIGHT` in edge cases | Low |
| B2 | Screen-share tile and camera tile use the same `renderVideo` render-prop; no visual distinction in fixture | Low |

---

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| Hackathon | Max subtiles per fractional tile = 6 (not 4) | Figma shows 3×2 grid; overrides original prompt |
| Post-hackathon | Subtiling phases revised: Phase 1 = full tiles for all, Phase 2 = 2 subtiles per cell, Phase 3 = 4 subtiles per cell | Ensures all main tiles are the same size and all subtiles are the same size within a render; only non-active participants are pushed to subtiles; overflow is always a single subtile showing "+N more" with 3 avatars |
| Hackathon | Fixture uses webpack + Jest, not Vite + Vitest | Monorepo already uses webpack/Jest; avoids new toolchain |
| Hackathon | FLIP via `framer-motion layout` prop | Simplest correct approach; production-grade from day one |
| Hackathon | Viewport dropdown (not multi-viewport canvas) | Preserves participant state across viewport switches; easier to focus on one layout at a time |
| Hackathon | `renderVideo` render prop for video content | Decouples component from media APIs; fixture uses `<img>`, production uses `<video>` |
| Hackathon | Presenter mode deferred | Out of scope for hackathon; needs separate layout branch |
