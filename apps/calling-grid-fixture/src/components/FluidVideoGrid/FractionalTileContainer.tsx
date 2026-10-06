import {FractionalTileDescriptor} from './FluidVideoGrid.types';
import {FractionalTile} from './FractionalTile';
import {OverflowTile} from './OverflowTile';

interface FractionalTileContainerProps {
  fractionalTiles: FractionalTileDescriptor[];
  /** Fixed pixel size of a single fractional tile — every cell renders at exactly this size. */
  tileWidth: number;
  tileHeight: number;
  /**
   * The container's own box — may be larger than its hugged content when sharing a row with
   * full tiles: either squeezed to exactly one full-tile-width slot while at full capacity
   * (box wider than content), or forced to `tileHeight` while under-filled, since it must
   * align with the row regardless of how little is inside (box taller than content). `align`
   * controls whether that extra space centers the content or leaves it top/left-aligned; when
   * the box matches its content exactly (the common case), it has no visible effect.
   */
  boxWidth: number;
  boxHeight: number;
  /** `'column'` fills top-to-bottom then wraps right; `'row'` fills left-to-right then wraps down. */
  fillDirection: 'row' | 'column';
  align: 'center' | 'start';
  gap: number;
}

/**
 * Holds every fractional tile for one row. Only the individual tile size and the
 * container's own box (computed in the reducer) are fixed; everything else — how many
 * lines are needed, where each tile lands — is left to CSS flex-wrap in the given
 * `fillDirection`, with no row/column index math needed here.
 */
export function FractionalTileContainer({
  fractionalTiles,
  tileWidth,
  tileHeight,
  boxWidth,
  boxHeight,
  fillDirection,
  align,
  gap,
}: FractionalTileContainerProps) {
  const justify = align === 'center' ? 'center' : 'flex-start';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: fillDirection,
        flexWrap: 'wrap',
        alignContent: justify,
        justifyContent: justify,
        width: boxWidth,
        height: boxHeight,
        gap,
      }}
    >
      {fractionalTiles.map(entry => (
        <div
          key={entry.type === 'overflow' ? 'overflow' : entry.participant.id}
          style={{width: tileWidth, height: tileHeight, flexShrink: 0, position: 'relative'}}
        >
          {entry.type === 'overflow' ? (
            <OverflowTile count={entry.count} avatars={entry.avatars} />
          ) : (
            <FractionalTile participant={entry.participant} />
          )}
        </div>
      ))}
    </div>
  );
}
