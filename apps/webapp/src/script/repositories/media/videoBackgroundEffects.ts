/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

/**
 * Blur intensity level for background blur effects.
 */
export type BlurLevel = 'low' | 'high';

/**
 * Discriminated union type representing the selected background effect.
 *
 * Effect types:
 * - 'none': No background effect applied
 * - 'blur': Blur effect with specified intensity level
 * - 'virtual': Virtual background replacement with a builtin background image
 * - 'custom': Custom background (user-provided image/video)
 */
export type BackgroundEffectSelection =
  | {type: 'none'}
  | {type: 'blur'; level: BlurLevel}
  | {type: 'virtual'; backgroundId: string}
  | {type: 'custom'};

/**
 * Background source type for virtual background mode.
 *
 * Supports both HTMLImageElement (loaded images) and ImageBitmap (processed bitmaps).
 */
export type BackgroundSource = HTMLImageElement | ImageBitmap;

/**
 * Default background effect selection (no effect applied).
 */
export const DEFAULT_BACKGROUND_EFFECT: BackgroundEffectSelection = {type: 'none'};

/**
 * Blur strength values mapped to blur levels.
 *
 * Values range from 0.0 (no blur) to 1.0 (maximum blur). These are passed
 * directly to the background effects controller's blur strength parameter.
 */
export const BLUR_STRENGTHS: Record<BlurLevel, number> = {
  low: 0.7,
  high: 1.0,
};

type BuiltinBackgroundLabelKey =
  | 'videoCallBackgroundOffice1'
  | 'videoCallBackgroundOffice2'
  | 'videoCallBackgroundOffice3'
  | 'videoCallBackgroundOffice4'
  | 'videoCallBackgroundOffice5'
  | 'videoCallBackgroundWire1';

/**
 * Base definition for builtin background images.
 *
 * Contains metadata for a predefined background option available in the UI.
 */
type BuiltinBackgroundDefinition = {
  /** Unique identifier for the background. */
  id: string;
  /** Localization key for the background display name. */
  labelKey: BuiltinBackgroundLabelKey;
  /** URL path to the background image file. */
  imageUrl: string;
  /** Color palette used for gradient fallback if image fails to load. */
  previewColors: string[];
};

/**
 * Complete builtin background definition with computed preview gradient.
 *
 * Extends BuiltinBackgroundDefinition with a CSS gradient string generated
 * from the preview colors for use in UI preview tiles.
 */
export type BuiltinBackground = BuiltinBackgroundDefinition & {
  /** CSS linear gradient string generated from previewColors. */
  previewGradient: string;
};

/**
 * Builds a CSS linear gradient string from an array of color values.
 *
 * Creates a 135-degree diagonal gradient with evenly spaced color stops.
 *
 * @param colors - Array of CSS color strings (hex, rgb, named colors, etc.).
 * @returns CSS linear-gradient() function string.
 */
const buildGradient = (colors: string[]) => `linear-gradient(135deg, ${colors.join(', ')})`;
export const DEFAULT_BUILTIN_BACKGROUND_ID = 'wire-1';
const BUILTIN_BACKGROUND_DEFINITIONS: BuiltinBackgroundDefinition[] = [
  {
    id: DEFAULT_BUILTIN_BACKGROUND_ID,
    labelKey: 'videoCallBackgroundWire1',
    imageUrl: '/assets/images/backgrounds/wire-1.png',
    previewColors: ['#1a1a1a', '#2d2d2d', '#4a4a4a'],
  },
  {
    id: 'office-1',
    labelKey: 'videoCallBackgroundOffice1',
    imageUrl: '/assets/images/backgrounds/office-1.png',
    previewColors: ['#4a5568', '#718096', '#cbd5e0'],
  },
  {
    id: 'office-2',
    labelKey: 'videoCallBackgroundOffice2',
    imageUrl: '/assets/images/backgrounds/office-2.png',
    previewColors: ['#2d3748', '#4a5568', '#718096'],
  },
];

export const BUILTIN_BACKGROUNDS: BuiltinBackground[] = BUILTIN_BACKGROUND_DEFINITIONS.map(definition => ({
  ...definition,
  previewGradient: buildGradient(definition.previewColors),
}));

/** Maximum number of cached background images before evicting oldest entries. */
const MAX_BACKGROUND_CACHE_ENTRIES = 8;
/** LRU cache for loaded background images, keyed by background ID. */
const backgroundImageCache = new Map<string, HTMLImageElement>();

/**
 * Retrieves a cached background image and updates its position in the LRU cache.
 *
 * Implements LRU (Least Recently Used) cache behavior by moving the accessed
 * entry to the end of the map (most recently used position).
 *
 * @param backgroundId - Unique identifier for the background to retrieve.
 * @returns Cached HTMLImageElement if found, undefined otherwise.
 */
const getCachedImage = (backgroundId: string): HTMLImageElement | undefined => {
  const cached = backgroundImageCache.get(backgroundId);
  if (!cached) {
    return undefined;
  }
  backgroundImageCache.delete(backgroundId);
  backgroundImageCache.set(backgroundId, cached);
  return cached;
};

/**
 * Stores a background image in the cache with LRU eviction policy.
 *
 * If the cache exceeds MAX_BACKGROUND_CACHE_ENTRIES, the oldest entry
 * (first key in iteration order) is evicted to make room.
 *
 * @param backgroundId - Unique identifier for the background.
 * @param image - HTMLImageElement to cache.
 */
const setCachedImage = (backgroundId: string, image: HTMLImageElement): void => {
  if (backgroundImageCache.has(backgroundId)) {
    backgroundImageCache.delete(backgroundId);
  }
  backgroundImageCache.set(backgroundId, image);
  if (backgroundImageCache.size > MAX_BACKGROUND_CACHE_ENTRIES) {
    const oldestKey = backgroundImageCache.keys().next().value;
    if (oldestKey) {
      backgroundImageCache.delete(oldestKey);
    }
  }
};

/**
 * Loads an image from a URL with CORS support.
 *
 * Creates a new HTMLImageElement, sets crossOrigin to 'anonymous' for CORS,
 * and returns a Promise that resolves when the image loads successfully.
 *
 * @param src - URL path to the image file.
 * @returns Promise resolving to the loaded HTMLImageElement.
 * @throws Error if the image fails to load.
 */
const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load background image: ${src}`));
    image.src = src;
  });

/**
 * Creates an ImageBitmap from a linear gradient defined by color stops.
 *
 * Generates a 1920x1080 bitmap with a diagonal linear gradient using the
 * provided colors. Uses OffscreenCanvas when available (Web Worker context),
 * otherwise falls back to HTMLCanvasElement (main thread).
 *
 * @param colors - Array of CSS color strings for gradient stops.
 * @returns Promise resolving to an ImageBitmap of the gradient.
 * @throws Error if 2D context creation fails.
 */
const createGradientBitmap = async (colors: string[]): Promise<ImageBitmap> => {
  const width = 1920;
  const height = 1080;
  const canvas =
    typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : document.createElement('canvas');
  const isOffscreenCanvas = typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas;
  if (!isOffscreenCanvas) {
    (canvas as HTMLCanvasElement).width = width;
    (canvas as HTMLCanvasElement).height = height;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create 2D context for background gradient.');
  }
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  const stops = Math.max(colors.length - 1, 1);
  colors.forEach((color, index) => {
    gradient.addColorStop(index / stops, color);
  });
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  return createImageBitmap(canvas as OffscreenCanvas | HTMLCanvasElement);
};

/**
 * Retrieves a builtin background definition by ID.
 *
 * Searches the BUILTIN_BACKGROUNDS array for a background matching the
 * provided ID. Returns undefined if no match is found.
 *
 * @param backgroundId - Unique identifier for the background to find.
 * @returns BuiltinBackground object if found, undefined otherwise.
 */
export const getBuiltinBackground = (backgroundId: string): BuiltinBackground | undefined =>
  BUILTIN_BACKGROUNDS.find(background => background.id === backgroundId);

/**
 * Loads a background source for virtual background mode.
 *
 * This function:
 * 1. Looks up the builtin background definition by ID
 * 2. Checks the LRU cache for a previously loaded image
 * 3. If cached, returns the cached image
 * 4. If not cached, attempts to load the image from the URL
 * 5. If image load fails, falls back to a gradient bitmap generated from preview colors
 * 6. Caches successful image loads for future use
 *
 * @param backgroundId - Unique identifier for the builtin background to load.
 * @returns Promise resolving to HTMLImageElement (loaded image) or ImageBitmap (gradient fallback).
 * @throws Error if the backgroundId is unknown (not found in BUILTIN_BACKGROUNDS).
 */
export const loadBackgroundSource = async (backgroundId: string): Promise<BackgroundSource> => {
  const background = getBuiltinBackground(backgroundId);
  if (!background) {
    throw new Error(`Unknown background id: ${backgroundId}`);
  }
  const cachedImage = getCachedImage(backgroundId);
  if (cachedImage) {
    return cachedImage;
  }
  try {
    const image = await loadImage(background.imageUrl);
    setCachedImage(backgroundId, image);
    return image;
  } catch (_error) {
    return createGradientBitmap(background.previewColors);
  }
};
