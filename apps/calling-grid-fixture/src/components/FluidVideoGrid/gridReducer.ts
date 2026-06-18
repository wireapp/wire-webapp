import {
  GridAction,
  GridConfig,
  GridLayout,
  GridParticipant,
  GridState,
  isActiveTier,
  RowLayout,
  SubtileDescriptor,
  TileDescriptor,
  TIER_ORDER,
} from './FluidVideoGrid.types';

// ── Stable slot assignment ────────────────────────────────────────────────────

// Both passive tiers are in a single slot group so that turning a camera on/off
// never reorders a passive participant within the visible subtile set.
// Sub-prioritisation (camera-on > camera-off) only kicks in during overflow
// resolution, not during slot assignment.
const SLOT_GROUPS: ReadonlyArray<ReadonlyArray<ParticipantTier>> = [
  ['screen-sharing'],
  ['active-camera'],
  ['active-no-camera'],
  ['passive-camera', 'passive-no-camera'],
];

/**
 * Assigns a stable slot index to every participant.
 * Participants are grouped by tier priority (see SLOT_GROUPS), and within
 * each group their relative order from the previous render is preserved.
 * New participants are appended at the end of their group.
 */
function updateSlotMap(
  participants: GridParticipant[],
  prevSlotMap: Record<string, number>,
): Record<string, number> {
  const newSlotMap: Record<string, number> = {};
  let cursor = 0;

  for (const tiers of SLOT_GROUPS) {
    const group = participants.filter(p => (tiers as ParticipantTier[]).includes(p.tier));

    group.sort((a, b) => {
      const aSlot = prevSlotMap[a.id] ?? Infinity;
      const bSlot = prevSlotMap[b.id] ?? Infinity;
      return aSlot - bSlot;
    });

    for (const p of group) {
      newSlotMap[p.id] = cursor++;
    }
  }

  return newSlotMap;
}

// ── Sub-grid selection ────────────────────────────────────────────────────────

/**
 * Given a fractional tile of tileW × tileH pixels and the number of
 * participants to place, find the best (subRows, subCols) arrangement:
 *   1. subRows ≤ maxSubRows, subCols ≤ maxSubCols
 *   2. subRows × subCols ≥ passivesToPlace  (fits everyone, possibly with overflow)
 *   3. subtileAspectRatio ∈ [minAR, maxAR]  (preferred; best-effort if impossible)
 *
 * Among valid pairs, the one with the smallest capacity (subRows × subCols) is
 * chosen to minimise empty subtile slots. Ties broken by AR closest to tileAR.
 */
function selectSubGrid(
  passivesToPlace: number,
  tileW: number,
  tileH: number,
  config: GridConfig,
): {subRows: number; subCols: number} {
  const {minAspectRatio, maxAspectRatio, maxSubRows, maxSubCols, tileGap: gap} = config;
  const maxCap = maxSubRows * maxSubCols;
  const tileAR = tileW / tileH;

  // If passives exceed max capacity, we'll use overflow — fix at max subgrid.
  const target = Math.min(passivesToPlace, maxCap);

  let bestR = maxSubRows;
  let bestC = maxSubCols;
  let bestCap = maxCap;
  let bestARDiff = Infinity;
  let bestInBounds = false;

  for (let r = 1; r <= maxSubRows; r++) {
    for (let c = 1; c <= maxSubCols; c++) {
      const cap = r * c;
      if (cap < target) continue; // doesn't fit all passives

      const sw = (tileW - gap * (c - 1)) / c;
      const sh = (tileH - gap * (r - 1)) / r;
      if (sw <= 0 || sh <= 0) continue;

      const sar = sw / sh;
      const inBounds = sar >= minAspectRatio && sar <= maxAspectRatio;
      const arDiff = inBounds ? 0 : Math.min(Math.abs(sar - minAspectRatio), Math.abs(sar - maxAspectRatio));
      const arCloseness = Math.abs(sar - tileAR);

      if (inBounds) {
        if (
          !bestInBounds ||
          cap < bestCap ||
          (cap === bestCap && arCloseness < bestARDiff)
        ) {
          bestR = r;
          bestC = c;
          bestCap = cap;
          bestARDiff = arCloseness;
          bestInBounds = true;
        }
      } else if (!bestInBounds) {
        if (arDiff < bestARDiff || (arDiff === bestARDiff && cap < bestCap)) {
          bestR = r;
          bestC = c;
          bestCap = cap;
          bestARDiff = arDiff;
        }
      }
    }
  }

  return {subRows: bestR, subCols: bestC};
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

  // Container has padding = gap on all sides; subtract before computing tile space.
  const usableW = width - 2 * gap;
  const usableH = height - 2 * gap;

  if (usableW <= 0 || usableH <= 0) return empty;

  // ── Step 1: Grid capacity ──────────────────────────────────────────────────
  // N tiles in a row use: N × minTileWidth + (N-1) × gap ≤ usableW
  // → N ≤ (usableW + gap) / (minTileWidth + gap)
  const minTileWidth = minTileHeight * minAspectRatio;
  const maxCols = Math.max(1, Math.floor((usableW + gap) / (minTileWidth + gap)));
  const maxRows = Math.max(1, Math.floor((usableH + gap) / (minTileHeight + gap)));
  const capacity = maxCols * maxRows;

  // Sort participants by slot index for stable rendering order
  const sorted = [...participants].sort((a, b) => (slotMap[a.id] ?? 0) - (slotMap[b.id] ?? 0));

  const activeParts = sorted.filter(p => isActiveTier(p.tier));
  const passiveParts = sorted.filter(p => !isActiveTier(p.tier));

  const nActive = activeParts.length;
  const nPassive = passiveParts.length;

  if (nActive === 0 && nPassive === 0) return {...empty, maxRows, maxCols};

  // ── Step 2: Premium / non-premium split ───────────────────────────────────
  // A fractional tile is needed when there are passive participants or when
  // active participants overflow the grid capacity.
  const needFractional = nPassive > 0 || nActive > capacity;
  const nFullTiles = Math.min(nActive, needFractional ? Math.max(0, capacity - 1) : capacity);
  const overflowActive = Math.max(0, nActive - nFullTiles);
  const passivesToPlace = nPassive + overflowActive;
  const hasFractional = needFractional && passivesToPlace > 0;

  // ── Step 3: Tile dimensions ────────────────────────────────────────────────
  const nTiles = nFullTiles + (hasFractional ? 1 : 0);
  const nRows = Math.max(1, Math.ceil(nTiles / maxCols));
  const rawH = (usableH - gap * (nRows - 1)) / nRows;
  const tileH = Math.min(Math.max(rawH, minTileHeight), maxTileHeight);
  const targetAR = (minAspectRatio + maxAspectRatio) / 2;
  const tileW = tileH * targetAR;

  // ── Step 4: Sub-grid selection ─────────────────────────────────────────────
  let subtileWidth: number | null = null;
  let subtileHeight: number | null = null;
  let subtileAspectRatio: number | null = null;
  let fractionalTile: TileDescriptor | null = null;

  if (hasFractional) {
    const {subRows, subCols} = selectSubGrid(passivesToPlace, tileW, tileH, config);
    const fractCap = subRows * subCols;

    subtileWidth = (tileW - gap * (subCols - 1)) / subCols;
    subtileHeight = (tileH - gap * (subRows - 1)) / subRows;
    subtileAspectRatio = subtileWidth / subtileHeight;

    // ── Step 5: Subtile assignment ───────────────────────────────────────────
    // Overflow active participants go before passive participants in subtiles.
    // All of these are already in slot order (passiveParts comes from `sorted`).
    const overflowActiveParts = activeParts.slice(nFullTiles);
    const passiveCameraOn = passiveParts.filter(p => p.tier === 'passive-camera');
    const passiveCameraOff = passiveParts.filter(p => p.tier === 'passive-no-camera');

    // All participants that need a subtile slot, in slot order (for counting / overflow).
    const subtileParticipants: GridParticipant[] = [
      ...overflowActiveParts,
      ...passiveParts,
    ];

    const needsOverflow = passivesToPlace > fractCap;

    let visibleParticipants: GridParticipant[];
    let hiddenParticipants: GridParticipant[];

    if (needsOverflow) {
      // When the fractional tile is full, sub-prioritise passive participants:
      // passive-camera gets a slot before passive-no-camera.
      // Within each group slot order is preserved (stable).
      // Priority order: overflow-active > passive-camera > passive-no-camera
      const prioritised = [...overflowActiveParts, ...passiveCameraOn, ...passiveCameraOff];
      const candidates = prioritised.slice(0, fractCap - 1);
      // Re-sort by slot index so positions within the visible set are stable
      // (turning camera on while already visible must not change your position).
      visibleParticipants = candidates.slice().sort((a, b) => (slotMap[a.id] ?? 0) - (slotMap[b.id] ?? 0));
      const visibleSet = new Set(visibleParticipants.map(p => p.id));
      hiddenParticipants = subtileParticipants.filter(p => !visibleSet.has(p.id));
    } else {
      visibleParticipants = subtileParticipants;
      hiddenParticipants = [];
    }

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

  // ── Step 6: Build rows ─────────────────────────────────────────────────────
  const allTiles: TileDescriptor[] = [
    ...activeParts.slice(0, nFullTiles).map(p => ({type: 'full' as const, participant: p})),
    ...(fractionalTile ? [fractionalTile] : []),
  ];

  const rows: RowLayout[] = [];
  for (let i = 0; i < allTiles.length; i += maxCols) {
    rows.push({tiles: allTiles.slice(i, i + maxCols)});
  }

  return {
    maxRows,
    maxCols,
    tileWidth: tileW,
    tileHeight: tileH,
    tileAspectRatio: targetAR,
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
        const participants = [...state.participants, action.participant];
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
        const updated = {...state.participants[idx], ...action.changes};
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

export {updateSlotMap as _updateSlotMap, computeLayout as _computeLayout};
