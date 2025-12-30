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

import type {QualityTierParams} from '../types';

const BASE_MIN_RADIUS = 2;
const BASE_MAX_RADIUS = 12;
const BASE_TIER_RADIUS = 4;
const BASE_DOWNSAMPLE_SCALE = 0.5;
const MAX_SHADER_RADIUS = 16;

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
