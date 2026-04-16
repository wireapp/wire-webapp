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
 * Public API exports for the quality control module.
 *
 * This module provides:
 * - QualityController: Adaptive quality tier management
 * - Tier definitions and resolution utilities
 * - Quality policy resolution based on browser capabilities
 * - Performance metrics collection and aggregation
 * - Blur radius computation utilities
 */

export {QualityController} from './qualityController';
export {resolveQualityPolicy, baselineTierForCapabilities, applyPolicyMode} from './capabilityPolicy';
export {DEFAULT_TUNING, type QualityTuning} from './tuning';
export type {PerformanceSample} from './samples';
export {
  TIER_DEFINITIONS,
  resolveSegmentationModelPath,
  resolveTierParams,
  applyModeOverlay,
  type TierDefinition,
  type PerfTierParams,
  type ModeOverlay,
} from './definitions';

export {
  effectModeToProcessingMode,
  getBypassTier,
  resolveQualityTier,
  resolveQualityTierForEffectMode,
  isProcessingMode,
} from './resolve';
export {
  buildMetrics,
  createMetricsWindow,
  pushMetricsSample,
  resetMetricsWindow,
  type MetricsSample,
  type MetricsWindow,
} from './metrics';
export {computeBlurRadius} from './blur';
