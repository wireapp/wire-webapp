import {
  AssignmentMap,
  FractionalTileDescriptor,
  GridAction,
  GridConfig,
  GridLayout,
  GridModeLayout,
  GridParticipant,
  GridState,
  isActiveTier,
  OneOnOneLayout,
  PresenterModeLayout,
  TIER_ORDER,
  TileDescriptor,
} from './FluidVideoGrid.types';

/** A fractional tile is at least half the height of a minimum-size full tile. */
const MIN_FRACTIONAL_TILE_HEIGHT_RATIO = 0.5;

/** How many avatars the overflow badge previews. */
const OVERFLOW_AVATAR_COUNT = 3;

function tierRank(tier: GridParticipant['tier']): number {
  return TIER_ORDER.indexOf(tier);
}

// ── Stable slot assignment ────────────────────────────────────────────────────

/**
 * Orders every participant, self included — self carries no seating privilege and
 * competes on the same tier/recency/stickiness rules as everyone else.
 *
 * Two rules, in order of precedence:
 *  1. Participants that already held a slot keep their *relative* order. Changing
 *     tier never reshuffles someone who is already seated — that is what makes
 *     seating sticky.
 *  2. Newcomers are inserted at the position their tier earns them, ahead of any
 *     lower-priority participant. Within a tier, the most recently activated goes first.
 */
function orderParticipants(
  participants: GridParticipant[],
  prevSlotMap: Record<string, number>,
): GridParticipant[] {
  const seated = participants
    .filter(p => prevSlotMap[p.id] !== undefined)
    .sort((a, b) => prevSlotMap[a.id] - prevSlotMap[b.id]);

  const newcomers = participants
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

/** Assigns a stable slot index to every participant, by tier priority and seating stickiness. */
function updateSlotMap(
  participants: GridParticipant[],
  prevSlotMap: Record<string, number>,
): Record<string, number> {
  const ordered = orderParticipants(participants, prevSlotMap);

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

  return {
    usableWidth,
    usableHeight,
    maxRows,
    maxCols,
    maxTiles: maxRows * maxCols,
  };
}

/**
 * The fixed size of a single fractional tile — invariant for a given `tileHeight`, regardless
 * of how many participants actually need to fit or which of the container's three layout
 * modes is active. Two things make that true:
 *
 *  - Height is chosen by picking the row count whose *exact* division of `tileHeight` lands
 *    closest to the target (half the configured minimum full-tile height), then always using
 *    that exact per-row height — never a fallback/target value that differs depending on fill
 *    level. A fixed `rows` and a fixed `fracHeight` is the whole point: there is exactly one
 *    size for a given `tileHeight`, so a half-filled column and a completely full column use
 *    identical cells (only the column count, decided by flex-wrap, responds to fill level).
 *  - Width follows a *fixed* aspect ratio — the midpoint of the fractional tile's own
 *    configured bounds — rather than the current full tile's aspect ratio. The full tile's own
 *    shape varies a lot between grid layouts (a lone full tile clamps to the widest allowed
 *    ratio; a packed multi-column grid is often much narrower), and inheriting it would make
 *    fractional tiles balloon or shrink sideways purely because the *grid* reconfigured, not
 *    because anything about the fractional tile itself changed.
 *
 * In a degenerate, very short container the per-row height shrinks below the target just
 * enough to still fit the mandatory 2 rows.
 */
function computeFractionalTileSize(
  tileHeight: number,
  config: GridConfig,
): {rows: number; fracWidth: number; fracHeight: number} {
  const {minTileHeight, minAspectRatio, maxAspectRatio, tileGap: gap} = config;
  const minFracAspectRatio = config.minFractionalTileAspectRatio ?? minAspectRatio;
  const maxFracAspectRatio = config.maxFractionalTileAspectRatio ?? maxAspectRatio;
  const targetFracHeight = minTileHeight * MIN_FRACTIONAL_TILE_HEIGHT_RATIO;
  const targetAspectRatio = (minFracAspectRatio + maxFracAspectRatio) / 2;

  // A fractional tile can never be the size of a full tile — always at least a 2-way split —
  // but beyond that, pick however many rows of the fixed target height land closest to exact.
  const rows = Math.max(2, Math.round((tileHeight + gap) / (targetFracHeight + gap)));

  // Exact division — zero leftover space across `rows` rows of `tileHeight`, always, so the
  // size never has to vary between an under-filled and a fully-filled column.
  const fracHeight = (tileHeight - gap * (rows - 1)) / rows;
  const fracWidth = fracHeight * targetAspectRatio;

  return {rows, fracWidth, fracHeight};
}

/**
 * Builds the fractional tile list for a given `capacity`: everyone who fits, plus an
 * overflow badge summarising the rest if they don't all fit. Returned in priority order —
 * rendering relies on CSS flex-wrap to place them (column-major or row-major, depending on
 * the container's mode), so no row/column index math happens here.
 */
function buildFractionalTiles(
  participants: GridParticipant[],
  capacity: number,
): {tiles: FractionalTileDescriptor[]; visibleCount: number; hasOverflow: boolean} {
  const hasOverflow = participants.length > capacity;
  const visibleCount = hasOverflow ? capacity - 1 : participants.length;

  const tiles: FractionalTileDescriptor[] = participants
    .slice(0, visibleCount)
    .map(participant => ({type: 'participant' as const, participant}));

  if (hasOverflow) {
    const hidden = participants.slice(visibleCount);
    tiles.push({type: 'overflow', count: hidden.length, avatars: hidden.slice(0, OVERFLOW_AVATAR_COUNT)});
  }

  return {tiles, visibleCount, hasOverflow};
}

// ── Tile counts ───────────────────────────────────────────────────────────────

export interface TileCounts {
  full: number;
  needsFractionContainer: boolean;
}

/**
 * Decides how many full tiles to render. Active participants earn full tiles; passive
 * (silent, camera-off) participants never do — they always go into the fractional tile
 * container, which exists whenever at least one passive participant is present, or when
 * there are more active participants than full tiles can hold.
 *
 * When active participants alone would saturate the entire grid (no partial last row and
 * no room for another row), one full tile is sacrificed so the mandatory container still
 * has somewhere to render — it then also absorbs the active participant bumped out.
 */
export function computeTileCounts(
  activeCount: number,
  passiveCount: number,
  inv: Invariants,
  _config: GridConfig,
): TileCounts {
  const participantCount = activeCount + passiveCount;
  if (participantCount === 0) {
    return {full: 0, needsFractionContainer: false};
  }

  let full = Math.min(activeCount, inv.maxTiles);
  const needsFractionContainer = passiveCount > 0 || activeCount > full;

  // A full tile is sacrificed only when the full tiles alone already saturate the entire grid
  // (every slot the container could possibly hold, `maxRows * maxCols`) — the one case where
  // there is truly nowhere left for the mandatory fraction container to go, not even a new row.
  // Below that ceiling, `computeLayout` sizes tiles from `full + 1` units (the fraction
  // container counts as one more unit, see `gridUnitCount`), and `chooseGridShape` always finds
  // a shape with a leftover slot or an extra row for that `+1` on its own — e.g. 4 full tiles
  // that would perfectly fill a 2×2 grid simply grow into a 3-column shape instead, with the
  // 4th tile staying full-size rather than being demoted into the tiny fraction container.
  if (needsFractionContainer && full >= inv.maxTiles) {
    full -= 1;
  }

  return {full, needsFractionContainer};
}

// ── Full-tile seat assignment ─────────────────────────────────────────────────

/**
 * Sticky assignment of the full-tile boundary only: whoever already holds a full tile
 * keeps it as long as they're still active; new or promoted active participants fill
 * whatever seats are left, highest priority first. The fractional tile container's
 * internal membership is not sticky — see `splitFractionalTiles`.
 */
function assignFullTiles(
  sorted: GridParticipant[],
  full: number,
  prevAssignment: AssignmentMap,
): {fullOccupants: GridParticipant[]; assignmentMap: AssignmentMap} {
  const occupants: (GridParticipant | null)[] = new Array(full).fill(null);
  const assigned = new Set<string>();

  // Incumbents keep their exact seat as long as they're still active.
  for (const p of sorted) {
    if (assigned.has(p.id) || !isActiveTier(p.tier)) {
      continue;
    }
    const prev = prevAssignment[p.id];
    if (prev === undefined || prev.kind !== 'full' || prev.seatIndex >= full) {
      continue;
    }
    if (occupants[prev.seatIndex] !== null) {
      continue;
    }
    occupants[prev.seatIndex] = p;
    assigned.add(p.id);
  }

  // Fill whatever's left with the highest-priority active participants remaining.
  const remaining = sorted.filter(p => !assigned.has(p.id) && isActiveTier(p.tier));
  let cursor = 0;
  for (let i = 0; i < full; i++) {
    if (occupants[i] !== null) {
      continue;
    }
    if (cursor < remaining.length) {
      occupants[i] = remaining[cursor];
      assigned.add(remaining[cursor].id);
      cursor++;
    }
  }

  const assignmentMap: AssignmentMap = {};
  const fullOccupants: GridParticipant[] = [];
  occupants.forEach((p, seatIndex) => {
    if (p !== null) {
      assignmentMap[p.id] = {kind: 'full', seatIndex};
      fullOccupants.push(p);
    }
  });

  return {fullOccupants, assignmentMap};
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

function emptyGridLayout(inv: Invariants | null): GridModeLayout {
  return {
    mode: 'grid',
    maxRows: inv?.maxRows ?? 0,
    maxCols: inv?.maxCols ?? 0,
    maxTiles: inv?.maxTiles ?? 0,
    maxFractionalTilesPerContainer: 0,
    tiles: [],
    tileWidth: 0,
    tileHeight: 0,
    tileAspectRatio: 0,
    fractionalTileWidth: null,
    fractionalTileHeight: null,
    fractionalTileAspectRatio: null,
    fractionalContainerWidth: null,
    fractionalContainerHeight: null,
  };
}

function soloLayout(participant: GridParticipant, inv: Invariants, config: GridConfig): GridModeLayout {
  const {width, height} = tileDimensionsFor(1, inv, config);
  return {
    mode: 'grid',
    maxRows: inv.maxRows,
    maxCols: inv.maxCols,
    maxTiles: inv.maxTiles,
    maxFractionalTilesPerContainer: 0,
    tiles: [{type: 'full', participant}],
    tileWidth: width,
    tileHeight: height,
    tileAspectRatio: width / height,
    fractionalTileWidth: null,
    fractionalTileHeight: null,
    fractionalTileAspectRatio: null,
    fractionalContainerWidth: null,
    fractionalContainerHeight: null,
  };
}

function computeOneOnOneLayout(
  self: GridParticipant,
  other: GridParticipant,
  inv: Invariants,
): OneOnOneLayout {
  return {
    mode: 'one-on-one',
    maxRows: inv.maxRows,
    maxCols: inv.maxCols,
    maxTiles: inv.maxTiles,
    maxFractionalTilesPerContainer: 0,
    main: {type: 'full', participant: other},
    pip: self,
  };
}

/**
 * The spotlight is a single prime seat, so — unlike full tiles, where stickiness prevents the
 * whole grid from jittering as people come and go — it always tracks whoever is currently the
 * single most-relevant participant, with no incumbency protection. Self competes on exactly
 * the same terms as anyone else; there is no seating privilege for being the local user.
 *
 * Priority drops through three tiers, each one only considered when the tier(s) above it are
 * completely empty:
 *  1. Screen-sharing. With several simultaneous screen-shares, this is what gives the "stack"
 *     behavior — whoever started sharing most recently holds the spotlight, and when they stop,
 *     it falls back to whoever among the remaining sharers started next-most-recently (just a
 *     side effect of always recomputing "most recent" fresh from whoever is left).
 *  2. Speaking (camera on or off) — only matters once nobody is screen-sharing.
 *  3. Camera on, silent — the fallback once nobody is sharing or speaking.
 *
 * Within whichever tier is in play, `activatedAt` (already debounce/hold-adjusted upstream,
 * wherever tiers are assigned) picks the most recent one — the same recency signal that ranks
 * everyone for full-tile assignment, just without the sticky-incumbent exception that makes
 * sense for a grid of many tiles but not for a single always-tracks-the-latest spotlight.
 */
function selectSpotlight(participants: GridParticipant[]): GridParticipant | null {
  if (participants.length === 0) {
    return null;
  }
  const screenSharers = participants.filter(p => p.tier === 'screen-sharing');
  const speakers = participants.filter(p => p.tier === 'speaking-camera' || p.tier === 'speaking-no-camera');
  const camerasOn = participants.filter(p => p.tier === 'silent-camera');
  const pool = screenSharers.length > 0 ? screenSharers : speakers.length > 0 ? speakers : camerasOn.length > 0 ? camerasOn : participants;

  return pool.reduce((latest, p) => ((p.activatedAt ?? 0) > (latest.activatedAt ?? 0) ? p : latest));
}

function computePresenterLayout(
  sorted: GridParticipant[],
  inv: Invariants,
  config: GridConfig,
): PresenterModeLayout {
  const {minTileHeight, minAspectRatio, maxAspectRatio, tileGap: gap} = config;

  // The strip is a fixed-width sidebar; the spotlight simply absorbs the rest.
  const stripTileWidth = Math.ceil(minTileHeight * minAspectRatio);
  const minStripTileHeight = stripTileWidth / maxAspectRatio;
  const maxStripTileHeight = stripTileWidth / minAspectRatio;

  const spotlightParticipant = selectSpotlight(sorted);
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
    maxFractionalTilesPerContainer: 0,
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

  if (presenterMode && sorted.length > 0) {
    return {
      layout: computePresenterLayout(sorted, inv, config),
      assignmentMap: prevAssignment,
    };
  }

  if (sorted.length === 0) {
    return {layout: emptyGridLayout(inv), assignmentMap: {}};
  }

  // A solo call is always one big tile, regardless of active/passive status — there's
  // nobody else to compete with it for space. Still records the seat so a newcomer
  // joining right after doesn't bump the incumbent out of the seat they already hold.
  if (sorted.length === 1) {
    return {
      layout: soloLayout(sorted[0], inv, config),
      assignmentMap: {[sorted[0].id]: {kind: 'full', seatIndex: 0}},
    };
  }

  // Two people always use the one-on-one template: the other participant fills the
  // stage, self overlays as a small thumbnail. Falls through to the general grid if
  // neither participant is flagged as self (shouldn't happen in practice).
  if (sorted.length === 2) {
    const self = sorted.find(p => p.isSelf);
    const other = sorted.find(p => p !== self);
    if (self && other) {
      return {
        layout: computeOneOnOneLayout(self, other, inv),
        assignmentMap: {...prevAssignment, [other.id]: {kind: 'full', seatIndex: 0}},
      };
    }
  }

  const activeCount = sorted.filter(p => isActiveTier(p.tier)).length;
  const passiveCount = sorted.length - activeCount;
  const {full, needsFractionContainer} = computeTileCounts(activeCount, passiveCount, inv, config);

  const {fullOccupants, assignmentMap} = assignFullTiles(sorted, full, prevAssignment);
  const fullIds = new Set(fullOccupants.map(p => p.id));
  const fractionalParticipants = needsFractionContainer ? sorted.filter(p => !fullIds.has(p.id)) : [];

  // The fractional tile container competes for grid space exactly like one more full tile
  // would — otherwise, e.g., a single full tile would claim the *entire* grid height for
  // itself, leaving the container with nowhere to go but to overflow underneath it.
  const gridUnitCount = Math.max(1, full + (fractionalParticipants.length > 0 ? 1 : 0));
  const {cols: fullCols, width: tileWidth, height: tileHeight} = tileDimensionsFor(gridUnitCount, inv, config);

  let fractionalTileWidth: number | null = null;
  let fractionalTileHeight: number | null = null;
  let fractionalTileAspectRatio: number | null = null;
  let fractionalContainerWidth: number | null = null;
  let fractionalContainerHeight: number | null = null;
  let fractionalContainerTile: TileDescriptor | null = null;
  let maxFractionalTilesPerContainer = 0;

  if (fractionalParticipants.length > 0) {
    const {rows: capRows, fracWidth: baseFracWidth, fracHeight: baseFracHeight} =
      computeFractionalTileSize(tileHeight, config);

    const leftoverFullTiles = full === 0 ? 0 : full % fullCols;
    const sharesRow = leftoverFullTiles > 0;

    if (sharesRow) {
      // Modes 1 & 3 — the container is tucked beside leftover full tiles in their row, so it
      // fills column-major (first column top-to-bottom, then the next). Capacity is bounded
      // by the width actually left over in that row (not the full grid width) — otherwise it
      // grows wider than the row it's in, CSS wraps it to a new line, and that line is still
      // `tileHeight` tall, blowing out the total content height (see the regression test).
      const remainingSlots = fullCols - leftoverFullTiles;
      const availableWidth = remainingSlots * tileWidth + (remainingSlots - 1) * gap;
      const maxCols = Math.max(1, Math.floor((availableWidth + gap) / (baseFracWidth + gap)));
      const capacity = maxCols * capRows;

      const {tiles, visibleCount} = buildFractionalTiles(fractionalParticipants, capacity);

      // Cell height is the fixed, invariant size from computeFractionalTileSize — identical
      // whether the column is half-full or completely full. The container's box is always
      // `tileHeight` regardless of fill level — it must align with the full tile(s) it shares
      // the row with either way.
      fractionalTileHeight = baseFracHeight;

      // Mode 1: this shared row is the *only* row (no full-tile-only rows above) — tightly
      // packed beside the lone full tile, last column vertically centered. Mode 3: there are
      // full-tile rows above it — top/left-aligned instead, consistent with tiles flowing
      // top-to-bottom, left-to-right.
      const isOnlyRow = full < fullCols;

      // Width hugs its content whenever genuinely fewer than `maxCols` columns are in use —
      // full tiles are fixed-size and never grow into space freed up by hugging, so there's no
      // benefit to forcing the container wider than its content, only the visual cost of a gap
      // that doesn't belong to any tile. The whole shared row (full tile(s) + this now
      // content-sized container) is centered as a block by the outer grid regardless of mode.
      // Because the hugged width is purely a function of `cols` (a function of participant
      // count, not of whether the previous column *just* filled up), it doesn't change
      // discontinuously as participants are added within the same column count, so the row
      // doesn't visibly jump around.
      //
      // Once `cols` reaches `maxCols` though — as many columns as can possibly fit, whether or
      // not the last one is completely full — hugging with the fixed target width would still
      // leave a few leftover px (`maxCols` is a floor), and centering *that* leaves an
      // inconsistent inset: a few px narrower than `availableWidth`, which itself is built from
      // the same `tileWidth` the full tile(s) in this row already use. The result reads as a
      // "kink" where this row's edges sit slightly inside the full tile rows' edges instead of
      // lining up with them. So at `cols === maxCols`, the cell width instead divides
      // `availableWidth` exactly (mirroring how cell height already divides `tileHeight`
      // exactly), closing that gap — still invariant across fill level, since `maxCols` and
      // `availableWidth` depend only on the grid shape, not on how many passives are seated.
      const cols = Math.max(1, Math.ceil(visibleCount / capRows));
      if (cols >= maxCols) {
        fractionalTileWidth = (availableWidth - (maxCols - 1) * gap) / maxCols;
        fractionalContainerWidth = availableWidth;
      } else {
        fractionalTileWidth = baseFracWidth;
        fractionalContainerWidth = cols * fractionalTileWidth + (cols - 1) * gap;
      }
      fractionalContainerHeight = tileHeight;
      maxFractionalTilesPerContainer = capacity;
      fractionalContainerTile = {
        type: 'fractional',
        fractionalTiles: tiles,
        fillDirection: 'column',
        align: isOnlyRow ? 'center' : 'start',
      };
    } else {
      // Mode 2 — the container has a row entirely to itself, so it behaves like a miniature
      // version of the main grid: fills row-major (left-to-right, then wraps down), last row
      // centered horizontally. Width always claims exactly `fullCols * tileWidth + gaps` — the
      // precise width any full-tile row in this grid spans (mode 2 only triggers when `full`
      // divides evenly into `fullCols`, so every full-tile row is completely full, all sharing
      // that same width) — rather than the grid's abstract usable width, which can be wider
      // than what full tiles actually render at once they clamp to the max aspect ratio. Using
      // the real full-tile-row width keeps left/right edges flush with the rows above/below
      // instead of each row being independently centered to a different width by the outer
      // flex-wrap (which reads as misalignment).
      //
      // `maxCols` must be floored against that *same* real container width (not the grid's
      // abstract usable width — using that let `maxCols` overcount, understating how many
      // columns the container can actually fit). And like mode 3, `maxCols * targetWidth` is
      // generally a few px short of the container width; left uncorrected, `justifyContent:
      // 'center'` (this mode's "last row centered horizontally" rule) splits that slack onto
      // *both* edges even when every column is in use — a symmetric inset that never reaches
      // either edge, instead of a flush fit. Stretching the cell width to exactly divide the
      // container width (mirroring mode 3's fix) removes the slack for a fully-packed row, so
      // centering only has a visible effect on a genuinely under-filled last row, as intended.
      const containerWidth = fullCols * tileWidth + (fullCols - 1) * gap;
      const maxCols = Math.max(1, Math.floor((containerWidth + gap) / (baseFracWidth + gap)));
      const maxRows = Math.max(1, Math.floor((tileHeight + gap) / (baseFracHeight + gap)));
      const capacity = maxCols * maxRows;

      const {tiles, visibleCount} = buildFractionalTiles(fractionalParticipants, capacity);

      fractionalTileHeight = baseFracHeight;
      fractionalTileWidth = (containerWidth - (maxCols - 1) * gap) / maxCols;

      const rowsNeeded = Math.max(1, Math.ceil(visibleCount / maxCols));
      fractionalContainerWidth = containerWidth;
      fractionalContainerHeight = rowsNeeded * fractionalTileHeight + (rowsNeeded - 1) * gap;
      maxFractionalTilesPerContainer = capacity;

      fractionalContainerTile = {
        type: 'fractional',
        fractionalTiles: tiles,
        fillDirection: 'row',
        align: 'center',
      };
    }

    fractionalTileAspectRatio = fractionalTileWidth / fractionalTileHeight;
  }

  // Full tiles first (priority order), then the fractional container. A single flex-wrap
  // container renders these — the browser decides row breaks and the fractional container's
  // width, since only each tile's own fixed size is computed here, not row/column layout.
  const tiles: TileDescriptor[] = [
    ...fullOccupants.map(participant => ({type: 'full' as const, participant})),
    ...(fractionalContainerTile ? [fractionalContainerTile] : []),
  ];

  return {
    layout: {
      mode: 'grid',
      maxRows: inv.maxRows,
      maxCols: inv.maxCols,
      maxTiles: inv.maxTiles,
      maxFractionalTilesPerContainer,
      tiles,
      tileWidth,
      tileHeight,
      tileAspectRatio: tileWidth / tileHeight,
      fractionalTileWidth,
      fractionalTileHeight,
      fractionalTileAspectRatio,
      fractionalContainerWidth,
      fractionalContainerHeight,
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
    presenterModeBeforeScreenShare: null,
    areAllParticipantsShown: false,
    layout: emptyGridLayout(null),
  };
}

function hasScreenShare(participants: GridParticipant[]): boolean {
  return participants.some(p => p.tier === 'screen-sharing');
}

/**
 * Recomputes slots, seating and layout after the participant list changes.
 *
 * Presenter mode auto-activates the moment a screen share first appears (from zero sharers to
 * one or more), snapshotting whatever the user had it set to beforehand. It stays
 * user-toggleable for the rest of that screen-share session — manually switching it on/off
 * while sharing is in progress works normally and isn't overridden here. Only once the very
 * last screen share ends does it revert to the snapshotted pre-share setting, discarding
 * whatever it was manually changed to in between (that's the "remembered setting", not a
 * clean slate).
 */
function reproject(state: GridState, participants: GridParticipant[], config: GridConfig): GridState {
  const hadScreenShare = hasScreenShare(state.participants);
  const hasScreenShareNow = hasScreenShare(participants);

  let isPresenterModeActive = state.isPresenterModeActive;
  let presenterModeBeforeScreenShare = state.presenterModeBeforeScreenShare;

  if (!hadScreenShare && hasScreenShareNow) {
    presenterModeBeforeScreenShare = state.isPresenterModeActive;
    isPresenterModeActive = true;
  } else if (hadScreenShare && !hasScreenShareNow) {
    isPresenterModeActive = presenterModeBeforeScreenShare ?? false;
    presenterModeBeforeScreenShare = null;
  }

  const slotMap = updateSlotMap(participants, state.slotMap);
  const {layout, assignmentMap} = computeLayout(
    participants,
    slotMap,
    state.containerSize,
    config,
    isPresenterModeActive,
    state.assignmentMap,
  );
  return {
    ...state,
    participants,
    slotMap,
    assignmentMap,
    isPresenterModeActive,
    presenterModeBeforeScreenShare,
    layout,
  };
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
        return reproject(state, participants, config);
      }

      case 'REMOVE_PARTICIPANT': {
        const participants = state.participants.filter(p => p.id !== action.id);
        if (participants.length === state.participants.length) {
          return state;
        }
        return reproject(state, participants, config);
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
        return reproject(state, participants, config);
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

export {
  updateSlotMap as _updateSlotMap,
  computeInvariants as _computeInvariants,
  computeFractionalTileSize as _computeFractionalTileSize,
  tileDimensionsFor as _tileDimensionsFor,
};

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
