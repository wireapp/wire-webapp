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

import type {StringIdentifer} from 'Util/LocalizerUtil';

export type BlurLevel = 'low' | 'high';

export type BackgroundEffectSelection =
  | {type: 'none'}
  | {type: 'blur'; level: BlurLevel}
  | {type: 'virtual'; backgroundId: string}
  | {type: 'custom'};

export type BackgroundSource = HTMLImageElement | ImageBitmap;

export const DEFAULT_BACKGROUND_EFFECT: BackgroundEffectSelection = {type: 'none'};

export const BLUR_STRENGTHS: Record<BlurLevel, number> = {
  low: 0.7,
  high: 1.0,
};

type BuiltinBackgroundDefinition = {
  id: string;
  labelKey: StringIdentifer;
  imageUrl: string;
  previewColors: string[];
};

export type BuiltinBackground = BuiltinBackgroundDefinition & {
  previewGradient: string;
};

const buildGradient = (colors: string[]) => `linear-gradient(135deg, ${colors.join(', ')})`;

const BUILTIN_BACKGROUND_DEFINITIONS: BuiltinBackgroundDefinition[] = [
  {
    id: 'sunset',
    labelKey: 'videoCallBackgroundSunset',
    imageUrl: '/image/backgrounds/sunset.jpg',
    previewColors: ['#ff7a59', '#ffb27a', '#ffd37e'],
  },
  {
    id: 'ocean',
    labelKey: 'videoCallBackgroundOcean',
    imageUrl: '/image/backgrounds/ocean.jpg',
    previewColors: ['#1b4965', '#5fa8d3', '#cae9ff'],
  },
  {
    id: 'forest',
    labelKey: 'videoCallBackgroundForest',
    imageUrl: '/image/backgrounds/forest.jpg',
    previewColors: ['#2d6a4f', '#52b788', '#b7e4c7'],
  },
  {
    id: 'sand',
    labelKey: 'videoCallBackgroundSand',
    imageUrl: '/image/backgrounds/sand.jpg',
    previewColors: ['#f1dca7', '#e6b980', '#cfa670'],
  },
  {
    id: 'ember',
    labelKey: 'videoCallBackgroundEmber',
    imageUrl: '/image/backgrounds/ember.jpg',
    previewColors: ['#b23a48', '#fcbf49', '#f77f00'],
  },
  {
    id: 'slate',
    labelKey: 'videoCallBackgroundSlate',
    imageUrl: '/image/backgrounds/slate.jpg',
    previewColors: ['#30343f', '#536878', '#9aa5b1'],
  },
];

export const BUILTIN_BACKGROUNDS: BuiltinBackground[] = BUILTIN_BACKGROUND_DEFINITIONS.map(definition => ({
  ...definition,
  previewGradient: buildGradient(definition.previewColors),
}));

const MAX_BACKGROUND_CACHE_ENTRIES = 8;
const backgroundImageCache = new Map<string, HTMLImageElement>();

const getCachedImage = (backgroundId: string): HTMLImageElement | undefined => {
  const cached = backgroundImageCache.get(backgroundId);
  if (!cached) {
    return undefined;
  }
  backgroundImageCache.delete(backgroundId);
  backgroundImageCache.set(backgroundId, cached);
  return cached;
};

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

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load background image: ${src}`));
    image.src = src;
  });

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

export const getBuiltinBackground = (backgroundId: string): BuiltinBackground | undefined =>
  BUILTIN_BACKGROUNDS.find(background => background.id === backgroundId);

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
