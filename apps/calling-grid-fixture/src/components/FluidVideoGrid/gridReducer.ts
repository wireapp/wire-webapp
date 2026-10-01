import {
  AssignmentMap,
  FractionDescriptor,
  GridAction,
  GridConfig,
  GridLayout,
  GridModeLayout,
  GridParticipant,
  GridState,
  isActiveTier,
  PresenterModeLayout,
  RowLayout,
  TIER_ORDER,
  TileDescriptor,
  TileKind,
} from './FluidVideoGrid.types';

/** A fraction is at least half the height of a minimum-size full tile. */
const MIN_FRACTION_HEIGHT_RATIO = 0.5;

/**
 * A fractional tile is never split more finely than this per axis. Without it a tall
 * tile would "fit" dozens of minimum-size fractions and a single fractional tile would
 * swallow the whole call instead of spilling into a second one.
 */
const MAX_FRACTIONS_PER_AXIS = 3;

/** How many avatars the overflow badge previews. */
const OVERFLOW_AVATAR_COUNT = 3;

function tierRank(tier: GridParticipant['tier']): number {
  return TIER_ORDER.indexOf(tier);
}

// ── Stable slot assignment ────────────────────────────────────────────────────

/**
 * Orders every participant except self.
 *
 * Two rules, in order of precedence:
 *  1. Participants that already held a slot keep their *relative* order. Changing
 *     tier never reshuffles someone who is already seated — that is what makes
 *     seating sticky.
 *  2. Newcomers are inserted at the position their tier earns them, ahead of any
 *     lower-priority participant. Within a tier, the most recently activated goes first.
 */
function orderOthers(others: GridParticipant[], prevSlotMap: Record<string, number>): GridParticipant[] {
  const seated = others
    .filter(p => prevSlotMap[p.id] !== undefined)
    .sort((a, b) => prevSlotMap[a.id] - prevSlotMap[b.id]);

  const newcomers = others
    .filter(p => prevSlotMap[p.id] === undefined)
    .sort((a, b) => {
      const byTier = tierRank(a.tier) - tierRank(b.tier);
      if (byTier !== 0) {
        return byTier;
      }
      return (b.activatedAt ?? 0) - (a.activatedAt ?? 0);
    });

  const ordered = [...seated];
  for (const p of newcomers) {
    const rank = tierRank(p.tier);
    const insertAt = ordered.findIndex(existing => tierRank(existing.tier) > rank);
    ordered.splice(insertAt === -1 ? ordered.length : insertAt, 0, p);
  }

  return ordered;
}

/**
 * Assigns a stable slot index to every participant.
 *
 * Self is always the leader of whichever bucket it belongs to: the first full tile
 * while active, or the first fraction while silent-camera-off. This is a fixed
 * position, not a competitive rank, so it never contends with — or gets displaced
 * by — anyone else's tier or recency inside that bucket.
 */
function updateSlotMap(
  participants: GridParticipant[],
  prevSlotMap: Record<string, number>,
): Record<string, number> {
  const self = participants.find(p => p.isSelf);
  const others = participants.filter(p => !p.isSelf);
  const ordered = orderOthers(others, prevSlotMap);

  if (self) {
    const insertAt = isActiveTier(self.tier) ? 0 : ordered.findIndex(p => !isActiveTier(p.tier));
    ordered.splice(insertAt === -1 ? ordered.length : insertAt, 0, self);
  }

  const slotMap: Record<string, number> = {};
  ordered.forEach((p, index) => {
    slotMap[p.id] = index;
  });
  return slotMap;
}

// ── Layout invariants ─────────────────────────────────────────────────────────

interface Invariants {
  usableWidth: number;
  usableHeight: number;
  maxRows: number;
  maxCols: number;
  maxTiles: number;
  minFractionWidth: number;
  minFractionHeight: number;
}

/**
 * Capacity bounds that depend only on the container and the config — never on
 * who is in the call. Recomputed whenever the container resizes.
 */
function computeInvariants(
  containerSize: {width: number; height: number},
  config: GridConfig,
): Invariants | null {
  const {minTileHeight, minAspectRatio, tileGap: gap} = config;

  // The container is padded by `gap` on all sides.
  const usableWidth = containerSize.width - 2 * gap;
  const usableHeight = containerSize.height - 2 * gap;
  if (usableWidth <= 0 || usableHeight <= 0) {
    return null;
  }

  const minTileWidth = minTileHeight * minAspectRatio;
  const maxCols = Math.max(1, Math.floor((usableWidth + gap) / (minTileWidth + gap)));
  const maxRows = Math.max(1, Math.floor((usableHeight + gap) / (minTileHeight + gap)));

  const minFractionHeight = minTileHeight * MIN_FRACTION_HEIGHT_RATIO;
  const minFractionWidth = minFractionHeight * minAspectRatio;

  return {
    usableWidth,
    usableHeight,
    maxRows,
    maxCols,
    maxTiles: maxRows * maxCols,
    minFractionWidth,
    minFractionHeight,
  };
}

/**
 * The finest subdivision a tile of the given size allows — bounded both by the minimum
 * legible fraction size and by MAX_FRACTIONS_PER_AXIS.
 */
function fractionBoundsFor(
  tileWidth: number,
  tileHeight: number,
  inv: Invariants,
  gap: number,
): {maxRows: number; maxCols: number; capacity: number} {
  const maxCols = Math.min(
    MAX_FRACTIONS_PER_AXIS,
    Math.max(1, Math.floor((tileWidth + gap) / (inv.minFractionWidth + gap))),
  );
  const maxRows = Math.min(
    MAX_FRACTIONS_PER_AXIS,
    Math.max(1, Math.floor((tileHeight + gap) / (inv.minFractionHeight + gap))),
  );
  return {maxRows, maxCols, capacity: maxRows * maxCols};
}

/**
 * Picks the fraction grid for a tile that must seat `needed` participants: the shape
 * with the fewest empty cells, preferring fractions whose aspect ratio stays in bounds.
 */
function chooseFractionShape(
  needed: number,
  tileWidth: number,
  tileHeight: number,
  inv: Invariants,
  config: GridConfig,
): {rows: number; cols: number; capacity: number} {
  const {minAspectRatio, maxAspectRatio, tileGap: gap} = config;
  const bounds = fractionBoundsFor(tileWidth, tileHeight, inv, gap);
  const target = Math.max(1, Math.min(needed, bounds.capacity));
  const tileAspectRatio = tileWidth / tileHeight;

  let best = {rows: bounds.maxRows, cols: bounds.maxCols, capacity: bounds.capacity};
  let bestScore = Infinity;

  for (let cols = 1; cols <= bounds.maxCols; cols++) {
    const rows = Math.ceil(target / cols);
    if (rows > bounds.maxRows) {
      continue;
    }
    const width = (tileWidth - gap * (cols - 1)) / cols;
    const height = (tileHeight - gap * (rows - 1)) / rows;
    const aspectRatio = width / height;

    const outOfBounds = aspectRatio < minAspectRatio || aspectRatio > maxAspectRatio ? 1e6 : 0;
    const wastedCells = rows * cols - target;
    const score = outOfBounds + wastedCells * 10 + Math.abs(aspectRatio - tileAspectRatio);

    if (score < bestScore) {
      bestScore = score;
      best = {rows, cols, capacity: rows * cols};
    }
  }

  return best;
}

/** Minimum fraction capacity tried first under `forcePassiveFractional`, before escalating. */
const MIN_FRACTION_CAPACITY = 2;
/** Fallback minimum when a 2-way split can't stay within the configured aspect bounds. */
const ESCALATED_MIN_FRACTION_CAPACITY = 4;

/**
 * Like `chooseFractionShape`, but never returns a shape below `minimumCapacity` — used by
 * `forcePassiveFractional` so a lightly-populated tile still renders as a visibly
 * subdivided tile rather than one large cell. Starting at a 2-way split, this escalates
 * to a 4-way (2×2) split if 2 cells can't be arranged within the aspect-ratio bounds.
 */
function chooseFractionShapeWithFloor(
  needed: number,
  tileWidth: number,
  tileHeight: number,
  inv: Invariants,
  config: GridConfig,
  minimumCapacity: number,
): {rows: number; cols: number; capacity: number} {
  if (minimumCapacity <= 1) {
    return chooseFractionShape(needed, tileWidth, tileHeight, inv, config);
  }

  const shape = chooseFractionShape(Math.max(minimumCapacity, needed), tileWidth, tileHeight, inv, config);
  const {minAspectRatio, maxAspectRatio, tileGap: gap} = config;
  const width = (tileWidth - gap * (shape.cols - 1)) / shape.cols;
  const height = (tileHeight - gap * (shape.rows - 1)) / shape.rows;
  const aspectRatio = width / height;
  const withinBounds = aspectRatio >= minAspectRatio && aspectRatio <= maxAspectRatio;

  if (!withinBounds && minimumCapacity < ESCALATED_MIN_FRACTION_CAPACITY) {
    return chooseFractionShapeWithFloor(
      needed,
      tileWidth,
      tileHeight,
      inv,
      config,
      ESCALATED_MIN_FRACTION_CAPACITY,
    );
  }

  return shape;
}

// ── Tile counts ───────────────────────────────────────────────────────────────

export interface TileCounts {
  total: number;
  full: number;
  fractional: number;
}

/**
 * Decides how many tiles to render and how many of them are subdivided.
 *
 * Active participants earn full tiles; silent camera-off participants are compressed into
 * fractional tiles. `maxFractionalTilesRatio` caps the share of the grid that may
 * be fractional, which in turn caps the total once actives are few.
 *
 * `forcePassiveFractional` (experimental) hands full tiles to active participants only,
 * period — including the all-silent case, which normally gives everyone an equal full
 * tile since nobody has "earned" a bigger one yet.
 */
export function computeTileCounts(
  activeCount: number,
  silentCount: number,
  maxTiles: number,
  maxFractionsPerTile: number,
  ratio: number,
  forcePassiveFractional = false,
): TileCounts {
  const participantCount = activeCount + silentCount;
  if (participantCount === 0 || maxTiles === 0) {
    return {total: 0, full: 0, fractional: 0};
  }

  if (activeCount === 0) {
    if (forcePassiveFractional) {
      const fractional = Math.min(Math.ceil(participantCount / maxFractionsPerTile), maxTiles);
      return {total: fractional, full: 0, fractional};
    }
    // Nobody has spoken yet, so nobody has earned a bigger tile — everyone is equal.
    // The ratio rule is meaningless here (it is expressed per active participant), so
    // lay out plain full tiles; only when the grid runs out of room does the last tile
    // become fractional to host the remainder and the overflow badge.
    if (participantCount <= maxTiles) {
      return {total: participantCount, full: participantCount, fractional: 0};
    }
    return {total: maxTiles, full: maxTiles - 1, fractional: 1};
  }

  const requestedFractional = Math.ceil(silentCount / maxFractionsPerTile);

  const total = Math.min(
    activeCount + requestedFractional,
    Math.ceil(activeCount / (1 - ratio)),
    maxTiles,
  );

  let fractional = Math.min(requestedFractional, Math.ceil(ratio * total), total);
  let full = total - fractional;

  // Defensive: the formula above always keeps full <= activeCount in practice, but
  // under this mode a passive must never occupy a full seat, so guarantee it explicitly
  // rather than relying on that being true by construction.
  if (forcePassiveFractional && full > activeCount) {
    fractional += full - activeCount;
    full = activeCount;
  }

  return {total: full + fractional, full, fractional};
}

// ── Sticky seat assignment ────────────────────────────────────────────────────

interface Seat {
  kind: TileKind;
  /** Index of the tile this seat belongs to (full tiles first, then fractional). */
  tileIndex: number;
}

/**
 * Builds the flat list of seats the layout offers, in priority order: every full tile,
 * then every fraction of every fractional tile (each sized by its own entry in
 * `fractionCapacities`, so an under-full tile doesn't reserve capacity it won't use),
 * then overflow.
 */
function buildSeats(counts: TileCounts, fractionCapacities: number[], participantCount: number): Seat[] {
  const seats: Seat[] = [];

  for (let i = 0; i < counts.full; i++) {
    seats.push({kind: 'full', tileIndex: i});
  }

  for (let f = 0; f < counts.fractional; f++) {
    const tileIndex = counts.full + f;
    for (let c = 0; c < fractionCapacities[f]; c++) {
      seats.push({kind: 'fractional', tileIndex});
    }
  }

  // Anyone beyond the visible seats is represented by the overflow badge, which
  // consumes the final fraction of the last fractional tile.
  if (participantCount > seats.length && counts.fractional > 0) {
    seats.pop();
    while (seats.length < participantCount) {
      seats.push({kind: 'overflow', tileIndex: counts.full + counts.fractional - 1});
    }
  }

  return seats;
}

/**
 * Two-pass assignment of participants to seats.
 *
 * Pass 1 lays out the tentative order (strict priority). Pass 2 walks the seats and
 * lets an incumbent keep their seat whenever the *kind* of seat they would receive is
 * unchanged — so toggling a camera or tier never shuffles someone who is already
 * sitting somewhere equivalent. Only seats left vacant are filled from the tentative order.
 */
function assignSeats(
  sorted: GridParticipant[],
  seats: Seat[],
  prevAssignment: AssignmentMap,
  forcePassiveFractional = false,
): {occupants: (GridParticipant | null)[]; assignmentMap: AssignmentMap} {
  // Position-based fallback used only for participants whose tier's active-ness hasn't
  // changed — see the eligibility check in pass 2a for why this isn't used universally.
  const tentativeKind = new Map<string, TileKind>();
  sorted.forEach((p, i) => {
    const seat = seats[i];
    if (seat) {
      tentativeKind.set(p.id, seat.kind);
    }
  });

  const occupants: (GridParticipant | null)[] = new Array(seats.length).fill(null);
  const assigned = new Set<string>();

  // Pass 1 — self always takes the first seat of its own tier's kind outright, bypassing
  // the exact-seat stickiness below entirely. Self's *rank* (front of its bucket) is
  // computed correctly by updateSlotMap, but that rank can still land on the wrong side
  // of the full/fractional boundary: an already-seated participant that gets promoted to
  // active keeps its old (low) rank by design (see pass 2a), which can leave a gap ahead
  // of it that self's rank alone doesn't account for. Deriving self's seat directly from
  // its own tier sidesteps that entirely — self simply always gets the first seat that
  // matches what it currently is.
  const self = sorted.find(p => p.isSelf);
  if (self) {
    const hasFractionalRun = seats.some(seat => seat.kind === 'fractional');
    const selfIsActive = isActiveTier(self.tier);
    const selfKind: TileKind =
      selfIsActive || (!forcePassiveFractional && !hasFractionalRun) ? 'full' : 'fractional';
    const selfSeatIndex = seats.findIndex(seat => seat.kind === selfKind);
    if (selfSeatIndex !== -1) {
      occupants[selfSeatIndex] = self;
      assigned.add(self.id);
    }
  }

  // Pass 2a — incumbents whose seat kind is unchanged stay exactly where they are.
  //
  // A full-tile holder is grandfathered unconditionally: going quiet doesn't cost you
  // your tile, matching the "no capacity pressure, no eviction" rule tested elsewhere.
  // But the reverse — someone who *wasn't* full and has just become active — must NOT
  // sticky-match their old (lesser) kind. Without this, a participant promoted to active
  // stays stuck in a fraction purely because their exact old seat index happens to still
  // be a fraction after the layout reflows, even though they now qualify for a full tile;
  // this exemption lets them compete fresh in pass 2b instead, alongside self's fix above.
  //
  // Under `forcePassiveFractional`, a passive is barred from re-matching a full seat at
  // all — no grandfathering, no positional fallback — since the whole point of that mode
  // is that a passive never occupies one, regardless of history.
  const bySeatIndex = new Map<number, GridParticipant>();
  for (const p of sorted) {
    if (assigned.has(p.id)) {
      continue;
    }
    const prev = prevAssignment[p.id];
    if (prev === undefined) {
      continue;
    }
    if (forcePassiveFractional && prev.kind === 'full' && !isActiveTier(p.tier)) {
      continue;
    }
    const seat = seats[prev.seatIndex];
    if (!seat || occupants[prev.seatIndex] !== null || seat.kind !== prev.kind) {
      continue;
    }
    const newlyEligibleForFull = prev.kind !== 'full' && isActiveTier(p.tier);
    const keepsSeat = prev.kind === 'full' || tentativeKind.get(p.id) === prev.kind;
    if (!newlyEligibleForFull && keepsSeat && !bySeatIndex.has(prev.seatIndex)) {
      bySeatIndex.set(prev.seatIndex, p);
    }
  }
  for (const [seatIndex, p] of bySeatIndex) {
    occupants[seatIndex] = p;
    assigned.add(p.id);
  }

  // Pass 2b — fill the remaining seats from whoever's left, active participants first.
  // Active-before-passive here (not raw slot order) is what lets a freshly-promoted
  // participant claim a vacated full seat ahead of an incumbent passive with a lower
  // slot number purely from having arrived earlier. Under `forcePassiveFractional`, a
  // full seat is left empty rather than ever handed to a passive candidate — in practice
  // this never triggers, since counts.full is capped at activeCount for that mode, but
  // the guard makes the invariant explicit rather than incidental.
  const remainingActive = sorted.filter(p => !assigned.has(p.id) && isActiveTier(p.tier));
  const remainingPassive = sorted.filter(p => !assigned.has(p.id) && !isActiveTier(p.tier));
  let activeCursor = 0;
  let passiveCursor = 0;
  for (let i = 0; i < seats.length; i++) {
    if (occupants[i] !== null) {
      continue;
    }
    if (activeCursor < remainingActive.length) {
      occupants[i] = remainingActive[activeCursor];
      assigned.add(remainingActive[activeCursor].id);
      activeCursor++;
      continue;
    }
    if (forcePassiveFractional && seats[i].kind === 'full') {
      continue;
    }
    if (passiveCursor < remainingPassive.length) {
      occupants[i] = remainingPassive[passiveCursor];
      assigned.add(remainingPassive[passiveCursor].id);
      passiveCursor++;
    }
  }

  const assignmentMap: AssignmentMap = {};
  occupants.forEach((p, seatIndex) => {
    if (p !== null) {
      assignmentMap[p.id] = {kind: seats[seatIndex].kind, seatIndex};
    }
  });

  return {occupants, assignmentMap};
}

// ── Grid geometry ─────────────────────────────────────────────────────────────

/**
 * Picks the (rows, cols) split for `tileCount` tiles that yields the largest tiles,
 * preferring layouts whose natural width already satisfies the minimum aspect ratio.
 */
function chooseGridShape(
  tileCount: number,
  inv: Invariants,
  config: GridConfig,
): {rows: number; cols: number} {
  const {minTileHeight, maxTileHeight, minAspectRatio, maxAspectRatio, tileGap: gap} = config;

  let bestRows = 1;
  let bestCols = Math.min(tileCount, inv.maxCols);
  let bestScore = -Infinity;

  for (let cols = 1; cols <= inv.maxCols; cols++) {
    const rows = Math.ceil(tileCount / cols);
    if (rows > inv.maxRows) {
      continue;
    }

    const rawW = (inv.usableWidth - gap * (cols - 1)) / cols;
    const rawH = (inv.usableHeight - gap * (rows - 1)) / rows;
    const height = Math.min(Math.max(rawH, minTileHeight), maxTileHeight);
    const width = Math.min(Math.max(rawW, height * minAspectRatio), height * maxAspectRatio);

    // Layouts that are naturally wide enough waste no container space, so they win
    // outright; otherwise fall back to maximising tile area.
    const hasNaturalWidth = rawW >= height * minAspectRatio;
    const score = (hasNaturalWidth ? 1e9 : 0) + width * height;

    if (score > bestScore) {
      bestScore = score;
      bestRows = rows;
      bestCols = cols;
    }
  }

  return {rows: bestRows, cols: bestCols};
}

/** Grid shape plus the resulting clamped tile dimensions for `tileCount` tiles. */
function tileDimensionsFor(
  tileCount: number,
  inv: Invariants,
  config: GridConfig,
): {rows: number; cols: number; width: number; height: number} {
  const {minTileHeight, maxTileHeight, minAspectRatio, maxAspectRatio, tileGap: gap} = config;
  const {rows, cols} = chooseGridShape(tileCount, inv, config);

  const height = Math.min(
    Math.max((inv.usableHeight - gap * (rows - 1)) / rows, minTileHeight),
    maxTileHeight,
  );
  const rawWidth = (inv.usableWidth - gap * (cols - 1)) / cols;
  const width = Math.min(Math.max(rawWidth, height * minAspectRatio), height * maxAspectRatio);

  return {rows, cols, width, height};
}

// ── Layout computation ────────────────────────────────────────────────────────

function emptyGridLayout(inv: Invariants | null, maxFractionsPerTile = 0): GridModeLayout {
  return {
    mode: 'grid',
    maxRows: inv?.maxRows ?? 0,
    maxCols: inv?.maxCols ?? 0,
    maxTiles: inv?.maxTiles ?? 0,
    maxFractionsPerTile,
    rows: [],
    tileWidth: 0,
    tileHeight: 0,
    tileAspectRatio: 0,
    fractionWidth: null,
    fractionHeight: null,
    fractionAspectRatio: null,
  };
}

function computePresenterLayout(
  sorted: GridParticipant[],
  inv: Invariants,
  config: GridConfig,
  maxFractionsPerTile: number,
): PresenterModeLayout {
  const {minTileHeight, minAspectRatio, maxAspectRatio, tileGap: gap} = config;

  // The strip is a fixed-width sidebar; the spotlight simply absorbs the rest.
  const stripTileWidth = Math.ceil(minTileHeight * minAspectRatio);
  const minStripTileHeight = stripTileWidth / maxAspectRatio;
  const maxStripTileHeight = stripTileWidth / minAspectRatio;

  const spotlightParticipant = sorted.find(p => !p.isSelf) ?? sorted[0] ?? null;
  const stripParticipants = sorted.filter(p => p !== spotlightParticipant);

  const maxStripTiles = Math.max(1, Math.floor((inv.usableHeight + gap) / (minStripTileHeight + gap)));
  const hasOverflow = stripParticipants.length > maxStripTiles;
  const visibleCount = hasOverflow ? maxStripTiles - 1 : stripParticipants.length;

  const occupiedRows = hasOverflow ? maxStripTiles : stripParticipants.length;
  const rawHeight =
    occupiedRows > 0 ? (inv.usableHeight - gap * (occupiedRows - 1)) / occupiedRows : maxStripTileHeight;
  const stripTileHeight = Math.min(maxStripTileHeight, Math.max(minStripTileHeight, rawHeight));

  const strip: TileDescriptor[] = stripParticipants
    .slice(0, visibleCount)
    .map(participant => ({type: 'full' as const, participant}));

  if (hasOverflow) {
    const hidden = stripParticipants.slice(visibleCount);
    strip.push({
      type: 'overflow',
      count: hidden.length,
      avatars: hidden.slice(0, OVERFLOW_AVATAR_COUNT),
    });
  }

  return {
    mode: 'presenter',
    maxRows: inv.maxRows,
    maxCols: inv.maxCols,
    maxTiles: inv.maxTiles,
    maxFractionsPerTile,
    spotlight: spotlightParticipant ? {type: 'full', participant: spotlightParticipant} : null,
    strip,
    stripTileWidth,
    stripTileHeight,
  };
}

function computeLayout(
  participants: GridParticipant[],
  slotMap: Record<string, number>,
  containerSize: {width: number; height: number},
  config: GridConfig,
  presenterMode = false,
  prevAssignment: AssignmentMap = {},
): {layout: GridLayout; assignmentMap: AssignmentMap} {
  const inv = computeInvariants(containerSize, config);
  if (inv === null) {
    return {layout: emptyGridLayout(null), assignmentMap: {}};
  }

  const sorted = [...participants].sort((a, b) => (slotMap[a.id] ?? 0) - (slotMap[b.id] ?? 0));
  const {tileGap: gap} = config;

  // Fraction capacity depends on tile size, which depends on the tile count, which in
  // turn depends on fraction capacity. Break the cycle with a provisional pass over
  // the uncompressed tile count, then settle on the real numbers.
  const provisional = tileDimensionsFor(Math.max(1, Math.min(sorted.length, inv.maxTiles)), inv, config);
  const maxFractionsPerTile = fractionBoundsFor(provisional.width, provisional.height, inv, gap).capacity;

  if (presenterMode && sorted.length > 0) {
    return {
      layout: computePresenterLayout(sorted, inv, config, maxFractionsPerTile),
      assignmentMap: prevAssignment,
    };
  }

  if (sorted.length === 0) {
    return {layout: emptyGridLayout(inv, maxFractionsPerTile), assignmentMap: {}};
  }

  const activeCount = sorted.filter(p => isActiveTier(p.tier)).length;
  const forcePassiveFractional = config.forcePassiveFractional ?? false;

  const counts = computeTileCounts(
    activeCount,
    sorted.length - activeCount,
    inv.maxTiles,
    maxFractionsPerTile,
    config.maxFractionalTilesRatio,
    forcePassiveFractional,
  );

  const {cols: gridCols, width: tileWidth, height: tileHeight} = tileDimensionsFor(
    counts.total,
    inv,
    config,
  );

  // Distribute the fraction-eligible participants across tiles by filling each one to
  // capacity in turn, with the remainder in the last — the same split `counts.fractional`
  // itself assumes. Each tile then gets a shape sized to what it actually holds, so an
  // under-full tile renders as one (or a few) large cell rather than a few small ones
  // floating in unused space. Under `forcePassiveFractional`, every tile's shape is
  // additionally floored at a 2-way split (escalating to 4-way if 2 doesn't fit the
  // aspect bounds), so even a single occupant still reads as a visibly subdivided tile.
  const fractionTileShapes: {rows: number; cols: number; capacity: number}[] = [];
  let unseated = sorted.length - counts.full;
  for (let f = 0; f < counts.fractional; f++) {
    const target = Math.max(1, Math.min(maxFractionsPerTile, unseated));
    fractionTileShapes.push(
      forcePassiveFractional
        ? chooseFractionShapeWithFloor(target, tileWidth, tileHeight, inv, config, MIN_FRACTION_CAPACITY)
        : chooseFractionShape(target, tileWidth, tileHeight, inv, config),
    );
    unseated -= target;
  }

  const seats = buildSeats(counts, fractionTileShapes.map(shape => shape.capacity), sorted.length);
  const {occupants, assignmentMap} = assignSeats(sorted, seats, prevAssignment, forcePassiveFractional);

  // ── Build tile descriptors from the seated occupants ──
  const fullTiles: TileDescriptor[] = [];
  for (let i = 0; i < counts.full; i++) {
    const participant = occupants[i];
    if (participant) {
      fullTiles.push({type: 'full', participant});
    }
  }

  const fractionalTiles: TileDescriptor[] = [];
  for (let f = 0; f < counts.fractional; f++) {
    const tileIndex = counts.full + f;
    const {rows: fractionRows, cols: fractionCols} = fractionTileShapes[f];
    const fractions: FractionDescriptor[] = [];

    seats.forEach((seat, seatIndex) => {
      if (seat.tileIndex !== tileIndex) {
        return;
      }
      const participant = occupants[seatIndex];
      if (seat.kind === 'fractional' && participant) {
        fractions.push({type: 'participant', participant});
      }
    });

    const hiddenParticipants = seats
      .map((seat, seatIndex) => (seat.tileIndex === tileIndex && seat.kind === 'overflow' ? occupants[seatIndex] : null))
      .filter((p): p is GridParticipant => p !== null);

    if (hiddenParticipants.length > 0) {
      fractions.push({
        type: 'overflow',
        count: hiddenParticipants.length,
        avatars: hiddenParticipants.slice(0, OVERFLOW_AVATAR_COUNT),
      });
    }

    if (fractions.length > 0) {
      fractionalTiles.push({type: 'fractional', fractionRows, fractionCols, fractions});
    }
  }

  // Lightly-populated tiles read as a single highlighted participant rather than a
  // crowded grid, so they belong before the more tightly-packed ones.
  fractionalTiles.sort((a, b) => {
    const aLength = a.type === 'fractional' ? a.fractions.length : 0;
    const bLength = b.type === 'fractional' ? b.fractions.length : 0;
    return aLength - bLength;
  });

  const tiles: TileDescriptor[] = [...fullTiles, ...fractionalTiles];

  // Representative subtile size for a fully-packed fraction tile — informational only;
  // FractionalTile computes its own per-tile size from its own fractionRows/fractionCols.
  const standardFractionShape =
    counts.fractional > 0
      ? chooseFractionShape(maxFractionsPerTile, tileWidth, tileHeight, inv, config)
      : null;
  const fractionWidth = standardFractionShape
    ? (tileWidth - gap * (standardFractionShape.cols - 1)) / standardFractionShape.cols
    : null;
  const fractionHeight = standardFractionShape
    ? (tileHeight - gap * (standardFractionShape.rows - 1)) / standardFractionShape.rows
    : null;

  const rows: RowLayout[] = [];
  for (let i = 0; i < tiles.length; i += gridCols) {
    rows.push({tiles: tiles.slice(i, i + gridCols)});
  }

  return {
    layout: {
      mode: 'grid',
      maxRows: inv.maxRows,
      maxCols: inv.maxCols,
      maxTiles: inv.maxTiles,
      maxFractionsPerTile,
      rows,
      tileWidth,
      tileHeight,
      tileAspectRatio: tileWidth / tileHeight,
      fractionWidth,
      fractionHeight,
      fractionAspectRatio:
        fractionWidth !== null && fractionHeight !== null ? fractionWidth / fractionHeight : null,
    },
    assignmentMap,
  };
}

// ── Reducer factory ───────────────────────────────────────────────────────────

export function createInitialState(containerSize: {width: number; height: number}): GridState {
  return {
    participants: [],
    containerSize,
    slotMap: {},
    assignmentMap: {},
    isPresenterModeActive: false,
    areAllParticipantsShown: false,
    layout: emptyGridLayout(null),
  };
}

function hasScreenShare(participants: GridParticipant[]): boolean {
  return participants.some(p => p.tier === 'screen-sharing');
}

/**
 * Recomputes slots, seating and layout after the participant list changes.
 * Presenter mode auto-activates the first time a screen share appears.
 */
function reproject(
  state: GridState,
  participants: GridParticipant[],
  config: GridConfig,
  screenShareAppeared: boolean,
): GridState {
  const isPresenterModeActive = screenShareAppeared ? true : state.isPresenterModeActive;
  const slotMap = updateSlotMap(participants, state.slotMap);
  const {layout, assignmentMap} = computeLayout(
    participants,
    slotMap,
    state.containerSize,
    config,
    isPresenterModeActive,
    state.assignmentMap,
  );
  return {...state, participants, slotMap, assignmentMap, isPresenterModeActive, layout};
}

/**
 * Returns a curried reducer closed over the given config.
 * Pass the result to `useReducer`.
 */
export function createGridReducer(config: GridConfig) {
  return function gridReducer(state: GridState, action: GridAction): GridState {
    switch (action.type) {
      case 'ADD_PARTICIPANT': {
        if (state.participants.some(p => p.id === action.participant.id)) {
          return state;
        }
        let participant = action.participant;
        // Active-tier participants need an activatedAt for recency ordering.
        if (isActiveTier(participant.tier) && participant.activatedAt === undefined) {
          participant = {...participant, activatedAt: action.now ?? Date.now()};
        }
        const participants = [...state.participants, participant];
        const appeared = !hasScreenShare(state.participants) && hasScreenShare(participants);
        return reproject(state, participants, config, appeared);
      }

      case 'REMOVE_PARTICIPANT': {
        const participants = state.participants.filter(p => p.id !== action.id);
        if (participants.length === state.participants.length) {
          return state;
        }
        return reproject(state, participants, config, false);
      }

      case 'UPDATE_PARTICIPANT': {
        const index = state.participants.findIndex(p => p.id === action.id);
        if (index === -1) {
          return state;
        }
        const prev = state.participants[index];
        let updated = {...prev, ...action.changes};
        // A tier change restarts the recency clock.
        if (action.changes.tier !== undefined && action.changes.tier !== prev.tier) {
          updated = {...updated, activatedAt: action.now ?? Date.now()};
        }
        const participants = [...state.participants];
        participants[index] = updated;
        const appeared = !hasScreenShare(state.participants) && hasScreenShare(participants);
        return reproject(state, participants, config, appeared);
      }

      case 'SET_CONTAINER_SIZE': {
        const containerSize = {width: action.width, height: action.height};
        const {layout, assignmentMap} = computeLayout(
          state.participants,
          state.slotMap,
          containerSize,
          config,
          state.isPresenterModeActive,
          state.assignmentMap,
        );
        return {...state, containerSize, assignmentMap, layout};
      }

      case 'TOGGLE_PRESENTER_MODE': {
        const isPresenterModeActive = !state.isPresenterModeActive;
        const {layout, assignmentMap} = computeLayout(
          state.participants,
          state.slotMap,
          state.containerSize,
          config,
          isPresenterModeActive,
          state.assignmentMap,
        );
        return {...state, isPresenterModeActive, assignmentMap, layout};
      }

      case 'TOGGLE_ALL_PARTICIPANTS': {
        return {...state, areAllParticipantsShown: !state.areAllParticipantsShown};
      }

      default:
        return state;
    }
  };
}

export {updateSlotMap as _updateSlotMap, computeInvariants as _computeInvariants};

/** Test seam: returns just the layout, matching the shape tests assert against. */
export function _computeLayout(
  participants: GridParticipant[],
  slotMap: Record<string, number>,
  containerSize: {width: number; height: number},
  config: GridConfig,
  presenterMode = false,
  prevAssignment: AssignmentMap = {},
): GridLayout {
  return computeLayout(participants, slotMap, containerSize, config, presenterMode, prevAssignment).layout;
}
