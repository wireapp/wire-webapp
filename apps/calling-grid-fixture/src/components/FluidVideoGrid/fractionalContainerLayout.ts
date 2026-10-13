import {
  FractionalContainerTile,
  FractionalTileDescriptor,
  GridConfig,
  GridParticipant,
} from './FluidVideoGrid.types';
import {
  computeFractionalTileSize,
  countThatFit,
  FractionalTileSize,
  sizeToExactlyFill,
  spanOf,
} from './gridGeometry';
import {splitForCapacity} from './overflowBadge';

export interface FractionalContainerLayout {
  tile: FractionalContainerTile;
  cellWidth: number;
  cellHeight: number;
  width: number;
  height: number;
  capacity: number;
}

export interface FullTileGeometry {
  rows: number;
  cols: number;
  width: number;
  height: number;
}

/**
 * The container sits either beside leftover full tiles in their row, or alone on a row of its
 * own — which decides how it fills and how wide it may grow.
 */
export function computeFractionalContainerLayout(
  participants: GridParticipant[],
  fullTileCount: number,
  fullTile: FullTileGeometry,
  config: GridConfig,
): FractionalContainerLayout {
  const cellSize = computeFractionalTileSize(fullTile.height, config);
  const leftoverFullTilesInLastRow = fullTileCount === 0 ? 0 : fullTileCount % fullTile.cols;

  return leftoverFullTilesInLastRow > 0
    ? besideFullTiles(participants, leftoverFullTilesInLastRow, fullTileCount, fullTile, cellSize, config)
    : onOwnRow(participants, fullTile, cellSize, config);
}

/**
 * Sharing a row with full tiles: fills column-major, bounded by the width actually left in that
 * row — not the whole grid width, which would let it wrap onto a new full-height line and blow
 * out the total content height.
 */
function besideFullTiles(
  participants: GridParticipant[],
  leftoverFullTilesInLastRow: number,
  fullTileCount: number,
  fullTile: FullTileGeometry,
  cellSize: FractionalTileSize,
  config: GridConfig,
): FractionalContainerLayout {
  const {tileGap} = config;

  const freeSlotsInRow = fullTile.cols - leftoverFullTilesInLastRow;
  const availableWidth = spanOf(freeSlotsInRow, fullTile.width, tileGap);
  const maxCols = countThatFit(availableWidth, cellSize.width, tileGap);
  const capacity = maxCols * cellSize.rowsPerContainer;

  const {tiles, visibleCount} = buildTiles(participants, capacity);
  const usedCols = Math.max(1, Math.ceil(visibleCount / cellSize.rowsPerContainer));

  // At max columns, stretch cells to divide the available width exactly: `maxCols` is a floor,
  // so the few leftover px would otherwise leave this row's edges sitting inside the full-tile
  // rows above. Below max columns the container simply hugs its content.
  const isAtMaxColumns = usedCols >= maxCols;
  const cellWidth = isAtMaxColumns ? sizeToExactlyFill(availableWidth, maxCols, tileGap) : cellSize.width;

  return {
    tile: {
      type: 'fractional',
      fractionalTiles: tiles,
      fillDirection: 'column',
      // Alone in its row the content centers; with full-tile rows above it top-aligns, reading
      // consistently with tiles flowing top-to-bottom.
      align: fullTileCount < fullTile.cols ? 'center' : 'start',
    },
    cellWidth,
    cellHeight: cellSize.height,
    width: isAtMaxColumns ? availableWidth : spanOf(usedCols, cellWidth, tileGap),
    // Always matches the full tiles it shares the row with, whatever the fill level.
    height: fullTile.height,
    capacity,
  };
}

/**
 * A row to itself: behaves like a miniature grid, row-major and exactly as wide as any
 * full-tile row, keeping its edges flush with the rows above and below.
 */
function onOwnRow(
  participants: GridParticipant[],
  fullTile: FullTileGeometry,
  cellSize: FractionalTileSize,
  config: GridConfig,
): FractionalContainerLayout {
  const {tileGap} = config;

  const width = spanOf(fullTile.cols, fullTile.width, tileGap);
  const maxCols = countThatFit(width, cellSize.width, tileGap);
  const maxRows = countThatFit(fullTile.height, cellSize.height, tileGap);
  const capacity = maxCols * maxRows;

  const {tiles, visibleCount} = buildTiles(participants, capacity);
  const usedRows = Math.max(1, Math.ceil(visibleCount / maxCols));

  return {
    tile: {type: 'fractional', fractionalTiles: tiles, fillDirection: 'row', align: 'center'},
    // Stretched to divide the row exactly, so a fully-packed row reaches both edges instead of
    // leaving a symmetric inset once centered.
    cellWidth: sizeToExactlyFill(width, maxCols, tileGap),
    cellHeight: cellSize.height,
    width,
    height: spanOf(usedRows, cellSize.height, tileGap),
    capacity,
  };
}

function buildTiles(
  participants: GridParticipant[],
  capacity: number,
): {tiles: FractionalTileDescriptor[]; visibleCount: number} {
  const {visible, badge} = splitForCapacity(participants, capacity);

  const tiles: FractionalTileDescriptor[] = visible.map(participant => ({
    type: 'participant',
    participant,
  }));
  if (badge) {
    tiles.push(badge);
  }

  return {tiles, visibleCount: visible.length};
}
