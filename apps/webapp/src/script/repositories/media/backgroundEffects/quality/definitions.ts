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
  isHighQuality: boolean;
  downscale: boolean;
}

export const TIER_DEFINITIONS: Record<QualityTier, QualityTierParams> = {
  fhd: {
    tier: 'fhd',
    resolution: {width: 1920, height: 1080},
    isHighQuality: true,
    downscale: true,
  },
  hd: {
    tier: 'hd',
    resolution: {width: 1280, height: 720},
    isHighQuality: true,
    downscale: true,
  },
  qhd: {
    tier: 'qhd',
    resolution: {width: 960, height: 540},
    isHighQuality: false,
    downscale: true,
  },
  nhd: {
    tier: 'nhd',
    resolution: {width: 640, height: 360},
    isHighQuality: false,
    downscale: false,
  },
  bypass: {
    tier: 'bypass',
    resolution: {width: 0, height: 0},
    isHighQuality: false,
    downscale: false,
  },
};

const QUALITY_TIERS = [TIER_DEFINITIONS.fhd, TIER_DEFINITIONS.hd, TIER_DEFINITIONS.qhd] as const;

export function getBestMatchingQualityTier(resolution: Resolution): QualityTierParams {
  return (
    QUALITY_TIERS.find(({resolution: minResolution}) => resolutionIsGreaterThanOrEqualTo(resolution, minResolution)) ??
    TIER_DEFINITIONS.nhd
  );
}

export function resolutionIsGreaterThanOrEqualTo(resolution: Resolution, lowerThan: Resolution): boolean {
  return resolution.width >= lowerThan.width && resolution.height >= lowerThan.height;
}
