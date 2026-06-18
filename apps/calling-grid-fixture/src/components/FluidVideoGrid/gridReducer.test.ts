import {GridConfig, GridParticipant, GridState, ParticipantTier} from './FluidVideoGrid.types';
import {createGridReducer, createInitialState, _updateSlotMap, _computeLayout} from './gridReducer';

const DEFAULT_CONFIG: GridConfig = {
  minTileHeight: 100,
  maxTileHeight: 600,
  minAspectRatio: 1.33,
  maxAspectRatio: 1.78,
  maxSubtilesPerTile: 6,
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

// ── ADD_PARTICIPANT ────────────────────────────────────────────────────────────

describe('ADD_PARTICIPANT', () => {
  it('adds participant and recalculates layout', () => {
    const state = createInitialState(container1280x720);
    const next = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a', 'active-camera')});
    expect(next.participants).toHaveLength(1);
    expect(next.layout.cells).toHaveLength(1);
    expect(next.layout.cells[0].type).toBe('active');
  });

  it('is idempotent — duplicate id is ignored', () => {
    const state = createInitialState(container1280x720);
    const s1 = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a')});
    const s2 = reducer(s1, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a')});
    expect(s2.participants).toHaveLength(1);
  });

  it('screen-sharing participant lands in first cell', () => {
    let state = createInitialState(container1280x720);
    state = addAll(state, [
      makeParticipant('passive1', 'passive-no-camera'),
      makeParticipant('screen1', 'screen-sharing'),
    ]);
    const activeCell = state.layout.cells.find(c => c.type === 'active');
    expect(activeCell?.participant?.id).toBe('screen1');
  });

  it('passive participant goes into a fractional cell', () => {
    let state = createInitialState(container1280x720);
    state = addAll(state, [makeParticipant('active1', 'active-camera'), makeParticipant('passive1', 'passive-no-camera')]);

    const fractional = state.layout.cells.find(c => c.type === 'fractional');
    expect(fractional).toBeDefined();
    expect(fractional?.subtiles?.[0].participant?.id).toBe('passive1');
  });

  it('multiple screen-sharing participants each get their own active cell', () => {
    const state = createInitialState(container1280x720);
    const next = addAll(state, [
      makeParticipant('s1', 'screen-sharing'),
      makeParticipant('s2', 'screen-sharing'),
    ]);
    const activeCells = next.layout.cells.filter(c => c.type === 'active');
    expect(activeCells).toHaveLength(2);
    const ids = activeCells.map(c => c.participant?.id);
    expect(ids).toContain('s1');
    expect(ids).toContain('s2');
  });
});

// ── REMOVE_PARTICIPANT ─────────────────────────────────────────────────────────

describe('REMOVE_PARTICIPANT', () => {
  it('removes participant and recalculates layout', () => {
    let state = createInitialState(container1280x720);
    state = addAll(state, [makeParticipant('a', 'active-camera'), makeParticipant('b', 'passive-no-camera')]);
    const next = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a'});
    expect(next.participants).toHaveLength(1);
    expect(next.participants[0].id).toBe('b');
  });

  it('removing unknown id is a no-op', () => {
    const state = createInitialState(container1280x720);
    const s1 = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('a')});
    const s2 = reducer(s1, {type: 'REMOVE_PARTICIPANT', id: 'unknown'});
    expect(s2.participants).toHaveLength(1);
  });

  it('cleans up slot map for removed participant', () => {
    let state = createInitialState(container1280x720);
    state = addAll(state, [makeParticipant('a'), makeParticipant('b')]);
    const next = reducer(state, {type: 'REMOVE_PARTICIPANT', id: 'a'});
    expect(next.slotMap['a']).toBeUndefined();
    expect(next.slotMap['b']).toBeDefined();
  });
});

// ── UPDATE_PARTICIPANT — tier upgrade ─────────────────────────────────────────

describe('UPDATE_PARTICIPANT — tier upgrade', () => {
  it('passive→active-camera: participant appears in active cell', () => {
    let state = createInitialState(container1280x720);
    state = addAll(state, [makeParticipant('active1', 'active-camera'), makeParticipant('lazy', 'passive-no-camera')]);

    const upgraded = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'lazy', changes: {tier: 'active-camera'}});
    const activeCells = upgraded.layout.cells.filter(c => c.type === 'active');
    const activeIds = activeCells.map(c => c.participant?.id);
    expect(activeIds).toContain('lazy');
  });

  it('previously passive participant no longer appears in any fractional cell after upgrade', () => {
    let state = createInitialState(container1280x720);
    state = addAll(state, [makeParticipant('a1', 'active-camera'), makeParticipant('lazy', 'passive-no-camera')]);

    const upgraded = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'lazy', changes: {tier: 'active-camera'}});
    const allSubtileIds = upgraded.layout.cells
      .filter(c => c.type === 'fractional')
      .flatMap(c => c.subtiles ?? [])
      .filter(s => s.type === 'participant')
      .map(s => s.participant?.id);
    expect(allSubtileIds).not.toContain('lazy');
  });

  it('unchanged participants keep their slot indices after an upgrade', () => {
    let state = createInitialState(container1280x720);
    state = addAll(state, [
      makeParticipant('a1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
    ]);
    const slotBefore = state.slotMap['a1'];
    const upgraded = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'p1', changes: {tier: 'active-camera'}});
    // a1 is in a higher-priority tier than p1 was, so its slot should stay at 0
    expect(upgraded.slotMap['a1']).toBe(slotBefore);
  });
});

// ── UPDATE_PARTICIPANT — tier downgrade ────────────────────────────────────────

describe('UPDATE_PARTICIPANT — tier downgrade', () => {
  it('active→passive: vacated active cell is gone; participant goes to fractional', () => {
    let state = createInitialState(container1280x720);
    state = addAll(state, [makeParticipant('a1', 'active-camera')]);

    const downgraded = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'a1', changes: {tier: 'passive-no-camera'}});
    const activeCells = downgraded.layout.cells.filter(c => c.type === 'active');
    const fractionalCells = downgraded.layout.cells.filter(c => c.type === 'fractional');
    expect(activeCells).toHaveLength(0);
    expect(fractionalCells.some(c => c.subtiles?.some(s => s.participant?.id === 'a1'))).toBe(true);
  });

  it('screen-sharing→passive-no-camera: no longer gets a full tile', () => {
    let state = createInitialState(container1280x720);
    state = addAll(state, [makeParticipant('screener', 'screen-sharing')]);
    const next = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'screener', changes: {tier: 'passive-no-camera'}});
    const activeCells = next.layout.cells.filter(c => c.type === 'active');
    expect(activeCells.every(c => c.participant?.id !== 'screener')).toBe(true);
  });
});

// ── Overflow tile ──────────────────────────────────────────────────────────────

describe('overflow', () => {
  const SMALL_CONTAINER = {width: 400, height: 300};
  const smallConfig: GridConfig = {...DEFAULT_CONFIG, maxSubtilesPerTile: 2};
  const smallReducer = createGridReducer(smallConfig);

  function buildOverflowState(): GridState {
    let state = createInitialState(SMALL_CONTAINER);
    // 1 active + 3 passives, but max 2 subtiles per tile → only 1 fractional tile → 2 slots
    // 2nd slot becomes overflow when passives > 1
    state = [
      makeParticipant('active1', 'active-camera'),
      makeParticipant('p1', 'passive-no-camera'),
      makeParticipant('p2', 'passive-no-camera'),
      makeParticipant('p3', 'passive-no-camera'),
    ].reduce((s, p) => smallReducer(s, {type: 'ADD_PARTICIPANT', participant: p}), state);
    return state;
  }

  it('shows overflow tile when passive participants exceed available subtile slots', () => {
    const state = buildOverflowState();
    const overflow = state.layout.cells
      .filter(c => c.type === 'fractional')
      .flatMap(c => c.subtiles ?? [])
      .find(s => s.type === 'overflow');
    expect(overflow).toBeDefined();
  });

  it('overflow tile reports the correct count of hidden participants', () => {
    const state = buildOverflowState();
    const overflow = state.layout.cells
      .filter(c => c.type === 'fractional')
      .flatMap(c => c.subtiles ?? [])
      .find(s => s.type === 'overflow');
    // 3 passives, 2 slots (maxSubtilesPerTile=2): 1 visible + 1 overflow showing 2 hidden
    expect(overflow?.overflowCount).toBe(2);
  });

  it('overflow tile carries up to 3 avatar references', () => {
    const state = buildOverflowState();
    const overflow = state.layout.cells
      .filter(c => c.type === 'fractional')
      .flatMap(c => c.subtiles ?? [])
      .find(s => s.type === 'overflow');
    expect((overflow?.overflowAvatars?.length ?? 0)).toBeLessThanOrEqual(3);
    expect((overflow?.overflowAvatars?.length ?? 0)).toBeGreaterThan(0);
  });

  it('adding one more passive participant increases overflow count by 1', () => {
    const state = buildOverflowState();
    const countBefore = state.layout.cells
      .flatMap(c => c.subtiles ?? [])
      .find(s => s.type === 'overflow')?.overflowCount ?? 0;

    const next = smallReducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('p4', 'passive-no-camera')});
    const countAfter = next.layout.cells
      .flatMap(c => c.subtiles ?? [])
      .find(s => s.type === 'overflow')?.overflowCount ?? 0;

    expect(countAfter).toBe(countBefore + 1);
  });

  it('no overflow tile when all passive participants fit in available subtile slots', () => {
    const config2: GridConfig = {...DEFAULT_CONFIG, maxSubtilesPerTile: 6};
    const r = createGridReducer(config2);
    let state = createInitialState(container1280x720);
    // Add 1 active + 5 passives — should fit in one fractional tile (6 slots)
    state = addAll(state, [
      makeParticipant('a1', 'active-camera'),
      ...Array.from({length: 5}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera')),
    ]);
    const overflow = state.layout.cells
      .flatMap(c => c.subtiles ?? [])
      .find(s => s.type === 'overflow');
    expect(overflow).toBeUndefined();
  });
});

// ── SET_CONTAINER_SIZE ────────────────────────────────────────────────────────

describe('SET_CONTAINER_SIZE', () => {
  it('recalculates layout without touching participant list or slot map', () => {
    let state = createInitialState(container1280x720);
    state = addAll(state, [makeParticipant('a', 'active-camera'), makeParticipant('b', 'passive-no-camera')]);
    const slotBefore = {...state.slotMap};

    const next = reducer(state, {type: 'SET_CONTAINER_SIZE', width: 640, height: 480});
    expect(next.participants).toHaveLength(2);
    expect(next.slotMap).toEqual(slotBefore);
    expect(next.containerSize).toEqual({width: 640, height: 480});
  });

  it('tile height stays within configured bounds after resize', () => {
    const config: GridConfig = {
      minTileHeight: 80,
      maxTileHeight: 400,
      minAspectRatio: 1.33,
      maxAspectRatio: 1.78,
      maxSubtilesPerTile: 6,
      tileGap: 4,
    };
    const r = createGridReducer(config);
    let state = createInitialState({width: 1920, height: 1080});
    state = addAll(state, [makeParticipant('a', 'active-camera')]);

    state = r(state, {type: 'SET_CONTAINER_SIZE', width: 320, height: 240});
    expect(state.layout.tileHeight).toBeGreaterThanOrEqual(config.minTileHeight);
    expect(state.layout.tileHeight).toBeLessThanOrEqual(config.maxTileHeight);
  });

  it('very small container (below minTileHeight) still produces a valid layout', () => {
    let state = createInitialState({width: 50, height: 50});
    state = addAll(state, [makeParticipant('a', 'active-camera')]);
    // Should not throw; may produce empty layout or single cell
    expect(Array.isArray(state.layout.cells)).toBe(true);
  });
});

// ── Stable slot assignment ─────────────────────────────────────────────────────

describe('stable slot assignment', () => {
  it('participant keeps its slot when tier is unchanged', () => {
    let state = createInitialState(container1280x720);
    state = addAll(state, [makeParticipant('a', 'active-camera'), makeParticipant('b', 'passive-no-camera')]);
    const slotA = state.slotMap['a'];
    const slotB = state.slotMap['b'];

    // Update something other than tier
    const next = reducer(state, {type: 'UPDATE_PARTICIPANT', id: 'b', changes: {isMuted: true}});
    expect(next.slotMap['a']).toBe(slotA);
    expect(next.slotMap['b']).toBe(slotB);
  });

  it('relative order within a tier is preserved when a third participant is added', () => {
    let state = createInitialState(container1280x720);
    state = addAll(state, [makeParticipant('p1', 'passive-no-camera'), makeParticipant('p2', 'passive-no-camera')]);
    const slotP1Before = state.slotMap['p1'];
    const slotP2Before = state.slotMap['p2'];

    state = reducer(state, {type: 'ADD_PARTICIPANT', participant: makeParticipant('p3', 'passive-no-camera')});

    expect(state.slotMap['p1']).toBe(slotP1Before);
    expect(state.slotMap['p2']).toBe(slotP2Before);
    expect(state.slotMap['p3']).toBeGreaterThan(state.slotMap['p2']);
  });

  it('screen-sharing always has a lower slot than active-camera', () => {
    let state = createInitialState(container1280x720);
    state = addAll(state, [
      makeParticipant('cam1', 'active-camera'),
      makeParticipant('screen1', 'screen-sharing'),
    ]);
    expect(state.slotMap['screen1']).toBeLessThan(state.slotMap['cam1']);
  });
});

// ── _computeLayout (internal, exported for testing) ───────────────────────────

describe('_computeLayout internal', () => {
  const config = DEFAULT_CONFIG;

  it('empty participant list returns empty cells', () => {
    const layout = _computeLayout([], {}, container1280x720, config);
    expect(layout.cells).toHaveLength(0);
  });

  it('single active participant produces one active cell', () => {
    const p = makeParticipant('a', 'active-camera');
    const layout = _computeLayout([p], {'a': 0}, container1280x720, config);
    expect(layout.cells).toHaveLength(1);
    expect(layout.cells[0].type).toBe('active');
    expect(layout.cells[0].participant?.id).toBe('a');
  });

  it('cols * rows <= container capacity does not produce more cells than available space', () => {
    const participants = Array.from({length: 20}, (_, i) => makeParticipant(`p${i}`, 'passive-no-camera'));
    const slotMap = Object.fromEntries(participants.map((p, i) => [p.id, i]));
    const layout = _computeLayout(participants, slotMap, container1280x720, config);
    expect(layout.cells.length).toBeLessThanOrEqual(layout.cols * layout.rows);
  });
});

// ── _updateSlotMap (internal, exported for testing) ───────────────────────────

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
