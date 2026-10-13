import {
  GridConfig,
  GridModeLayout,
  GridParticipant,
  GridState,
  OneOnOneLayout,
  ParticipantTier,
  PresenterModeLayout,
  TileDescriptor,
} from './FluidVideoGrid.types';
import {createGridReducer, createInitialState} from './gridReducer';
import {
  computeFractionalTileSize,
  computeLayoutCapacity,
  computeTileDimensions,
} from './gridGeometry';
import {computeLayout, countFullTiles} from './gridLayout';
import {assignSlotOrder} from './seatAssignment';

/** Layout-only view of `computeLayout`, which also returns the seat assignment map. */
function layoutOf(...args: Parameters<typeof computeLayout>) {
  return computeLayout(...args).layout;
}

const DEFAULT_CONFIG: GridConfig = {
  minTileHeight: 120,
  maxTileHeight: 600,
  minAspectRatio: 0.67,
  maxAspectRatio: 1.78,
  tileGap: 4,
};

const reducer = createGridReducer(DEFAULT_CONFIG);

// Large container: maxTiles = 15 × 5 = 75
const container1280x720 = {width: 1280, height: 720};

// Small container: maxCols=3, maxRows=1 → maxTiles=3.
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

function oneOnOne(state: GridState): OneOnOneLayout {
  if (state.layout.mode !== 'one-on-one') {
    throw new Error(`expected a one-on-one layout, got "${state.layout.mode}"`);
  }
  return state.layout;
}

type FullTile = Extract<TileDescriptor, {type: 'full'}>;
type FractionalContainerTile = Extract<TileDescriptor, {type: 'fractional'}>;

function allTiles(state: GridState): TileDescriptor[] {
  return grid(state).tiles;
}

function fullTiles(state: GridState): FullTile[] {
  return allTiles(state).filter((t): t is FullTile => t.type === 'full');
}

function fullTileIds(state: GridState): string[] {
  return fullTiles(state).map(t => t.participant.id);
}

/** The single fractional tile container, if one exists in this layout. */
function fractionalContainer(state: GridState): FractionalContainerTile | undefined {
  return allTiles(state).find((t): t is FractionalContainerTile => t.type === 'fractional');
}

/** Ids of every participant seated in the fractional tile container (excluding the overflow badge). */
function fractionalTileIds(state: GridState): string[] {
  const tile = fractionalContainer(state);
  if (!tile) {
    return [];
  }
  return tile.fractionalTiles
    .filter(f => f.type === 'participant')
    .map(f => (f as {participant: GridParticipant}).participant.id);
}

function overflowCount(state: GridState): number {
  const tile = fractionalContainer(state);
  const overflow = tile?.fractionalTiles.find(f => f.type === 'overflow');
  return overflow && overflow.type === 'overflow' ? overflow.count : 0;
}

/** Everyone actually visible — full tiles plus fractional tiles, excluding the overflow badge. */
function visibleIds(state: GridState): string[] {
  return [...fullTileIds(state), ...fractionalTileIds(state)];
}

// ── Solo call ──────────────────────────────────────────────────────────────────
//
// With only one participant in the call, there's nobody to compete with for space, so a solo
// participant always gets the one full tile — speaking, silent, camera on or off makes no
// difference.

describe('solo call', () => {
  it('a lone participant always gets one full tile, whether they are speaking or just sitting silently with camera off', () => {
    const speaking = addAll(createInitialState(container1280x720), [makeParticipant('a', 'speaking-camera')]);
    expect(allTiles(speaking)).toHaveLength(1);
    expect(fullTileIds(speaking)).toEqual(['a']);
    expect(fractionalContainer(speaking)).toBeUndefined();

    const silent = addAll(createInitialState(container1280x720), [makeParticipant('p', 'silent-no-camera')]);
    expect(fullTileIds(silent)).toEqual(['p']);
    expect(fractionalContainer(silent)).toBeUndefined();
  });

  it('the one full tile still respects the configured min/max height', () => {
    const state = addAll(createInitialState({width: 320, height: 240}), [makeParticipant('a')]);
    expect(grid(state).tileHeight).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minTileHeight);
    expect(grid(state).tileHeight).toBeLessThanOrEqual(DEFAULT_CONFIG.maxTileHeight);
  });
});

// ── One-on-one call ──────────────────────────────────────────────────────────────
//
// With exactly two participants, the other person fills the whole stage and you become a small
// overlay thumbnail on top of them — this is a fixed layout, not something tier/activity changes.
// Note: `OneOnOneLayout` has no tileWidth/tileHeight of its own — the stage simply fills the
// container like any flex child, so there are no min/max dimension rules to test here.

describe('one-on-one call', () => {
  it('whoever is not you fills the stage, and you always become the small overlay — this does not depend on who is active', () => {
    const bothPassive = oneOnOne(
      addAll(createInitialState(container1280x720), [
        makeSelf('me', 'silent-no-camera'),
        makeParticipant('other', 'silent-no-camera'),
      ]),
    );
    expect(bothPassive.main.type === 'full' && bothPassive.main.participant.id).toBe('other');
    expect(bothPassive.pip.id).toBe('me');

    const selfIsTheActiveOne = oneOnOne(
      addAll(createInitialState(container1280x720), [
        makeSelf('me', 'speaking-camera'),
        makeParticipant('other', 'silent-no-camera'),
      ]),
    );
    expect(selfIsTheActiveOne.main.type === 'full' && selfIsTheActiveOne.main.participant.id).toBe('other');
    expect(selfIsTheActiveOne.pip.id).toBe('me');
  });

  it('presenter mode (turned on automatically by a screen share) takes priority over the one-on-one layout', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
    ]);
    expect(state.layout.mode).toBe('presenter');
  });

  it('starting a call alone and then having a second person join switches live into the one-on-one layout', () => {
    let state = addAll(createInitialState(container1280x720), [makeSelf('me', 'silent-no-camera')]);
    expect(state.layout.mode).toBe('grid'); // solo is reported as a 1-tile grid layout

    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('other', 'speaking-camera')});
    const layout = oneOnOne(state);
    expect(layout.main.type === 'full' && layout.main.participant.id).toBe('other');
    expect(layout.pip.id).toBe('me');
  });

  it('a 3-person call that drops to 2 people switches live into the one-on-one layout', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeSelf('me', 'speaking-camera'),
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('a2', 'speaking-camera'),
    ]);
    expect(state.layout.mode).toBe('grid');

    state = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a2'});
    const layout = oneOnOne(state);
    expect(layout.main.type === 'full' && layout.main.participant.id).toBe('a1');
    expect(layout.pip.id).toBe('me');
  });
});

// ── Reducer basics ────────────────────────────────────────────────────────────
//
// Plumbing checks for ADD_PARTICIPANT / REMOVE_PARTICIPANT that aren't about who gets which
// tile — see "full-tile assignment" below for that.

describe('reducer basics', () => {
  it('adding the same participant id twice is ignored', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'speaking-camera')});
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'speaking-camera')});
    expect(state.participants).toHaveLength(1);
  });

  it('removing an id that was never in the call does nothing', () => {
    const state = addAll(createInitialState(container1280x720), [makeParticipant('a', 'speaking-camera')]);
    expect(reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'unknown'})).toBe(state);
  });

  it('removing a participant updates both the layout and the seating order', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'speaking-camera'),
      makeParticipant('b', 'speaking-camera'),
      makeParticipant('c', 'speaking-camera'),
    ]);
    const next = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a'});
    expect(next.participants).toHaveLength(2);
    expect(next.participants.some(p => p.id === 'a')).toBe(false);
    expect(next.slotMap['a']).toBeUndefined();
    expect(next.slotMap['b']).toBeDefined();
  });
});

// ── Full-tile assignment ──────────────────────────────────────────────────────
//
// Who gets a full tile, and when a participant who already has one keeps it. Active
// participants (speaking, screen-sharing, or just camera-on) compete for full tiles; passive
// participants (silent, camera off) never get one — they always go to the fractional tile
// container. A full-tile holder keeps their exact seat as long as there's room for everyone —
// losing their active tier always loses the seat immediately, and once the grid is completely
// full, a strictly higher-priority participant (by tier, then by recency within a tier) can
// also take over the seat of whoever currently ranks worst. An exact tie never evicts anyone.

describe('full-tile assignment', () => {
  it('every active participant gets their own full tile when there is room, ranked screen-share first, then speaking, then camera-on', () => {
    const rankCheck = addAll(createInitialState(container1280x720), [
      makeParticipant('cam', 'speaking-camera'),
      makeParticipant('screen1', 'screen-sharing'),
    ]);
    expect(rankCheck.slotMap['screen1']).toBeLessThan(rankCheck.slotMap['cam']);

    const roomToSpare = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('a2', 'speaking-camera'),
      makeParticipant('a3', 'speaking-no-camera'),
    ]);
    expect(fullTiles(roomToSpare)).toHaveLength(3);
    expect(fractionalContainer(roomToSpare)).toBeUndefined();
  });

  it('passive participants never get a full tile, even with room to spare', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    expect(fullTileIds(state)).toEqual(['a1']);
    expect(fractionalTileIds(state)).toEqual(['p1', 'p2']);
  });

  it('a participant keeps their full tile when someone else joins or gets upgraded, as long as there is room for both', () => {
    // Joining: a higher-priority newcomer still doesn't reorder an existing holder.
    const afterJoin = exitPresenter(
      addAll(createInitialState(container1280x720), [
        makeParticipant('cam', 'speaking-camera'),
        makeParticipant('screen1', 'screen-sharing'),
      ]),
    );
    expect(fullTileIds(afterJoin)).toEqual(['cam', 'screen1']);

    // Upgrading: promoting one passive participant to active doesn't displace an existing holder.
    const beforeUpgrade = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    const afterUpgrade = reducer(beforeUpgrade, {
      type: 'UPDATE_PARTICIPANT',
      id: 'p1',
      changes: {tier: 'speaking-camera'},
      now: 999,
    });
    expect(fullTileIds(afterUpgrade)).toEqual(['a1', 'p1']);
  });

  it('once the grid is completely full, a higher-tier newcomer takes over the worst-ranked existing full tile instead of waiting', () => {
    // 3 same-tier incumbents fill a 3-seat grid.
    let state = createInitialState(smallContainer); // maxTiles = 3
    for (const id of ['a1', 'a2', 'a3']) {
      state = reducer(state, {
        type: 'ADD_PARTICIPANT',
        participant: makeParticipant(id, 'speaking-no-camera'),
        now: 100,
      });
    }
    expect(fullTileIds(state)).toEqual(['a1', 'a2', 'a3']);

    // A higher-tier participant joins. The grid also shrinks by one seat at the same time (to
    // make room for the mandatory fractional tile container, unrelated to eviction), so there
    // are only 2 seats to contest: the newcomer wins one, taking it from whichever of the three
    // original incumbents ranks worst — the other incumbent (a1) is completely untouched.
    state = reducer(state, {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('higher', 'speaking-camera'), // outranks speaking-no-camera
      now: 999,
    });
    expect(fullTileIds(state)).toEqual(['a1', 'higher']);
    expect(fractionalTileIds(state)).toEqual(['a2', 'a3']);
  });

  it('within the same tier, a more recently active newcomer can also take over a full tile from a less recently active one', () => {
    let state = createInitialState(smallContainer); // maxTiles = 3
    for (const id of ['a1', 'a2', 'a3']) {
      state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant(id, 'silent-camera'), now: 100});
    }
    state = reducer(state, {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('fresh', 'silent-camera'), // same tier, much more recently active
      now: 500,
    });
    expect(fullTileIds(state)).toEqual(['a1', 'fresh']);
    expect(fractionalTileIds(state)).toEqual(['a2', 'a3']);
  });

  it('an exact tie in tier and recency never evicts anyone — ties always favor whoever already has the seat', () => {
    let state = createInitialState(smallContainer); // maxTiles = 3
    for (const id of ['a1', 'a2', 'a3']) {
      state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant(id, 'silent-camera'), now: 100});
    }
    // Same tier, the exact same activatedAt as the incumbents — nothing to justify a takeover.
    state = reducer(state, {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('tied', 'silent-camera'),
      now: 100,
    });
    expect(fullTileIds(state)).toEqual(['a1', 'a2']);
    expect(fractionalTileIds(state)).toEqual(['a3', 'tied']);
  });

  it('several higher-priority participants arriving at once can win more than one seat in the same update', () => {
    let state = createInitialState(smallContainer); // maxTiles = 3
    for (const id of ['a1', 'a2', 'a3']) {
      state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant(id, 'silent-camera'), now: 100});
    }
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s1', 'screen-sharing'), now: 500});
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s2', 'screen-sharing'), now: 501});
    state = exitPresenter(state); // screen-sharing auto-activates presenter mode; back to the grid
    expect(fullTileIds(state)).toEqual(['s1', 's2']);
  });

  it('once a full tile frees up, the highest-priority participant waiting in the fractional tile container moves into it — and if nobody active is waiting, the tile just disappears', () => {
    // Someone is waiting (but not high-priority enough to have evicted anyone on arrival —
    // that's covered by the eviction tests above): they get promoted once a seat opens up.
    let state = createInitialState(smallContainer); // maxTiles = 3
    for (const id of ['a1', 'a2', 'a3']) {
      state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant(id, 'speaking-camera'), now: 100});
    }
    state = reducer(state, {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('waiting', 'silent-camera'), // lower tier — waits, doesn't evict
      now: 999,
    });
    expect(fullTileIds(state)).toEqual(['a1', 'a2']);
    expect(fractionalTileIds(state)).toEqual(['a3', 'waiting']);

    const promoted = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a1'});
    expect(fullTileIds(promoted)).toEqual(['a3', 'a2', 'waiting']);
    expect(fractionalContainer(promoted)).toBeUndefined();

    // Nobody active is waiting: the freed tile just disappears, the grid reshapes around one
    // fewer tile.
    let roomyState = addAll(createInitialState(container1280x720), [
      makeParticipant('x1', 'speaking-camera'),
      makeParticipant('x2', 'speaking-camera'),
      makeParticipant('q1', 'silent-no-camera'),
    ]);
    const afterRemoval = reducer(roomyState, {type: 'REMOVE_PARTICIPANT', id: 'x1'});
    expect(fullTileIds(afterRemoval)).toEqual(['x2']);
  });

  it('a fractional-tile participant moves into a full tile once their camera turns on, if there is a free seat', () => {
    // The no-room case (evicting another camera-on participant by recency) is the same pending
    // eviction-mechanism decision as above — not a separate thing to design.
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
      makeParticipant('p3', 'silent-no-camera'),
    ]);
    expect(fractionalTileIds(state)).toContain('p3');

    const next = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'p3', changes: {tier: 'silent-camera'}});
    expect(fullTileIds(next)).toContain('p3');
    expect(fractionalTileIds(next)).not.toContain('p3');
  });

  it('promoting one participant does not move anyone else\'s seat', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
      makeParticipant('p3', 'silent-no-camera'),
    ]);
    const slotP1Before = state.slotMap['p1'];
    const next = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'p2', changes: {tier: 'silent-camera'}});
    expect(next.slotMap['p1']).toBe(slotP1Before);
  });

  it('losing an active tier (camera off, stopped sharing) loses the full seat right away — the reducer never holds a seat open', () => {
    // Hold time or debounce, if there is any, is a decision for whoever decides to send the
    // tier change (the call client) — the reducer always reacts to the tier it is given right
    // away, with no grace period of its own.
    const state = exitPresenter(
      addAll(createInitialState(container1280x720), [
        makeParticipant('screener', 'screen-sharing'),
        makeParticipant('cam', 'speaking-camera'),
        makeParticipant('filler', 'silent-no-camera'),
      ]),
    );
    expect(fullTileIds(state)).toContain('screener');

    const next = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'screener', changes: {tier: 'silent-no-camera'}});
    expect(fullTileIds(next)).not.toContain('screener');
    expect(fractionalTileIds(next)).toContain('screener');
  });
});

// ── countFullTiles ────────────────────────────────────────────────────────────

describe('countFullTiles', () => {
  const inv = computeLayoutCapacity(container1280x720, DEFAULT_CONFIG)!; // maxTiles = 75
  const smallInv = computeLayoutCapacity(smallContainer, DEFAULT_CONFIG)!; // maxRows=1, maxCols=3, maxTiles=3

  it('before anyone has joined, there are no tiles and no container (this models the reducer\'s starting state, not a reachable in-call state)', () => {
    expect(countFullTiles(0, 0, inv)).toEqual({fullTileCount: 0, needsFractionalContainer: false});
  });

  it('an active-only call that fits entirely in full tiles needs no fractional tile container', () => {
    expect(countFullTiles(5, 0, inv)).toEqual({fullTileCount: 5, needsFractionalContainer: false});
  });

  it('any passive participant forces a fractional tile container to exist, even with room to spare', () => {
    expect(countFullTiles(2, 1, inv)).toEqual({fullTileCount: 2, needsFractionalContainer: true});
  });

  it('an all-passive call gives nobody a full tile', () => {
    expect(countFullTiles(0, 5, inv)).toEqual({fullTileCount: 0, needsFractionalContainer: true});
  });

  it('more active participants than full-tile slots also forces a fractional tile container', () => {
    const result = countFullTiles(5, 0, smallInv);
    expect(result.needsFractionalContainer).toBe(true);
    expect(result.fullTileCount).toBeLessThanOrEqual(smallInv.maxTiles);
  });

  it('the fractional tile container always takes up one full-tile-sized slot, so when active participants would otherwise fill every slot, one of them is turned into the container instead', () => {
    // Active participants alone filling the grid.
    expect(countFullTiles(4, 0, smallInv)).toEqual({fullTileCount: 2, needsFractionalContainer: true});
    // Same result when some of those slots would have gone to passive participants instead.
    expect(countFullTiles(3, 2, smallInv)).toEqual({fullTileCount: 2, needsFractionalContainer: true});
  });

  it('nothing is converted into a container when there is room left over', () => {
    const result = countFullTiles(5, 3, inv);
    expect(result.fullTileCount).toBe(5);
    expect(result.needsFractionalContainer).toBe(true);
  });

  it('filling the grid with only active participants, with nobody needing a container, converts nobody', () => {
    // Different from the test above: this guards against converting a full tile just because
    // the grid is full, instead of only when a fractional tile container is actually needed.
    const result = countFullTiles(3, 0, smallInv);
    expect(result).toEqual({fullTileCount: 3, needsFractionalContainer: false});
  });

  it('right at the edge: one slot short of completely full converts nobody, but exactly at full one tile is converted — this is the exact boundary a past bug got wrong', () => {
    // Bug history: the check used to compare against the shape for the full tiles *alone*
    // instead of full+1 (the shape actually used once the container's own slot is counted), so
    // a perfectly-filled grid of actives was wrongly judged to have "no room," converting a tile
    // even when growing one more column would have fit everyone. `midInv` is a real multi-row,
    // multi-column shape (not `smallInv`, which is a single row and so always reports "no room").
    const midInv = {usableWidth: 952, usableHeight: 532, maxRows: 2, maxCols: 5, maxTiles: 10};

    const oneShort = countFullTiles(9, 1, midInv);
    expect(oneShort.fullTileCount).toBe(9);
    expect(oneShort.needsFractionalContainer).toBe(true);

    const exactlyFull = countFullTiles(10, 1, midInv);
    expect(exactlyFull.fullTileCount).toBe(9); // one converted into the container
    expect(exactlyFull.needsFractionalContainer).toBe(true);
  });
});

// ── Tile dimension invariants ─────────────────────────────────────────────────

describe('tile dimension invariants', () => {
  const gap = DEFAULT_CONFIG.tileGap;

  it('the chosen column count always fits within the usable container width', () => {
    const inv = computeLayoutCapacity(container1280x720, DEFAULT_CONFIG)!;
    for (const n of [3, 5, 10, 20, 50]) {
      const {cols, width} = computeTileDimensions(n, inv, DEFAULT_CONFIG);
      expect(cols * width + (cols - 1) * gap).toBeLessThanOrEqual(inv.usableWidth + 0.01);
    }
  });

  it('tile aspect ratio always stays within the configured min/max bounds', () => {
    for (const n of [3, 6]) {
      const state = addAll(
        createInitialState(container960x540),
        Array.from({length: n}, (_, i) => makeParticipant(`p${i}`, 'speaking-camera')),
      );
      expect(grid(state).tileAspectRatio).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minAspectRatio - 0.01);
      expect(grid(state).tileAspectRatio).toBeLessThanOrEqual(DEFAULT_CONFIG.maxAspectRatio + 0.01);
    }
  });

  it('tile height always stays within the configured min/max bounds', () => {
    const state = addAll(createInitialState({width: 320, height: 240}), [
      makeParticipant('a', 'speaking-camera'),
      makeParticipant('b', 'speaking-camera'),
      makeParticipant('c', 'speaking-camera'),
    ]);
    expect(grid(state).tileHeight).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minTileHeight);
    expect(grid(state).tileHeight).toBeLessThanOrEqual(DEFAULT_CONFIG.maxTileHeight);
  });

  // Concrete worked examples: given a viewport and a participant count, this is exactly the
  // shape (rows × cols) and tile size the grid should produce. Numbers here are computed from
  // the real function, not guessed — if one of these changes, it means the actual layout changed.
  it.each([
    {viewport: {width: 1280, height: 720}, count: 2, rows: 1, cols: 2, width: 634.0, height: 600.0},
    {viewport: {width: 1280, height: 720}, count: 4, rows: 2, cols: 2, width: 630.12, height: 354.0},
    {viewport: {width: 960, height: 540}, count: 6, rows: 2, cols: 3, width: 314.67, height: 264.0},
    {viewport: {width: 1920, height: 1080}, count: 9, rows: 3, cols: 3, width: 631.31, height: 354.67},
    {viewport: {width: 320, height: 240}, count: 3, rows: 1, cols: 3, width: 155.44, height: 232.0},
  ])(
    '$viewport.width×$viewport.height with $count participants → $rows row(s) × $cols col(s)',
    ({viewport, count, rows, cols, width, height}) => {
      const inv = computeLayoutCapacity(viewport, DEFAULT_CONFIG)!;
      const result = computeTileDimensions(count, inv, DEFAULT_CONFIG);
      expect(result.rows).toBe(rows);
      expect(result.cols).toBe(cols);
      expect(result.width).toBeCloseTo(width, 1);
      expect(result.height).toBeCloseTo(height, 1);
    },
  );
});

// ── assignSlotOrder ──────────────────────────────────────────────────
//
// The seating-order rules in one place, tested directly against the pure function. This is
// also the one place in the whole file that proves self has no seating privilege — every other
// test elsewhere treats self exactly like any other participant without needing to call that
// out separately.

describe('assignSlotOrder', () => {
  it('assigns the first seats by tier priority', () => {
    const slotMap = assignSlotOrder(
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

  it('self is ranked exactly like any other participant — no special treatment', () => {
    const slotMap = assignSlotOrder(
      [makeParticipant('screen1', 'screen-sharing'), makeSelf('me', 'speaking-camera')],
      {},
    );
    expect(slotMap['screen1']).toBeLessThan(slotMap['me']);
  });

  it('a new participant is placed after existing participants in the same tier', () => {
    const existing = [
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ];
    const prevMap = assignSlotOrder(existing, {});
    const newMap = assignSlotOrder([...existing, makeParticipant('p3', 'silent-no-camera')], prevMap);
    expect(newMap['p3']).toBeGreaterThan(newMap['p1']);
    expect(newMap['p3']).toBeGreaterThan(newMap['p2']);
  });

  it('within the same tier, whoever became active more recently gets the better seat on first assignment', () => {
    const slotMap = assignSlotOrder(
      [makeParticipant('old', 'speaking-camera', 0, 100), makeParticipant('new', 'speaking-camera', 0, 200)],
      {},
    );
    expect(slotMap['new']).toBeLessThan(slotMap['old']);
  });

  it('a participant who already has a seat keeps it, even if recency would otherwise reorder them', () => {
    const slotMap = assignSlotOrder(
      [makeParticipant('old', 'speaking-camera', 0, 100), makeParticipant('new', 'speaking-camera', 0, 200)],
      {old: 0, new: 1},
    );
    expect(slotMap['old']).toBe(0);
    expect(slotMap['new']).toBe(1);
  });

  it('a new participant with a higher-priority tier is placed ahead of existing lower-tier participants', () => {
    const prevMap = {cam: 0};
    const slotMap = assignSlotOrder(
      [makeParticipant('cam', 'speaking-camera'), makeParticipant('screen', 'screen-sharing')],
      prevMap,
    );
    expect(slotMap['screen']).toBeLessThan(slotMap['cam']);
  });
});

// ── Tier priority ──────────────────────────────────────────────────────────────

describe('tier priority', () => {
  it('seats follow this exact tier order: screen-sharing, then speaking-camera, then speaking-no-camera, then silent-camera, then silent-no-camera', () => {
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

  it('higher-priority participants stay visible when many low-priority participants push the fractional tile container into overflow', () => {
    const state = addAllSmall([
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('a2', 'speaking-camera'),
      makeParticipant('pc', 'silent-camera'),
      ...Array.from({length: 20}, (_, i) => makeParticipant(`pn${i}`, 'silent-no-camera')),
    ]);
    expect(fractionalTileIds(state)).toContain('pc');
    expect(overflowCount(state)).toBeGreaterThan(0);
  });

  it('a participant hidden behind the overflow badge gets a real fractional tile once enough higher-priority participants leave', () => {
    let state = addAllSmall([
      makeParticipant('a1', 'speaking-camera'),
      ...Array.from({length: 20}, (_, i) => makeParticipant(`p${i}`, 'silent-no-camera')),
    ]);
    expect(fractionalTileIds(state)).not.toContain('p19'); // last-added, lowest priority — hidden behind the badge

    for (let i = 0; i < 18; i++) {
      state = reducer(state, {type: 'REMOVE_PARTICIPANT', id: `p${i}`});
    }
    expect(fractionalTileIds(state)).toContain('p19');
  });
});

// ── activatedAt management ─────────────────────────────────────────────────────
//
// `activatedAt` breaks ties by recency when two participants would otherwise rank equally — the
// array/arrival order alone isn't reliable enough for this (two participants can report
// activity in the same tick, and "who's first in the array" isn't the same as "who was more
// recently active"). It's set only for active-tier participants, and only changes when the
// tier itself changes.

describe('activatedAt management', () => {
  it('adding a participant with an active tier sets activatedAt right away', () => {
    const state = reducer(createInitialState(container1280x720), {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('a', 'speaking-camera'),
      now: 42,
    });
    expect(state.participants[0].activatedAt).toBe(42);
  });

  it('adding a participant with a passive tier does not set activatedAt', () => {
    const state = reducer(createInitialState(container1280x720), {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('p', 'silent-no-camera'),
      now: 42,
    });
    expect(state.participants[0].activatedAt).toBeUndefined();
  });

  it('changing a participant\'s tier refreshes activatedAt to the time of the change', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'silent-no-camera'), now: 10});
    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'a', changes: {tier: 'speaking-camera'}, now: 200});
    expect(state.participants.find(p => p.id === 'a')!.activatedAt).toBe(200);
  });

  it('activatedAt only changes when the tier itself changes — updating anything else leaves it untouched', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'speaking-camera'), now: 100});
    const before = state.participants[0].activatedAt;

    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'a', changes: {isMuted: true}, now: 999});
    expect(state.participants.find(p => p.id === 'a')!.activatedAt).toBe(before);
  });
});

// ── computeFractionalTileSize ──────────────────────────────────────────────────
//
// A fractional tile's size depends only on the full tile's height — never on how many
// participants need to fit. This is what fixes the old bug where adding one more passive
// participant flipped a 3-row column into a 2×2 grid: row count has to stay put as the count
// grows, so the column just keeps filling and a new column starts when it's full.

describe('computeFractionalTileSize', () => {
  it('gives the same result every time for the same tile height, no matter how many participants need to fit', () => {
    const a = computeFractionalTileSize(532, DEFAULT_CONFIG);
    const b = computeFractionalTileSize(532, DEFAULT_CONFIG);
    expect(a).toEqual(b);
  });

  it('never returns fewer than 2 rows — a fractional tile is never the size of a full tile', () => {
    const {rowsPerContainer} = computeFractionalTileSize(130, DEFAULT_CONFIG);
    expect(rowsPerContainer).toBeGreaterThanOrEqual(2);
  });

  it('picks the row count whose exact division of the tile height lands closest to the target size', () => {
    // target height = minTileHeight * 0.5 = 60; gap = 4. round((532+4)/(60+4)) = round(8.375) = 8.
    // Exact division across 8 rows of 532 with gap 4: (532 - 7*4) / 8 = 63 — close to, but not
    // exactly, the 60 target, since this is an exact division rather than a capped target.
    const {rowsPerContainer, height: cellHeight} = computeFractionalTileSize(532, DEFAULT_CONFIG);
    expect(rowsPerContainer).toBe(8);
    expect(cellHeight).toBeCloseTo(63, 5);
  });

  it('a taller full tile gets more rows of fractional tiles, at the same fixed tile width', () => {
    const short = computeFractionalTileSize(240, DEFAULT_CONFIG);
    const tall = computeFractionalTileSize(600, DEFAULT_CONFIG);
    expect(tall.rowsPerContainer).toBeGreaterThan(short.rowsPerContainer);
  });

  it('only shrinks below the target size when even 2 rows would not otherwise fit', () => {
    const {rowsPerContainer, height: cellHeight} = computeFractionalTileSize(100, DEFAULT_CONFIG);
    expect(rowsPerContainer).toBe(2);
    expect(cellHeight).toBeLessThan(DEFAULT_CONFIG.minTileHeight * 0.5);
  });

  it('width always follows a fixed aspect ratio, never the current full tile\'s own shape', () => {
    // A lone full tile (wide, clamped to the max aspect ratio) and a packed grid's full tile
    // (much narrower) must not produce different-looking fractional tiles for the same tile
    // height — width is purely `height * fixedAspectRatio`, with no tile-width input at all.
    const {width: cellWidth, height: cellHeight} = computeFractionalTileSize(532, DEFAULT_CONFIG);
    const expectedAspectRatio =
      ((DEFAULT_CONFIG.minFractionalTileAspectRatio ?? DEFAULT_CONFIG.minAspectRatio) +
        (DEFAULT_CONFIG.maxFractionalTileAspectRatio ?? DEFAULT_CONFIG.maxAspectRatio)) /
      2;
    expect(cellWidth).toBeCloseTo(cellHeight * expectedAspectRatio, 5);
  });
});

// ── Fractional tile container ──────────────────────────────────────────────────
//
// The container can be positioned three ways relative to the full tiles around it:
//  - it shares its only row with full tiles (full tiles beside it, none above)
//  - it shares a later row, with full-tile rows above it (full tiles beside it *and* above)
//  - it has its own row, with no full tiles beside it at all

describe('fractional tile container', () => {
  it('a fractional tile is never a 1×1 shape — always at least a 2-way split', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(grid(state).fractionalTileHeight!).toBeLessThan(grid(state).tileHeight / 2 + 0.01);
    expect(fractionalContainer(state)!.fractionalTiles.filter(f => f.type === 'participant')).toHaveLength(1);
  });

  it('the array order is priority order — this is what lets the renderer place tiles column-major with plain CSS', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p0', 'silent-no-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    expect(fractionalTileIds(state)).toEqual(['p0', 'p1', 'p2']);
  });

  it('fractional tile dimensions are null when no container exists', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'speaking-camera'),
      makeParticipant('b', 'speaking-camera'),
      makeParticipant('c', 'speaking-camera'),
    ]);
    expect(grid(state).fractionalTileWidth).toBeNull();
    expect(grid(state).fractionalTileHeight).toBeNull();
  });

  it('extra active participants beyond the full-tile slots join the passive ones inside the fractional tile container, still ranked by the normal tier order', () => {
    const state = addAllSmall(Array.from({length: 4}, (_, i) => makeParticipant(`a${i}`, 'speaking-camera')));
    // smallContainer has maxTiles=3, so 4 actives can't all get a full tile.
    expect(fullTiles(state).length).toBeLessThan(4);
    expect(fractionalContainer(state)).toBeDefined();
  });

  // ── Shares its only row with full tiles (column-major, centered, hugs width) ───

  it('tags fillDirection "column" and align "center" when sharing the only row', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    const tile = fractionalContainer(state)!;
    expect(tile.fillDirection).toBe('column');
    expect(tile.align).toBe('center');
  });

  it('width hugs while under capacity, then snaps to the full tile width once truly full — the overflow badge never causes a jump', () => {
    // Under capacity: the container is narrower than a full tile, so the full tile beside it can
    // actually use the freed-up space.
    const underCapacity = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(overflowCount(underCapacity)).toBe(0);
    expect(grid(underCapacity).fractionalContainerWidth!).toBeLessThan(grid(underCapacity).tileWidth);

    // Exactly at capacity vs. one more participant (now showing the overflow badge): both are
    // "fully packed," so both must be exactly a full tile's width — with no jump between them.
    const bigConfig: GridConfig = {...DEFAULT_CONFIG, minTileHeight: 240};
    const bigReducer = createGridReducer(bigConfig);
    const build = (passiveCount: number) =>
      [
        makeParticipant('a1', 'speaking-camera'),
        ...Array.from({length: passiveCount}, (_, i) => makeParticipant(`p${i}`, 'silent-no-camera')),
      ].reduce(
        (s, p) => bigReducer(s, {type: 'ADD_PARTICIPANT', participant: p}),
        createInitialState(container960x540),
      );
    const capacity = grid(build(1)).maxFractionalTilesPerContainer;
    const exactlyFull = build(capacity);
    const withOverflow = build(capacity + 1);
    expect(overflowCount(exactlyFull)).toBe(0);
    expect(overflowCount(withOverflow)).toBeGreaterThan(0);
    expect(grid(exactlyFull).fractionalContainerWidth).toBe(grid(withOverflow).fractionalContainerWidth);
    expect(grid(exactlyFull).fractionalContainerWidth).toBe(grid(exactlyFull).tileWidth);
  });

  it('the fractional tile\'s own size never changes, whether the column is half full or completely full', () => {
    const underfilled = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(grid(underfilled).fractionalContainerHeight).toBe(grid(underfilled).tileHeight);
    expect(grid(underfilled).fractionalTileHeight!).toBeLessThan(grid(underfilled).tileHeight / 2);

    const {rowsPerContainer} = computeFractionalTileSize(grid(underfilled).tileHeight, DEFAULT_CONFIG);
    const filled = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      ...Array.from({length: rowsPerContainer}, (_, i) => makeParticipant(`p${i}`, 'silent-no-camera')),
    ]);
    expect(overflowCount(filled)).toBe(0);
    expect(grid(filled).fractionalTileHeight).toBe(grid(underfilled).fractionalTileHeight);
    expect(grid(filled).fractionalTileWidth).toBe(grid(underfilled).fractionalTileWidth);

    const expectedHeight =
      (grid(underfilled).tileHeight - DEFAULT_CONFIG.tileGap * (rowsPerContainer - 1)) / rowsPerContainer;
    expect(grid(filled).fractionalTileHeight).toBeCloseTo(expectedHeight, 5);
  });

  // ── Shares a later row, with full-tile rows above it (column-major, top/left-aligned) ──

  it('tags fillDirection "column" and align "start" when full-tile rows exist above it', () => {
    // 5 actives need 2 rows of full tiles (3 cols × 2 rows); the container shares the last,
    // partial row rather than being alone with a single active tile.
    const state = addAll(createInitialState(container1280x720), [
      ...Array.from({length: 5}, (_, i) => makeParticipant(`a${i}`, 'speaking-camera')),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    const tile = fractionalContainer(state)!;
    expect(tile.fillDirection).toBe('column');
    expect(tile.align).toBe('start');
  });

  it('hugs its content below the max column count — width stays the same within a column count, and only grows when a new column starts', () => {
    const bigConfig: GridConfig = {...DEFAULT_CONFIG, minTileHeight: 240};
    const bigReducer = createGridReducer(bigConfig);
    const build = (passiveCount: number) =>
      [
        ...Array.from({length: 5}, (_, i) => makeParticipant(`a${i}`, 'speaking-camera')),
        ...Array.from({length: passiveCount}, (_, i) => makeParticipant(`p${i}`, 'silent-no-camera')),
      ].reduce(
        (s, p) => bigReducer(s, {type: 'ADD_PARTICIPANT', participant: p}),
        createInitialState({width: 1920, height: 1080}),
      );

    const {rowsPerContainer: capRows} = computeFractionalTileSize(grid(build(1)).tileHeight, bigConfig);
    const capacity = grid(build(1)).maxFractionalTilesPerContainer;
    const maxCols = capacity / capRows;
    expect(maxCols).toBeGreaterThan(2); // need 1→2 columns to both stay below maxCols

    // One column started vs. one column completely full — same column count, must be the exact
    // same (hugged) width.
    const oneColumnStarted = build(1);
    const oneColumnFull = build(capRows);
    expect(overflowCount(oneColumnFull)).toBe(0);
    expect(grid(oneColumnStarted).fractionalContainerWidth).toBe(grid(oneColumnFull).fractionalContainerWidth);

    // Crossing from 1 column to 2 (well below the max) grows the width by exactly one cell + gap.
    const twoColumnsStarted = build(capRows + 1);
    const gap = bigConfig.tileGap;
    expect(grid(twoColumnsStarted).fractionalContainerWidth).toBeCloseTo(
      grid(oneColumnFull).fractionalContainerWidth! + grid(twoColumnsStarted).fractionalTileWidth! + gap,
      5,
    );
  });

  it('flushes exactly to the available width once at the max column count — no gap against the full-tile row(s) above', () => {
    const bigConfig: GridConfig = {...DEFAULT_CONFIG, minTileHeight: 240};
    const bigReducer = createGridReducer(bigConfig);
    const build = (passiveCount: number) =>
      [
        ...Array.from({length: 3}, (_, i) => makeParticipant(`a${i}`, 'speaking-camera')),
        ...Array.from({length: passiveCount}, (_, i) => makeParticipant(`p${i}`, 'silent-no-camera')),
      ].reduce(
        (s, p) => bigReducer(s, {type: 'ADD_PARTICIPANT', participant: p}),
        createInitialState(container960x540),
      );
    const capacity = grid(build(1)).maxFractionalTilesPerContainer;
    const {rowsPerContainer: capRows} = computeFractionalTileSize(grid(build(1)).tileHeight, bigConfig);
    const maxCols = capacity / capRows;
    expect(maxCols).toBeGreaterThan(1); // meaningful check, not a single-column coincidence

    // Last column just started (at the max column count, but not every cell full) vs.
    // completely full — both are at the max column count, so both flush to the same width.
    const lastColumnStarted = build(capacity - capRows + 1);
    const lastColumnFull = build(capacity);
    expect(overflowCount(lastColumnFull)).toBe(0);
    expect(grid(lastColumnStarted).fractionalContainerWidth).toBe(grid(lastColumnFull).fractionalContainerWidth);

    const layout = grid(lastColumnFull);
    const spannedWidth = maxCols * layout.fractionalTileWidth! + (maxCols - 1) * bigConfig.tileGap;
    expect(spannedWidth).toBeCloseTo(layout.fractionalContainerWidth!, 5);
  });

  // ── Has its own row, with no full tiles beside it (row-major, centered, always hugs) ──

  it('tags fillDirection "row" and align "center" when it has a row entirely to itself', () => {
    // All-passive always gives the container its own row — nothing to share with.
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    const tile = fractionalContainer(state)!;
    expect(tile.fillDirection).toBe('row');
    expect(tile.align).toBe('center');
  });

  it('fills left-to-right, not stacked in a column, when it has its own row', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('p0', 'silent-no-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    const layout = grid(state);
    // All 3 fit in a single row: container height is exactly one cell tall, not three.
    expect(layout.fractionalContainerHeight).toBeCloseTo(layout.fractionalTileHeight!, 5);
  });

  it('never stretches taller than it needs to, even with plenty of content', () => {
    const many = Array.from({length: 40}, (_, i) => makeParticipant(`p${i}`, 'silent-no-camera'));
    const state = addAll(createInitialState(container1280x720), many);
    const layout = grid(state);
    expect(overflowCount(state)).toBe(0);
    // Height hugs however many rows are actually needed — with no full-tile sibling to match, it
    // should land on a whole multiple of the fixed cell height, not some other stretched value.
    const rowsNeeded = Math.round(
      (layout.fractionalContainerHeight! + DEFAULT_CONFIG.tileGap) /
        (layout.fractionalTileHeight! + DEFAULT_CONFIG.tileGap),
    );
    const expectedHeight = rowsNeeded * layout.fractionalTileHeight! + (rowsNeeded - 1) * DEFAULT_CONFIG.tileGap;
    expect(layout.fractionalContainerHeight).toBeCloseTo(expectedHeight, 5);
  });

  it('a fully-packed row reaches edge-to-edge with zero slack, not an inset that stops short on both sides', () => {
    const bigConfig: GridConfig = {...DEFAULT_CONFIG, minTileHeight: 240};
    const bigReducer = createGridReducer(bigConfig);
    const build = (passiveCount: number) =>
      [
        makeParticipant('a1', 'silent-camera'),
        makeParticipant('a2', 'silent-camera'),
        ...Array.from({length: passiveCount}, (_, i) => makeParticipant(`p${i}`, 'silent-no-camera')),
      ].reduce(
        (s, p) => bigReducer(s, {type: 'ADD_PARTICIPANT', participant: p}),
        createInitialState(container960x540),
      );

    const probeState = build(1);
    const probe = grid(probeState);
    expect(fractionalContainer(probeState)?.fillDirection).toBe('row'); // confirms it has its own row
    const maxCols = probe.maxFractionalTilesPerContainer / Math.max(1, Math.round(
      // rowsNeeded for 1 passive is 1, so maxFractionalTilesPerContainer === maxCols * maxRows;
      // recover maxRows the same way the reducer does, from tileHeight and the fixed cell height.
      (probe.tileHeight + bigConfig.tileGap) / (probe.fractionalTileHeight! + bigConfig.tileGap),
    ));
    expect(maxCols).toBeGreaterThan(1); // meaningful check, not a single-column coincidence

    const fullRow = build(maxCols);
    const layout = grid(fullRow);
    expect(overflowCount(fullRow)).toBe(0);
    const spannedWidth = maxCols * layout.fractionalTileWidth! + (maxCols - 1) * bigConfig.tileGap;
    expect(spannedWidth).toBeCloseTo(layout.fractionalContainerWidth!, 5);
  });
});

// ── Overflow ───────────────────────────────────────────────────────────────────

describe('overflow', () => {
  it('no overflow badge appears when everyone fits', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(overflowCount(state)).toBe(0);
  });

  it('an overflow badge appears once the fractional tile container runs out of room', () => {
    const state = addAllSmall(
      Array.from({length: 12}, (_, i) => makeParticipant(`p${i}`, i === 0 ? 'speaking-camera' : 'silent-no-camera')),
    );
    expect(overflowCount(state)).toBeGreaterThan(0);
  });

  it('the fractional tile container can only grow as wide as the space actually left in its row — never wider than that, even though the grid itself is much wider', () => {
    // Bug history: capacity used to be computed against the full grid width even when the
    // container shared its row with a full tile, letting it grow wider than that row could
    // actually hold. CSS then wrapped it onto its own line at the same (large) tile height,
    // blowing out the total content height — with no overflow badge ever appearing, since the
    // (wrong) capacity was never exceeded.
    const bigConfig: GridConfig = {...DEFAULT_CONFIG, minTileHeight: 240};
    const bigReducer = createGridReducer(bigConfig);
    const state = [
      makeParticipant('a1', 'speaking-camera'),
      ...Array.from({length: 20}, (_, i) => makeParticipant(`p${i}`, 'silent-no-camera')),
    ].reduce(
      (s, p) => bigReducer(s, {type: 'ADD_PARTICIPANT', participant: p}),
      createInitialState(container960x540),
    );

    expect(overflowCount(state)).toBeGreaterThan(0);
    expect(fractionalTileIds(state).length).toBeLessThanOrEqual(grid(state).maxFractionalTilesPerContainer);
  });

  it('the overflow count equals exactly how many participants did not fit', () => {
    const state = addAllSmall(
      Array.from({length: 12}, (_, i) => makeParticipant(`p${i}`, i === 0 ? 'speaking-camera' : 'silent-no-camera')),
    );
    expect(overflowCount(state)).toBe(12 - visibleIds(state).length);
  });

  it('adding one more participant increases the overflow count by exactly one, once already overflowing', () => {
    const base = addAllSmall(
      Array.from({length: 12}, (_, i) => makeParticipant(`p${i}`, i === 0 ? 'speaking-camera' : 'silent-no-camera')),
    );
    const before = overflowCount(base);
    expect(before).toBeGreaterThan(0);
    const next = reducer(base, {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('extra', 'silent-no-camera'),
    });
    expect(overflowCount(next)).toBe(before + 1);
  });

  it('the overflow badge shows at most 3 avatars', () => {
    const state = addAllSmall(
      Array.from({length: 20}, (_, i) => makeParticipant(`p${i}`, i === 0 ? 'speaking-camera' : 'silent-no-camera')),
    );
    const tile = fractionalContainer(state)!;
    const overflow = tile.fractionalTiles.find(f => f.type === 'overflow');
    expect(overflow).toBeDefined();
    if (overflow && overflow.type === 'overflow') {
      expect(overflow.avatars.length).toBeGreaterThan(0);
      expect(overflow.avatars.length).toBeLessThanOrEqual(3);
    }
  });

  it('the overflow badge is always the last slot in the container', () => {
    const state = addAllSmall(
      Array.from({length: 12}, (_, i) => makeParticipant(`p${i}`, i === 0 ? 'speaking-camera' : 'silent-no-camera')),
    );
    const tile = fractionalContainer(state)!;
    expect(tile.fractionalTiles[tile.fractionalTiles.length - 1].type).toBe('overflow');
    expect(tile.fractionalTiles.slice(0, -1).every(f => f.type === 'participant')).toBe(true);
  });
});

// ── Presenter mode ────────────────────────────────────────────────────────────

describe('presenter mode', () => {
  it('turns on automatically when someone starts screen-sharing — whether they join already sharing, or start sharing while already in the call', () => {
    const joinsAlreadySharing = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
    ]);
    expect(joinsAlreadySharing.isPresenterModeActive).toBe(true);
    expect(joinsAlreadySharing.layout.mode).toBe('presenter');

    const startsSharingLater = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
    ]);
    expect(startsSharingLater.isPresenterModeActive).toBe(false);
    const afterSharing = reducer(startsSharingLater, {
      type: 'UPDATE_PARTICIPANT',
      id: 'a1',
      changes: {tier: 'screen-sharing'},
    });
    expect(afterSharing.isPresenterModeActive).toBe(true);
  });

  it('does not turn on by itself just because someone is active — only a screen share does that', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('a1', 'speaking-camera'),
    ]);
    expect(state.isPresenterModeActive).toBe(false);
  });

  it('turning presenter mode off reveals the one-on-one layout with exactly 2 people, or the tiled grid with 3 or more', () => {
    let twoPeople = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
    ]);
    twoPeople = reducer(twoPeople, {type: 'TOGGLE_PRESENTER_MODE'});
    expect(twoPeople.isPresenterModeActive).toBe(false);
    expect(twoPeople.layout.mode).toBe('one-on-one');

    twoPeople = reducer(twoPeople, {type: 'TOGGLE_PRESENTER_MODE'});
    expect(twoPeople.isPresenterModeActive).toBe(true);
    expect(twoPeople.layout.mode).toBe('presenter');

    let threePeople = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
      makeParticipant('a1', 'speaking-camera'),
    ]);
    threePeople = reducer(threePeople, {type: 'TOGGLE_PRESENTER_MODE'});
    expect(threePeople.layout.mode).toBe('grid');
  });

  it('spotlights the highest-priority tier — screen-sharing beats speaking, which beats everything else — regardless of who that is, including you', () => {
    const screenShareWins = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
      makeParticipant('a1', 'speaking-camera'),
    ]);
    const spotlight1 = presenter(screenShareWins).spotlight;
    expect(spotlight1 && spotlight1.type === 'full' && spotlight1.participant.id).toBe('s1');

    const selfIsHighestPriority = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeSelf('me', 'screen-sharing'),
    ]);
    const spotlight2 = presenter(selfIsHighestPriority).spotlight;
    expect(spotlight2 && spotlight2.type === 'full' && spotlight2.participant.id).toBe('me');
  });

  it('with several people screen-sharing at once, the one who started most recently gets the spotlight — and when they stop, it falls back to whoever is left sharing most recently, not just the next person in priority order', () => {
    let state = addAll(createInitialState(container1280x720), [makeParticipant('s1', 'screen-sharing')], 100);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s2', 'screen-sharing'), now: 200});
    let spotlight = presenter(state).spotlight;
    expect(spotlight && spotlight.type === 'full' && spotlight.participant.id).toBe('s2');

    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 's2', changes: {tier: 'silent-no-camera'}, now: 300});
    spotlight = presenter(state).spotlight;
    expect(spotlight && spotlight.type === 'full' && spotlight.participant.id).toBe('s1');
  });

  it('falls back to the most recently active speaker once nobody is screen-sharing', () => {
    let state = addAll(createInitialState(container1280x720), [makeParticipant('a1', 'speaking-camera')], 100);
    state = reducer(state, {type: 'TOGGLE_PRESENTER_MODE'}); // no screen share yet — needs a manual enable
    state = reducer(state, {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('a2', 'speaking-no-camera'),
      now: 200,
    });
    const spotlight = presenter(state).spotlight;
    expect(spotlight && spotlight.type === 'full' && spotlight.participant.id).toBe('a2');
  });

  it('falls back to the most recently active camera-on participant once nobody is sharing or speaking', () => {
    let state = addAll(createInitialState(container1280x720), [makeParticipant('c1', 'silent-camera')], 100);
    state = reducer(state, {type: 'TOGGLE_PRESENTER_MODE'});
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('c2', 'silent-camera'), now: 200});
    const spotlight = presenter(state).spotlight;
    expect(spotlight && spotlight.type === 'full' && spotlight.participant.id).toBe('c2');
  });

  it('everyone except the spotlight goes into the strip', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
      makeParticipant('a1', 'speaking-camera'),
    ]);
    const stripIds = presenter(state).strip.map(t => (t.type === 'full' ? t.participant.id : 'overflow'));
    expect(stripIds).toEqual(['a1', 'me']);
  });

  it('the strip keeps a participant\'s position when the spotlight changes — a strip seat only moves if that participant\'s own tier changes, exactly like the main grid', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeParticipant('s1', 'screen-sharing'),
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('a2', 'speaking-camera'),
    ]);
    expect(presenter(state).strip.map(t => (t.type === 'full' ? t.participant.id : 'overflow'))).toEqual([
      'a1',
      'a2',
    ]);

    // A second sharer takes the spotlight away from s1, who now joins the strip — a1 and a2 must
    // keep their relative order, not get reshuffled by this unrelated change.
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s2', 'screen-sharing'), now: 999});
    const stripIds = presenter(state).strip.map(t => (t.type === 'full' ? t.participant.id : 'overflow'));
    expect(stripIds.indexOf('a1')).toBeLessThan(stripIds.indexOf('a2'));
  });

  it('strip tiles are sized within the configured aspect-ratio bounds', () => {
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

  // ── Remembers the setting from before anyone was screen-sharing ───────────────
  //
  // Turning on automatically for a screen share is a temporary override, not a new preference:
  // once the last screen share ends, presenter mode returns to whatever it was set to before
  // anyone started sharing — discarding any manual toggles made during the sharing session
  // itself. You can still freely turn presenter mode on or off manually while a share is
  // ongoing; that choice just doesn't become the new "remembered" setting.

  it('turns back off once the only screen share ends, if presenter mode was off beforehand', () => {
    let state = addAll(createInitialState(container1280x720), [makeParticipant('a1', 'speaking-camera')]);
    expect(state.isPresenterModeActive).toBe(false);

    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s1', 'screen-sharing')});
    expect(state.isPresenterModeActive).toBe(true);

    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 's1', changes: {tier: 'silent-no-camera'}});
    expect(state.isPresenterModeActive).toBe(false);
  });

  it('stays on after the screen share ends, if presenter mode was turned on manually beforehand', () => {
    let state = reducer(createInitialState(container1280x720), {type: 'TOGGLE_PRESENTER_MODE'});
    expect(state.isPresenterModeActive).toBe(true);

    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s1', 'screen-sharing')});
    expect(state.isPresenterModeActive).toBe(true);

    // Removing the sharer entirely (not just changing their tier) must revert it too.
    state = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 's1'});
    expect(state.isPresenterModeActive).toBe(true);
  });

  it('a manual toggle during a screen share takes effect right away, but is discarded once sharing ends', () => {
    let state = addAll(createInitialState(container1280x720), [makeParticipant('a1', 'speaking-camera')]);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s1', 'screen-sharing')});
    expect(state.isPresenterModeActive).toBe(true); // turned on automatically

    state = reducer(state, {type: 'TOGGLE_PRESENTER_MODE'});
    expect(state.isPresenterModeActive).toBe(false); // the manual change takes effect right away

    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 's1', changes: {tier: 'silent-no-camera'}});
    // Reverts to the remembered pre-share setting (off), not the manual mid-share toggle.
    expect(state.isPresenterModeActive).toBe(false);
  });

  it('starting a second screen share while one is already in progress does not overwrite the remembered setting', () => {
    // Presenter mode manually on before any sharing starts — this is the baseline that must
    // eventually be restored.
    let state = reducer(createInitialState(container1280x720), {type: 'TOGGLE_PRESENTER_MODE'});
    expect(state.isPresenterModeActive).toBe(true);

    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s1', 'screen-sharing')});
    expect(state.isPresenterModeActive).toBe(true); // already on, no visible change

    // Manually turn it off while s1 is still sharing.
    state = reducer(state, {type: 'TOGGLE_PRESENTER_MODE'});
    expect(state.isPresenterModeActive).toBe(false);

    // A second screen share starting mid-session must not save this (now-off) live value as a
    // new baseline — the real baseline (on, from before s1 ever started) is already remembered.
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s2', 'screen-sharing')});
    expect(state.isPresenterModeActive).toBe(false); // still respects the manual override

    state = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 's1'});
    expect(state.isPresenterModeActive).toBe(false); // s2 is still sharing — no reversion yet

    state = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 's2'});
    expect(state.isPresenterModeActive).toBe(true); // reverts to the original pre-share baseline
  });
});

// ── View-all-participants flag ────────────────────────────────────────────────

describe('areAllParticipantsShown', () => {
  it('starts off and toggles on and off', () => {
    let state = createInitialState(container1280x720);
    expect(state.areAllParticipantsShown).toBe(false);

    state = reducer(state, {type: 'TOGGLE_ALL_PARTICIPANTS'});
    expect(state.areAllParticipantsShown).toBe(true);

    state = reducer(state, {type: 'TOGGLE_ALL_PARTICIPANTS'});
    expect(state.areAllParticipantsShown).toBe(false);
  });

  it('toggling it does not change the layout', () => {
    const state = addAll(createInitialState(container1280x720), [makeParticipant('a', 'speaking-camera')]);
    const next = reducer(state, {type: 'TOGGLE_ALL_PARTICIPANTS'});
    expect(next.layout).toBe(state.layout);
  });
});

// ── SET_CONTAINER_SIZE ────────────────────────────────────────────────────────

describe('SET_CONTAINER_SIZE', () => {
  it('recalculates the layout without touching participants or seating order', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'speaking-camera'),
      makeParticipant('b', 'speaking-camera'),
    ]);
    const slotsBefore = {...state.slotMap};
    const next = reducer(state, {type: 'SET_CONTAINER_SIZE', width: 640, height: 480});
    expect(next.participants).toHaveLength(2);
    expect(next.slotMap).toEqual(slotsBefore);
    expect(next.containerSize).toEqual({width: 640, height: 480});
  });

  it('tile height stays within bounds after resizing', () => {
    let state = addAll(createInitialState({width: 1920, height: 1080}), [
      makeParticipant('a', 'speaking-camera'),
      makeParticipant('b', 'speaking-camera'),
      makeParticipant('c', 'speaking-camera'),
    ]);
    state = reducer(state, {type: 'SET_CONTAINER_SIZE', width: 320, height: 240});
    expect(grid(state).tileHeight).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minTileHeight);
    expect(grid(state).tileHeight).toBeLessThanOrEqual(DEFAULT_CONFIG.maxTileHeight);
  });

  it('a very small container still produces a valid layout instead of breaking', () => {
    const state = addAll(createInitialState({width: 50, height: 50}), [makeParticipant('a', 'speaking-camera')]);
    expect(Array.isArray(grid(state).tiles)).toBe(true);
  });

  it('a wider container allows more columns', () => {
    const narrow = addAll(createInitialState({width: 400, height: 400}), [makeParticipant('a', 'speaking-camera')]);
    const wide = addAll(createInitialState({width: 1600, height: 400}), [makeParticipant('a', 'speaking-camera')]);
    expect(wide.layout.maxCols).toBeGreaterThan(narrow.layout.maxCols);
  });
});

// ── computeLayout ──────────────────────────────────────────────────

describe('computeLayout', () => {
  it('an empty participant list produces no tiles', () => {
    const layout = layoutOf([], {}, container1280x720, DEFAULT_CONFIG) as GridModeLayout;
    expect(layout.tiles).toHaveLength(0);
  });

  it('a single participant produces exactly one full tile', () => {
    const p = makeParticipant('a', 'speaking-camera');
    const layout = layoutOf([p], {a: 0}, container1280x720, DEFAULT_CONFIG) as GridModeLayout;
    expect(layout.tiles).toHaveLength(1);
    expect(layout.tiles[0].type).toBe('full');
  });

  it('the number of rendered slots — full tiles, plus the fractional tile container and/or overflow badge if present — never exceeds what the grid can physically hold', () => {
    const participants = Array.from({length: 20}, (_, i) => makeParticipant(`p${i}`, 'speaking-camera'));
    const slotMap = Object.fromEntries(participants.map((p, i) => [p.id, i]));
    const layout = layoutOf(participants, slotMap, container1280x720, DEFAULT_CONFIG) as GridModeLayout;
    expect(layout.tiles.length).toBeLessThanOrEqual(layout.maxRows * layout.maxCols);
  });

  it('a zero-sized container produces an empty layout instead of throwing', () => {
    const layout = layoutOf([], {}, {width: 0, height: 0}, DEFAULT_CONFIG) as GridModeLayout;
    expect(layout.tiles).toHaveLength(0);
    expect(layout.maxTiles).toBe(0);
  });
});
