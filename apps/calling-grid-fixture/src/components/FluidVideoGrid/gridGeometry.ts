import {ContainerSize, GridConfig} from './FluidVideoGrid.types';

/** A fractional tile is at least half the height of a minimum-size full tile. */
const FRACTIONAL_TILE_HEIGHT_RATIO = 0.5;

/** Capacity bounds that depend only on the container and config — never on who is in the call. */
export interface LayoutCapacity {
  usableWidth: number;
  usableHeight: number;
  maxRows: number;
  maxCols: number;
  maxTiles: number;
}

export function computeLayoutCapacity(
  containerSize: ContainerSize,
  config: GridConfig,
): LayoutCapacity | null {
  const {minTileHeight, minAspectRatio, tileGap} = config;

  const usableWidth = containerSize.width - 2 * tileGap;
  const usableHeight = containerSize.height - 2 * tileGap;
  if (usableWidth <= 0 || usableHeight <= 0) {
    return null;
  }

  const minTileWidth = minTileHeight * minAspectRatio;
  const maxCols = countThatFit(usableWidth, minTileWidth, tileGap);
  const maxRows = countThatFit(usableHeight, minTileHeight, tileGap);

  return {usableWidth, usableHeight, maxCols, maxRows, maxTiles: maxRows * maxCols};
}

/** How many `itemSize`-wide items fit across `available`, separated by `gap`. */
export function countThatFit(available: number, itemSize: number, gap: number): number {
  return Math.max(1, Math.floor((available + gap) / (itemSize + gap)));
}

/** Total span of `count` items of `itemSize`, separated by `gap`. */
export function spanOf(count: number, itemSize: number, gap: number): number {
  return count * itemSize + Math.max(0, count - 1) * gap;
}

/** The item size that makes exactly `count` items span `available` with no leftover. */
export function sizeToExactlyFill(available: number, count: number, gap: number): number {
  return (available - gap * (count - 1)) / count;
}

export interface TileDimensions {
  rows: number;
  cols: number;
  width: number;
  height: number;
}

/**
 * Picks the (rows, cols) split for `tileCount` tiles yielding the largest tiles, preferring
 * shapes whose natural width already satisfies the minimum aspect ratio — those waste no
 * container space, so they win outright over merely-larger-area alternatives.
 */
export function computeTileDimensions(
  tileCount: number,
  capacity: LayoutCapacity,
  config: GridConfig,
): TileDimensions {
  let best: TileDimensions | null = null;
  let bestScore = -Infinity;

  for (let cols = 1; cols <= capacity.maxCols; cols++) {
    const rows = Math.ceil(tileCount / cols);
    if (rows > capacity.maxRows) {
      continue;
    }

    const {width, height, fitsWidthNaturally} = clampTileToConfig(rows, cols, capacity, config);
    const score = (fitsWidthNaturally ? 1e9 : 0) + width * height;

    if (score > bestScore) {
      bestScore = score;
      best = {rows, cols, width, height};
    }
  }

  if (best === null) {
    const cols = Math.min(tileCount, capacity.maxCols);
    const {width, height} = clampTileToConfig(1, cols, capacity, config);
    return {rows: 1, cols, width, height};
  }
  return best;
}

function clampTileToConfig(
  rows: number,
  cols: number,
  capacity: LayoutCapacity,
  config: GridConfig,
): {width: number; height: number; fitsWidthNaturally: boolean} {
  const {minTileHeight, maxTileHeight, minAspectRatio, maxAspectRatio, tileGap} = config;

  const naturalWidth = sizeToExactlyFill(capacity.usableWidth, cols, tileGap);
  const naturalHeight = sizeToExactlyFill(capacity.usableHeight, rows, tileGap);

  const height = clamp(naturalHeight, minTileHeight, maxTileHeight);
  const width = clamp(naturalWidth, height * minAspectRatio, height * maxAspectRatio);

  return {width, height, fitsWidthNaturally: naturalWidth >= height * minAspectRatio};
}

export interface FractionalTileSize {
  rowsPerContainer: number;
  width: number;
  height: number;
}

/**
 * The size of one fractional cell — a pure function of the full tile's height, so it stays
 * identical whether a column is half-filled or completely full. Height divides `fullTileHeight`
 * exactly; width uses a fixed aspect ratio rather than the full tile's own, which varies a lot
 * between grid shapes and would otherwise make cells balloon when the grid reconfigures.
 */
export function computeFractionalTileSize(
  fullTileHeight: number,
  config: GridConfig,
): FractionalTileSize {
  const {minTileHeight, minAspectRatio, maxAspectRatio, tileGap} = config;

  const minRatio = config.minFractionalTileAspectRatio ?? minAspectRatio;
  const maxRatio = config.maxFractionalTileAspectRatio ?? maxAspectRatio;
  const aspectRatio = (minRatio + maxRatio) / 2;

  const targetHeight = minTileHeight * FRACTIONAL_TILE_HEIGHT_RATIO;
  // Never a 1-way split: a fractional tile is never the size of a full tile.
  const rowsPerContainer = Math.max(2, Math.round((fullTileHeight + tileGap) / (targetHeight + tileGap)));
  const height = sizeToExactlyFill(fullTileHeight, rowsPerContainer, tileGap);

  return {rowsPerContainer, width: height * aspectRatio, height};
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
