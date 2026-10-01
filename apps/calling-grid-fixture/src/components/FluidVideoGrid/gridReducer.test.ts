import {
  GridConfig,
  GridModeLayout,
  GridParticipant,
  GridState,
  ParticipantTier,
  PresenterModeLayout,
  TileDescriptor,
} from './FluidVideoGrid.types';
import {
  computeTileCounts,
  createGridReducer,
  createInitialState,
  _computeLayout,
  _updateSlotMap,
} from './gridReducer';

const DEFAULT_CONFIG: GridConfig = {
  minTileHeight: 120,
  maxTileHeight: 600,
  minAspectRatio: 0.67,
  maxAspectRatio: 1.78,
  tileGap: 4,
  maxFractionalTilesRatio: 1 / 3,
};

const RATIO = DEFAULT_CONFIG.maxFractionalTilesRatio;
const reducer = createGridReducer(DEFAULT_CONFIG);

const FORCE_PASSIVE_FRACTIONAL_CONFIG: GridConfig = {...DEFAULT_CONFIG, forcePassiveFractional: true};
const forcedReducer = createGridReducer(FORCE_PASSIVE_FRACTIONAL_CONFIG);

// Large container: maxTiles = 15 × 5 = 75
const container1280x720 = {width: 1280, height: 720};

// Small container: maxCols=3, maxRows=1 → maxTiles=3.
// usableW=292, minTileWidth≈80.4 → floor((292+4)/(80.4+4))=3
// usableH=130, minTileHeight=120 → floor((130+4)/(120+4))=1
const smallContainer = {width: 300, height: 138};

const container960x540 = {width: 960, height: 540};

function makeParticipant(
  id: string,
  tier: ParticipantTier = 'silent-no-camera',
  speakingDuration = 0,
  activatedAt?: number,
): GridParticipant {
  return {id, name: `User ${id}`, tier, isMuted: false, speakingDuration, activatedAt};
}

/** The local user. `isSelf` is identity only — it carries no seating privilege. */
function makeSelf(id: string, tier: ParticipantTier = 'silent-no-camera'): GridParticipant {
  return {...makeParticipant(id, tier), isSelf: true};
}

function addAll(state: GridState, participants: GridParticipant[], now = 0): GridState {
  return participants.reduce((s, p) => reducer(s, {type: 'ADD_PARTICIPANT', participant: p, now}), state);
}

function addAllForced(state: GridState, participants: GridParticipant[], now = 0): GridState {
  return participants.reduce((s, p) => forcedReducer(s, {type: 'ADD_PARTICIPANT', participant: p, now}), state);
}

function addAllSmall(participants: GridParticipant[], now = 0): GridState {
  return addAll(createInitialState(smallContainer), participants, now);
}

/** Screen sharing auto-enters presenter mode; grid assertions need the tiled layout back. */
function exitPresenter(state: GridState): GridState {
  return state.isPresenterModeActive ? reducer(state, {type: 'TOGGLE_PRESENTER_MODE'}) : state;
}

function grid(state: GridState): GridModeLayout {
  if (state.layout.mode !== 'grid') {
    throw new Error(`expected a grid layout, got "${state.layout.mode}"`);
  }
  return state.layout;
}

function presenter(state: GridState): PresenterModeLayout {
  if (state.layout.mode !== 'presenter') {
    throw new Error(`expected a presenter layout, got "${state.layout.mode}"`);
  }
  return state.layout;
}

type FullTile = Extract<TileDescriptor, {type: 'full'}>;
type FractionalTile = Extract<TileDescriptor, {type: 'fractional'}>;

function allTiles(state: GridState): TileDescriptor[] {
  return grid(state).rows.flatMap(r => r.tiles);
}

function fullTiles(state: GridState): FullTile[] {
  return allTiles(state).filter((t): t is FullTile => t.type === 'full');
}

function fullTileIds(state: GridState): string[] {
  return fullTiles(state).map(t => t.participant.id);
}

function fractionalTiles(state: GridState): FractionalTile[] {
  return allTiles(state).filter((t): t is FractionalTile => t.type === 'fractional');
}

function fractionalTile(state: GridState): FractionalTile | undefined {
  return fractionalTiles(state)[0];
}

/** Ids of every participant seated in a fraction, across all fractional tiles. */
function fractionIds(state: GridState): string[] {
  return fractionalTiles(state).flatMap(t =>
    t.fractions.filter(f => f.type === 'participant').map(f => (f as {participant: GridParticipant}).participant.id),
  );
}

function overflowCount(state: GridState): number {
  const overflow = fractionalTiles(state)
    .flatMap(t => t.fractions)
    .find(f => f.type === 'overflow');
  return overflow && overflow.type === 'overflow' ? overflow.count : 0;
}

/** Everyone actually visible — full tiles plus fractions, excluding the overflow badge. */
function visibleIds(state: GridState): string[] {
  return [...fullTileIds(state), ...fractionIds(state)];
}

// ── ADD_PARTICIPANT ────────────────────────────────────────────────────────────

describe('ADD_PARTICIPANT', () => {
  it('adds participant and produces a tile', () => {
    const state = reducer(createInitialState(container1280x720), {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('a', 'speaking-camera'),
    });
    expect(state.participants).toHaveLength(1);
    expect(allTiles(state)).toHaveLength(1);
    expect(allTiles(state)[0].type).toBe('full');
  });

  it('is idempotent — duplicate id is ignored', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'speaking-camera')});
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'speaking-camera')});
    expect(state.participants).toHaveLength(1);
  });

  it('screen-sharing outranks speaking-camera in the slot order', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('cam', 'speaking-camera'),
      makeParticipant('screen1', 'screen-sharing'),
    ]);
    expect(state.slotMap['screen1']).toBeLessThan(state.slotMap['cam']);
  });

  it('a higher-priority newcomer does not evict an incumbent from their tile', () => {
    // Slot order decides who gets a seat; it does not reshuffle whoever already has one.
    const state = exitPresenter(
      addAll(createInitialState(container1280x720), [
        makeParticipant('cam', 'speaking-camera'),
        makeParticipant('screen1', 'screen-sharing'),
      ]),
    );
    expect(fullTileIds(state)).toEqual(['cam', 'screen1']);
  });

  it('active participants each get their own full tile', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('a2', 'speaking-camera'),
      makeParticipant('a3', 'speaking-no-camera'),
    ]);
    expect(fullTiles(state)).toHaveLength(3);
    expect(fractionalTiles(state)).toHaveLength(0);
  });

  it('passive participants are compressed into fractional tiles, not given full tiles', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(fullTileIds(state)).toEqual(['a1']);
    expect(fractionIds(state)).toEqual(['p1']);
  });

  it('a fractional tile holding a single passive participant is a valid layout', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    const fractional = fractionalTile(state);
    expect(fractional).toBeDefined();
    expect(fractional!.fractions).toHaveLength(1);
  });

  it('fractional tiles never exceed the configured share of the grid', () => {
    for (const n of [4, 8, 16, 40]) {
      const state = addAll(
        createInitialState(container1280x720),
        Array.from({length: n}, (_, i) => makeParticipant(`p${i}`, i < 4 ? 'speaking-camera' : 'silent-no-camera')),
      );
      const total = allTiles(state).length;
      expect(fractionalTiles(state).length).toBeLessThanOrEqual(Math.ceil(RATIO * total));
    }
  });
});

// ── REMOVE_PARTICIPANT ─────────────────────────────────────────────────────────

describe('REMOVE_PARTICIPANT', () => {
  it('removes participant and recalculates layout', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'speaking-camera'),
      makeParticipant('b', 'speaking-camera'),
    ]);
    const next = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a'});
    expect(next.participants).toHaveLength(1);
    expect(next.participants[0].id).toBe('b');
  });

  it('removing unknown id is a no-op', () => {
    const state = addAll(createInitialState(container1280x720), [makeParticipant('a', 'speaking-camera')]);
    expect(reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'unknown'})).toBe(state);
  });

  it('cleans up slot map for removed participant', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'speaking-camera'),
      makeParticipant('b', 'speaking-camera'),
    ]);
    const next = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a'});
    expect(next.slotMap['a']).toBeUndefined();
    expect(next.slotMap['b']).toBeDefined();
  });

  it('removing the last passive participant removes the fractional tile', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(fractionalTile(state)).toBeDefined();

    const next = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'p1'});
    expect(fractionalTile(next)).toBeUndefined();
    expect(fullTileIds(next)).toEqual(['a1']);
  });
});

// ── Tile counts ────────────────────────────────────────────────────────────────

describe('computeTileCounts', () => {
  const maxTiles = 75;
  const maxFractions = 6;

  it.each([
    // active, passive, total, fractional, full
    [1, 0, 1, 0, 1],
    [1, 1, 2, 1, 1],
    [2, 2, 3, 1, 2],
    [3, 1, 4, 1, 3],
    [6, 0, 6, 0, 6],
    [4, 20, 6, 2, 4],
    [10, 50, 15, 5, 10],
  ])(
    'active=%i passive=%i → total=%i fractional=%i full=%i',
    (active, passive, total, fractional, full) => {
      expect(computeTileCounts(active, passive, maxTiles, maxFractions, RATIO)).toEqual({
        total,
        full,
        fractional,
      });
    },
  );

  it('never exceeds maxTiles', () => {
    expect(computeTileCounts(4, 20, 6, maxFractions, RATIO).total).toBeLessThanOrEqual(6);
    expect(computeTileCounts(40, 200, 6, maxFractions, RATIO).total).toBeLessThanOrEqual(6);
  });

  it('renders no tiles when there are no participants', () => {
    expect(computeTileCounts(0, 0, maxTiles, maxFractions, RATIO)).toEqual({total: 0, full: 0, fractional: 0});
  });

  it('gives everyone an equal full tile when nobody is active', () => {
    // Nobody has earned a bigger tile yet, so the ratio rule does not apply.
    expect(computeTileCounts(0, 5, maxTiles, maxFractions, RATIO)).toEqual({
      total: 5,
      full: 5,
      fractional: 0,
    });
  });

  it('falls back to a fractional tile for the remainder when an all-silent call outgrows the grid', () => {
    const counts = computeTileCounts(0, 10, 4, maxFractions, RATIO);
    expect(counts.total).toBe(4);
    expect(counts.full).toBe(3);
    expect(counts.fractional).toBe(1);
  });

  it('gives every passive participant a seat or a place in the overflow badge', () => {
    const state = addAll(
      createInitialState(container1280x720),
      Array.from({length: 30}, (_, i) => makeParticipant(`p${i}`, i < 3 ? 'speaking-camera' : 'silent-no-camera')),
    );
    expect(visibleIds(state).length + overflowCount(state)).toBe(30);
  });
});

// ── Tile dimension invariants ─────────────────────────────────────────────────

describe('tile dimension invariants', () => {
  const gap = DEFAULT_CONFIG.tileGap;

  it('widest row fits within the usable container width', () => {
    for (const n of [1, 2, 5, 10, 20, 50]) {
      const state = addAll(
        createInitialState(container1280x720),
        Array.from({length: n}, (_, i) => makeParticipant(`p${i}`, 'speaking-camera')),
      );
      const {tileWidth, rows} = grid(state);
      const cols = Math.max(...rows.map(r => r.tiles.length), 0);
      const usableW = container1280x720.width - 2 * gap;
      expect(cols * tileWidth + (cols - 1) * gap).toBeLessThanOrEqual(usableW + 0.01);
    }
  });

  it('all rows fit within the usable container height', () => {
    for (const n of [1, 2, 5, 10, 20, 50]) {
      const state = addAll(
        createInitialState(container1280x720),
        Array.from({length: n}, (_, i) => makeParticipant(`p${i}`, 'speaking-camera')),
      );
      const {tileHeight, rows} = grid(state);
      const usableH = container1280x720.height - 2 * gap;
      expect(rows.length * tileHeight + (rows.length - 1) * gap).toBeLessThanOrEqual(usableH + 0.01);
    }
  });

  it('tileAspectRatio stays within [minAR, maxAR]', () => {
    for (const n of [1, 3, 6]) {
      const state = addAll(
        createInitialState(container960x540),
        Array.from({length: n}, (_, i) => makeParticipant(`p${i}`, 'speaking-camera')),
      );
      expect(grid(state).tileAspectRatio).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minAspectRatio - 0.01);
      expect(grid(state).tileAspectRatio).toBeLessThanOrEqual(DEFAULT_CONFIG.maxAspectRatio + 0.01);
    }
  });

  it('6 participants in 960×540 uses 2 rows, not a single portrait row', () => {
    const state = addAll(
      createInitialState(container960x540),
      Array.from({length: 6}, (_, i) => makeParticipant(`p${i}`, 'speaking-camera')),
    );
    expect(grid(state).rows).toHaveLength(2);
  });

  it('tileHeight stays within configured bounds', () => {
    const state = addAll(createInitialState({width: 320, height: 240}), [makeParticipant('a', 'speaking-camera')]);
    expect(grid(state).tileHeight).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minTileHeight);
    expect(grid(state).tileHeight).toBeLessThanOrEqual(DEFAULT_CONFIG.maxTileHeight);
  });

  it('the last row never holds more tiles than the rows above it', () => {
    for (const n of [4, 5, 7, 11]) {
      const state = addAll(
        createInitialState(container960x540),
        Array.from({length: n}, (_, i) => makeParticipant(`p${i}`, 'speaking-camera')),
      );
      const rows = grid(state).rows;
      if (rows.length > 1) {
        const last = rows[rows.length - 1].tiles.length;
        expect(last).toBeLessThanOrEqual(rows[0].tiles.length);
      }
    }
  });
});

// ── Tier priority ─────────────────────────────────────────────────────────────

describe('tier priority', () => {
  it('a passive self does not outrank participants in the active bucket', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('s1', 'screen-sharing'),
      makeSelf('me', 'silent-no-camera'),
      makeParticipant('a1', 'speaking-camera'),
    ]);
    expect(state.slotMap['s1']).toBeLessThan(state.slotMap['me']);
    expect(state.slotMap['a1']).toBeLessThan(state.slotMap['me']);
  });

  it('an active self floats to the front of the active bucket, ahead of higher-tier peers', () => {
    // 'me' is only speaking-camera, but screen-sharing normally outranks it —
    // self still leads the active bucket regardless.
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('s1', 'screen-sharing'),
      makeSelf('me', 'speaking-camera'),
    ]);
    expect(state.slotMap['me']).toBeLessThan(state.slotMap['s1']);
    expect(state.slotMap['me']).toBe(0);
  });

  it('a passive self floats to the front of the passive bucket, ahead of earlier arrivals', () => {
    let state = reducer(createInitialState(container1280x720), {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('p1', 'silent-no-camera'),
      now: 100,
    });
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeSelf('me', 'silent-no-camera'), now: 200});
    expect(state.slotMap['me']).toBeLessThan(state.slotMap['p1']);
  });

  it('self keeps leading its bucket as other participants come and go', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeSelf('me', 'speaking-camera'),
      makeParticipant('a1', 'screen-sharing'),
    ]);
    expect(state.slotMap['me']).toBe(0);

    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a2', 'screen-sharing'), now: 999});
    expect(state.slotMap['me']).toBe(0);

    state = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a1'});
    expect(state.slotMap['me']).toBe(0);
  });

  it('self moves from the active bucket to the passive bucket when it goes silent-camera-off', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeSelf('me', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(state.slotMap['me']).toBe(0);

    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'me', changes: {tier: 'silent-no-camera'}});
    // self now leads the passive bucket, ahead of the participant who was already there
    expect(state.slotMap['me']).toBeLessThan(state.slotMap['p1']);
  });

  it('a passive self is compressed into a fraction, not given a full tile', () => {
    const state = exitPresenter(
      addAll(createInitialState(container1280x720), [
        makeParticipant('s1', 'screen-sharing'),
        makeSelf('me', 'silent-no-camera'),
        makeParticipant('a1', 'speaking-camera'),
      ]),
    );
    expect(fullTileIds(state)).not.toContain('me');
    expect(fractionIds(state)).toContain('me');
  });

  it('self earns a full tile only once it becomes active', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeSelf('me', 'silent-no-camera'),
      makeParticipant('a1', 'speaking-camera'),
    ]);
    expect(fractionIds(state)).toContain('me');

    state = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'me',
      changes: {tier: 'speaking-camera'},
      now: 999,
    });
    expect(fullTileIds(state)).toContain('me');
  });
});

// ── Self's seat assignment ─────────────────────────────────────────────────────
//
// Leading its bucket in *slot order* (above) is necessary but not sufficient: seat
// assignment has its own sticky mechanism (assignSeats) that can pin a participant to
// their exact previous seat index. Tile counts shift as participants come and go —
// e.g. counts.full grows or shrinks — which renumbers which seat index is "first".
// A participant sticky-pinned to a stale index can drift away from the front purely
// from that renumbering, even though their rank never changed. Self must never drift:
// it always occupies the exact first seat of its kind.

describe("self's seat assignment", () => {
  it('self is the first full tile whenever active', () => {
    const state = exitPresenter(
      addAll(createInitialState(container1280x720), [
        makeParticipant('s1', 'screen-sharing'),
        makeSelf('me', 'speaking-camera'),
      ]),
    );
    expect(fullTileIds(state)[0]).toBe('me');
  });

  it('self is the first fraction whenever passive', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeSelf('me', 'silent-no-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    expect(fractionIds(state)[0]).toBe('me');
  });

  it('self does not drift out of the first fraction when the full-tile count shrinks', () => {
    // Two actives push the fraction run's start index to 2; self (passive) leads it.
    let state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('a2', 'speaking-camera'),
      makeSelf('me', 'silent-no-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
      makeParticipant('p3', 'silent-no-camera'),
    ]);
    expect(fractionIds(state)[0]).toBe('me');

    // Removing a1 shrinks the full-tile count, so the fraction run now starts one
    // seat earlier. Self's rank hasn't changed — it must still lead the fraction.
    state = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a1'});
    expect(fractionIds(state)[0]).toBe('me');
  });

  it('self does not drift when the full-tile count grows', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeSelf('me', 'silent-no-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    expect(fractionIds(state)[0]).toBe('me');

    state = reducer(state, {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('a2', 'speaking-camera'),
      now: 999,
    });
    expect(fractionIds(state)[0]).toBe('me');
  });

  it('self does not drift across several successive tile-count changes', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('a2', 'speaking-camera'),
      makeParticipant('a3', 'speaking-camera'),
      makeSelf('me', 'silent-no-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
      makeParticipant('p3', 'silent-no-camera'),
      makeParticipant('p4', 'silent-no-camera'),
    ]);
    expect(fractionIds(state)[0]).toBe('me');

    // Removing a1, a2 still leaves one active — self must keep leading the fraction.
    state = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a1'});
    expect(fractionIds(state)[0]).toBe('me');
    state = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a2'});
    expect(fractionIds(state)[0]).toBe('me');

    // Removing the last active drops activeCount to 0, so everyone gets an equal
    // full tile instead — self must lead that instead.
    state = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a3'});
    expect(fractionalTile(state)).toBeUndefined();
    expect(fullTileIds(state)[0]).toBe('me');
  });

  it("other participants' exact-seat stickiness is unaffected by self's reservation", () => {
    let state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('a2', 'speaking-camera'),
      makeSelf('me', 'silent-no-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    const slotP1 = state.slotMap['p1'];
    expect(fractionIds(state)).toEqual(['me', 'p1', 'p2']);

    // A camera toggle on p2 must not reshuffle p1, even though self's own seat is
    // now handled outside the general sticky mechanism.
    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'p2', changes: {tier: 'silent-camera'}});
    expect(state.slotMap['p1']).toBe(slotP1);
  });

  it("self's own tile does not thrash frame-to-frame with no relevant change", () => {
    let state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeSelf('me', 'silent-no-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(fractionIds(state)[0]).toBe('me');

    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'p1', changes: {isMuted: true}});
    expect(fractionIds(state)[0]).toBe('me');
  });

  it('a fraction peer promoted to active gets the new full tile, and self stays in the fraction', () => {
    // Arrival order matters: p_early arrives (and stays seated) *ahead of* p_late in the
    // passive bucket. Sticky slot preservation means a later tier change on p_late does
    // not reorder it past p_early — it stays positioned behind p_early even once active.
    let state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p_early', 'silent-no-camera'),
      makeSelf('me', 'silent-no-camera'),
      makeParticipant('p_late', 'silent-no-camera'),
    ]);
    // Sanity check on the starting layout: self leads the fraction, p_late trails it —
    // i.e. p_late "appears after self in a fraction", matching the reported scenario.
    expect(fractionIds(state)).toEqual(['me', 'p_early', 'p_late']);

    // p_late turns its camera on — it should now earn a full tile.
    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'p_late', changes: {tier: 'silent-camera'}, now: 999});

    expect(fullTileIds(state)).toContain('p_late');
    expect(fullTileIds(state)).not.toContain('me');
    expect(fractionIds(state)).toContain('me');
  });
});

describe('tier priority extras', () => {
  it('seat allocation follows tier order: screen-sharing < speaking-camera < speaking-no-camera < silent-camera < silent-no-camera', () => {
    const {slotMap} = addAll(createInitialState(container1280x720), [
      makeParticipant('pn', 'silent-no-camera'),
      makeParticipant('pc', 'silent-camera'),
      makeParticipant('anc', 'speaking-no-camera'),
      makeParticipant('ac', 'speaking-camera'),
      makeParticipant('ss', 'screen-sharing'),
    ]);
    expect(slotMap['ss']).toBeLessThan(slotMap['ac']);
    expect(slotMap['ac']).toBeLessThan(slotMap['anc']);
    expect(slotMap['anc']).toBeLessThan(slotMap['pc']);
    expect(slotMap['pc']).toBeLessThan(slotMap['pn']);
  });

  it('silent-camera outranks silent-no-camera', () => {
    const {slotMap} = addAll(createInitialState(container1280x720), [
      makeParticipant('pn1', 'silent-no-camera'),
      makeParticipant('pn2', 'silent-no-camera'),
      makeParticipant('pc1', 'silent-camera'),
      makeParticipant('pc2', 'silent-camera'),
    ]);
    expect(slotMap['pc1']).toBeLessThan(slotMap['pn1']);
    expect(slotMap['pc1']).toBeLessThan(slotMap['pn2']);
    expect(slotMap['pc2']).toBeLessThan(slotMap['pn1']);
    expect(slotMap['pc2']).toBeLessThan(slotMap['pn2']);
  });

  it('higher-priority participants stay visible when others overflow', () => {
    const state = addAllSmall([
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('a2', 'speaking-camera'),
      makeParticipant('pc', 'silent-camera'),
      makeParticipant('pn0', 'silent-no-camera'),
      makeParticipant('pn1', 'silent-no-camera'),
      makeParticipant('pn2', 'silent-no-camera'),
      makeParticipant('pn3', 'silent-no-camera'),
    ]);
    expect(fractionIds(state)).toContain('pc');
    expect(overflowCount(state)).toBeGreaterThan(0);
  });
});

// ── Sticky seating ────────────────────────────────────────────────────────────
//
// A participant who already holds a seat of the right kind is never shuffled just
// because someone else's tier changed or a newcomer arrived.

describe('sticky seating', () => {
  it('upgrading a participant does not displace the existing full-tile holder', () => {
    const state = addAll(
      createInitialState(container1280x720),
      [makeParticipant('a1', 'speaking-camera'), makeParticipant('p1', 'silent-no-camera')],
      0,
    );
    const slotA1 = state.slotMap['a1'];
    const upgraded = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'p1',
      changes: {tier: 'speaking-camera'},
      now: 999,
    });
    expect(upgraded.slotMap['a1']).toBe(slotA1);
  });

  it('tier downgrade does not move a participant off their full tile', () => {
    const state = exitPresenter(
      addAll(createInitialState(container1280x720), [
        makeParticipant('screener', 'screen-sharing'),
        makeParticipant('cam', 'speaking-camera'),
      ]),
    );
    const slotBefore = state.slotMap['screener'];
    const next = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'screener',
      changes: {tier: 'silent-no-camera'},
    });
    expect(next.slotMap['screener']).toBe(slotBefore);
  });

  it('a participant keeps their seat number when their tier changes with no new pressure', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a1', 'speaking-camera'), now: 100});
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a2', 'speaking-camera'), now: 200});
    const slotA2 = state.slotMap['a2'];
    const next = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'a2',
      changes: {tier: 'silent-no-camera'},
    });
    expect(next.slotMap['a2']).toBe(slotA2);
  });

  it('a participant added with higher recency does not displace the earlier holder', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('early', 'speaking-camera'), now: 100});
    const slotEarly = state.slotMap['early'];
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('late', 'speaking-camera'), now: 200});
    expect(state.slotMap['early']).toBe(slotEarly);
    expect(state.slotMap['late']).not.toBe(slotEarly);
  });

  it('promoting a participant to active leaves the existing full-tile holder seated', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a_old', 'speaking-camera'),
      makeParticipant('lazy', 'silent-no-camera'),
    ]);
    const slotOld = state.slotMap['a_old'];
    const upgraded = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'lazy',
      changes: {tier: 'speaking-camera'},
      now: 999,
    });
    expect(upgraded.slotMap['a_old']).toBe(slotOld);
    expect(fullTileIds(upgraded)).toContain('lazy');
    expect(fullTileIds(upgraded)).toContain('a_old');
  });

  it('full tile render order is unchanged when a participant upgrades without eviction', () => {
    const state = exitPresenter(
      addAll(createInitialState(container1280x720), [
        makeParticipant('pn', 'silent-no-camera'),
        makeParticipant('ac', 'speaking-camera'),
        makeParticipant('ss', 'screen-sharing'),
      ]),
    );
    const idsBefore = fullTileIds(state);
    const next = exitPresenter(
      reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'ac', changes: {tier: 'screen-sharing'}, now: 999}),
    );
    expect(fullTileIds(next)).toEqual(idsBefore);
  });

  it('a fraction participant who turns their camera on is promoted to a full tile', () => {
    // silent-camera is an active tier — camera-on alone earns a full tile, same as speaking.
    const state = addAllSmall([
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
      makeParticipant('p3', 'silent-no-camera'),
    ]);
    expect(fractionIds(state)).toContain('p3');

    const next = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'p3',
      changes: {tier: 'silent-camera'},
    });
    expect(fullTileIds(next)).toContain('p3');
    expect(fractionIds(next)).not.toContain('p3');
  });

  it('turning a camera on does not change seats when nobody is under pressure', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    const slotP1 = state.slotMap['p1'];
    const slotP2 = state.slotMap['p2'];
    const next = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'p2',
      changes: {tier: 'silent-camera'},
    });
    expect(next.slotMap['p1']).toBe(slotP1);
    expect(next.slotMap['p2']).toBe(slotP2);
  });

  it('participant keeps its slot when only non-tier fields change', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'speaking-camera'),
      makeParticipant('b', 'silent-no-camera'),
    ]);
    const slotA = state.slotMap['a'];
    const slotB = state.slotMap['b'];
    const next = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'b', changes: {isMuted: true}});
    expect(next.slotMap['a']).toBe(slotA);
    expect(next.slotMap['b']).toBe(slotB);
  });

  it('existing participants keep their seats when a newcomer of the same tier arrives', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    const slotP1 = state.slotMap['p1'];
    const slotP2 = state.slotMap['p2'];
    const next = reducer(state, {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('p3', 'silent-no-camera'),
    });
    expect(next.slotMap['p1']).toBe(slotP1);
    expect(next.slotMap['p2']).toBe(slotP2);
    expect(next.slotMap['p3']).toBeGreaterThan(next.slotMap['p2']);
  });
});

// ── Recency ordering ──────────────────────────────────────────────────────────

describe('recency ordering within active tiers', () => {
  it('first added active participant gets the first seat', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('old', 'speaking-camera'),
      makeParticipant('new', 'speaking-camera'),
    ]);
    expect(state.slotMap['old']).toBeLessThan(state.slotMap['new']);
  });

  it('passive participants are seated in arrival order', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('p1', 'silent-no-camera'), now: 100});
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('p2', 'silent-no-camera'), now: 200});
    expect(state.slotMap['p1']).toBeLessThan(state.slotMap['p2']);
  });

  it('updating a non-tier field does not change activatedAt', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'speaking-camera'), now: 100});
    const before = state.participants[0].activatedAt;
    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'a', changes: {isMuted: true}});
    expect(state.participants.find(p => p.id === 'a')!.activatedAt).toBe(before);
  });
});

// ── activatedAt management ────────────────────────────────────────────────────

describe('activatedAt management', () => {
  it('ADD_PARTICIPANT with active tier auto-sets activatedAt', () => {
    const state = reducer(createInitialState(container1280x720), {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('a', 'speaking-camera'),
      now: 42,
    });
    expect(state.participants[0].activatedAt).toBe(42);
  });

  it('ADD_PARTICIPANT with passive tier does not set activatedAt', () => {
    const state = reducer(createInitialState(container1280x720), {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('p', 'silent-no-camera'),
      now: 42,
    });
    expect(state.participants[0].activatedAt).toBeUndefined();
  });

  it('ADD_PARTICIPANT preserves an explicit activatedAt', () => {
    const state = reducer(createInitialState(container1280x720), {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('a', 'speaking-camera', 0, 77),
      now: 42,
    });
    expect(state.participants[0].activatedAt).toBe(77);
  });

  it('UPDATE_PARTICIPANT changing tier refreshes activatedAt', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'silent-no-camera'), now: 10});
    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'a', changes: {tier: 'speaking-camera'}, now: 200});
    expect(state.participants.find(p => p.id === 'a')!.activatedAt).toBe(200);
  });

  it('UPDATE_PARTICIPANT not changing tier preserves activatedAt', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'speaking-camera'), now: 100});
    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'a', changes: {isMuted: true}, now: 999});
    expect(state.participants.find(p => p.id === 'a')!.activatedAt).toBe(100);
  });
});

// ── Fractional tiles & overflow ───────────────────────────────────────────────

describe('fractional tiles', () => {
  it('fraction grid is sized to the participants it seats, not to its maximum', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    const fractional = fractionalTile(state)!;
    expect(fractional.fractionRows * fractional.fractionCols).toBe(2);
  });

  it('fraction dimensions follow the gap-corrected formula', () => {
    const state = addAllSmall(
      Array.from({length: 5}, (_, i) => makeParticipant(`p${i}`, i === 0 ? 'speaking-camera' : 'silent-no-camera')),
    );
    const fractional = fractionalTile(state)!;
    const {tileWidth, tileHeight, fractionWidth, fractionHeight} = grid(state);
    const gap = DEFAULT_CONFIG.tileGap;
    expect(fractionWidth).toBeCloseTo((tileWidth - gap * (fractional.fractionCols - 1)) / fractional.fractionCols, 5);
    expect(fractionHeight).toBeCloseTo((tileHeight - gap * (fractional.fractionRows - 1)) / fractional.fractionRows, 5);
  });

  it('fraction dimensions are null when no fractional tile exists', () => {
    const state = addAll(createInitialState(container1280x720), [makeParticipant('a', 'speaking-camera')]);
    expect(grid(state).fractionWidth).toBeNull();
    expect(grid(state).fractionHeight).toBeNull();
  });

  it('a fraction is never narrower or shorter than the configured minimum', () => {
    const state = addAllSmall(
      Array.from({length: 5}, (_, i) => makeParticipant(`p${i}`, i === 0 ? 'speaking-camera' : 'silent-no-camera')),
    );
    const {fractionHeight} = grid(state);
    expect(fractionHeight).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minTileHeight / 2 - 0.01);
  });

  it('several fractional tiles appear once one cannot hold everyone', () => {
    const state = addAll(
      createInitialState(container1280x720),
      Array.from({length: 40}, (_, i) => makeParticipant(`p${i}`, i < 6 ? 'speaking-camera' : 'silent-no-camera')),
    );
    expect(fractionalTiles(state).length).toBeGreaterThan(1);
  });

  it('an under-full fractional tile is shaped to its own occupants, not a shared maximum', () => {
    // A small container caps fraction capacity low enough that 5 passives need 2 tiles.
    const smallish = {width: 480, height: 360};
    const state = addAll(
      createInitialState(smallish),
      Array.from({length: 8}, (_, i) => makeParticipant(`p${i}`, i < 3 ? 'speaking-camera' : 'silent-no-camera')),
    );
    const tiles = fractionalTiles(state);
    expect(tiles).toHaveLength(2);

    const underFull = tiles.find(t => t.fractions.length === 1)!;
    const packed = tiles.find(t => t.fractions.length > 1)!;
    expect(underFull).toBeDefined();
    expect(packed).toBeDefined();
    // One occupant gets a 1×1 shape — it fills the entire tile, not a small sub-cell.
    expect(underFull.fractionRows * underFull.fractionCols).toBe(1);
    expect(packed.fractionRows * packed.fractionCols).toBeGreaterThan(1);
  });

  it('a fractional tile with fewer occupants renders before one with more', () => {
    const smallish = {width: 480, height: 360};
    const state = addAll(
      createInitialState(smallish),
      Array.from({length: 8}, (_, i) => makeParticipant(`p${i}`, i < 3 ? 'speaking-camera' : 'silent-no-camera')),
    );
    const tiles = fractionalTiles(state);
    for (let i = 1; i < tiles.length; i++) {
      expect(tiles[i - 1].fractions.length).toBeLessThanOrEqual(tiles[i].fractions.length);
    }
  });

  it('the overflow badge still lands in the tile with the most fractions after sorting', () => {
    const state = addAllSmall(
      Array.from({length: 12}, (_, i) => makeParticipant(`p${i}`, i === 0 ? 'speaking-camera' : 'silent-no-camera')),
    );
    const tiles = fractionalTiles(state);
    const withOverflow = tiles.filter(t => t.fractions.some(f => f.type === 'overflow'));
    expect(withOverflow).toHaveLength(1);
    // It's tied for (or the sole holder of) the largest fraction count.
    expect(Math.max(...tiles.map(t => t.fractions.length))).toBe(withOverflow[0].fractions.length);
  });
});

describe('overflow', () => {
  it('no overflow badge when everyone fits', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(overflowCount(state)).toBe(0);
  });

  it('overflow badge appears once the fractions run out', () => {
    const state = addAllSmall(
      Array.from({length: 12}, (_, i) => makeParticipant(`p${i}`, i === 0 ? 'speaking-camera' : 'silent-no-camera')),
    );
    expect(overflowCount(state)).toBeGreaterThan(0);
  });

  it('overflow count equals the number of hidden participants', () => {
    const state = addAllSmall(
      Array.from({length: 12}, (_, i) => makeParticipant(`p${i}`, i === 0 ? 'speaking-camera' : 'silent-no-camera')),
    );
    expect(overflowCount(state)).toBe(12 - visibleIds(state).length);
  });

  it('adding one more participant increases the overflow count by one', () => {
    const base = addAllSmall(
      Array.from({length: 12}, (_, i) => makeParticipant(`p${i}`, i === 0 ? 'speaking-camera' : 'silent-no-camera')),
    );
    const before = overflowCount(base);
    const next = reducer(base, {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('extra', 'silent-no-camera'),
    });
    expect(overflowCount(next)).toBe(before + 1);
  });

  it('overflow badge carries up to 3 avatars', () => {
    const state = addAllSmall(
      Array.from({length: 20}, (_, i) => makeParticipant(`p${i}`, i === 0 ? 'speaking-camera' : 'silent-no-camera')),
    );
    const overflow = fractionalTiles(state)
      .flatMap(t => t.fractions)
      .find(f => f.type === 'overflow');
    expect(overflow).toBeDefined();
    if (overflow && overflow.type === 'overflow') {
      expect(overflow.avatars.length).toBeGreaterThan(0);
      expect(overflow.avatars.length).toBeLessThanOrEqual(3);
    }
  });

  it('the overflow badge lives in the last fractional tile', () => {
    const state = addAllSmall(
      Array.from({length: 12}, (_, i) => makeParticipant(`p${i}`, i === 0 ? 'speaking-camera' : 'silent-no-camera')),
    );
    const tiles = fractionalTiles(state);
    const last = tiles[tiles.length - 1];
    expect(last.fractions.some(f => f.type === 'overflow')).toBe(true);
    expect(tiles.slice(0, -1).every(t => t.fractions.every(f => f.type !== 'overflow'))).toBe(true);
  });
});

// ── forcePassiveFractional (experimental) ─────────────────────────────────────
//
// Passive (silent, camera-off) participants never get a full tile under this mode —
// not even in the all-silent case, which normally gives everyone an equal full tile.
// Every fractional tile is floored at a 2-way split (escalating to 4-way if 2 cells
// don't fit the aspect bounds), so even a single occupant reads as a subdivided tile.

describe('forcePassiveFractional', () => {
  it('gives nobody a full tile when everybody is silent', () => {
    const state = addAllForced(createInitialState(container1280x720), [
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
      makeParticipant('p3', 'silent-no-camera'),
    ]);
    expect(fullTiles(state)).toHaveLength(0);
    expect(fractionIds(state)).toEqual(['p1', 'p2', 'p3']);
  });

  it('still gives active participants full tiles when passives are also present', () => {
    const state = addAllForced(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('a2', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(fullTileIds(state)).toEqual(['a1', 'a2']);
    expect(fractionIds(state)).toContain('p1');
  });

  it('floors a single passive occupant at a 2-cell fraction rather than 1×1', () => {
    const state = addAllForced(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    const tile = fractionalTile(state)!;
    expect(tile.fractionRows * tile.fractionCols).toBeGreaterThanOrEqual(2);
    expect(tile.fractions).toHaveLength(1);
  });

  it('camera-on (active) participants are unaffected — they still get full tiles', () => {
    const state = addAllForced(createInitialState(container1280x720), [
      makeParticipant('a1', 'silent-camera'),
      makeParticipant('a2', 'silent-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(fullTileIds(state)).toEqual(['a1', 'a2']);
  });

  it('a passive self is never forced into a full tile even with nobody active', () => {
    const state = addAllForced(createInitialState(container1280x720), [makeSelf('me', 'silent-no-camera')]);
    expect(fullTiles(state)).toHaveLength(0);
    expect(fractionIds(state)).toEqual(['me']);
  });

  it('an active participant demoted to passive loses its full tile immediately, no grace period', () => {
    let state = addAllForced(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(fullTileIds(state)).toEqual(['a1']);

    state = forcedReducer(state, {type: 'UPDATE_PARTICIPANT', id: 'a1', changes: {tier: 'silent-no-camera'}});
    expect(fullTiles(state)).toHaveLength(0);
    expect(fractionIds(state)).toContain('a1');
  });

  it('does not change behaviour for a fully-active call — everyone still gets a full tile', () => {
    const state = addAllForced(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('a2', 'speaking-camera'),
      makeParticipant('a3', 'speaking-camera'),
    ]);
    expect(fullTiles(state)).toHaveLength(3);
    expect(fractionalTiles(state)).toHaveLength(0);
  });
});

// ── Presenter mode ────────────────────────────────────────────────────────────

describe('presenter mode', () => {
  it('auto-activates when a screen share appears', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
    ]);
    expect(state.isPresenterModeActive).toBe(true);
    expect(state.layout.mode).toBe('presenter');
  });

  it('does not auto-activate without a screen share', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('a1', 'speaking-camera'),
    ]);
    expect(state.isPresenterModeActive).toBe(false);
  });

  it('auto-activates when an existing participant starts sharing', () => {
    const state = addAll(createInitialState(container1280x720), [makeParticipant('a1', 'speaking-camera')]);
    expect(state.isPresenterModeActive).toBe(false);
    const next = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'a1', changes: {tier: 'screen-sharing'}});
    expect(next.isPresenterModeActive).toBe(true);
  });

  it('can be toggled off and back on', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
    ]);
    state = reducer(state, {type: 'TOGGLE_PRESENTER_MODE'});
    expect(state.isPresenterModeActive).toBe(false);
    expect(state.layout.mode).toBe('grid');

    state = reducer(state, {type: 'TOGGLE_PRESENTER_MODE'});
    expect(state.isPresenterModeActive).toBe(true);
    expect(state.layout.mode).toBe('presenter');
  });

  it('spotlights the highest-priority participant who is not you', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
      makeParticipant('a1', 'speaking-camera'),
    ]);
    const spotlight = presenter(state).spotlight;
    expect(spotlight?.type).toBe('full');
    expect(spotlight && spotlight.type === 'full' && spotlight.participant.id).toBe('s1');
  });

  it('puts everyone except the spotlight into the strip', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
      makeParticipant('a1', 'speaking-camera'),
    ]);
    const stripIds = presenter(state).strip.map(t => (t.type === 'full' ? t.participant.id : 'overflow'));
    // Self is silent here, so it sorts behind the speaking participant.
    expect(stripIds).toEqual(['a1', 'me']);
  });

  it('sizes strip tiles within the aspect-ratio bounds', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
      makeParticipant('a1', 'speaking-camera'),
    ]);
    const {stripTileWidth, stripTileHeight} = presenter(state);
    const aspectRatio = stripTileWidth / stripTileHeight;
    expect(aspectRatio).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minAspectRatio - 0.01);
    expect(aspectRatio).toBeLessThanOrEqual(DEFAULT_CONFIG.maxAspectRatio + 0.01);
  });

  it('adds an overflow tile to the strip when it cannot hold everyone', () => {
    const state = addAll(createInitialState(smallContainer), [
      makeParticipant('s1', 'screen-sharing'),
      ...Array.from({length: 10}, (_, i) => makeParticipant(`p${i}`, 'silent-no-camera')),
    ]);
    const strip = presenter(state).strip;
    expect(strip[strip.length - 1].type).toBe('overflow');
  });
});

// ── View-all-participants flag ────────────────────────────────────────────────

describe('areAllParticipantsShown', () => {
  it('defaults to false and toggles', () => {
    let state = createInitialState(container1280x720);
    expect(state.areAllParticipantsShown).toBe(false);

    state = reducer(state, {type: 'TOGGLE_ALL_PARTICIPANTS'});
    expect(state.areAllParticipantsShown).toBe(true);

    state = reducer(state, {type: 'TOGGLE_ALL_PARTICIPANTS'});
    expect(state.areAllParticipantsShown).toBe(false);
  });

  it('does not disturb the layout', () => {
    const state = addAll(createInitialState(container1280x720), [makeParticipant('a', 'speaking-camera')]);
    const next = reducer(state, {type: 'TOGGLE_ALL_PARTICIPANTS'});
    expect(next.layout).toBe(state.layout);
  });
});

// ── SET_CONTAINER_SIZE ────────────────────────────────────────────────────────

describe('SET_CONTAINER_SIZE', () => {
  it('recalculates layout without touching participants or slots', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'speaking-camera'),
      makeParticipant('b', 'silent-no-camera'),
    ]);
    const slotsBefore = {...state.slotMap};
    const next = reducer(state, {type: 'SET_CONTAINER_SIZE', width: 640, height: 480});
    expect(next.participants).toHaveLength(2);
    expect(next.slotMap).toEqual(slotsBefore);
    expect(next.containerSize).toEqual({width: 640, height: 480});
  });

  it('tileHeight stays within bounds after a resize', () => {
    let state = addAll(createInitialState({width: 1920, height: 1080}), [makeParticipant('a', 'speaking-camera')]);
    state = reducer(state, {type: 'SET_CONTAINER_SIZE', width: 320, height: 240});
    expect(grid(state).tileHeight).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minTileHeight);
    expect(grid(state).tileHeight).toBeLessThanOrEqual(DEFAULT_CONFIG.maxTileHeight);
  });

  it('a very small container still produces a valid layout', () => {
    const state = addAll(createInitialState({width: 50, height: 50}), [makeParticipant('a', 'speaking-camera')]);
    expect(Array.isArray(grid(state).rows)).toBe(true);
  });

  it('a wider container yields more maxCols', () => {
    const small = addAll(createInitialState({width: 400, height: 400}), [makeParticipant('a', 'speaking-camera')]);
    const large = addAll(createInitialState({width: 1600, height: 400}), [makeParticipant('a', 'speaking-camera')]);
    expect(large.layout.maxCols).toBeGreaterThan(small.layout.maxCols);
  });
});

// ── _computeLayout internal ───────────────────────────────────────────────────

describe('_computeLayout', () => {
  it('empty participant list returns empty rows', () => {
    const layout = _computeLayout([], {}, container1280x720, DEFAULT_CONFIG) as GridModeLayout;
    expect(layout.rows).toHaveLength(0);
  });

  it('single participant produces one full tile in one row', () => {
    const p = makeParticipant('a', 'speaking-camera');
    const layout = _computeLayout([p], {a: 0}, container1280x720, DEFAULT_CONFIG) as GridModeLayout;
    expect(layout.rows).toHaveLength(1);
    expect(layout.rows[0].tiles).toHaveLength(1);
    expect(layout.rows[0].tiles[0].type).toBe('full');
  });

  it('tile count never exceeds maxRows × maxCols', () => {
    const participants = Array.from({length: 20}, (_, i) => makeParticipant(`p${i}`, 'speaking-camera'));
    const slotMap = Object.fromEntries(participants.map((p, i) => [p.id, i]));
    const layout = _computeLayout(participants, slotMap, container1280x720, DEFAULT_CONFIG) as GridModeLayout;
    expect(layout.rows.flatMap(r => r.tiles).length).toBeLessThanOrEqual(layout.maxRows * layout.maxCols);
  });

  it('a zero-sized container produces an empty layout rather than throwing', () => {
    const layout = _computeLayout([], {}, {width: 0, height: 0}, DEFAULT_CONFIG) as GridModeLayout;
    expect(layout.rows).toHaveLength(0);
    expect(layout.maxTiles).toBe(0);
  });
});

// ── _updateSlotMap internal ───────────────────────────────────────────────────

describe('_updateSlotMap', () => {
  it('assigns initial slots in tier priority order', () => {
    const slotMap = _updateSlotMap(
      [
        makeParticipant('passive1', 'silent-no-camera'),
        makeParticipant('active1', 'speaking-camera'),
        makeParticipant('screen1', 'screen-sharing'),
      ],
      {},
    );
    expect(slotMap['screen1']).toBeLessThan(slotMap['active1']);
    expect(slotMap['active1']).toBeLessThan(slotMap['passive1']);
  });

  it('a passive self does not outrank the active bucket', () => {
    const slotMap = _updateSlotMap(
      [
        makeParticipant('screen1', 'screen-sharing'),
        makeSelf('me'),
        makeParticipant('active1', 'speaking-camera'),
      ],
      {},
    );
    expect(slotMap['screen1']).toBeLessThan(slotMap['me']);
    expect(slotMap['active1']).toBeLessThan(slotMap['me']);
  });

  it('self leads its bucket even when a peer would otherwise outrank it by tier', () => {
    const slotMap = _updateSlotMap(
      [makeParticipant('screen1', 'screen-sharing'), makeSelf('me', 'speaking-camera')],
      {},
    );
    expect(slotMap['me']).toBeLessThan(slotMap['screen1']);
  });

  it('new passive participant is appended after existing peers in the same tier', () => {
    const existing = [
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ];
    const prevMap = _updateSlotMap(existing, {});
    const newMap = _updateSlotMap([...existing, makeParticipant('p3', 'silent-no-camera')], prevMap);
    expect(newMap['p3']).toBeGreaterThan(newMap['p1']);
    expect(newMap['p3']).toBeGreaterThan(newMap['p2']);
  });

  it('active tier: higher activatedAt wins the lower slot on initial assignment', () => {
    const slotMap = _updateSlotMap(
      [makeParticipant('old', 'speaking-camera', 0, 100), makeParticipant('new', 'speaking-camera', 0, 200)],
      {},
    );
    expect(slotMap['new']).toBeLessThan(slotMap['old']);
  });

  it('existing slots are preserved even when recency would reorder them', () => {
    const slotMap = _updateSlotMap(
      [makeParticipant('old', 'speaking-camera', 0, 100), makeParticipant('new', 'speaking-camera', 0, 200)],
      {old: 0, new: 1},
    );
    expect(slotMap['old']).toBe(0);
    expect(slotMap['new']).toBe(1);
  });

  it('a newcomer of a higher tier is inserted ahead of lower-tier incumbents', () => {
    const prevMap = {cam: 0};
    const slotMap = _updateSlotMap(
      [makeParticipant('cam', 'speaking-camera'), makeParticipant('screen', 'screen-sharing')],
      prevMap,
    );
    expect(slotMap['screen']).toBeLessThan(slotMap['cam']);
  });
});
