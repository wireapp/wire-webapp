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

import {Mode, QualityTier, QualityTierParams, SegmentationModelByTier} from '../backgroundEffectsWorkerTypes';

/**
 * Performance tier parameters that control rendering quality and resource usage.
 * These parameters are applied before mode-specific overlays.
 */
export interface PerfTierParams {
  /** Quality tier identifier. */
  tier: QualityTier;
  /** Width of the segmentation mask in pixels. Lower values reduce CPU/ML cost. */
  segmentationWidth: number;
  /** Height of the segmentation mask in pixels. Lower values reduce CPU/ML cost. */
  segmentationHeight: number;
  /** Segmentation cadence (process every Nth frame). Higher values reduce CPU/ML cost. */
  segmentationCadence: number;
  /** Scale factor for mask refinement pass (0-1). Lower values reduce GPU cost. */
  maskRefineScale: number;
  /** Scale factor for blur downsampling (0-1). Lower values reduce GPU cost. */
  blurDownsampleScale: number;
  /** Blur radius in pixels. Lower values reduce GPU cost. */
  blurRadius: number;
  /** Joint bilateral filter radius in pixels. Lower values reduce GPU cost. */
  bilateralRadius: number;
  /** Spatial sigma for joint bilateral filter. Controls spatial smoothing. */
  bilateralSpatialSigma: number;
  /** Range sigma for joint bilateral filter. Controls edge preservation. */
  bilateralRangeSigma: number;
  /** If true, bypass all processing and pass through original frames. */
  bypass: boolean;
}

/**
 * Tier definition that groups performance parameters with the default model path.
 */
export interface TierDefinition extends PerfTierParams {
  /** Default segmentation model path for this tier. */
  modelPath: string;
}

/**
 * Mode-specific overlay parameters that adjust matte processing and temporal smoothing.
 * These values are applied on top of tier parameters to optimize for each effect mode.
 */
export interface ModeOverlay {
  /** Temporal smoothing alpha (0-1). Higher values increase temporal stability. */
  temporalAlpha: number;
  /** Lower threshold for soft matte edge (0-1). Controls where soft edges begin. */
  softLow: number;
  /** Upper threshold for soft matte edge (0-1). Controls where soft edges end. */
  softHigh: number;
  /** Lower threshold for matte cutoff (0-1). Pixels below this are considered background. */
  matteLow: number;
  /** Upper threshold for matte cutoff (0-1). Pixels above this are considered foreground. */
  matteHigh: number;
  /** Hysteresis value for matte thresholds to prevent flickering (0-1). */
  matteHysteresis: number;
}

/**
 * Quality tier definitions.
 */
export const TIER_DEFINITIONS: Record<QualityTier, TierDefinition> = {
  superhigh: {
    tier: 'superhigh',
    segmentationWidth: 256,
    segmentationHeight: 256,
    segmentationCadence: 1,
    maskRefineScale: 0.5,
    blurDownsampleScale: 0.5,
    blurRadius: 4,
    bilateralRadius: 5,
    bilateralSpatialSigma: 3.5,
    bilateralRangeSigma: 0.1,
    bypass: false,
    modelPath: '/assets/mediapipe-models/selfie_multiclass_256x256.tflite',
  },
  high: {
    tier: 'high',
    segmentationWidth: 256,
    segmentationHeight: 256,
    segmentationCadence: 1,
    maskRefineScale: 0.5,
    blurDownsampleScale: 0.5,
    blurRadius: 4,
    bilateralRadius: 5,
    bilateralSpatialSigma: 3.5,
    bilateralRangeSigma: 0.1,
    bypass: false,
    modelPath: '/assets/mediapipe-models/selfie_segmenter_landscape.tflite',
  },
  medium: {
    tier: 'medium',
    segmentationWidth: 256,
    segmentationHeight: 144,
    segmentationCadence: 2,
    maskRefineScale: 0.5,
    blurDownsampleScale: 0.5,
    blurRadius: 3,
    bilateralRadius: 5,
    bilateralSpatialSigma: 3.5,
    bilateralRangeSigma: 0.1,
    bypass: false,
    modelPath: '/assets/mediapipe-models/selfie_segmenter_landscape.tflite',
  },
  low: {
    tier: 'low',
    segmentationWidth: 160,
    segmentationHeight: 96,
    segmentationCadence: 3,
    maskRefineScale: 0.4,
    blurDownsampleScale: 0.25,
    blurRadius: 2,
    bilateralRadius: 3,
    bilateralSpatialSigma: 2.5,
    bilateralRangeSigma: 0.12,
    bypass: false,
    modelPath: '/assets/mediapipe-models/selfie_segmenter_landscape.tflite',
  },
  bypass: {
    tier: 'bypass',
    segmentationWidth: 0,
    segmentationHeight: 0,
    segmentationCadence: 0,
    maskRefineScale: 1,
    blurDownsampleScale: 1,
    blurRadius: 0,
    bilateralRadius: 0,
    bilateralSpatialSigma: 0,
    bilateralRangeSigma: 0,
    bypass: true,
    modelPath: '/assets/mediapipe-models/selfie_segmenter_landscape.tflite',
  },
};

/**
 * Default overlay parameters for each effect mode.
 */
export const MODE_DEFAULTS: Record<Mode, ModeOverlay> = {
  blur: {
    temporalAlpha: 0.78,
    softLow: 0.3,
    softHigh: 0.65,
    matteLow: 0.45,
    matteHigh: 0.6,
    matteHysteresis: 0.04,
  },
  virtual: {
    temporalAlpha: 0.62,
    softLow: 0.3,
    softHigh: 0.65,
    matteLow: 0.45,
    matteHigh: 0.6,
    matteHysteresis: 0.04,
  },
};

/**
 * Gets mode-specific overlay parameters for a given mode and tier.
 *
 * Applies tier-specific adjustments to the base mode defaults:
 * - Tier D: Disables temporal smoothing (temporalAlpha = 0) since bypass mode doesn't need it
 * - Virtual mode at Tier C: Expands matte thresholds slightly to improve edge quality at lower resolution
 *
 * @param mode - The effect mode ('blur' or 'virtual').
 * @param tier - The quality tier ('A', 'B', 'C', or 'D').
 * @returns Mode overlay parameters with tier-specific adjustments applied.
 */
export function getModeOverlay(mode: Mode, tier: QualityTier): ModeOverlay {
  const base = MODE_DEFAULTS[mode];
  if (tier === 'bypass') {
    return {...base, temporalAlpha: 0};
  }
  if (mode === 'virtual' && tier === 'low') {
    return {...base, matteLow: base.matteLow - 0.02, matteHigh: base.matteHigh + 0.02};
  }
  return base;
}

/**
 * Applies mode-specific overlay parameters to tier parameters.
 *
 * Merges the base tier performance parameters with mode-specific overlay values
 * to produce the final quality tier parameters. The overlay values override
 * the tier defaults to optimize rendering for each effect mode.
 *
 * @param tier - Base performance tier parameters.
 * @param mode - The effect mode ('blur' or 'virtual').
 * @returns Complete quality tier parameters with mode-specific adjustments.
 */
export function applyModeOverlay(tier: PerfTierParams, mode: Mode): QualityTierParams {
  const overlay = getModeOverlay(mode, tier.tier);
  return {
    ...tier,
    softLow: overlay.softLow,
    softHigh: overlay.softHigh,
    matteLow: overlay.matteLow,
    matteHigh: overlay.matteHigh,
    matteHysteresis: overlay.matteHysteresis,
    temporalAlpha: overlay.temporalAlpha,
  };
}

/**
 * Resolves quality tier parameters for a given tier and mode.
 *
 * Looks up the tier definition and applies mode-specific overlays to produce
 * the final quality parameters. This is a convenience function that combines
 * tier lookup and mode overlay application.
 *
 * @param tier - The quality tier.
 * @param mode - The effect mode ('blur' or 'virtual').
 * @returns Complete quality tier parameters for the specified tier and mode.
 */
export function resolveTierParams(tier: QualityTier, mode: Mode): QualityTierParams {
  return applyModeOverlay(TIER_DEFINITIONS[tier], mode);
}

/**
 * Resolves the segmentation model path for a given tier.
 *
 * Resolution priority:
 * 1. Tier-specific override from `overrides` map
 * 2. Global `fallback` path
 * 3. Default model path from tier definition
 *
 * @param tier - The quality tier.
 * @param overrides - Optional map of tier-specific model path overrides.
 * @param fallback - Optional fallback model path if no tier override exists.
 * @returns The resolved segmentation model path for the tier.
 */
export function resolveSegmentationModelPath(
  tier: QualityTier,
  overrides: SegmentationModelByTier | undefined,
  fallback: string | undefined,
): string {
  return overrides?.[tier] ?? fallback ?? TIER_DEFINITIONS[tier].modelPath;
}
