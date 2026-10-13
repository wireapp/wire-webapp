import {
  AssignmentMap,
  ContainerSize,
  GridConfig,
  GridLayout,
  GridModeLayout,
  GridParticipant,
  isActiveTier,
  OneOnOneLayout,
  SlotMap,
  TileDescriptor,
} from './FluidVideoGrid.types';
import {computeFractionalContainerLayout} from './fractionalContainerLayout';
import {computeLayoutCapacity, computeTileDimensions, LayoutCapacity} from './gridGeometry';
import {computePresenterLayout} from './presenterLayout';
import {assignFullTiles, sortBySlotOrder} from './seatAssignment';

export interface LayoutResult {
  layout: GridLayout;
  assignmentMap: AssignmentMap;
}

/** Picks the layout mode the current call warrants, and computes it. */
export function computeLayout(
  participants: GridParticipant[],
  slotOrder: SlotMap,
  containerSize: ContainerSize,
  config: GridConfig,
  isPresenterModeActive = false,
  previousAssignment: AssignmentMap = {},
): LayoutResult {
  const capacity = computeLayoutCapacity(containerSize, config);
  if (capacity === null) {
    return {layout: emptyLayout(null), assignmentMap: {}};
  }

  const participantsBySlot = sortBySlotOrder(participants, slotOrder);

  if (participantsBySlot.length === 0) {
    return {layout: emptyLayout(capacity), assignmentMap: {}};
  }

  if (isPresenterModeActive) {
    return {
      layout: computePresenterLayout(participantsBySlot, capacity, config),
      assignmentMap: previousAssignment,
    };
  }

  // A solo participant always gets one big tile — nobody competes for the space. The seat is
  // still recorded so a newcomer joining right after doesn't displace them.
  if (participantsBySlot.length === 1) {
    const [soloParticipant] = participantsBySlot;
    return {
      layout: soloLayout(soloParticipant, capacity, config),
      assignmentMap: {[soloParticipant.id]: {kind: 'full', seatIndex: 0}},
    };
  }

  const oneOnOne = tryOneOnOneLayout(participantsBySlot, capacity);
  if (oneOnOne) {
    return {
      layout: oneOnOne.layout,
      assignmentMap: {...previousAssignment, ...oneOnOne.assignmentMap},
    };
  }

  return tiledGridLayout(participantsBySlot, slotOrder, capacity, config, previousAssignment);
}

// ── Full-tile count ──────────────────────────────────────────────────────────

export interface FullTileCount {
  fullTileCount: number;
  needsFractionalContainer: boolean;
}

/**
 * Active participants earn full tiles; passive ones always go to the fractional container.
 *
 * One full tile is given up only when active participants alone would occupy every slot the
 * grid can hold — the single case where the mandatory container has nowhere left to go. Below
 * that ceiling the container is sized as one more grid unit, and the shape search always finds
 * room for it without demoting anyone.
 */
export function countFullTiles(
  activeCount: number,
  passiveCount: number,
  capacity: LayoutCapacity,
): FullTileCount {
  if (activeCount + passiveCount === 0) {
    return {fullTileCount: 0, needsFractionalContainer: false};
  }

  const seatedActiveCount = Math.min(activeCount, capacity.maxTiles);
  const needsFractionalContainer = passiveCount > 0 || activeCount > seatedActiveCount;
  const gridIsSaturated = seatedActiveCount >= capacity.maxTiles;

  return {
    fullTileCount:
      needsFractionalContainer && gridIsSaturated ? seatedActiveCount - 1 : seatedActiveCount,
    needsFractionalContainer,
  };
}

// ── Tiled grid ───────────────────────────────────────────────────────────────

function tiledGridLayout(
  participantsBySlot: GridParticipant[],
  slotOrder: SlotMap,
  capacity: LayoutCapacity,
  config: GridConfig,
  previousAssignment: AssignmentMap,
): LayoutResult {
  const activeCount = participantsBySlot.filter(participant => isActiveTier(participant.tier)).length;
  const {fullTileCount, needsFractionalContainer} = countFullTiles(
    activeCount,
    participantsBySlot.length - activeCount,
    capacity,
  );

  const {occupants, assignmentMap} = assignFullTiles(
    participantsBySlot,
    fullTileCount,
    previousAssignment,
    slotOrder,
  );

  const seatedIds = new Set(occupants.map(participant => participant.id));
  const fractionalParticipants = needsFractionalContainer
    ? participantsBySlot.filter(participant => !seatedIds.has(participant.id))
    : [];

  // The container competes for space as one more grid unit — otherwise a single full tile would
  // claim the entire grid height, leaving the container nowhere to go.
  const gridUnitCount = Math.max(1, fullTileCount + (fractionalParticipants.length > 0 ? 1 : 0));
  const fullTile = computeTileDimensions(gridUnitCount, capacity, config);

  const fractional =
    fractionalParticipants.length > 0
      ? computeFractionalContainerLayout(fractionalParticipants, fullTileCount, fullTile, config)
      : null;

  const tiles: TileDescriptor[] = [
    ...occupants.map(participant => ({type: 'full' as const, participant})),
    ...(fractional ? [fractional.tile] : []),
  ];

  return {
    layout: {
      ...emptyLayout(capacity),
      maxFractionalTilesPerContainer: fractional?.capacity ?? 0,
      tiles,
      tileWidth: fullTile.width,
      tileHeight: fullTile.height,
      tileAspectRatio: fullTile.width / fullTile.height,
      fractionalTileWidth: fractional?.cellWidth ?? null,
      fractionalTileHeight: fractional?.cellHeight ?? null,
      fractionalTileAspectRatio: fractional ? fractional.cellWidth / fractional.cellHeight : null,
      fractionalContainerWidth: fractional?.width ?? null,
      fractionalContainerHeight: fractional?.height ?? null,
    },
    assignmentMap,
  };
}

// ── Small-call layouts ───────────────────────────────────────────────────────

function soloLayout(
  participant: GridParticipant,
  capacity: LayoutCapacity,
  config: GridConfig,
): GridModeLayout {
  const {width, height} = computeTileDimensions(1, capacity, config);

  return {
    ...emptyLayout(capacity),
    tiles: [{type: 'full', participant}],
    tileWidth: width,
    tileHeight: height,
    tileAspectRatio: width / height,
  };
}

/**
 * Two people always use the one-on-one template: the other participant fills the stage, self
 * overlays as a thumbnail. Falls through to the general grid when neither is flagged as self.
 */
function tryOneOnOneLayout(
  participantsBySlot: GridParticipant[],
  capacity: LayoutCapacity,
): {layout: OneOnOneLayout; assignmentMap: AssignmentMap} | null {
  if (participantsBySlot.length !== 2) {
    return null;
  }

  const self = participantsBySlot.find(participant => participant.isSelf);
  const other = participantsBySlot.find(participant => participant !== self);
  if (!self || !other) {
    return null;
  }

  return {
    layout: {
      mode: 'one-on-one',
      maxRows: capacity.maxRows,
      maxCols: capacity.maxCols,
      maxTiles: capacity.maxTiles,
      maxFractionalTilesPerContainer: 0,
      main: {type: 'full', participant: other},
      pip: self,
    },
    assignmentMap: {[other.id]: {kind: 'full', seatIndex: 0}},
  };
}

export function emptyLayout(capacity: LayoutCapacity | null): GridModeLayout {
  return {
    mode: 'grid',
    maxRows: capacity?.maxRows ?? 0,
    maxCols: capacity?.maxCols ?? 0,
    maxTiles: capacity?.maxTiles ?? 0,
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
