import {FractionalContainerTile} from './FluidVideoGrid.types';
import * as styles from './FractionalTileContainer.styles';
import {OverflowTile} from './OverflowTile';
import {ParticipantTile} from './ParticipantTile';

interface FractionalTileContainerProps {
  tile: FractionalContainerTile;
  cellWidth: number;
  cellHeight: number;
  width: number;
  height: number;
  gap: number;
}

/**
 * Holds every fractional tile for one row. Only each cell's size and the container's own box
 * are fixed — how many lines are needed and where each cell lands is left to CSS flex-wrap.
 */
export function FractionalTileContainer({
  tile,
  cellWidth,
  cellHeight,
  width,
  height,
  gap,
}: FractionalTileContainerProps) {
  return (
    <div css={styles.container(tile.fillDirection, tile.align, width, height, gap)}>
      {tile.fractionalTiles.map(entry => (
        <div
          key={entry.type === 'overflow' ? 'overflow' : entry.participant.id}
          css={styles.cell(cellWidth, cellHeight)}
        >
          {entry.type === 'overflow' ? (
            <OverflowTile count={entry.count} avatars={entry.avatars} />
          ) : (
            <ParticipantTile participant={entry.participant} size="fractional" />
          )}
        </div>
      ))}
    </div>
  );
}
