import {GridConfig, GridParticipant, GridState, ParticipantTier, TileDescriptor} from './FluidVideoGrid.types';
import {createGridReducer, createInitialState, _updateSlotMap, _computeLayout, _selectFractionalLayout} from './gridReducer';

const DEFAULT_CONFIG: GridConfig = {
  minTileHeight: 120,
  maxTileHeight: 600,
  minAspectRatio: 0.67,
  maxAspectRatio: 1.78,
  tileGap: 4,
};

const reducer = createGridReducer(DEFAULT_CONFIG);

// Large container: capacity = 15 × 5 = 75
const container1280x720 = {width: 1280, height: 720};

// Small container: maxCols=3, maxRows=1 → capacity=3.
// usableW=292, minTileWidth≈80.4 → floor((292+4)/(80.4+4))=3
// usableH=130, minTileHeight=120 → floor((130+4)/(120+4))=1
const smallContainer = {width: 300, height: 138};

// Medium container used for optimal-layout tests.
// Chosen so 6 tiles fit best in a 2-row layout, not 1-row.
const container960x540 = {width: 960, height: 540};

function makeParticipant(
  id: string,
  tier: ParticipantTier = 'passive-no-camera',
  speakingDuration = 0,
  activatedAt?: number,
): GridParticipant {
  return {id, name: `User ${id}`, tier, isMuted: false, speakingDuration, activatedAt};
}

function addAll(state: GridState, participants: GridParticipant[], now = 0): GridState {
  return participants.reduce(
    (s, p) => reducer(s, {type: 'ADD_PARTICIPANT', participant: p, now}),
    state,
  );
}

function addAllSmall(participants: GridParticipant[], now = 0): GridState {
  return addAll(createInitialState(smallContainer), participants, now);
}

type FullTile = Extract<TileDescriptor, {type: 'full'}>;
type FractionalTileDescriptor = Extract<TileDescriptor, {type: 'fractional'}>;

function fullTiles(state: GridState): FullTile[] {
  return state.layout.rows
    .flatMap(r => r.tiles)
    .filter((t): t is FullTile => t.type === 'full');
}

function fractionalTile(state: GridState): FractionalTileDescriptor | undefined {
  return state.layout.rows
    .flatMap(r => r.tiles)
    .find((t): t is FractionalTileDescriptor => t.type === 'fractional');
}

function subtileIds(state: GridState): string[] {
  return (
    fractionalTile(state)
      ?.subtiles.filter(s => s.type === 'participant')
      .map(s => s.participant!.id) ?? []
  );
}

function overflowCount(state: GridState): number {
  return fractionalTile(state)?.subtiles.find(s => s.type === 'overflow')?.count ?? 0;
}

// ── ADD_PARTICIPANT ────────────────────────────────────────────────────────────

describe('ADD_PARTICIPANT', () => {
  it('adds participant and produces a tile', () => {
    const state = createInitialState(container1280x720);
    const next = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'active-camera')});
    expect(next.participants).toHaveLength(1);
    expect(next.layout.rows.flatMap(r => r.tiles)).toHaveLength(1);
    expect(next.layout.rows.flatMap(r => r.tiles)[0].type).toBe('full');
  });

  it('is idempotent — duplicate id is ignored', () => {
    const state = createInitialState(container1280x720);
    const s1 = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'active-camera')});
    const s2 = reducer(s1, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'active-camera')});
    expect(s2.participants).toHaveLength(1);
  });

  it('screen-sharing participant lands in first full tile (before active-camera)', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('cam', 'active-camera'),
      makeParticipant('screen1', 'screen-sharing'),
    ]);
    expect(fullTiles(state)[0].participant.id).toBe('screen1');
  });

  it('multiple participants each get their own full tile when under capacity', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('s1', 'screen-sharing'),
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'),
    ]);
    expect(fullTiles(state)).toHaveLength(3);
  });

  it('at most one fractional tile exists', () => {
    // smallContainer capacity=3, force fractional by adding 4 participants
    const state = addAllSmall([
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p0', 'passive-no-camera'),
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
    ]);
    const fracCount = state.layout.rows.flatMap(r => r.tiles).filter(t => t.type === 'fractional').length;
    expect(fracCount).toBeLessThanOrEqual(1);
  });
});

// ── REMOVE_PARTICIPANT ─────────────────────────────────────────────────────────

describe('REMOVE_PARTICIPANT', () => {
  it('removes participant and recalculates layout', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'active-camera'),
      makeParticipant('b', 'passive-no-camera'),
    ]);
    const next = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a'});
    expect(next.participants).toHaveLength(1);
    expect(next.participants[0].id).toBe('b');
  });

  it('removing unknown id is a no-op', () => {
    const s1 = addAll(createInitialState(container1280x720), [makeParticipant('a', 'active-camera')]);
    const s2 = reducer(s1, {type: 'REMOVE_PARTICIPANT', id: 'unknown'});
    expect(s2.participants).toHaveLength(1);
  });

  it('cleans up slot map for removed participant', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'passive-no-camera'),
      makeParticipant('b', 'passive-no-camera'),
    ]);
    const next = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a'});
    expect(next.slotMap['a']).toBeUndefined();
    expect(next.slotMap['b']).toBeDefined();
  });

  it('removing the last subtile participant removes the fractional tile', () => {
    // In smallContainer capacity=3; 4 participants trigger fractional
    const state = addAllSmall([
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p0', 'passive-no-camera'),
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('extra', 'passive-no-camera'),
    ]);
    expect(fractionalTile(state)).toBeDefined();

    const next = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'extra'});
    // Now 3 participants = capacity → all full tiles, no fractional
    expect(fractionalTile(next)).toBeUndefined();
  });
});

// ── UPDATE_PARTICIPANT — tier upgrade ─────────────────────────────────────────

describe('UPDATE_PARTICIPANT — tier upgrade', () => {
  it('passive→active-camera: participant moves to higher-priority slot', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      makeParticipant('lazy', 'passive-no-camera'),
    ]);
    const slotBefore = state.slotMap['lazy'];
    const upgraded = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'lazy',
      changes: {tier: 'active-camera'},
      now: 999,
    });
    expect(upgraded.slotMap['lazy']).toBeLessThan(slotBefore);
  });

  it('passive→active-camera: participant appears in a full tile', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      makeParticipant('lazy', 'passive-no-camera'),
    ]);
    const upgraded = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'lazy',
      changes: {tier: 'active-camera'},
      now: 999,
    });
    expect(fullTiles(upgraded).map(t => t.participant.id)).toContain('lazy');
  });

  it('upgrading to active-camera with higher now puts the upgraded participant before the older one', () => {
    // a1 was added with now=0 (lower activatedAt); p1 upgrades with now=999 (higher activatedAt)
    // → p1 should get lower slot than a1 (more recently active = higher priority)
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),  // activatedAt = 0
      makeParticipant('p1', 'passive-no-camera'),
    ], 0);
    const upgraded = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'p1',
      changes: {tier: 'active-camera'},
      now: 999,
    });
    // p1 (activatedAt=999) should have lower slot than a1 (activatedAt=0)
    expect(upgraded.slotMap['p1']).toBeLessThan(upgraded.slotMap['a1']);
  });
});

// ── UPDATE_PARTICIPANT — tier downgrade ────────────────────────────────────────

describe('UPDATE_PARTICIPANT — tier downgrade', () => {
  it('screen-sharing→passive-no-camera: no longer gets a priority slot', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('screener', 'screen-sharing'),
      makeParticipant('cam', 'active-camera'),
    ]);
    const next = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'screener',
      changes: {tier: 'passive-no-camera'},
    });
    // cam (active-camera) now has higher priority than screener (passive-no-camera)
    expect(next.slotMap['cam']).toBeLessThan(next.slotMap['screener']);
  });

  it('downgrading a participant to passive moves it behind active-tier participants in subtiles', () => {
    // smallContainer capacity=3; 4 participants trigger fractional (2 full + 2 subtile)
    const state = addAllSmall([
      makeParticipant('a1', 'active-camera'),
      makeParticipant('a2', 'active-camera'),
      makeParticipant('a3', 'active-camera'),
      makeParticipant('a4', 'active-camera'),
    ]);
    // a1,a2 in full tiles; a3,a4 in subtiles (all same activatedAt=0, stable order)
    expect(subtileIds(state)).toEqual(['a3', 'a4']);

    // Downgrade a3 to passive-no-camera → a3 now behind a4 (active) in priority
    const next = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'a3',
      changes: {tier: 'passive-no-camera'},
    });
    const ids = subtileIds(next);
    // a4 (active-camera) should appear before a3 (passive-no-camera) in subtile order
    expect(ids.indexOf('a4')).toBeLessThan(ids.indexOf('a3'));
  });
});

// ── Tile dimension invariants ─────────────────────────────────────────────────

describe('tile dimension invariants', () => {
  const gap = DEFAULT_CONFIG.tileGap;

  it('widest row tiles fit within usable container width', () => {
    // The actual tile width is computed for the widest row in the layout,
    // so nActualCols × tileWidth + (nActualCols-1) × gap ≤ usableW must hold.
    for (const n of [1, 2, 5, 10, 20, 50]) {
      const participants = Array.from({length: n}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera'));
      const state = addAll(createInitialState(container1280x720), participants);
      const {tileWidth, rows} = state.layout;
      const nActualCols = Math.max(...rows.map(r => r.tiles.length), 0);
      const usableW = container1280x720.width - 2 * gap;
      expect(nActualCols * tileWidth + (nActualCols - 1) * gap).toBeLessThanOrEqual(usableW + 0.01);
    }
  });

  it('all rows fit within usable container height', () => {
    // nActualRows × tileHeight + (nActualRows-1) × gap ≤ usableH must hold.
    for (const n of [1, 2, 5, 10, 20, 50]) {
      const participants = Array.from({length: n}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera'));
      const state = addAll(createInitialState(container1280x720), participants);
      const {tileHeight, rows} = state.layout;
      const nActualRows = rows.length;
      const usableH = container1280x720.height - 2 * gap;
      expect(nActualRows * tileHeight + (nActualRows - 1) * gap).toBeLessThanOrEqual(usableH + 0.01);
    }
  });

  it('tileAspectRatio is within [minAR, maxAR]', () => {
    for (const n of [1, 3, 6]) {
      const participants = Array.from({length: n}, (_, i) => makeParticipant(`p${i}`, 'active-camera'));
      const state = addAll(createInitialState(container960x540), participants);
      expect(state.layout.tileAspectRatio).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minAspectRatio - 0.01);
      expect(state.layout.tileAspectRatio).toBeLessThanOrEqual(DEFAULT_CONFIG.maxAspectRatio + 0.01);
    }
  });

  it('6 participants in 960×540 uses 2 rows (optimal layout, not 1-row portrait)', () => {
    const state = addAll(
      createInitialState(container960x540),
      Array.from({length: 6}, (_, i) => makeParticipant(`p${i}`, 'active-camera')),
    );
    expect(state.layout.rows).toHaveLength(2);
  });

  it('tileHeight stays within configured bounds', () => {
    const state = addAll(createInitialState({width: 320, height: 240}), [
      makeParticipant('a', 'active-camera'),
    ]);
    expect(state.layout.tileHeight).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minTileHeight);
    expect(state.layout.tileHeight).toBeLessThanOrEqual(DEFAULT_CONFIG.maxTileHeight);
  });
});

// ── 'you' tier ────────────────────────────────────────────────────────────────

describe("'you' tier", () => {
  it("'you' participant always has slot 0", () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('s1', 'screen-sharing'),
      makeParticipant('me', 'you'),
      makeParticipant('a1', 'active-camera'),
    ]);
    expect(state.slotMap['me']).toBe(0);
  });

  it("'you' participant appears as the first full tile", () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('s1', 'screen-sharing'),
      makeParticipant('me', 'you'),
      makeParticipant('a1', 'active-camera'),
    ]);
    expect(fullTiles(state)[0].participant.id).toBe('me');
  });

  it("'you' tile is stable when other participants change tier", () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('me', 'you'),
      makeParticipant('a1', 'active-camera'),
    ]);
    const slotMe = state.slotMap['me'];
    const next = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'a1',
      changes: {tier: 'screen-sharing'},
      now: 500,
    });
    expect(next.slotMap['me']).toBe(slotMe);
  });
});

// ── Unified priority queue (passive in full tiles) ────────────────────────────

describe('unified priority queue', () => {
  it('passive participant gets a full tile when capacity allows', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'),
    ]);
    // 2 participants well under capacity=75 → both full tiles
    expect(fullTiles(state)).toHaveLength(2);
    expect(fractionalTile(state)).toBeUndefined();
  });

  it('passive-camera has higher priority than passive-no-camera', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('pc', 'passive-camera'),
      makeParticipant('pn', 'passive-no-camera'),
    ]);
    expect(state.slotMap['pc']).toBeLessThan(state.slotMap['pn']);
  });

  it('tier priority order: you < screen-sharing < active-camera < active-no-camera < passive-camera < passive-no-camera', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('pn', 'passive-no-camera'),
      makeParticipant('pc', 'passive-camera'),
      makeParticipant('anc', 'active-no-camera'),
      makeParticipant('ac', 'active-camera'),
      makeParticipant('ss', 'screen-sharing'),
      makeParticipant('me', 'you'),
    ]);
    const {slotMap} = state;
    expect(slotMap['me']).toBeLessThan(slotMap['ss']);
    expect(slotMap['ss']).toBeLessThan(slotMap['ac']);
    expect(slotMap['ac']).toBeLessThan(slotMap['anc']);
    expect(slotMap['anc']).toBeLessThan(slotMap['pc']);
    expect(slotMap['pc']).toBeLessThan(slotMap['pn']);
  });

  it('full tile layout renders participants in slot order', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('pn', 'passive-no-camera'),
      makeParticipant('ac', 'active-camera'),
      makeParticipant('ss', 'screen-sharing'),
    ]);
    const ids = fullTiles(state).map(t => t.participant.id);
    expect(ids).toEqual(['ss', 'ac', 'pn']);
  });
});

// ── Recency ordering within active tiers ─────────────────────────────────────

describe('recency ordering within active tiers', () => {
  it('most recently activated active-camera participant gets the lower slot', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('old', 'active-camera'),  // activatedAt auto-set to now=0
      makeParticipant('new', 'active-camera'),  // also now=0, but added after
    ]);
    // Both now=0, so tiebreak by prevSlotMap: 'old' was assigned first → lower slot
    expect(state.slotMap['old']).toBeLessThan(state.slotMap['new']);
  });

  it('participant added with higher now gets a lower slot than earlier participant', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('early', 'active-camera'), now: 100});
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('late', 'active-camera'), now: 200});
    // 'late' has activatedAt=200 > 100 → lower slot (higher recency priority)
    expect(state.slotMap['late']).toBeLessThan(state.slotMap['early']);
  });

  it('passive tier does NOT use recency — stable (add) order is preserved', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('p1', 'passive-no-camera'), now: 100});
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('p2', 'passive-no-camera'), now: 200});
    // p1 was added first → lower slot (stable/add order, NOT recency)
    expect(state.slotMap['p1']).toBeLessThan(state.slotMap['p2']);
  });

  it('updating tier to active sets activatedAt and moves participant to recency slot', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeParticipant('a_old', 'active-camera'),  // activatedAt=0
      makeParticipant('lazy', 'passive-no-camera'),
    ]);
    const upgraded = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'lazy',
      changes: {tier: 'active-camera'},
      now: 999,
    });
    // lazy has activatedAt=999, a_old has activatedAt=0 → lazy is lower slot
    expect(upgraded.slotMap['lazy']).toBeLessThan(upgraded.slotMap['a_old']);
  });

  it('updating non-tier field does not change activatedAt', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'active-camera'), now: 100});
    const activatedAtBefore = state.participants[0].activatedAt;
    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'a', changes: {isMuted: true}});
    expect(state.participants.find(p => p.id === 'a')!.activatedAt).toBe(activatedAtBefore);
  });
});

// ── activatedAt management ────────────────────────────────────────────────────

describe('activatedAt management', () => {
  it('ADD_PARTICIPANT with active tier auto-sets activatedAt when not provided', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('a', 'active-camera'),
      now: 42,
    });
    expect(state.participants[0].activatedAt).toBe(42);
  });

  it('ADD_PARTICIPANT with passive tier does NOT set activatedAt', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('p', 'passive-no-camera'),
      now: 42,
    });
    expect(state.participants[0].activatedAt).toBeUndefined();
  });

  it('ADD_PARTICIPANT preserves explicit activatedAt on the participant', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {
      type: 'ADD_PARTICIPANT',
      participant: makeParticipant('a', 'active-camera', 0, 77),
      now: 42,
    });
    // Explicit activatedAt=77 from participant object is preserved (not overwritten by now=42)
    expect(state.participants[0].activatedAt).toBe(77);
  });

  it('UPDATE_PARTICIPANT changing tier refreshes activatedAt', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'passive-no-camera'), now: 10});
    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'a', changes: {tier: 'active-camera'}, now: 200});
    expect(state.participants.find(p => p.id === 'a')!.activatedAt).toBe(200);
  });

  it('UPDATE_PARTICIPANT NOT changing tier preserves activatedAt', () => {
    let state = createInitialState(container1280x720);
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'active-camera'), now: 100});
    state = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'a', changes: {isMuted: true}, now: 999});
    expect(state.participants.find(p => p.id === 'a')!.activatedAt).toBe(100);
  });
});

// ── Fractional tile trigger ────────────────────────────────────────────────────
//
// smallContainer: capacity = 3.
// Fractional tile appears when nParticipants > 3.

describe('fractional tile trigger', () => {
  it('no fractional tile when nP = capacity (all get full tiles)', () => {
    const state = addAllSmall([
      makeParticipant('p0', 'passive-no-camera'),
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
    ]);
    expect(fractionalTile(state)).toBeUndefined();
    expect(fullTiles(state)).toHaveLength(3);
  });

  it('fractional tile appears when nP = capacity + 1', () => {
    const state = addAllSmall([
      makeParticipant('p0', 'passive-no-camera'),
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
      makeParticipant('p3', 'passive-no-camera'),
    ]);
    expect(fractionalTile(state)).toBeDefined();
    expect(fullTiles(state)).toHaveLength(2); // capacity - 1 = 2
  });

  it('fractional tile contains the lower-priority participants (highest slots)', () => {
    const state = addAllSmall([
      makeParticipant('hi', 'screen-sharing'),
      makeParticipant('mid', 'active-camera'),
      makeParticipant('lo1', 'passive-no-camera'),
      makeParticipant('lo2', 'passive-no-camera'),
    ]);
    // Full tiles = 2 highest priority: 'hi' and 'mid'
    const fullIds = fullTiles(state).map(t => t.participant.id);
    expect(fullIds).toContain('hi');
    expect(fullIds).toContain('mid');
    // Subtile = remaining: lo1, lo2
    expect(subtileIds(state)).toContain('lo1');
    expect(subtileIds(state)).toContain('lo2');
  });

  it('subtile count grows as more participants are added', () => {
    let state = addAllSmall([
      makeParticipant('p0', 'passive-no-camera'),
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
      makeParticipant('p3', 'passive-no-camera'), // triggers fractional
    ]);
    expect(subtileIds(state)).toHaveLength(2); // slot 2 and slot 3 → 2 subtile participants, no overflow

    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('p4', 'passive-no-camera')});
    expect(subtileIds(state).length).toBeGreaterThanOrEqual(2);
  });
});

// ── Fractional capacity restricted to {2, 3, 4, 6} ───────────────────────────

describe('fractional capacity restricted to {2, 3, 4, 6}', () => {
  const VALID_CAPS = new Set([2, 3, 4, 6]);

  it('_selectFractionalLayout always returns a layout with cap in {2, 3, 4, 6}', () => {
    const tileSizes = [
      {w: 160, h: 90},
      {w: 160, h: 120},
      {w: 200, h: 200},
      {w: 320, h: 180},
    ];
    for (const {w, h} of tileSizes) {
      for (const n of [1, 2, 3, 4, 5, 6, 10]) {
        const {subRows, subCols} = _selectFractionalLayout(n, w, h, DEFAULT_CONFIG);
        expect(VALID_CAPS.has(subRows * subCols)).toBe(true);
      }
    }
  });

  it('fractional tile in smallContainer has cap in {2, 3, 4, 6}', () => {
    // Use enough participants to trigger fractional
    const state = addAllSmall(
      Array.from({length: 6}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
    );
    const frac = fractionalTile(state);
    if (frac) {
      expect(VALID_CAPS.has(frac.subRows * frac.subCols)).toBe(true);
    }
  });

  it('subtile dimensions satisfy gap-corrected formula', () => {
    // Force a fractional tile in smallContainer
    const state = addAllSmall(
      Array.from({length: 5}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
    );
    const frac = fractionalTile(state);
    const {tileWidth, tileHeight, subtileWidth, subtileHeight} = state.layout;
    if (frac && subtileWidth !== null && subtileHeight !== null) {
      const gap = DEFAULT_CONFIG.tileGap;
      const expectedW = (tileWidth - gap * (frac.subCols - 1)) / frac.subCols;
      const expectedH = (tileHeight - gap * (frac.subRows - 1)) / frac.subRows;
      expect(subtileWidth).toBeCloseTo(expectedW, 5);
      expect(subtileHeight).toBeCloseTo(expectedH, 5);
    }
  });

  it('subtile height is at least minTileHeight / 2', () => {
    const state = addAllSmall(
      Array.from({length: 5}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
    );
    const {subtileHeight} = state.layout;
    if (subtileHeight !== null) {
      expect(subtileHeight).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minTileHeight / 2 - 0.01);
    }
  });
});

// ── Overflow ──────────────────────────────────────────────────────────────────
//
// smallContainer: capacity=3, nFullTiles=2 when fractional is active.
// The maximum fractional cap in this container is 4 (2×2 layout when overflowing).
// With fractCap=4 and needsOverflow: visibleParticipants = 3, overflow shows the rest.
//
// nSubtile = nTotal - 2 (full tiles)
// overflow appears when nSubtile > fractCap (4 for this container)
// i.e. nTotal > 6

describe('overflow', () => {
  it('no overflow when subtile count ≤ fractCap', () => {
    // 2 full + 4 subtiles = 6 total; fractCap=4 (exact fit)
    const state = addAllSmall(
      Array.from({length: 6}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
    );
    expect(overflowCount(state)).toBe(0);
    expect(fractionalTile(state)?.subtiles.find(s => s.type === 'overflow')).toBeUndefined();
  });

  it('overflow tile appears when subtile count > fractCap', () => {
    // 7 total: 2 full + 5 subtile participants > fractCap(4) → overflow
    const state = addAllSmall(
      Array.from({length: 7}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
    );
    expect(fractionalTile(state)?.subtiles.find(s => s.type === 'overflow')).toBeDefined();
  });

  it('overflow count equals number of hidden participants', () => {
    // 7 total, nSubtile=5, fractCap=4 → 3 visible + overflow(2)
    const state = addAllSmall(
      Array.from({length: 7}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
    );
    expect(overflowCount(state)).toBe(2);
  });

  it('adding one more participant increases overflow count by 1', () => {
    const base = addAllSmall(
      Array.from({length: 8}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
    );
    const countBefore = overflowCount(base);
    const next = reducer(base, {type: 'ADD_PARTICIPANT', participant: makeParticipant('extra', 'passive-no-camera')});
    expect(overflowCount(next)).toBe(countBefore + 1);
  });

  it('overflow tile carries up to 3 avatar references', () => {
    const state = addAllSmall(
      Array.from({length: 12}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
    );
    const overflow = fractionalTile(state)?.subtiles.find(s => s.type === 'overflow');
    expect(overflow?.avatars?.length).toBeGreaterThan(0);
    expect(overflow?.avatars?.length).toBeLessThanOrEqual(3);
  });

  it('priority ordering is preserved in overflow — higher-priority participants are visible', () => {
    // Mix passive-camera (higher priority) with passive-no-camera in overflow scenario
    // smallContainer with 7 total: slots 0-1 = full tiles, slots 2-4 = subtiles, slots 5-6 = overflow
    const state = addAllSmall([
      makeParticipant('hi0', 'active-camera'),
      makeParticipant('hi1', 'active-camera'),
      makeParticipant('pc0', 'passive-camera'),   // passive-camera → lower slot than passive-no-camera
      makeParticipant('pn0', 'passive-no-camera'),
      makeParticipant('pn1', 'passive-no-camera'),
      makeParticipant('pn2', 'passive-no-camera'),
      makeParticipant('pn3', 'passive-no-camera'),
    ]);
    // 'pc0' has higher priority than 'pn*' → visible in subtile, not in overflow
    expect(subtileIds(state)).toContain('pc0');
  });
});

// ── SET_CONTAINER_SIZE ────────────────────────────────────────────────────────

describe('SET_CONTAINER_SIZE', () => {
  it('recalculates layout without touching participant list or slot map', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'active-camera'),
      makeParticipant('b', 'passive-no-camera'),
    ]);
    const slotBefore = {...state.slotMap};
    const next = reducer(state, {type: 'SET_CONTAINER_SIZE', width: 640, height: 480});
    expect(next.participants).toHaveLength(2);
    expect(next.slotMap).toEqual(slotBefore);
    expect(next.containerSize).toEqual({width: 640, height: 480});
  });

  it('tileHeight stays within configured bounds after resize', () => {
    let state = addAll(createInitialState({width: 1920, height: 1080}), [
      makeParticipant('a', 'active-camera'),
    ]);
    state = reducer(state, {type: 'SET_CONTAINER_SIZE', width: 320, height: 240});
    expect(state.layout.tileHeight).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minTileHeight);
    expect(state.layout.tileHeight).toBeLessThanOrEqual(DEFAULT_CONFIG.maxTileHeight);
  });

  it('very small container produces valid layout without throwing', () => {
    const state = addAll(createInitialState({width: 50, height: 50}), [
      makeParticipant('a', 'active-camera'),
    ]);
    expect(Array.isArray(state.layout.rows)).toBe(true);
  });

  it('wider container produces more maxCols', () => {
    const small = addAll(createInitialState({width: 400, height: 400}), [makeParticipant('a', 'active-camera')]);
    const large = addAll(createInitialState({width: 1600, height: 400}), [makeParticipant('a', 'active-camera')]);
    expect(large.layout.maxCols).toBeGreaterThan(small.layout.maxCols);
  });
});

// ── Stable slot assignment ─────────────────────────────────────────────────────

describe('stable slot assignment', () => {
  it('participant keeps its slot when only non-tier fields change', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'active-camera'),
      makeParticipant('b', 'passive-no-camera'),
    ]);
    const slotA = state.slotMap['a'];
    const slotB = state.slotMap['b'];
    const next = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'b', changes: {isMuted: true}});
    expect(next.slotMap['a']).toBe(slotA);
    expect(next.slotMap['b']).toBe(slotB);
  });

  it('passive tier preserves add-order when a new passive is added', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
    ]);
    const slotP1 = state.slotMap['p1'];
    const slotP2 = state.slotMap['p2'];
    const next = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('p3', 'passive-no-camera')});
    expect(next.slotMap['p1']).toBe(slotP1);
    expect(next.slotMap['p2']).toBe(slotP2);
    expect(next.slotMap['p3']).toBeGreaterThan(next.slotMap['p2']);
  });

  it('screen-sharing always has lower slot than active-camera', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('cam1', 'active-camera'),
      makeParticipant('screen1', 'screen-sharing'),
    ]);
    expect(state.slotMap['screen1']).toBeLessThan(state.slotMap['cam1']);
  });
});

// ── passive-camera priority over passive-no-camera ────────────────────────────

describe('passive tier ordering', () => {
  it('passive-camera participants always have lower slots than passive-no-camera', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('pn1', 'passive-no-camera'),
      makeParticipant('pn2', 'passive-no-camera'),
      makeParticipant('pc1', 'passive-camera'),
      makeParticipant('pc2', 'passive-camera'),
    ]);
    expect(state.slotMap['pc1']).toBeLessThan(state.slotMap['pn1']);
    expect(state.slotMap['pc1']).toBeLessThan(state.slotMap['pn2']);
    expect(state.slotMap['pc2']).toBeLessThan(state.slotMap['pn1']);
    expect(state.slotMap['pc2']).toBeLessThan(state.slotMap['pn2']);
  });

  it('turning camera on promotes passive participant above passive-no-camera peers', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
    ]);
    const slotP1before = state.slotMap['p1'];
    const slotP2before = state.slotMap['p2'];
    const next = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'p2',
      changes: {tier: 'passive-camera'},
    });
    // p2 now in passive-camera group → lower slot than p1 (passive-no-camera)
    expect(next.slotMap['p2']).toBeLessThan(next.slotMap['p1']);
    // p1 slot is re-indexed but still reflects passive-no-camera
    expect(next.slotMap['p1']).toBeGreaterThan(next.slotMap['p2']);
  });

  it('in overflow scenario, passive-camera participant is visible over passive-no-camera', () => {
    // smallContainer capacity=3, 7 total → 2 full + 5 subtile → 3 visible + overflow
    // Add a passive-camera participant: it has higher priority, so it appears in subtile
    const state = addAllSmall([
      makeParticipant('a1', 'active-camera'),
      makeParticipant('a2', 'active-camera'),
      makeParticipant('pc', 'passive-camera'),    // higher priority than pn*
      makeParticipant('pn0', 'passive-no-camera'),
      makeParticipant('pn1', 'passive-no-camera'),
      makeParticipant('pn2', 'passive-no-camera'),
      makeParticipant('pn3', 'passive-no-camera'),
    ]);
    // 'pc' has higher priority than all pn* → visible in subtile
    expect(subtileIds(state)).toContain('pc');
    // At least one pn* is in overflow
    expect(overflowCount(state)).toBeGreaterThan(0);
  });
});

// ── _computeLayout internal ───────────────────────────────────────────────────

describe('_computeLayout internal', () => {
  it('empty participant list returns empty rows', () => {
    const layout = _computeLayout([], {}, container1280x720, DEFAULT_CONFIG);
    expect(layout.rows).toHaveLength(0);
  });

  it('single participant produces one full tile in one row', () => {
    const p = makeParticipant('a', 'active-camera');
    const layout = _computeLayout([p], {a: 0}, container1280x720, DEFAULT_CONFIG);
    expect(layout.rows).toHaveLength(1);
    expect(layout.rows[0].tiles).toHaveLength(1);
    expect(layout.rows[0].tiles[0].type).toBe('full');
  });

  it('tile count never exceeds maxRows × maxCols', () => {
    const participants = Array.from({length: 20}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera'));
    const slotMap = Object.fromEntries(participants.map((p, i) => [p.id, i]));
    const layout = _computeLayout(participants, slotMap, container1280x720, DEFAULT_CONFIG);
    const totalTiles = layout.rows.flatMap(r => r.tiles).length;
    expect(totalTiles).toBeLessThanOrEqual(layout.maxRows * layout.maxCols);
  });

  it('tileAspectRatio is within [minAR, maxAR]', () => {
    const p = makeParticipant('a', 'active-camera');
    const layout = _computeLayout([p], {a: 0}, container1280x720, DEFAULT_CONFIG);
    expect(layout.tileAspectRatio).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minAspectRatio - 0.01);
    expect(layout.tileAspectRatio).toBeLessThanOrEqual(DEFAULT_CONFIG.maxAspectRatio + 0.01);
  });
});

// ── _updateSlotMap internal ───────────────────────────────────────────────────

describe('_updateSlotMap internal', () => {
  it('assigns monotonically increasing slots in tier priority order', () => {
    const participants: GridParticipant[] = [
      makeParticipant('passive1', 'passive-no-camera'),
      makeParticipant('active1', 'active-camera'),
      makeParticipant('screen1', 'screen-sharing'),
    ];
    const slotMap = _updateSlotMap(participants, {});
    expect(slotMap['screen1']).toBeLessThan(slotMap['active1']);
    expect(slotMap['active1']).toBeLessThan(slotMap['passive1']);
  });

  it("'you' participant has the absolute lowest slot", () => {
    const participants: GridParticipant[] = [
      makeParticipant('screen1', 'screen-sharing'),
      makeParticipant('me', 'you'),
      makeParticipant('active1', 'active-camera'),
    ];
    const slotMap = _updateSlotMap(participants, {});
    expect(slotMap['me']).toBeLessThan(slotMap['screen1']);
    expect(slotMap['me']).toBeLessThan(slotMap['active1']);
  });

  it('new passive participant is appended after existing peers in same tier', () => {
    const existing: GridParticipant[] = [
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
    ];
    const prevMap = _updateSlotMap(existing, {});
    const allParticipants = [...existing, makeParticipant('p3', 'passive-no-camera')];
    const newMap = _updateSlotMap(allParticipants, prevMap);
    expect(newMap['p3']).toBeGreaterThan(newMap['p1']);
    expect(newMap['p3']).toBeGreaterThan(newMap['p2']);
  });

  it('active tier: higher activatedAt → lower slot', () => {
    const participants: GridParticipant[] = [
      makeParticipant('old', 'active-camera', 0, 100),
      makeParticipant('new', 'active-camera', 0, 200),
    ];
    const slotMap = _updateSlotMap(participants, {});
    expect(slotMap['new']).toBeLessThan(slotMap['old']);
  });
});
