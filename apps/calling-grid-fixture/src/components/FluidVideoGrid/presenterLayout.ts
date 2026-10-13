import {GridConfig, GridParticipant, PresenterModeLayout, TileDescriptor} from './FluidVideoGrid.types';
import {countThatFit, LayoutCapacity, sizeToExactlyFill} from './gridGeometry';
import {splitForCapacity} from './overflowBadge';

/**
 * The spotlight is a single prime seat, so it always tracks the most relevant participant with
 * no incumbency protection. Priority falls through screen-sharing, then speaking, then
 * camera-on, each considered only when the tiers above it are empty; within a tier the most
 * recently active wins. With several simultaneous screen shares this gives stack behaviour —
 * when the newest sharer stops, the spotlight falls back to the next most recent.
 */
function selectSpotlight(participants: GridParticipant[]): GridParticipant | null {
  if (participants.length === 0) {
    return null;
  }

  const inTiers = (...tiers: GridParticipant['tier'][]) =>
    participants.filter(participant => tiers.includes(participant.tier));

  const candidates =
    [
      inTiers('screen-sharing'),
      inTiers('speaking-camera', 'speaking-no-camera'),
      inTiers('silent-camera'),
    ].find(group => group.length > 0) ?? participants;

  return candidates.reduce((mostRecent, candidate) =>
    (candidate.activatedAt ?? 0) > (mostRecent.activatedAt ?? 0) ? candidate : mostRecent,
  );
}

/** The spotlight absorbs whatever the fixed-width strip beside it doesn't take. */
export function computePresenterLayout(
  participantsBySlot: GridParticipant[],
  capacity: LayoutCapacity,
  config: GridConfig,
): PresenterModeLayout {
  const {minTileHeight, minAspectRatio, maxAspectRatio, tileGap} = config;

  const stripTileWidth = Math.ceil(minTileHeight * minAspectRatio);
  const minStripTileHeight = stripTileWidth / maxAspectRatio;
  const maxStripTileHeight = stripTileWidth / minAspectRatio;

  const spotlight = selectSpotlight(participantsBySlot);
  const stripParticipants = participantsBySlot.filter(participant => participant !== spotlight);

  const maxStripTiles = countThatFit(capacity.usableHeight, minStripTileHeight, tileGap);
  const {visible, badge} = splitForCapacity(stripParticipants, maxStripTiles);

  const occupiedRows = visible.length + (badge ? 1 : 0);
  const stripTileHeight =
    occupiedRows > 0
      ? clamp(
          sizeToExactlyFill(capacity.usableHeight, occupiedRows, tileGap),
          minStripTileHeight,
          maxStripTileHeight,
        )
      : maxStripTileHeight;

  const strip: TileDescriptor[] = visible.map(participant => ({type: 'full', participant}));
  if (badge) {
    strip.push(badge);
  }

  return {
    mode: 'presenter',
    maxRows: capacity.maxRows,
    maxCols: capacity.maxCols,
    maxTiles: capacity.maxTiles,
    maxFractionalTilesPerContainer: 0,
    spotlight: spotlight ? {type: 'full', participant: spotlight} : null,
    strip,
    stripTileWidth,
    stripTileHeight,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
