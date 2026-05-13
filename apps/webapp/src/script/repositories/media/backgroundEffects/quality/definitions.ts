/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

export type QualityTier = 'fhd' | 'hd' | 'qhd' | 'nhd' | 'bypass';

export type QualityMode = 'auto' | QualityTier;

export interface Resolution {
  width: number;
  height: number;
}

export interface QualityTierParams {
  /** Quality tier identifier */
  tier: QualityTier;
  resolution: Resolution;
  downscale: boolean;
}

export const TIER_DEFINITIONS: Record<QualityTier, QualityTierParams> = {
  fhd: {
    tier: 'fhd',
    resolution: {width: 1920, height: 1080},
    downscale: false,
  },
  hd: {
    tier: 'hd',
    resolution: {width: 1280, height: 720},
    downscale: true,
  },
  qhd: {
    tier: 'qhd',
    resolution: {width: 960, height: 540},
    downscale: true,
  },
  nhd: {
    tier: 'nhd',
    resolution: {width: 640, height: 360},
    downscale: true,
  },
  bypass: {
    tier: 'bypass',
    resolution: {width: 0, height: 0},
    downscale: false,
  },
};

export function getBestMatchingQualityTier(resolution: Resolution): QualityTierParams {
  const FHD = TIER_DEFINITIONS.fhd.resolution;
  if (resolutionIsGreaterThanOrEqualTo(resolution, FHD)) {
    return TIER_DEFINITIONS.fhd;
  }

  const HD = TIER_DEFINITIONS.hd.resolution;
  if (resolutionIsGreaterThanOrEqualTo(resolution, HD)) {
    return TIER_DEFINITIONS.hd;
  }

  const QHD = TIER_DEFINITIONS.qhd.resolution;
  if (resolutionIsGreaterThanOrEqualTo(resolution, QHD)) {
    return TIER_DEFINITIONS.qhd;
  }

  return TIER_DEFINITIONS.nhd;
}

export function resolutionIsGreaterThanOrEqualTo(resolution: Resolution, lowerThan: Resolution): boolean {
  return resolution.width >= lowerThan.width && resolution.height >= lowerThan.height;
}
