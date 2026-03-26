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
 * Detects browser capabilities required for background effects.
 *
 * @returns Capability information with boolean flags for each required API.
 * @example
 * ```typescript
 * const caps = detectCapabilities();
 * if (caps.webgl2 && caps.worker) {
 *   // Can use worker-based pipeline
 * }
 * ```
 */
export {detectCapabilities} from './effects/capability';

/**
 * Selects the optimal rendering pipeline based on browser capabilities.
 *
 * @param cap - Capability information from detectCapabilities().
 * @param preferWorker - If true, prefers worker-based pipeline when available.
 * @returns Selected pipeline identifier.
 * @example
 * ```typescript
 * const caps = detectCapabilities();
 * const pipeline = choosePipeline(caps, true);
 * ```
 */
export {choosePipeline} from './effects/capability';

/**
 * Video source wrapper for extracting frames from MediaStreamTrack.
 *
 * Provides frame callbacks using requestVideoFrameCallback (preferred) or
 * requestAnimationFrame (fallback). Used internally by BackgroundEffectsController.
 */
export {VideoSource} from './effects/videoSource';

/**
 * Effect mode type ('blur', 'virtual', or 'passthrough').
 */
export type {EffectMode} from './backgroundEffectsWorkerTypes';

/**
 * Debug visualization mode type.
 */
export type {DebugMode} from './backgroundEffectsWorkerTypes';

export type {QualityTier} from './backgroundEffectsWorkerTypes';

/**
 * Quality mode type ('auto' or fixed QualityTier).
 */
export type {QualityMode} from './backgroundEffectsWorkerTypes';

/**
 * BackgroundEffectsRenderingPipeline selection type.
 */
export type {PipelineType} from './backgroundEffectsWorkerTypes';

/**
 * Configuration options for starting the background effects pipeline.
 */
export type {StartOptions} from './backgroundEffectsWorkerTypes';

/**
 * Performance metrics tracked during frame processing.
 */
export type {Metrics} from './backgroundEffectsWorkerTypes';
