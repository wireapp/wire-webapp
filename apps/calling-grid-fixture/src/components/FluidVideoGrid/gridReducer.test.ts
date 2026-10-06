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
import {
  computeTileCounts,
  createGridReducer,
  createInitialState,
  _computeFractionalTileSize,
  _computeInvariants,
  _computeLayout,
  _tileDimensionsFor,
  _updateSlotMap,
} from './gridReducer';

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

/** Ids of every participant seated in the fractional tile container (excluding overflow). */
function fractionIds(state: GridState): string[] {
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
  return [...fullTileIds(state), ...fractionIds(state)];
}

// ── Solo call ──────────────────────────────────────────────────────────────────

describe('solo call', () => {
  it('a lone active participant gets one full tile filling the container', () => {
    const state = addAll(createInitialState(container1280x720), [makeParticipant('a', 'speaking-camera')]);
    expect(allTiles(state)).toHaveLength(1);
    expect(fullTileIds(state)).toEqual(['a']);
    expect(fractionalContainer(state)).toBeUndefined();
  });

  it('a lone passive participant still gets a full tile — solo bypasses active/passive entirely', () => {
    const state = addAll(createInitialState(container1280x720), [makeParticipant('p', 'silent-no-camera')]);
    expect(fullTileIds(state)).toEqual(['p']);
    expect(fractionalContainer(state)).toBeUndefined();
  });

  it('a lone passive self still gets a full tile', () => {
    const state = addAll(createInitialState(container1280x720), [makeSelf('me', 'silent-no-camera')]);
    expect(fullTileIds(state)).toEqual(['me']);
  });

  it('tile dimensions respect the configured min/max height', () => {
    const state = addAll(createInitialState({width: 320, height: 240}), [makeParticipant('a')]);
    expect(grid(state).tileHeight).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minTileHeight);
    expect(grid(state).tileHeight).toBeLessThanOrEqual(DEFAULT_CONFIG.maxTileHeight);
  });

  it('a newcomer joining right after does not evict the solo incumbent from seat 0', () => {
    let state = addAll(createInitialState(container1280x720), [makeParticipant('a', 'speaking-camera')]);
    state = reducer(state, {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('b', 'screen-sharing'),
      now: 999,
    });
    // 'b' outranks 'a' by tier, but 'a' already held the first full seat before 'b' arrived.
    expect(fullTileIds(exitPresenter(state))).toEqual(['a', 'b']);
  });
});

// ── One-on-one call ──────────────────────────────────────────────────────────────

describe('one-on-one call', () => {
  it('the other participant fills the stage and self becomes the pip, regardless of tier', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeSelf('me', 'silent-no-camera'),
      makeParticipant('other', 'silent-no-camera'),
    ]);
    const layout = oneOnOne(state);
    expect(layout.main.type).toBe('full');
    expect(layout.main.type === 'full' && layout.main.participant.id).toBe('other');
    expect(layout.pip.id).toBe('me');
  });

  it('uses the one-on-one template even when self is the active one and the other is passive', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeSelf('me', 'speaking-camera'),
      makeParticipant('other', 'silent-no-camera'),
    ]);
    const layout = oneOnOne(state);
    expect(layout.main.type === 'full' && layout.main.participant.id).toBe('other');
    expect(layout.pip.id).toBe('me');
  });

  it('falls back to the general grid when neither participant is flagged as self', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'speaking-camera'),
      makeParticipant('b', 'speaking-camera'),
    ]);
    expect(state.layout.mode).toBe('grid');
    expect(fullTileIds(state)).toHaveLength(2);
  });

  it('presenter mode (auto-activated by screen share) takes priority over the one-on-one template', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
    ]);
    expect(state.layout.mode).toBe('presenter');
  });
});

// ── ADD_PARTICIPANT / REMOVE_PARTICIPANT ────────────────────────────────────────

describe('ADD_PARTICIPANT', () => {
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

  it('a higher-priority newcomer does not evict an incumbent from their full seat', () => {
    const state = exitPresenter(
      addAll(createInitialState(container1280x720), [
        makeParticipant('cam', 'speaking-camera'),
        makeParticipant('screen1', 'screen-sharing'),
      ]),
    );
    expect(fullTileIds(state)).toEqual(['cam', 'screen1']);
  });

  it('active participants each get their own full tile when there is room to spare', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('a2', 'speaking-camera'),
      makeParticipant('a3', 'speaking-no-camera'),
    ]);
    expect(fullTiles(state)).toHaveLength(3);
    expect(fractionalContainer(state)).toBeUndefined();
  });

  it('passive participants are compressed into the fraction container, never given a full tile', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    expect(fullTileIds(state)).toEqual(['a1']);
    expect(fractionIds(state)).toEqual(['p1', 'p2']);
  });
});

describe('REMOVE_PARTICIPANT', () => {
  it('removes participant and recalculates layout', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'speaking-camera'),
      makeParticipant('b', 'speaking-camera'),
      makeParticipant('c', 'speaking-camera'),
    ]);
    const next = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a'});
    expect(next.participants).toHaveLength(2);
    expect(next.participants.some(p => p.id === 'a')).toBe(false);
  });

  it('removing unknown id is a no-op', () => {
    const state = addAll(createInitialState(container1280x720), [makeParticipant('a', 'speaking-camera')]);
    expect(reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'unknown'})).toBe(state);
  });

  it('cleans up slot map for removed participant', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'speaking-camera'),
      makeParticipant('b', 'speaking-camera'),
      makeParticipant('c', 'speaking-camera'),
    ]);
    const next = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a'});
    expect(next.slotMap['a']).toBeUndefined();
    expect(next.slotMap['b']).toBeDefined();
  });

  it('removing the last passive participant removes the fraction container', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('a2', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(fractionalContainer(state)).toBeDefined();

    const next = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'p1'});
    expect(fractionalContainer(next)).toBeUndefined();
    expect(fullTileIds(next)).toEqual(['a1', 'a2']);
  });
});

// ── computeTileCounts ────────────────────────────────────────────────────────────

describe('computeTileCounts', () => {
  const inv = _computeInvariants(container1280x720, DEFAULT_CONFIG)!; // maxTiles = 75
  const smallInv = _computeInvariants(smallContainer, DEFAULT_CONFIG)!; // maxRows=1, maxCols=3, maxTiles=3

  it('no participants → no tiles, no container', () => {
    expect(computeTileCounts(0, 0, inv, DEFAULT_CONFIG)).toEqual({full: 0, needsFractionContainer: false});
  });

  it('an active-only call that fits entirely in full tiles needs no container', () => {
    expect(computeTileCounts(5, 0, inv, DEFAULT_CONFIG)).toEqual({full: 5, needsFractionContainer: false});
  });

  it('any passive participant forces a container to exist, even with room to spare', () => {
    expect(computeTileCounts(2, 1, inv, DEFAULT_CONFIG)).toEqual({full: 2, needsFractionContainer: true});
  });

  it('an all-passive call gives nobody a full tile', () => {
    expect(computeTileCounts(0, 5, inv, DEFAULT_CONFIG)).toEqual({full: 0, needsFractionContainer: true});
  });

  it('active overflow beyond capacity also forces a container', () => {
    const result = computeTileCounts(5, 0, smallInv, DEFAULT_CONFIG);
    expect(result.needsFractionContainer).toBe(true);
    expect(result.full).toBeLessThanOrEqual(smallInv.maxTiles);
  });

  it('sacrifices exactly one full tile when actives alone would otherwise saturate the grid', () => {
    const result = computeTileCounts(4, 0, smallInv, DEFAULT_CONFIG);
    expect(result.full).toBe(2); // maxTiles(3) - 1
    expect(result.needsFractionContainer).toBe(true);
  });

  it('sacrifices a full tile when passives are present and actives already saturate the row', () => {
    const result = computeTileCounts(3, 2, smallInv, DEFAULT_CONFIG);
    expect(result.full).toBe(2);
    expect(result.needsFractionContainer).toBe(true);
  });

  it('does not sacrifice a full tile when the grid has slack left', () => {
    const result = computeTileCounts(5, 3, inv, DEFAULT_CONFIG);
    expect(result.full).toBe(5);
    expect(result.needsFractionContainer).toBe(true);
  });

  it('does not change behaviour for a fully-active call that exactly fills the grid', () => {
    const result = computeTileCounts(3, 0, smallInv, DEFAULT_CONFIG);
    expect(result).toEqual({full: 3, needsFractionContainer: false});
  });

  it('regression: does not sacrifice a full tile just because actives alone would perfectly fill a smaller shape', () => {
    // Bug: the sacrifice check used to compare against `chooseGridShape(full, ...)` — the shape
    // for the full tiles *alone* — rather than `full + 1` (the shape actually used once the
    // mandatory fraction container's own unit is counted, matching `gridUnitCount` in
    // computeLayout). So 4 actives that happened to perfectly fill a 2×2 grid were judged to
    // leave "no room" for the container, sacrificing one down to 3 full tiles — even though the
    // correctly-sized shape for 5 units (4 full + 1 fraction) naturally grows to 3 columns with
    // a leftover slot, needing no sacrifice at all. A real multi-row, multi-column grid (not
    // `smallInv`, which is a single row and so always reports "no room") is needed to exercise
    // this: maxRows=2, maxCols=5, well short of maxTiles=10.
    const midInv = {usableWidth: 952, usableHeight: 532, maxRows: 2, maxCols: 5, maxTiles: 10};
    const result = computeTileCounts(4, 1, midInv, DEFAULT_CONFIG);
    expect(result.full).toBe(4);
    expect(result.needsFractionContainer).toBe(true);
  });
});

// ── Tile dimension invariants ─────────────────────────────────────────────────

describe('tile dimension invariants', () => {
  const gap = DEFAULT_CONFIG.tileGap;

  it('the chosen column count always fits within the usable container width', () => {
    const inv = _computeInvariants(container1280x720, DEFAULT_CONFIG)!;
    for (const n of [3, 5, 10, 20, 50]) {
      const {cols, width} = _tileDimensionsFor(n, inv, DEFAULT_CONFIG);
      expect(cols * width + (cols - 1) * gap).toBeLessThanOrEqual(inv.usableWidth + 0.01);
    }
  });

  it('tileAspectRatio stays within [minAR, maxAR]', () => {
    for (const n of [3, 6]) {
      const state = addAll(
        createInitialState(container960x540),
        Array.from({length: n}, (_, i) => makeParticipant(`p${i}`, 'speaking-camera')),
      );
      expect(grid(state).tileAspectRatio).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minAspectRatio - 0.01);
      expect(grid(state).tileAspectRatio).toBeLessThanOrEqual(DEFAULT_CONFIG.maxAspectRatio + 0.01);
    }
  });

  it('6 active participants in 960×540 uses 2 rows, not a single portrait row', () => {
    const inv = _computeInvariants(container960x540, DEFAULT_CONFIG)!;
    const {rows} = _tileDimensionsFor(6, inv, DEFAULT_CONFIG);
    expect(rows).toBe(2);
  });

  it('tileHeight stays within configured bounds', () => {
    const state = addAll(createInitialState({width: 320, height: 240}), [
      makeParticipant('a', 'speaking-camera'),
      makeParticipant('b', 'speaking-camera'),
      makeParticipant('c', 'speaking-camera'),
    ]);
    expect(grid(state).tileHeight).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minTileHeight);
    expect(grid(state).tileHeight).toBeLessThanOrEqual(DEFAULT_CONFIG.maxTileHeight);
  });
});

// ── Tier priority (slot ordering) ───────────────────────────────────────────────

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

  it('an active self ranks by tier like anyone else — it does not jump ahead of higher-tier peers', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('s1', 'screen-sharing'),
      makeSelf('me', 'speaking-camera'),
    ]);
    expect(state.slotMap['s1']).toBeLessThan(state.slotMap['me']);
  });

  it('a passive self is appended after existing peers in the same tier, like any newcomer', () => {
    let state = reducer(createInitialState(container1280x720), {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('p1', 'silent-no-camera'),
      now: 100,
    });
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeSelf('me', 'silent-no-camera'), now: 200});
    expect(state.slotMap['p1']).toBeLessThan(state.slotMap['me']);
  });

  it('self follows the same ordering rules as everyone else as participants come and go', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeSelf('me', 'speaking-camera'),
      makeParticipant('a1', 'silent-no-camera'),
    ]);
    expect(state.slotMap['me']).toBe(0); // the only active participant so far, naturally first

    // A higher-tier newcomer is free to rank ahead of self, same as it would for anyone else.
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s1', 'screen-sharing'), now: 999});
    expect(state.slotMap['s1']).toBeLessThan(state.slotMap['me']);

    // Removing that participant isn't self-specific either — self just moves back up because
    // the list is shorter, exactly as it would for any other participant.
    state = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 's1'});
    expect(state.slotMap['me']).toBe(0);
  });

  it('self moves from the active bucket to the passive bucket when it goes silent-camera-off', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeSelf('me', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(state.slotMap['me']).toBe(0);

    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'me', changes: {tier: 'silent-no-camera'}});
    expect(state.slotMap['me']).toBeLessThan(state.slotMap['p1']);
  });

  it('self earns a full tile only once it becomes active', () => {
    // A third (filler) participant keeps this in the general grid, not the one-on-one template.
    let state = addAll(createInitialState(container1280x720), [
      makeSelf('me', 'silent-no-camera'),
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('filler', 'silent-no-camera'),
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

  it('higher-priority participants stay visible when many low-priority participants overflow', () => {
    const state = addAllSmall([
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('a2', 'speaking-camera'),
      makeParticipant('pc', 'silent-camera'),
      ...Array.from({length: 20}, (_, i) => makeParticipant(`pn${i}`, 'silent-no-camera')),
    ]);
    expect(fractionIds(state)).toContain('pc');
    expect(overflowCount(state)).toBeGreaterThan(0);
  });
});

// ── Full-tile seat stickiness ──────────────────────────────────────────────────
//
// Only the full-tile boundary is sticky: an incumbent keeps their exact full seat as
// long as they stay active. The fraction container's internal membership is not
// sticky — anyone not holding a full tile is simply re-sorted into it by priority.

describe('full-tile seat stickiness', () => {
  it('self competes for full tiles by the same priority order as everyone else', () => {
    const state = exitPresenter(
      addAll(createInitialState(container1280x720), [
        makeParticipant('s1', 'screen-sharing'),
        makeSelf('me', 'speaking-camera'),
        makeParticipant('filler', 'silent-no-camera'),
      ]),
    );
    expect(fullTileIds(state)[0]).toBe('s1');
    expect(fullTileIds(state)).toContain('me');
  });

  it('upgrading a participant does not displace the existing full-tile holder', () => {
    const state = addAll(
      createInitialState(container1280x720),
      [
        makeParticipant('a1', 'speaking-camera'),
        makeParticipant('p1', 'silent-no-camera'),
        makeParticipant('p2', 'silent-no-camera'),
      ],
      0,
    );
    expect(fullTileIds(state)).toEqual(['a1']);

    const upgraded = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'p1',
      changes: {tier: 'speaking-camera'},
      now: 999,
    });
    expect(fullTileIds(upgraded)).toEqual(['a1', 'p1']);
  });

  it('tier downgrade immediately loses the full seat — no grace period', () => {
    const state = exitPresenter(
      addAll(createInitialState(container1280x720), [
        makeParticipant('screener', 'screen-sharing'),
        makeParticipant('cam', 'speaking-camera'),
        makeParticipant('filler', 'silent-no-camera'),
      ]),
    );
    expect(fullTileIds(state)).toContain('screener');

    const next = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'screener',
      changes: {tier: 'silent-no-camera'},
    });
    expect(fullTileIds(next)).not.toContain('screener');
    expect(fractionIds(next)).toContain('screener');
  });

  it('a newcomer with higher recency does not displace an existing full-tile holder', () => {
    let state = addAll(createInitialState(container1280x720), [makeParticipant('early', 'speaking-camera')]);
    state = reducer(state, {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('late', 'speaking-camera'),
      now: 200,
    });
    expect(fullTileIds(exitPresenter(state))).toEqual(['early', 'late']);
  });

  it('promoting a participant to active leaves the existing full-tile holder seated', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a_old', 'speaking-camera'),
      makeParticipant('lazy', 'silent-no-camera'),
      makeParticipant('filler', 'silent-no-camera'),
    ]);
    const upgraded = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'lazy',
      changes: {tier: 'speaking-camera'},
      now: 999,
    });
    expect(fullTileIds(upgraded)).toContain('a_old');
    expect(fullTileIds(upgraded)).toContain('lazy');
  });

  it('a fraction participant who turns their camera on is promoted to a full tile', () => {
    const state = addAll(createInitialState(container1280x720), [
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

  it('turning a camera on does not move anyone when nobody is under capacity pressure', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
      makeParticipant('p3', 'silent-no-camera'),
    ]);
    const slotP1 = state.slotMap['p1'];
    const next = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'p2',
      changes: {tier: 'silent-camera'},
    });
    expect(next.slotMap['p1']).toBe(slotP1);
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

// ── computeFractionalTileSize ──────────────────────────────────────────────────
//
// Row count (and therefore cell size) is a pure function of the full tile's height —
// never of how many participants need to fit. This is what fixes the old bug where
// adding a 4th passive flipped a 3-row column into a 2×2 grid: row count must stay put
// as the count grows, so the column just keeps filling and a new column starts.

describe('computeFractionalTileSize', () => {
  it('is independent of participant count — same tileHeight always yields the same rows', () => {
    const a = _computeFractionalTileSize(532, DEFAULT_CONFIG);
    const b = _computeFractionalTileSize(532, DEFAULT_CONFIG);
    expect(a).toEqual(b);
  });

  it('never returns fewer than 2 rows — a fractional tile is never the size of a full tile', () => {
    const {rows} = _computeFractionalTileSize(130, DEFAULT_CONFIG);
    expect(rows).toBeGreaterThanOrEqual(2);
  });

  it('rows is however many fixed-height cells land closest to an exact fit of the tile height', () => {
    // target height = minTileHeight * 0.5 = 60; gap = 4. round((532+4)/(60+4)) = round(8.375) = 8.
    // Exact division across 8 rows of 532 with gap 4: (532 - 7*4) / 8 = 63 — close to, but not
    // exactly, the 60 target, since this is an exact division rather than a capped target.
    const {rows, fracHeight} = _computeFractionalTileSize(532, DEFAULT_CONFIG);
    expect(rows).toBe(8);
    expect(fracHeight).toBeCloseTo(63, 5);
  });

  it('more available height yields more rows, holding tile width constant', () => {
    const short = _computeFractionalTileSize(240, DEFAULT_CONFIG);
    const tall = _computeFractionalTileSize(600, DEFAULT_CONFIG);
    expect(tall.rows).toBeGreaterThan(short.rows);
  });

  it('shrinks the fixed target only when even 2 rows do not otherwise fit', () => {
    const {rows, fracHeight} = _computeFractionalTileSize(100, DEFAULT_CONFIG);
    expect(rows).toBe(2);
    expect(fracHeight).toBeLessThan(DEFAULT_CONFIG.minTileHeight * 0.5);
  });

  it('width follows a fixed aspect ratio, not the current full tile shape — no tileWidth input at all', () => {
    // The old signature took tileWidth and derived width from the full tile's own aspect
    // ratio, which is why a lone full tile (wide, clamped AR) and a packed grid's full tile
    // (narrow AR) produced different-looking fraction cells for the same tileHeight. There is
    // no tileWidth parameter anymore — width is purely `fracHeight * fixedAspectRatio`.
    const {fracWidth, fracHeight} = _computeFractionalTileSize(532, DEFAULT_CONFIG);
    const expectedAspectRatio =
      ((DEFAULT_CONFIG.minFractionalTileAspectRatio ?? DEFAULT_CONFIG.minAspectRatio) +
        (DEFAULT_CONFIG.maxFractionalTileAspectRatio ?? DEFAULT_CONFIG.maxAspectRatio)) /
      2;
    expect(fracWidth).toBeCloseTo(fracHeight * expectedAspectRatio, 5);
  });
});

// ── Fractional tile container ──────────────────────────────────────────────────

describe('fractional tile container', () => {
  it('a fractional tile is never a 1×1 shape — always at least a 2-way split', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(grid(state).fractionalTileHeight!).toBeLessThan(grid(state).tileHeight / 2 + 0.01);
    expect(fractionalContainer(state)!.fractionalTiles.filter(f => f.type === 'participant')).toHaveLength(1);
  });

  it('adding a 4th passive keeps filling the column instead of jumping to a 2×2 shape', () => {
    // Regression test: row count must not be re-derived per participant count.
    const threeState = addAll(createInitialState(container960x540), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p0', 'silent-no-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    const fourState = addAll(createInitialState(container960x540), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p0', 'silent-no-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
      makeParticipant('p3', 'silent-no-camera'),
    ]);
    // Same tileHeight (still 1 active + container competing for the same 2-unit shape) →
    // the fixed cell size, and therefore row count, must be identical in both states.
    expect(grid(fourState).fractionalTileHeight).toBe(grid(threeState).fractionalTileHeight);
  });

  it('fills column-major — the array order is priority order; CSS places it column-major', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p0', 'silent-no-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    const participantIds = fractionalContainer(state)!
      .fractionalTiles.filter(f => f.type === 'participant')
      .map(f => (f as {participant: GridParticipant}).participant.id);
    expect(participantIds).toEqual(['p0', 'p1', 'p2']);
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

  it('active overflow spills into the container too, alongside the passives', () => {
    const state = addAllSmall(Array.from({length: 4}, (_, i) => makeParticipant(`a${i}`, 'speaking-camera')));
    // smallContainer has maxTiles=3, so 4 actives can't all get a full tile.
    expect(fullTiles(state).length).toBeLessThan(4);
    expect(fractionalContainer(state)).toBeDefined();
  });

  // ── Mode 1: sharing the only row (column-major, centered, hugs width) ──────────

  it('mode 1: tags fillDirection "column" and align "center" when sharing the only row', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    const tile = fractionalContainer(state)!;
    expect(tile.fillDirection).toBe('column');
    expect(tile.align).toBe('center');
  });

  it('mode 1: width hugs narrower than the full tile — not snapped — when under capacity', () => {
    // So the full tile beside it can actually use the freed-up space, per the regression
    // this guards: width must not be forced to tileWidth just because it's squeezed to one
    // leftover slot — only once it's genuinely full (showing the overflow badge).
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    const layout = grid(state);
    expect(overflowCount(state)).toBe(0);
    expect(layout.fractionalContainerWidth!).toBeLessThan(layout.tileWidth);
  });

  it('mode 1: width snaps to exactly the full tile width once truly at overflow capacity', () => {
    // minTileHeight=240 (matching production, not the smaller test default) reproduces the
    // same geometry as the "caps capacity..." regression above: 1 active + container share a
    // single row at 960×540, container capacity is 16 — comfortably exceeded by 20 passives.
    const bigConfig: GridConfig = {...DEFAULT_CONFIG, minTileHeight: 240};
    const bigReducer = createGridReducer(bigConfig);
    const state = [
      makeParticipant('a1', 'speaking-camera'),
      ...Array.from({length: 20}, (_, i) => makeParticipant(`p${i}`, 'silent-no-camera')),
    ].reduce(
      (s, p) => bigReducer(s, {type: 'ADD_PARTICIPANT', participant: p}),
      createInitialState(container960x540),
    );
    const layout = grid(state);
    expect(overflowCount(state)).toBeGreaterThan(0);
    expect(fractionalContainer(state)!.fillDirection).toBe('column');
    expect(fractionalContainer(state)!.align).toBe('center'); // confirms this is mode 1, not 3
    expect(layout.fractionalContainerWidth).toBe(layout.tileWidth);
  });

  it('mode 1: width/alignment is identical exactly at capacity and just past it — the overflow badge must not shift the layout', () => {
    // Regression: snapping only triggered on `hasOverflow`, missing the case where the
    // participant count lands exactly on capacity (every cell full, no overflow badge needed
    // yet) — that state hugged narrower than the overflow state one participant later, even
    // though both are equally "fully packed". Same geometry as the capacity-16 test above.
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

  it('mode 1: the box height always matches the full tile, but the cell itself stays small either way', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    const layout = grid(state);
    expect(layout.fractionalContainerHeight).toBe(layout.tileHeight);
    expect(layout.fractionalTileHeight!).toBeLessThan(layout.tileHeight / 2);
  });

  it('mode 1: the cell size is invariant — identical whether the column is under-filled or completely full', () => {
    // Observation: cell size must not depend on `visibleCount`. One active + one passive
    // (column barely started) and one active + enough passives to exactly fill the column
    // must produce the exact same fractionalTileHeight/Width for the same tileHeight.
    const underfilled = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    const {rows} = _computeFractionalTileSize(grid(underfilled).tileHeight, DEFAULT_CONFIG);
    const filled = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      ...Array.from({length: rows}, (_, i) => makeParticipant(`p${i}`, 'silent-no-camera')),
    ]);
    expect(overflowCount(filled)).toBe(0);
    expect(grid(filled).fractionalTileHeight).toBe(grid(underfilled).fractionalTileHeight);
    expect(grid(filled).fractionalTileWidth).toBe(grid(underfilled).fractionalTileWidth);

    const expectedHeight = (grid(underfilled).tileHeight - DEFAULT_CONFIG.tileGap * (rows - 1)) / rows;
    expect(grid(filled).fractionalTileHeight).toBeCloseTo(expectedHeight, 5);
  });

  // ── Mode 3: sharing the last row of a multi-row grid (column-major, top/left-aligned) ──

  it('mode 3: tags fillDirection "column" and align "start" when full-tile rows exist above it', () => {
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

  it('mode 3: hugs its content below max columns — width is constant within a column count, grows only when a new column starts', () => {
    // Per the Figma reference designs: a container genuinely short of the max column count must
    // hug (not stretch to the full available slot), and the whole shared row (full tile(s) +
    // hugged container) is centered as a block by the outer grid — same as mode 1. This only
    // works without visibly shifting the full tile(s) because the hugged width is a pure
    // function of `cols` (a function of participant count): adding passives within the same
    // column count must not change the width, and crossing a column boundary must grow it by
    // exactly one cell + gap — as long as neither side of that boundary is already at the max
    // column count (see the separate "flushes exactly" test for that boundary specifically).
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

    const {rows: capRows} = _computeFractionalTileSize(grid(build(1)).tileHeight, bigConfig);
    const capacity = grid(build(1)).maxFractionalTilesPerContainer;
    const maxCols = capacity / capRows;
    expect(maxCols).toBeGreaterThan(2); // need 1→2 columns to both stay below maxCols

    // One column started vs one column completely full — same `cols` (1), must be the exact
    // same (hugged) width.
    const oneColumnStarted = build(1);
    const oneColumnFull = build(capRows);
    expect(overflowCount(oneColumnFull)).toBe(0);
    expect(grid(oneColumnStarted).fractionalContainerWidth).toBe(grid(oneColumnFull).fractionalContainerWidth);

    // Crossing from 1 column to 2 (well below maxCols) must grow the width by exactly one
    // cell + gap.
    const twoColumnsStarted = build(capRows + 1);
    const gap = bigConfig.tileGap;
    expect(grid(twoColumnsStarted).fractionalContainerWidth).toBeCloseTo(
      grid(oneColumnFull).fractionalContainerWidth! + grid(twoColumnsStarted).fractionalTileWidth! + gap,
      5,
    );
  });

  it('mode 3: flushes exactly to the available width once at max columns — no "kink" against the full-tile row(s) above', () => {
    // Regression: hugging all the way up to and including `maxCols` left a few leftover px
    // (`maxCols` is a floor), and centering that left this row's edges sitting slightly inside
    // the full-tile rows' edges above/below it — a small but visible "kink" rather than a clean
    // line, even though each row was individually centered correctly. At `cols === maxCols`
    // (whether or not the last column is completely full), width instead divides the available
    // width exactly, matching the same `tileWidth` the full tile(s) in this row already use.
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
    const {rows: capRows} = _computeFractionalTileSize(grid(build(1)).tileHeight, bigConfig);
    const maxCols = capacity / capRows;
    expect(maxCols).toBeGreaterThan(1); // meaningful check, not a single-column coincidence

    // Last column just started (cols === maxCols, but not every cell full) vs completely full —
    // both at max columns, so both must flush to the exact same (non-hugged) width.
    const lastColumnStarted = build(capacity - capRows + 1);
    const lastColumnFull = build(capacity);
    expect(overflowCount(lastColumnFull)).toBe(0);
    expect(grid(lastColumnStarted).fractionalContainerWidth).toBe(grid(lastColumnFull).fractionalContainerWidth);

    const layout = grid(lastColumnFull);
    const spannedWidth = maxCols * layout.fractionalTileWidth! + (maxCols - 1) * bigConfig.tileGap;
    expect(spannedWidth).toBeCloseTo(layout.fractionalContainerWidth!, 5);
  });

  // ── Mode 2: alone in its own row (row-major, centered, always hugs) ─────────────

  it('mode 2: tags fillDirection "row" and align "center" when it has a row to itself', () => {
    // All-passive always gives the container its own row — nothing to share with.
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    const tile = fractionalContainer(state)!;
    expect(tile.fillDirection).toBe('row');
    expect(tile.align).toBe('center');
  });

  it('mode 2: fills row-major — a handful of participants sit in one row, not stacked in a column', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('p0', 'silent-no-camera'),
      makeParticipant('p1', 'silent-no-camera'),
      makeParticipant('p2', 'silent-no-camera'),
    ]);
    const layout = grid(state);
    // All 3 fit in a single row: container height is exactly one cell tall, not three.
    expect(layout.fractionalContainerHeight).toBeCloseTo(layout.fractionalTileHeight!, 5);
  });

  it('mode 2: always hugs — never stretches to tileHeight even with plenty of content', () => {
    const many = Array.from({length: 40}, (_, i) => makeParticipant(`p${i}`, 'silent-no-camera'));
    const state = addAll(createInitialState(container1280x720), many);
    const layout = grid(state);
    expect(overflowCount(state)).toBe(0);
    // Height hugs however many rows are actually needed — it has no full-tile sibling to
    // force-match, so it's never forced to exactly tileHeight (that would only happen by
    // coincidence here, not by design — so just assert it's a hug, i.e. a whole multiple of
    // the fixed cell height, not the stretched exact-division value mode 1 would produce).
    const rowsNeeded = Math.round(
      (layout.fractionalContainerHeight! + DEFAULT_CONFIG.tileGap) /
        (layout.fractionalTileHeight! + DEFAULT_CONFIG.tileGap),
    );
    const expectedHeight = rowsNeeded * layout.fractionalTileHeight! + (rowsNeeded - 1) * DEFAULT_CONFIG.tileGap;
    expect(layout.fractionalContainerHeight).toBeCloseTo(expectedHeight, 5);
  });

  it('mode 2: a fully-packed row tiles edge-to-edge with zero slack, not a symmetric inset', () => {
    // Regression: maxCols was floored against the grid's abstract usable width instead of the
    // container's own (narrower, full-tile-row-matching) width, and even corrected for that,
    // `maxCols * targetWidth` is generally a few px short of the container width. Left
    // uncorrected, `justifyContent: 'center'` (mode 2's "last row centered" rule) split that
    // slack onto *both* edges even when a row was completely full — an inset that never
    // reached either edge, instead of flush alignment with the full-tile row above/below.
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
    expect(fractionalContainer(probeState)?.fillDirection).toBe('row'); // confirms mode 2, not 1/3
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

describe('overflow', () => {
  it('no overflow badge when everyone fits', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeParticipant('p1', 'silent-no-camera'),
    ]);
    expect(overflowCount(state)).toBe(0);
  });

  it('overflow badge appears once the container runs out of row space', () => {
    const state = addAllSmall(
      Array.from({length: 12}, (_, i) => makeParticipant(`p${i}`, i === 0 ? 'speaking-camera' : 'silent-no-camera')),
    );
    expect(overflowCount(state)).toBeGreaterThan(0);
  });

  it('caps capacity to the width left over next to a full tile sharing its row — regression', () => {
    // Bug: capacity was computed against the *full* grid width even when the container was
    // budgeted to share its row with a full tile, letting it grow wider than that row could
    // actually hold. CSS then wrapped it to its own line at the same (large) tile height,
    // blowing out the total content height well past the container — with no overflow badge
    // ever appearing, since the (wrong) capacity was never exceeded.
    //
    // minTileHeight=240 (matching the production fixture config, not the smaller test
    // default) reproduces the exact geometry where one active tile and the container share
    // a single ~530px-tall row: the container's own capacity is only 16 (4 rows × 4 cols) —
    // comfortably exceeded by 20 passives if, and only if, the fix is in place.
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
    expect(fractionIds(state).length).toBeLessThanOrEqual(grid(state).maxFractionalTilesPerContainer);
  });

  it('overflow count equals the number of participants that did not fit', () => {
    const state = addAllSmall(
      Array.from({length: 12}, (_, i) => makeParticipant(`p${i}`, i === 0 ? 'speaking-camera' : 'silent-no-camera')),
    );
    expect(overflowCount(state)).toBe(12 - visibleIds(state).length);
  });

  it('adding one more participant increases the overflow count by one once already overflowing', () => {
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

  it('overflow badge carries up to 3 avatars', () => {
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

  it('the overflow badge is the last slot in the container', () => {
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

  it('toggling off with exactly 2 participants reveals the one-on-one template underneath', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
    ]);
    state = reducer(state, {type: 'TOGGLE_PRESENTER_MODE'});
    expect(state.isPresenterModeActive).toBe(false);
    expect(state.layout.mode).toBe('one-on-one');

    state = reducer(state, {type: 'TOGGLE_PRESENTER_MODE'});
    expect(state.isPresenterModeActive).toBe(true);
    expect(state.layout.mode).toBe('presenter');
  });

  it('toggling off with 3+ participants reveals the tiled grid', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
      makeParticipant('a1', 'speaking-camera'),
    ]);
    state = reducer(state, {type: 'TOGGLE_PRESENTER_MODE'});
    expect(state.layout.mode).toBe('grid');
  });

  it('spotlights the highest-priority tier — screen-sharing beats speaking beats everything else', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
      makeParticipant('a1', 'speaking-camera'),
    ]);
    const spotlight = presenter(state).spotlight;
    expect(spotlight?.type).toBe('full');
    expect(spotlight && spotlight.type === 'full' && spotlight.participant.id).toBe('s1');
  });

  it('self takes the spotlight when self genuinely is the highest-priority participant — no seating privilege either way', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'speaking-camera'),
      makeSelf('me', 'screen-sharing'),
    ]);
    const spotlight = presenter(state).spotlight;
    expect(spotlight && spotlight.type === 'full' && spotlight.participant.id).toBe('me');
  });

  it('with multiple screen-sharers, the most recently started one gets the spotlight ("stack" behavior)', () => {
    let state = addAll(createInitialState(container1280x720), [makeParticipant('s1', 'screen-sharing')], 100);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s2', 'screen-sharing'), now: 200});
    let spotlight = presenter(state).spotlight;
    expect(spotlight && spotlight.type === 'full' && spotlight.participant.id).toBe('s2');

    // s2 stops sharing — falls back to s1, the only screen-sharer left, not just the next
    // participant in priority order.
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

  it('puts everyone except the spotlight into the strip', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeSelf('me'),
      makeParticipant('s1', 'screen-sharing'),
      makeParticipant('a1', 'speaking-camera'),
    ]);
    const stripIds = presenter(state).strip.map(t => (t.type === 'full' ? t.participant.id : 'overflow'));
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

  // ── Remembers the pre-screen-share setting ────────────────────────────────────
  //
  // Auto-activation on screen share is a temporary override, not a new user preference: once
  // the last screen share ends, presenter mode must return to whatever it was set to before
  // anyone started sharing — discarding any manual toggles made during the session itself.

  it('reverts to off once the only screen share ends, if presenter mode was off beforehand', () => {
    let state = addAll(createInitialState(container1280x720), [makeParticipant('a1', 'speaking-camera')]);
    expect(state.isPresenterModeActive).toBe(false);

    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s1', 'screen-sharing')});
    expect(state.isPresenterModeActive).toBe(true);

    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 's1', changes: {tier: 'silent-no-camera'}});
    expect(state.isPresenterModeActive).toBe(false);
  });

  it('stays on after the screen share ends, if presenter mode was manually on beforehand', () => {
    let state = reducer(createInitialState(container1280x720), {type: 'TOGGLE_PRESENTER_MODE'});
    expect(state.isPresenterModeActive).toBe(true);

    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s1', 'screen-sharing')});
    expect(state.isPresenterModeActive).toBe(true);

    // Removing the sharer entirely (not just changing their tier) must revert it too.
    state = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 's1'});
    expect(state.isPresenterModeActive).toBe(true);
  });

  it('a manual toggle during the screen share takes effect immediately but is discarded once sharing ends', () => {
    let state = addAll(createInitialState(container1280x720), [makeParticipant('a1', 'speaking-camera')]);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s1', 'screen-sharing')});
    expect(state.isPresenterModeActive).toBe(true); // auto-activated

    state = reducer(state, {type: 'TOGGLE_PRESENTER_MODE'});
    expect(state.isPresenterModeActive).toBe(false); // manual override takes effect right away

    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 's1', changes: {tier: 'silent-no-camera'}});
    // Reverts to the remembered pre-share setting (off), not the manual mid-share toggle.
    expect(state.isPresenterModeActive).toBe(false);
  });

  it('does not re-snapshot the remembered setting when a second screen share starts during an existing one', () => {
    // Presenter mode manually on before any sharing starts — this is the baseline that must
    // eventually be restored.
    let state = reducer(createInitialState(container1280x720), {type: 'TOGGLE_PRESENTER_MODE'});
    expect(state.isPresenterModeActive).toBe(true);

    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s1', 'screen-sharing')});
    expect(state.isPresenterModeActive).toBe(true); // already on, no visible change

    // Manually turn it off while s1 is still sharing.
    state = reducer(state, {type: 'TOGGLE_PRESENTER_MODE'});
    expect(state.isPresenterModeActive).toBe(false);

    // A second screen-share starting mid-session must not re-snapshot this (now-off) live
    // value as a new baseline — the real baseline (on, from before s1 ever started) is already
    // remembered.
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('s2', 'screen-sharing')});
    expect(state.isPresenterModeActive).toBe(false); // still respects the manual override

    state = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 's1'});
    expect(state.isPresenterModeActive).toBe(false); // s2 still sharing — no reversion yet

    state = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 's2'});
    expect(state.isPresenterModeActive).toBe(true); // reverts to the original pre-share baseline
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
      makeParticipant('b', 'speaking-camera'),
    ]);
    const slotsBefore = {...state.slotMap};
    const next = reducer(state, {type: 'SET_CONTAINER_SIZE', width: 640, height: 480});
    expect(next.participants).toHaveLength(2);
    expect(next.slotMap).toEqual(slotsBefore);
    expect(next.containerSize).toEqual({width: 640, height: 480});
  });

  it('tileHeight stays within bounds after a resize', () => {
    let state = addAll(createInitialState({width: 1920, height: 1080}), [
      makeParticipant('a', 'speaking-camera'),
      makeParticipant('b', 'speaking-camera'),
      makeParticipant('c', 'speaking-camera'),
    ]);
    state = reducer(state, {type: 'SET_CONTAINER_SIZE', width: 320, height: 240});
    expect(grid(state).tileHeight).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minTileHeight);
    expect(grid(state).tileHeight).toBeLessThanOrEqual(DEFAULT_CONFIG.maxTileHeight);
  });

  it('a very small container still produces a valid layout', () => {
    const state = addAll(createInitialState({width: 50, height: 50}), [makeParticipant('a', 'speaking-camera')]);
    expect(Array.isArray(grid(state).tiles)).toBe(true);
  });

  it('a wider container yields more maxCols', () => {
    const small = addAll(createInitialState({width: 400, height: 400}), [makeParticipant('a', 'speaking-camera')]);
    const large = addAll(createInitialState({width: 1600, height: 400}), [makeParticipant('a', 'speaking-camera')]);
    expect(large.layout.maxCols).toBeGreaterThan(small.layout.maxCols);
  });
});

// ── _computeLayout internal ───────────────────────────────────────────────────

describe('_computeLayout', () => {
  it('empty participant list returns no tiles', () => {
    const layout = _computeLayout([], {}, container1280x720, DEFAULT_CONFIG) as GridModeLayout;
    expect(layout.tiles).toHaveLength(0);
  });

  it('single participant produces one full tile', () => {
    const p = makeParticipant('a', 'speaking-camera');
    const layout = _computeLayout([p], {a: 0}, container1280x720, DEFAULT_CONFIG) as GridModeLayout;
    expect(layout.tiles).toHaveLength(1);
    expect(layout.tiles[0].type).toBe('full');
  });

  it('tile count never exceeds maxRows × maxCols', () => {
    const participants = Array.from({length: 20}, (_, i) => makeParticipant(`p${i}`, 'speaking-camera'));
    const slotMap = Object.fromEntries(participants.map((p, i) => [p.id, i]));
    const layout = _computeLayout(participants, slotMap, container1280x720, DEFAULT_CONFIG) as GridModeLayout;
    expect(layout.tiles.length).toBeLessThanOrEqual(layout.maxRows * layout.maxCols);
  });

  it('a zero-sized container produces an empty layout rather than throwing', () => {
    const layout = _computeLayout([], {}, {width: 0, height: 0}, DEFAULT_CONFIG) as GridModeLayout;
    expect(layout.tiles).toHaveLength(0);
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

  it('self ranks by tier like any other participant — a higher-tier peer still goes first', () => {
    const slotMap = _updateSlotMap(
      [makeParticipant('screen1', 'screen-sharing'), makeSelf('me', 'speaking-camera')],
      {},
    );
    expect(slotMap['screen1']).toBeLessThan(slotMap['me']);
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
