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

import type {Mode, QualityTierParams, SegmentationModelByTier} from '../types';

export type TierKey = 'A' | 'B' | 'C' | 'D';

/**
 * Performance tier parameters that control rendering quality and resource usage.
 * These parameters are applied before mode-specific overlays.
 */
export interface PerfTierParams {
  /** Quality tier identifier. */
  tier: TierKey;
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
 * Quality tier definitions ordered from highest (A) to lowest (D) quality.
 */
export const TIER_DEFINITIONS: Record<TierKey, TierDefinition> = {
  A: {
    tier: 'A',
    segmentationWidth: 256,
    segmentationHeight: 144,
    segmentationCadence: 1,
    maskRefineScale: 0.5,
    blurDownsampleScale: 0.25,
    blurRadius: 4,
    bilateralRadius: 5,
    bilateralSpatialSigma: 3.5,
    bilateralRangeSigma: 0.1,
    bypass: false,
    modelPath: '/assets/mediapipe-models/selfie_multiclass_256x256.tflite',
  },
  B: {
    tier: 'B',
    segmentationWidth: 256,
    segmentationHeight: 144,
    segmentationCadence: 2,
    maskRefineScale: 0.5,
    blurDownsampleScale: 0.25,
    blurRadius: 3,
    bilateralRadius: 4,
    bilateralSpatialSigma: 3.0,
    bilateralRangeSigma: 0.1,
    bypass: false,
    modelPath: '/assets/mediapipe-models/selfie_segmenter_landscape.tflite',
  },
  C: {
    tier: 'C',
    segmentationWidth: 160,
    segmentationHeight: 96,
    segmentationCadence: 2,
    maskRefineScale: 0.5,
    blurDownsampleScale: 0.25,
    blurRadius: 2,
    bilateralRadius: 3,
    bilateralSpatialSigma: 2.5,
    bilateralRangeSigma: 0.12,
    bypass: false,
    modelPath: '/assets/mediapipe-models/selfie_segmenter_landscape.tflite',
  },
  D: {
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

export function getModeOverlay(mode: Mode, tier: TierKey): ModeOverlay {
  const base = MODE_DEFAULTS[mode];
  if (tier === 'D') {
    return {...base, temporalAlpha: 0};
  }
  if (mode === 'virtual' && tier === 'C') {
    return {...base, matteLow: base.matteLow - 0.02, matteHigh: base.matteHigh + 0.02};
  }
  return base;
}

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

export function resolveTierParams(tier: TierKey, mode: Mode): QualityTierParams {
  return applyModeOverlay(TIER_DEFINITIONS[tier], mode);
}

export function resolveSegmentationModelPath(
  tier: TierKey,
  overrides: SegmentationModelByTier | undefined,
  fallback: string | undefined,
): string {
  return overrides?.[tier] ?? fallback ?? TIER_DEFINITIONS[tier].modelPath;
}
