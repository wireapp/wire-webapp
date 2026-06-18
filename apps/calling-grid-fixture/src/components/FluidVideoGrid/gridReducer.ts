import {
  GridAction,
  GridConfig,
  GridLayout,
  GridParticipant,
  GridState,
  isActiveTier,
  ParticipantTier,
  RowLayout,
  SubtileDescriptor,
  TileDescriptor,
} from './FluidVideoGrid.types';

// ── Stable slot assignment ────────────────────────────────────────────────────

// Each tier is its own group to keep priority ordering exact.
// Active tiers sort by activatedAt descending (most recent = lower slot).
// Passive tiers use stable sort by prevSlotMap (add order preserved).
const SLOT_GROUPS: ReadonlyArray<ReadonlyArray<ParticipantTier>> = [
  ['you'],
  ['screen-sharing'],
  ['active-camera'],
  ['active-no-camera'],
  ['passive-camera'],
  ['passive-no-camera'],
];

/**
 * Assigns a stable slot index to every participant.
 * Participants are grouped by tier priority (SLOT_GROUPS).
 * Within active tiers, most recently activated (highest activatedAt) gets the lowest slot.
 * Within passive tiers, relative order from the previous render is preserved.
 */
function updateSlotMap(
  participants: GridParticipant[],
  prevSlotMap: Record<string, number>,
): Record<string, number> {
  const newSlotMap: Record<string, number> = {};
  let cursor = 0;

  for (const tiers of SLOT_GROUPS) {
    const group = participants.filter(p => (tiers as ParticipantTier[]).includes(p.tier));

    if (isActiveTier(tiers[0])) {
      // Most recently activated first; ties broken by previous slot (stable)
      group.sort((a, b) => {
        const aAt = a.activatedAt ?? 0;
        const bAt = b.activatedAt ?? 0;
        if (bAt !== aAt) return bAt - aAt;
        return (prevSlotMap[a.id] ?? Infinity) - (prevSlotMap[b.id] ?? Infinity);
      });
    } else {
      // Passive tiers: preserve previous order; new participants go last
      group.sort((a, b) => {
        return (prevSlotMap[a.id] ?? Infinity) - (prevSlotMap[b.id] ?? Infinity);
      });
    }

    for (const p of group) {
      newSlotMap[p.id] = cursor++;
    }
  }

  return newSlotMap;
}

// ── Fractional tile layout selection ─────────────────────────────────────────

// Fixed set of (subRows × subCols) layouts producing capacities {2, 3, 4, 6}.
const FRACTIONAL_CANDIDATES: ReadonlyArray<{subRows: number; subCols: number}> = [
  {subRows: 1, subCols: 2}, // cap 2
  {subRows: 2, subCols: 1}, // cap 2
  {subRows: 1, subCols: 3}, // cap 3
  {subRows: 3, subCols: 1}, // cap 3
  {subRows: 2, subCols: 2}, // cap 4
  {subRows: 2, subCols: 3}, // cap 6
  {subRows: 3, subCols: 2}, // cap 6
];

/**
 * Selects the best (subRows, subCols) for the fractional tile.
 * Restricts to capacities {2, 3, 4, 6}.
 * Picks the smallest capacity that fits subtileParticipantsNeeded,
 * subject to minimum subtile size constraints.
 * Falls back to the largest valid capacity when all are exceeded.
 */
function selectFractionalLayout(
  subtileParticipantsNeeded: number,
  tileW: number,
  tileH: number,
  config: GridConfig,
): {subRows: number; subCols: number} {
  const {minTileHeight, minAspectRatio, maxAspectRatio, tileGap: gap} = config;

  const minSubH = minTileHeight / 2;
  const minSubW = minSubH * minAspectRatio;
  const tileAR = tileW / tileH;

  // Filter candidates to those where subtiles meet the minimum size constraints
  const valid = FRACTIONAL_CANDIDATES.filter(({subRows, subCols}) => {
    const subW = (tileW - gap * (subCols - 1)) / subCols;
    const subH = (tileH - gap * (subRows - 1)) / subRows;
    return subW >= minSubW && subH >= minSubH;
  });

  // Fall back to all candidates if none pass the size filter
  const candidates = valid.length > 0 ? valid : [...FRACTIONAL_CANDIDATES];

  // Prefer candidates that can hold all subtile participants
  const thatFit = candidates.filter(({subRows, subCols}) => subRows * subCols >= subtileParticipantsNeeded);
  const pool = thatFit.length > 0 ? thatFit : candidates;

  const overflowing = thatFit.length === 0;

  const scored = pool.map(c => {
    const subW = (tileW - gap * (c.subCols - 1)) / c.subCols;
    const subH = (tileH - gap * (c.subRows - 1)) / c.subRows;
    const ar = subW / subH;
    const inBounds = ar >= minAspectRatio && ar <= maxAspectRatio ? 1 : 0;
    const arDiff = Math.abs(ar - tileAR);
    const cap = c.subRows * c.subCols;
    return {c, cap, inBounds, arDiff};
  });

  // Non-overflow: smallest cap (minimise empty slots).
  // Overflow: largest cap (maximise visible subtiles before the overflow badge).
  scored.sort((a, b) => {
    if (a.cap !== b.cap) return overflowing ? b.cap - a.cap : a.cap - b.cap;
    if (a.inBounds !== b.inBounds) return b.inBounds - a.inBounds;
    return a.arDiff - b.arDiff;
  });

  return {subRows: scored[0].c.subRows, subCols: scored[0].c.subCols};
}

// ── Layout computation ────────────────────────────────────────────────────────

function computeLayout(
  participants: GridParticipant[],
  slotMap: Record<string, number>,
  containerSize: {width: number; height: number},
  config: GridConfig,
): GridLayout {
  const {width, height} = containerSize;
  const {minTileHeight, maxTileHeight, minAspectRatio, maxAspectRatio, tileGap: gap} = config;

  const empty: GridLayout = {
    maxRows: 0,
    maxCols: 0,
    tileWidth: 0,
    tileHeight: 0,
    tileAspectRatio: 0,
    subtileWidth: null,
    subtileHeight: null,
    subtileAspectRatio: null,
    rows: [],
  };

  // Container has padding = gap on all sides
  const usableW = width - 2 * gap;
  const usableH = height - 2 * gap;

  if (usableW <= 0 || usableH <= 0) return empty;

  // ── Step 1: Grid capacity bounds ──────────────────────────────────────────
  // Maximum columns/rows before tile dimensions drop below minimum.
  // maxCols * minTileWidth + (maxCols-1) * gap ≤ usableW
  // maxRows * minTileHeight + (maxRows-1) * gap ≤ usableH
  const minTileWidth = minTileHeight * minAspectRatio;
  const maxCols = Math.max(1, Math.floor((usableW + gap) / (minTileWidth + gap)));
  const maxRows = Math.max(1, Math.floor((usableH + gap) / (minTileHeight + gap)));
  const capacity = maxCols * maxRows;

  if (participants.length === 0) return {...empty, maxRows, maxCols};

  // ── Step 2: All participants sorted by priority (slot order) ──────────────
  const sorted = [...participants].sort((a, b) => (slotMap[a.id] ?? 0) - (slotMap[b.id] ?? 0));
  const nParticipants = sorted.length;

  // ── Step 3: Tile counts ───────────────────────────────────────────────────
  // All participants compete for the same pool of grid slots.
  // When nParticipants > capacity, the last slot becomes a fractional tile.
  const hasFractional = nParticipants > capacity;
  const nFullTiles = hasFractional ? capacity - 1 : nParticipants;
  const nTiles = nFullTiles + (hasFractional ? 1 : 0);

  // ── Step 4: Optimal (nRows, nCols) for nTiles ────────────────────────────
  // Enumerate candidate column counts and pick the layout with the largest
  // tile area. This ensures maxCols * tileWidth ≤ usableW and
  // maxRows * tileHeight ≤ usableH are always satisfied.
  let bestNRows = 1;
  let bestNCols = Math.min(nTiles, maxCols);
  let bestScore = -Infinity;

  for (let nc = 1; nc <= maxCols; nc++) {
    const nr = Math.ceil(nTiles / nc);
    if (nr > maxRows) continue;

    const rawW = (usableW - gap * (nc - 1)) / nc;
    const rawH = (usableH - gap * (nr - 1)) / nr;
    const tH = Math.min(Math.max(rawH, minTileHeight), maxTileHeight);
    const tW = Math.min(Math.max(rawW, tH * minAspectRatio), tH * maxAspectRatio);

    // Prefer layouts where rawW is naturally ≥ minAR × tileH (tile is not too narrow).
    // When rawW < minAR × tileH we must artificially widen the tile, wasting container
    // space. Among otherwise-equal layouts, maximise the clamped tile area.
    const hasNaturalWidth = rawW >= tH * minAspectRatio;
    const score = (hasNaturalWidth ? 1e9 : 0) + tW * tH;

    if (score > bestScore) {
      bestScore = score;
      bestNRows = nr;
      bestNCols = nc;
    }
  }

  const tileH = Math.min(
    Math.max((usableH - gap * (bestNRows - 1)) / bestNRows, minTileHeight),
    maxTileHeight,
  );
  const tileW_raw = (usableW - gap * (bestNCols - 1)) / bestNCols;
  const tileW = Math.min(Math.max(tileW_raw, tileH * minAspectRatio), tileH * maxAspectRatio);
  const tileAspectRatio = tileW / tileH;

  // ── Step 5: Fractional tile ───────────────────────────────────────────────
  let subtileWidth: number | null = null;
  let subtileHeight: number | null = null;
  let subtileAspectRatio: number | null = null;
  let fractionalTile: TileDescriptor | null = null;

  if (hasFractional) {
    const subtileParticipants = sorted.slice(nFullTiles);
    const {subRows, subCols} = selectFractionalLayout(subtileParticipants.length, tileW, tileH, config);
    const fractCap = subRows * subCols;

    subtileWidth = (tileW - gap * (subCols - 1)) / subCols;
    subtileHeight = (tileH - gap * (subRows - 1)) / subRows;
    subtileAspectRatio = subtileWidth / subtileHeight;

    const needsOverflow = subtileParticipants.length > fractCap;
    const visibleParticipants = needsOverflow
      ? subtileParticipants.slice(0, fractCap - 1)
      : subtileParticipants;
    const hiddenParticipants = needsOverflow
      ? subtileParticipants.slice(fractCap - 1)
      : [];

    const subtiles: SubtileDescriptor[] = visibleParticipants.map(p => ({
      type: 'participant',
      participant: p,
    }));

    if (needsOverflow) {
      subtiles.push({
        type: 'overflow',
        count: hiddenParticipants.length,
        avatars: hiddenParticipants.slice(0, 3),
      });
    }

    fractionalTile = {type: 'fractional', subRows, subCols, subtiles};
  }

  // ── Step 6: Build rows ────────────────────────────────────────────────────
  const allTiles: TileDescriptor[] = [
    ...sorted.slice(0, nFullTiles).map(p => ({type: 'full' as const, participant: p})),
    ...(fractionalTile ? [fractionalTile] : []),
  ];

  const rows: RowLayout[] = [];
  for (let i = 0; i < allTiles.length; i += bestNCols) {
    rows.push({tiles: allTiles.slice(i, i + bestNCols)});
  }

  return {
    maxRows,
    maxCols,
    tileWidth: tileW,
    tileHeight: tileH,
    tileAspectRatio,
    subtileWidth,
    subtileHeight,
    subtileAspectRatio,
    rows,
  };
}

// ── Reducer factory ───────────────────────────────────────────────────────────

export function createInitialState(containerSize: {width: number; height: number}): GridState {
  return {
    participants: [],
    containerSize,
    slotMap: {},
    layout: {
      maxRows: 0,
      maxCols: 0,
      tileWidth: 0,
      tileHeight: 0,
      tileAspectRatio: 0,
      subtileWidth: null,
      subtileHeight: null,
      subtileAspectRatio: null,
      rows: [],
    },
  };
}

/**
 * Returns a curried reducer closed over the given config.
 * Pass the result directly to `useReducer`.
 */
export function createGridReducer(config: GridConfig) {
  return function gridReducer(state: GridState, action: GridAction): GridState {
    switch (action.type) {
      case 'ADD_PARTICIPANT': {
        if (state.participants.some(p => p.id === action.participant.id)) {
          return state;
        }
        let participant = action.participant;
        // Auto-set activatedAt for active-tier participants that don't have one
        if (isActiveTier(participant.tier) && participant.activatedAt === undefined) {
          participant = {...participant, activatedAt: action.now ?? Date.now()};
        }
        const participants = [...state.participants, participant];
        const slotMap = updateSlotMap(participants, state.slotMap);
        const layout = computeLayout(participants, slotMap, state.containerSize, config);
        return {...state, participants, slotMap, layout};
      }

      case 'REMOVE_PARTICIPANT': {
        const participants = state.participants.filter(p => p.id !== action.id);
        const slotMap = updateSlotMap(participants, state.slotMap);
        const layout = computeLayout(participants, slotMap, state.containerSize, config);
        return {...state, participants, slotMap, layout};
      }

      case 'UPDATE_PARTICIPANT': {
        const idx = state.participants.findIndex(p => p.id === action.id);
        if (idx === -1) return state;
        const prev = state.participants[idx];
        let updated = {...prev, ...action.changes};
        // Refresh activatedAt when tier changes so recency ordering is correct
        if (action.changes.tier !== undefined && action.changes.tier !== prev.tier) {
          updated = {...updated, activatedAt: action.now ?? Date.now()};
        }
        const participants = [...state.participants];
        participants[idx] = updated;
        const slotMap = updateSlotMap(participants, state.slotMap);
        const layout = computeLayout(participants, slotMap, state.containerSize, config);
        return {...state, participants, slotMap, layout};
      }

      case 'SET_CONTAINER_SIZE': {
        const containerSize = {width: action.width, height: action.height};
        const layout = computeLayout(state.participants, state.slotMap, containerSize, config);
        return {...state, containerSize, layout};
      }

      default:
        return state;
    }
  };
}

export {updateSlotMap as _updateSlotMap, computeLayout as _computeLayout, selectFractionalLayout as _selectFractionalLayout};
