import {GridConfig, GridParticipant, GridState, ParticipantTier, TileDescriptor} from './FluidVideoGrid.types';
import {createGridReducer, createInitialState, _updateSlotMap, _computeLayout} from './gridReducer';

// Config matching constants.ts defaults (minAR=0.67 so modes 2,3,6 can also work)
const DEFAULT_CONFIG: GridConfig = {
  minTileHeight: 120,
  maxTileHeight: 600,
  minAspectRatio: 0.67,
  maxAspectRatio: 1.78,
  maxSubRows: 2,
  maxSubCols: 3,
  tileGap: 4,
};

const reducer = createGridReducer(DEFAULT_CONFIG);
const container1280x720 = {width: 1280, height: 720};

function makeParticipant(
  id: string,
  tier: ParticipantTier = 'passive-no-camera',
  speakingDuration = 0,
): GridParticipant {
  return {id, name: `User ${id}`, tier, isMuted: false, speakingDuration};
}

function addAll(state: GridState, participants: GridParticipant[]): GridState {
  return participants.reduce(
    (s, p) => reducer(s, {type: 'ADD_PARTICIPANT', participant: p}),
    state,
  );
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

// ── ADD_PARTICIPANT ────────────────────────────────────────────────────────────

describe('ADD_PARTICIPANT', () => {
  it('adds participant and recalculates layout', () => {
    const state = createInitialState(container1280x720);
    const next = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'active-camera')});
    expect(next.participants).toHaveLength(1);
    const tiles = next.layout.rows.flatMap(r => r.tiles);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].type).toBe('full');
  });

  it('is idempotent — duplicate id is ignored', () => {
    const state = createInitialState(container1280x720);
    const s1 = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'active-camera')});
    const s2 = reducer(s1, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'active-camera')});
    expect(s2.participants).toHaveLength(1);
  });

  it('active participant lands in a full tile', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('active1', 'active-camera'),
    ]);
    expect(fullTiles(state)).toHaveLength(1);
    expect(fullTiles(state)[0].participant?.id).toBe('active1');
  });

  it('passive participant goes into the fractional tile', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('active1', 'active-camera'),
      makeParticipant('passive1', 'passive-no-camera'),
    ]);
    const frac = fractionalTile(state);
    expect(frac).toBeDefined();
    expect(frac?.subtiles?.[0].type).toBe('participant');
    expect(frac?.subtiles?.[0].participant?.id).toBe('passive1');
  });

  it('screen-sharing participant lands in first full tile', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('cam', 'active-camera'),
      makeParticipant('screen1', 'screen-sharing'),
    ]);
    const tiles = fullTiles(state);
    expect(tiles[0].participant?.id).toBe('screen1');
  });

  it('multiple active participants each get their own full tile', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('s1', 'screen-sharing'),
      makeParticipant('s2', 'screen-sharing'),
      makeParticipant('a1', 'active-camera'),
    ]);
    expect(fullTiles(state)).toHaveLength(3);
  });

  it('at most one fractional tile exists', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      ...Array.from({length: 6}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
    ]);
    const fracCount = state.layout.rows.flatMap(r => r.tiles).filter(t => t.type === 'fractional').length;
    expect(fracCount).toBeLessThanOrEqual(1);
  });
});

// ── REMOVE_PARTICIPANT ─────────────────────────────────────────────────────────

describe('REMOVE_PARTICIPANT', () => {
  it('removes participant and recalculates layout', () => {
    let state = addAll(createInitialState(container1280x720), [
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
    let state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'passive-no-camera'),
      makeParticipant('b', 'passive-no-camera'),
    ]);
    const next = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a'});
    expect(next.slotMap['a']).toBeUndefined();
    expect(next.slotMap['b']).toBeDefined();
  });

  it('removing last passive removes fractional tile', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'),
    ]);
    const next = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'p1'});
    expect(fractionalTile(next)).toBeUndefined();
  });
});

// ── UPDATE_PARTICIPANT — tier upgrade ─────────────────────────────────────────

describe('UPDATE_PARTICIPANT — tier upgrade', () => {
  it('passive→active-camera: participant appears in a full tile', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      makeParticipant('lazy', 'passive-no-camera'),
    ]);
    const upgraded = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'lazy', changes: {tier: 'active-camera'}});
    const ids = fullTiles(upgraded).map(t => t.participant?.id);
    expect(ids).toContain('lazy');
  });

  it('upgraded participant no longer appears in the fractional tile', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      makeParticipant('lazy', 'passive-no-camera'),
    ]);
    const upgraded = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'lazy', changes: {tier: 'active-camera'}});
    const subtileIds = fractionalTile(upgraded)?.subtiles
      ?.filter(s => s.type === 'participant')
      .map(s => s.participant?.id) ?? [];
    expect(subtileIds).not.toContain('lazy');
  });

  it('unchanged participants keep their slot indices after an upgrade', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
    ]);
    const slotBefore = state.slotMap['a1'];
    const upgraded = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'p1', changes: {tier: 'active-camera'}});
    expect(upgraded.slotMap['a1']).toBe(slotBefore);
  });
});

// ── UPDATE_PARTICIPANT — tier downgrade ────────────────────────────────────────

describe('UPDATE_PARTICIPANT — tier downgrade', () => {
  it('active→passive: participant moves from full tile to fractional subtile', () => {
    let state = addAll(createInitialState(container1280x720), [makeParticipant('a1', 'active-camera')]);
    const downgraded = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'a1',
      changes: {tier: 'passive-no-camera'},
    });
    expect(fullTiles(downgraded).some(t => t.participant?.id === 'a1')).toBe(false);
    const subtileIds = fractionalTile(downgraded)?.subtiles
      ?.filter(s => s.type === 'participant')
      .map(s => s.participant?.id) ?? [];
    expect(subtileIds).toContain('a1');
  });

  it('screen-sharing→passive: no longer gets a full tile', () => {
    let state = addAll(createInitialState(container1280x720), [makeParticipant('screener', 'screen-sharing')]);
    const next = reducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'screener',
      changes: {tier: 'passive-no-camera'},
    });
    expect(fullTiles(next).every(t => t.participant?.id !== 'screener')).toBe(true);
  });
});

// ── Sub-grid selection ────────────────────────────────────────────────────────

describe('sub-grid selection', () => {
  it('fractional tile has subRows ≤ maxSubRows and subCols ≤ maxSubCols', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'),
    ]);
    const frac = fractionalTile(state);
    expect(frac?.subRows).toBeGreaterThanOrEqual(1);
    expect(frac?.subRows).toBeLessThanOrEqual(DEFAULT_CONFIG.maxSubRows);
    expect(frac?.subCols).toBeGreaterThanOrEqual(1);
    expect(frac?.subCols).toBeLessThanOrEqual(DEFAULT_CONFIG.maxSubCols);
  });

  it('subRows × subCols ≥ number of passive participants (when no overflow)', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const state = addAll(
        createInitialState(container1280x720),
        [
          makeParticipant('a1', 'active-camera'),
          ...Array.from({length: n}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
        ],
      );
      const frac = fractionalTile(state);
      expect((frac?.subRows ?? 0) * (frac?.subCols ?? 0)).toBeGreaterThanOrEqual(n);
    }
  });

  it('subtileAspectRatio is within [minAR, maxAR] when achievable', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
      makeParticipant('p3', 'passive-no-camera'),
      makeParticipant('p4', 'passive-no-camera'),
    ]);
    const {subtileAspectRatio} = state.layout;
    if (subtileAspectRatio !== null) {
      expect(subtileAspectRatio).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minAspectRatio - 0.01);
      expect(subtileAspectRatio).toBeLessThanOrEqual(DEFAULT_CONFIG.maxAspectRatio + 0.01);
    }
  });
});

// ── Overflow tile ──────────────────────────────────────────────────────────────

describe('overflow', () => {
  const maxCap = DEFAULT_CONFIG.maxSubRows * DEFAULT_CONFIG.maxSubCols; // 6

  it('no overflow when passive count ≤ maxSubRows × maxSubCols', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      ...Array.from({length: maxCap}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
    ]);
    const overflow = fractionalTile(state)?.subtiles?.find(s => s.type === 'overflow');
    expect(overflow).toBeUndefined();
  });

  it('overflow tile appears when passive count > maxSubRows × maxSubCols', () => {
    // maxCap = 6: slots 1-5 hold participants, slot 6 = overflow tile showing count=2
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      ...Array.from({length: maxCap + 1}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
    ]);
    const overflow = fractionalTile(state)?.subtiles?.find(s => s.type === 'overflow');
    expect(overflow).toBeDefined();
    // visibleCount = maxCap - 1 = 5; hidden = (maxCap + 1) - 5 = 2
    expect(overflow?.count).toBe(2);
  });

  it('overflow count equals passivesToPlace minus visible subtile slots', () => {
    const extra = 4;
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      ...Array.from({length: maxCap + extra}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
    ]);
    const overflow = fractionalTile(state)?.subtiles?.find(s => s.type === 'overflow');
    // visibleCount = maxCap - 1 = 5; hidden = (maxCap + extra) - 5
    expect(overflow?.count).toBe(extra + 1);
  });

  it('overflow tile carries up to 3 avatar references', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      ...Array.from({length: maxCap + 5}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
    ]);
    const overflow = fractionalTile(state)?.subtiles?.find(s => s.type === 'overflow');
    expect((overflow?.avatars?.length ?? 0)).toBeGreaterThan(0);
    expect((overflow?.avatars?.length ?? 0)).toBeLessThanOrEqual(3);
  });

  it('adding one more passive increases overflow count by 1', () => {
    const base = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      ...Array.from({length: maxCap + 2}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
    ]);
    const countBefore = fractionalTile(base)?.subtiles?.find(s => s.type === 'overflow')?.count ?? 0;
    const next = reducer(base, {type: 'ADD_PARTICIPANT', participant: makeParticipant('extra', 'passive-no-camera')});
    const countAfter = fractionalTile(next)?.subtiles?.find(s => s.type === 'overflow')?.count ?? 0;
    expect(countAfter).toBe(countBefore + 1);
  });
});

// ── SET_CONTAINER_SIZE ────────────────────────────────────────────────────────

describe('SET_CONTAINER_SIZE', () => {
  it('recalculates layout without touching participant list or slot map', () => {
    let state = addAll(createInitialState(container1280x720), [
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

  it('maxCols and maxRows account for the tile gap', () => {
    // With wider container more columns fit
    const small = addAll(createInitialState({width: 400, height: 400}), [makeParticipant('a', 'active-camera')]);
    const large = addAll(createInitialState({width: 1600, height: 400}), [makeParticipant('a', 'active-camera')]);
    expect(large.layout.maxCols).toBeGreaterThan(small.layout.maxCols);
  });

  it('subtile dimensions satisfy gap-corrected formula', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
    ]);
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
});

// ── No fractional tile when no passive participants ───────────────────────────

describe('no passive participants', () => {
  it('subtileWidth/Height/AR are null when there are no passives', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      makeParticipant('a2', 'active-camera'),
    ]);
    expect(state.layout.subtileWidth).toBeNull();
    expect(state.layout.subtileHeight).toBeNull();
    expect(state.layout.subtileAspectRatio).toBeNull();
  });

  it('no fractional tile when all participants are active', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('a1', 'active-camera'),
      makeParticipant('a2', 'screen-sharing'),
    ]);
    expect(fractionalTile(state)).toBeUndefined();
  });
});

// ── Stable slot assignment ─────────────────────────────────────────────────────

describe('stable slot assignment', () => {
  it('participant keeps its slot when only non-tier fields change', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeParticipant('a', 'active-camera'),
      makeParticipant('b', 'passive-no-camera'),
    ]);
    const slotA = state.slotMap['a'];
    const slotB = state.slotMap['b'];
    const next = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'b', changes: {isMuted: true}});
    expect(next.slotMap['a']).toBe(slotA);
    expect(next.slotMap['b']).toBe(slotB);
  });

  it('relative order within a tier is preserved when a third participant is added', () => {
    let state = addAll(createInitialState(container1280x720), [
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
    ]);
    const slotP1 = state.slotMap['p1'];
    const slotP2 = state.slotMap['p2'];
    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('p3', 'passive-no-camera')});
    expect(state.slotMap['p1']).toBe(slotP1);
    expect(state.slotMap['p2']).toBe(slotP2);
    expect(state.slotMap['p3']).toBeGreaterThan(state.slotMap['p2']);
  });

  it('screen-sharing always has a lower slot than active-camera', () => {
    const state = addAll(createInitialState(container1280x720), [
      makeParticipant('cam1', 'active-camera'),
      makeParticipant('screen1', 'screen-sharing'),
    ]);
    expect(state.slotMap['screen1']).toBeLessThan(state.slotMap['cam1']);
  });
});

// ── _computeLayout internal ───────────────────────────────────────────────────

describe('_computeLayout internal', () => {
  it('empty participant list returns empty rows', () => {
    const layout = _computeLayout([], {}, container1280x720, DEFAULT_CONFIG);
    expect(layout.rows).toHaveLength(0);
  });

  it('single active participant produces one full tile in one row', () => {
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

  it('tileAspectRatio equals the target midpoint of min and max AR', () => {
    const p = makeParticipant('a', 'active-camera');
    const layout = _computeLayout([p], {a: 0}, container1280x720, DEFAULT_CONFIG);
    const targetAR = (DEFAULT_CONFIG.minAspectRatio + DEFAULT_CONFIG.maxAspectRatio) / 2;
    expect(layout.tileAspectRatio).toBeCloseTo(targetAR, 5);
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

  it('new participant appended after existing peers in same tier', () => {
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
});

// ── Passive sub-prioritisation (camera-on > camera-off in overflow) ───────────
//
// Rules:
//   1. Participant already in a subtile turns camera on → stays in subtile,
//      position unchanged (slot order within the visible set is preserved).
//   2. Participant in overflow turns camera on → gets a subtile slot, displacing
//      the lowest-priority (camera-off) participant visible in the tile.
//   3. Without overflow the camera state of passives has no effect on ordering.

describe('passive sub-prioritisation', () => {
  // Use a tiny config so overflow is easy to trigger:
  // maxSubRows=1, maxSubCols=2 → fractCap=2 → visibleCount=1, overflow at ≥3 passives.
  const tinyConfig: GridConfig = {
    ...DEFAULT_CONFIG,
    maxSubRows: 1,
    maxSubCols: 2,
  };
  const tinyReducer = createGridReducer(tinyConfig);

  function subtileIds(state: GridState): string[] {
    return (
      fractionalTile(state)
        ?.subtiles.filter(s => s.type === 'participant')
        .map(s => s.participant!.id) ?? []
    );
  }

  function overflowAvatarIds(state: GridState): string[] {
    const ov = fractionalTile(state)?.subtiles.find(s => s.type === 'overflow');
    return ov?.avatars.map(p => p.id) ?? [];
  }

  function addAllTiny(participants: GridParticipant[]): GridState {
    return participants.reduce(
      (s, p) => tinyReducer(s, {type: 'ADD_PARTICIPANT', participant: p}),
      createInitialState(container1280x720),
    );
  }

  // ── Rule 1: already visible, turns camera on → stays visible, same position ──

  it('passive in subtile that turns camera on stays in the same subtile position', () => {
    // fractCap=2, 2 passives — no overflow, both visible
    let state = addAllTiny([
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
    ]);
    const positionBefore = subtileIds(state).indexOf('p1');

    state = tinyReducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'p1',
      changes: {tier: 'passive-camera'},
    });

    expect(subtileIds(state)).toContain('p1');
    expect(subtileIds(state).indexOf('p1')).toBe(positionBefore);
  });

  it('passive in subtile that turns camera on does not displace another visible participant', () => {
    // 2 passives, no overflow — both should remain visible after tier change
    let state = addAllTiny([
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
    ]);
    state = tinyReducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'p1',
      changes: {tier: 'passive-camera'},
    });
    expect(subtileIds(state)).toContain('p1');
    expect(subtileIds(state)).toContain('p2');
  });

  // ── Rule 2: overflow + turns camera on → bumps into visible ──────────────────

  it('passive in overflow that turns camera on gets a subtile slot', () => {
    // fractCap=2: 3 passives → visibleCount=1, 2 hidden in overflow
    // p1 slot=lowest → visible; p2, p3 → overflow
    let state = addAllTiny([
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'), // slot 0 (added first)
      makeParticipant('p2', 'passive-no-camera'), // slot 1
      makeParticipant('p3', 'passive-no-camera'), // slot 2
    ]);
    // p1 visible, p2+p3 in overflow
    expect(subtileIds(state)).toContain('p1');
    expect(subtileIds(state)).not.toContain('p3');

    // p3 turns camera on → should get a visible slot (over p1 which is camera-off)
    state = tinyReducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'p3',
      changes: {tier: 'passive-camera'},
    });

    expect(subtileIds(state)).toContain('p3');
  });

  it('camera-off participant is displaced to overflow when a camera-on participant takes its slot', () => {
    // p1 visible (cam-off), p2 + p3 overflow. p3 turns cam-on → p3 visible, p1 → overflow
    let state = addAllTiny([
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
      makeParticipant('p3', 'passive-no-camera'),
    ]);
    state = tinyReducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'p3',
      changes: {tier: 'passive-camera'},
    });

    // p3 (cam-on) now visible; p1 (cam-off, was visible) now in overflow
    expect(subtileIds(state)).toContain('p3');
    expect(subtileIds(state)).not.toContain('p1');
    expect(overflowAvatarIds(state)).toContain('p1');
  });

  it('overflow count decreases by 1 when a camera-on passive bumps in', () => {
    let state = addAllTiny([
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
      makeParticipant('p3', 'passive-no-camera'),
    ]);
    const overflowBefore = fractionalTile(state)?.subtiles.find(s => s.type === 'overflow')?.count ?? 0;

    state = tinyReducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'p3',
      changes: {tier: 'passive-camera'},
    });

    const overflowAfter = fractionalTile(state)?.subtiles.find(s => s.type === 'overflow')?.count ?? 0;
    // p3 moved from overflow to visible; p1 moved from visible to overflow → net change = 0
    expect(overflowAfter).toBe(overflowBefore);
  });

  it('camera-on passive in overflow does NOT bump another camera-on visible participant', () => {
    // p1 visible (cam-on), p2 overflow (cam-off), p3 overflow (cam-off)
    // p3 turns cam-on → p3 is cam-on, p1 is already cam-on: no free cam-off slot to displace
    let state = addAllTiny([
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-camera'),  // cam-on, visible
      makeParticipant('p2', 'passive-no-camera'),
      makeParticipant('p3', 'passive-no-camera'),
    ]);
    // p1 visible (cam-on), p2 or p3 in overflow
    expect(subtileIds(state)).toContain('p1');

    state = tinyReducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'p3',
      changes: {tier: 'passive-camera'},
    });

    // p1 should still be visible (it's cam-on, not displaceable by another cam-on)
    expect(subtileIds(state)).toContain('p1');
  });

  // ── Rule 3: no overflow → camera state has no effect on ordering ─────────────

  it('without overflow, camera state does not affect subtile order', () => {
    // 2 passives fit in fractCap=2 — no overflow
    // p1 and p2 share the same slot group regardless of camera state,
    // so add order (slot order) determines position: p1 before p2.
    const state = addAllTiny([
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'), // added first → lower slot
      makeParticipant('p2', 'passive-camera'),    // added second → higher slot
    ]);
    const ids = subtileIds(state);
    expect(ids[0]).toBe('p1');
    expect(ids[1]).toBe('p2');
  });

  it('without overflow, turning camera on does not reorder subtiles', () => {
    let state = addAllTiny([
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
    ]);
    const orderBefore = subtileIds(state);

    state = tinyReducer(state, {
      type: 'UPDATE_PARTICIPANT',
      id: 'p2',
      changes: {tier: 'passive-camera'},
    });

    expect(subtileIds(state)).toEqual(orderBefore);
  });
});
