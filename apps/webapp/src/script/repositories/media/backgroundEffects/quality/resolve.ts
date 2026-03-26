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

import {resolveTierParams} from './definitions';

import type {EffectMode, Mode, QualityMode, QualityTierParams} from '../backgroundEffectsWorkerTypes';

/**
 * Interface for objects that can provide quality tier parameters.
 * Used to abstract over QualityController instances for testing and flexibility.
 */
export interface QualityControllerLike {
  /**
   * Gets the current quality tier parameters for the specified mode.
   *
   * @param mode - The effect mode ('blur' or 'virtual').
   * @returns Quality tier parameters with mode-specific adjustments applied.
   */
  getTier(mode: Mode): QualityTierParams;
}

/**
 * Converts an effect mode to its corresponding processing mode.
 *
 * Maps 'virtual' to 'virtual' and all other modes (including 'blur') to 'blur'.
 * The 'passthrough' mode is not a processing mode and should be handled separately.
 *
 * @param mode - The effect mode to convert.
 * @returns The corresponding processing mode ('blur' or 'virtual').
 */
export const effectModeToProcessingMode = (mode: EffectMode): Mode => (mode === 'virtual' ? 'virtual' : 'blur');

/**
 * Type guard that checks if an effect mode is a processing mode.
 *
 * Processing modes require actual background effect processing, while 'passthrough'
 * bypasses all processing and returns the original video stream.
 *
 * @param mode - The effect mode to check.
 * @returns True if the mode is a processing mode ('blur' or 'virtual'), false if 'passthrough'.
 */
export const isProcessingMode = (mode: EffectMode): mode is Mode => mode !== 'passthrough';

/**
 * Gets the bypass tier (tier D) parameters for a given mode.
 *
 * Tier D bypasses all processing and passes through original frames, but still
 * needs mode-specific parameters for consistency.
 *
 * @param mode - The effect mode ('blur' or 'virtual').
 * @returns Bypass tier parameters with mode-specific adjustments.
 */
export const getBypassTier = (mode: Mode): QualityTierParams => resolveTierParams('bypass', mode);

/** Default mode to use when resolving bypass tier for non-processing modes. */
const DEFAULT_BYPASS_MODE: Mode = 'blur';

/**
 * Resolves quality tier parameters for an effect mode.
 *
 * Handles both processing modes ('blur', 'virtual') and non-processing modes ('passthrough'):
 * - For 'passthrough': Returns bypass tier (tier D) with default mode
 * - For processing modes: Delegates to resolveQualityTier
 *
 * @param qualityController - Optional quality controller for adaptive quality ('auto' mode).
 * @param quality - Quality mode ('auto' or fixed tier 'A'/'B'/'C'/'D').
 * @param mode - The effect mode ('blur', 'virtual', or 'passthrough').
 * @returns Quality tier parameters for the specified quality and effect mode.
 */
export const resolveQualityTierForEffectMode = (
  qualityController: QualityControllerLike | null,
  quality: QualityMode,
  mode: EffectMode,
): QualityTierParams => {
  if (!isProcessingMode(mode)) {
    return getBypassTier(DEFAULT_BYPASS_MODE);
  }
  return resolveQualityTier(qualityController, quality, mode);
};

/**
 * Resolves quality tier parameters for a processing mode.
 *
 * Resolution logic:
 * - Fixed quality ('A'/'B'/'C'/'D'): Returns tier parameters directly
 * - Adaptive quality ('auto'):
 *   - If quality controller available: Gets current tier from controller
 *   - If no controller: Falls back to bypass tier (tier D)
 *
 * @param qualityController - Optional quality controller for adaptive quality ('auto' mode).
 * @param quality - Quality mode ('auto' or fixed tier 'A'/'B'/'C'/'D').
 * @param mode - The processing mode ('blur' or 'virtual').
 * @returns Quality tier parameters for the specified quality and mode.
 */
export const resolveQualityTier = (
  qualityController: QualityControllerLike | null,
  quality: QualityMode,
  mode: Mode,
): QualityTierParams => {
  if (quality !== 'auto') {
    return resolveTierParams(quality, mode);
  }
  if (!qualityController) {
    return getBypassTier(mode);
  }

  return qualityController.getTier(mode);
};
