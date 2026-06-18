import type { GridConfig } from './components/FluidVideoGrid';

// ── Tile geometry constraints ─────────────────────────────────────────────────

export const MIN_TILE_HEIGHT = 120; // px
export const MAX_TILE_HEIGHT = 600; // px
export const MIN_ASPECT_RATIO = 0.67; // 4:3
export const MAX_ASPECT_RATIO = 1.78; // 16:9
export const MAX_SUBTILES_PER_TILE = 6; // passive participants per fractional tile
export const TILE_GAP = 4; // px
export const TRANSITION_DURATION_MS = 250;

export const GRID_CONFIG: GridConfig = {
  minTileHeight: MIN_TILE_HEIGHT,
  maxTileHeight: MAX_TILE_HEIGHT,
  minAspectRatio: MIN_ASPECT_RATIO,
  maxAspectRatio: MAX_ASPECT_RATIO,
  maxSubtilesPerTile: MAX_SUBTILES_PER_TILE,
  tileGap: TILE_GAP,
};

// ── Viewport configurations shown on the canvas ───────────────────────────────

export interface ViewportConfig {
  label: string;
  width: number;
  height: number;
}

export const VIEWPORT_CONFIGS: ViewportConfig[] = [
  { label: '1920×1080', width: 1920, height: 1080 },
  { label: '1280×720', width: 1280, height: 720 },
  { label: '960×540', width: 960, height: 540 },
  { label: '640×480', width: 640, height: 480 },
  { label: '360×640 portrait', width: 360, height: 640 },
];
