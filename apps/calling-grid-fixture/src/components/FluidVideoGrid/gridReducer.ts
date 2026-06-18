import {
  ACTIVE_TIERS,
  GridAction,
  GridConfig,
  GridParticipant,
  GridState,
  isActiveTier,
  LayoutCell,
  LayoutResult,
  SubtileEntry,
  TIER_ORDER,
} from './FluidVideoGrid.types';

// ── Stable slot assignment ────────────────────────────────────────────────────

/**
 * Assigns a stable slot index to every participant.
 * Participants are grouped by tier priority, and within each tier their
 * relative order from the previous render is preserved.  New participants
 * are appended at the end of their tier group.
 */
function updateSlotMap(
  participants: GridParticipant[],
  prevSlotMap: Record<string, number>,
): Record<string, number> {
  const newSlotMap: Record<string, number> = {};
  let cursor = 0;

  for (const tier of TIER_ORDER) {
    const group = participants.filter(p => p.tier === tier);

    // Sort: known participants keep their relative order, unknowns go last
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

// ── Layout computation ────────────────────────────────────────────────────────

function computeLayout(
  participants: GridParticipant[],
  slotMap: Record<string, number>,
  containerSize: {width: number; height: number},
  config: GridConfig,
): LayoutResult {
  const {width, height} = containerSize;
  const {minTileHeight, maxTileHeight, minAspectRatio, maxAspectRatio, maxSubtilesPerTile, tileGap} = config;

  const empty: LayoutResult = {cols: 1, rows: 1, tileWidth: 0, tileHeight: 0, cells: []};

  if (width <= 0 || height <= 0 || participants.length === 0) {
    return empty;
  }

  // Sort participants by slot index for stable rendering order
  const sorted = [...participants].sort((a, b) => (slotMap[a.id] ?? 0) - (slotMap[b.id] ?? 0));

  const activeParts = sorted.filter(p => isActiveTier(p.tier));
  const passiveParts = sorted.filter(p => !isActiveTier(p.tier));

  const targetAspect = (minAspectRatio + maxAspectRatio) / 2;

  // Minimum cells needed: one per active + one fractional per group of maxSubtilesPerTile passives
  const targetCells = Math.max(
    1,
    activeParts.length + Math.ceil(passiveParts.length / maxSubtilesPerTile),
  );

  // Find the (rows, cols) pair that maximises tile height while fitting all participants.
  // Prefer a layout that fits targetCells; fall back to the largest achievable layout if
  // the container is too small to accommodate all tiles within the tile-height bounds.
  let bestRows = 1;
  let bestCols = 1;
  let bestTileH = 0;
  let fallbackRows = 1;
  let fallbackCols = 1;
  let fallbackTileH = 0;

  for (let rows = 1; rows <= 20; rows++) {
    const rawH = (height - tileGap * (rows - 1)) / rows;
    if (rawH < minTileHeight) break;

    const tileH = Math.min(rawH, maxTileHeight);
    const tileW = tileH * targetAspect;
    const cols = Math.max(1, Math.floor((width + tileGap) / (tileW + tileGap)));
    const totalCells = rows * cols;

    // Track best layout that meets the target cell count
    if (totalCells >= targetCells && tileH > bestTileH) {
      bestTileH = tileH;
      bestRows = rows;
      bestCols = cols;
    }

      // Track best achievable layout regardless (fallback for small containers):
    // prefer max cells first, then largest tileH as tiebreaker
    const fallbackCells = fallbackRows * fallbackCols;
    if (totalCells > fallbackCells || (totalCells === fallbackCells && tileH > fallbackTileH)) {
      fallbackTileH = tileH;
      fallbackRows = rows;
      fallbackCols = cols;
    }
  }

  // Use target-fitting layout when available, otherwise use the most-cells achievable layout
  if (bestTileH === 0) {
    bestRows = fallbackRows;
    bestCols = fallbackCols;
    bestTileH = fallbackTileH;
  }

  const totalCells = bestRows * bestCols;
  const activeCellCount = Math.min(activeParts.length, totalCells);
  const fractionalCellCount = totalCells - activeCellCount;
  const passiveSlots = fractionalCellCount * maxSubtilesPerTile;

  // Determine visible vs overflow passive participants
  const needsOverflow = passiveParts.length > passiveSlots - 1 && passiveSlots > 0;
  const visiblePassive = needsOverflow ? passiveParts.slice(0, passiveSlots - 1) : passiveParts;
  const overflowPassive = needsOverflow ? passiveParts.slice(passiveSlots - 1) : [];

  // Build cell list
  const cells: LayoutCell[] = [];

  // Active cells
  for (let i = 0; i < activeCellCount; i++) {
    cells.push({type: 'active', participant: activeParts[i]});
  }

  // Fractional cells
  let passiveIdx = 0;
  for (let f = 0; f < fractionalCellCount; f++) {
    const subtiles: SubtileEntry[] = [];

    for (let s = 0; s < maxSubtilesPerTile; s++) {
      const isLastSlot = f === fractionalCellCount - 1 && s === maxSubtilesPerTile - 1;

      if (isLastSlot && overflowPassive.length > 0) {
        subtiles.push({
          type: 'overflow',
          overflowCount: overflowPassive.length,
          overflowAvatars: overflowPassive.slice(0, 3),
        });
        break;
      }

      if (passiveIdx >= visiblePassive.length) break;

      subtiles.push({type: 'participant', participant: visiblePassive[passiveIdx]});
      passiveIdx++;
    }

    if (subtiles.length > 0) {
      cells.push({type: 'fractional', subtiles});
    }
  }

  return {
    cols: bestCols,
    rows: bestRows,
    tileWidth: bestTileH * targetAspect,
    tileHeight: bestTileH,
    cells,
  };
}

// ── Reducer factory ───────────────────────────────────────────────────────────

export function createInitialState(containerSize: {width: number; height: number}): GridState {
  return {
    participants: [],
    containerSize,
    slotMap: {},
    layout: {cols: 1, rows: 1, tileWidth: 0, tileHeight: 0, cells: []},
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

// Re-export helpers so tests can import from one place
export {updateSlotMap as _updateSlotMap, computeLayout as _computeLayout};
