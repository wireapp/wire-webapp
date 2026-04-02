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

import type {QualityTierParams} from '../backgroundEffectsWorkerTypes';

/** Minimum blur radius in pixels (at blurStrength = 0). */
const BASE_MIN_RADIUS = 2;
/** Maximum blur radius in pixels (at blurStrength = 1). */
const BASE_MAX_RADIUS = 12;
/** Reference tier radius used for scaling calculations (tier A default). */
const BASE_TIER_RADIUS = 4;
/** Reference downsampling scale used for scaling calculations (tier A default). */
const BASE_DOWNSAMPLE_SCALE = 0.5;
/** Maximum blur radius supported by the shader (hardware/implementation limit). */
const MAX_SHADER_RADIUS = 16;

/**
 * Computes the effective blur radius based on quality tier, blur strength, and downsampling.
 *
 * The blur radius is calculated as:
 * 1. Base radius: Interpolated between BASE_MIN_RADIUS and BASE_MAX_RADIUS based on blurStrength (0-1)
 * 2. Tier scale: Multiplied by (quality.blurRadius / BASE_TIER_RADIUS) to adjust for quality tier
 * 3. Downsample scale: Optionally multiplied by (quality.blurDownsampleScale / BASE_DOWNSAMPLE_SCALE)
 *    to account for downsampled rendering (blur appears stronger at lower resolution)
 * 4. Final radius: Clamped to [0, MAX_SHADER_RADIUS]
 *
 * @param quality - Quality tier parameters containing blurRadius and blurDownsampleScale.
 * @param blurStrength - User-controlled blur strength (0-1), clamped internally.
 * @param includeDownsampleScale - If true, applies downsampling scale factor to account for
 *                                 lower-resolution blur rendering making blur appear stronger.
 * @returns Computed blur radius in pixels, clamped to valid shader range.
 */
export const computeBlurRadius = (
  quality: QualityTierParams,
  blurStrength: number,
  includeDownsampleScale: boolean,
): number => {
  const clampedStrength = Math.max(0, Math.min(1, blurStrength));
  const baseRadius = BASE_MIN_RADIUS + clampedStrength * (BASE_MAX_RADIUS - BASE_MIN_RADIUS);
  const tierScale = quality.blurRadius / BASE_TIER_RADIUS;
  const downsampleScale = includeDownsampleScale ? quality.blurDownsampleScale / BASE_DOWNSAMPLE_SCALE : 1;
  const radius = baseRadius * tierScale * downsampleScale;
  return Math.max(0, Math.min(MAX_SHADER_RADIUS, radius));
};
