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

import type {EffectMode, Mode, QualityMode, QualityTierParams} from '../types';

export interface QualityControllerLike {
  setTier(mode: Exclude<QualityMode, 'auto'>): void;
  getTier(mode: Mode): QualityTierParams;
}

export const getQualityMode = (mode: EffectMode): Mode => (mode === 'virtual' ? 'virtual' : 'blur');

export const getBypassTier = (): QualityTierParams => ({
  tier: 'D',
  segmentationWidth: 0,
  segmentationHeight: 0,
  segmentationCadence: 0,
  maskRefineScale: 1,
  blurDownsampleScale: 1,
  blurRadius: 0,
  bilateralRadius: 0,
  bilateralSpatialSigma: 0,
  bilateralRangeSigma: 0,
  softLow: 0.3,
  softHigh: 0.65,
  matteLow: 0.45,
  matteHigh: 0.6,
  matteHysteresis: 0.04,
  temporalAlpha: 0,
  bypass: true,
});

export const resolveQualityTier = (
  qualityController: QualityControllerLike | null,
  quality: QualityMode,
  mode: Mode,
): QualityTierParams => {
  if (!qualityController) {
    return getBypassTier();
  }

  if (quality !== 'auto') {
    qualityController.setTier(quality);
  }

  return qualityController.getTier(mode);
};
