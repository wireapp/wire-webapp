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

import type {SegmentationResult} from './segmenter';

import type {EffectMode, QualityTierParams} from '../backgroundEffectsWorkerTypes';

/**
 * Context information for mask post-processing operations.
 */
export interface MaskPostProcessContext {
  qualityTier: QualityTierParams;
  mode: EffectMode;
  timestampMs: number;
  /** Frame dimensions in pixels. */
  frameSize: {width: number; height: number};
}

/**
 * Interface for mask post-processing operations.
 *
 * Post-processors can modify segmentation results before rendering,
 * such as applying temporal smoothing, edge refinement, or other
 * enhancements to improve mask quality.
 */
export interface MaskPostProcessor {
  process(
    result: SegmentationResult,
    context: MaskPostProcessContext,
  ): Promise<SegmentationResult> | SegmentationResult;
  /**
   * Resets post-processor state (e.g., clears temporal buffers).
   *
   * @returns Nothing.
   */
  reset(): void;
}

/**
 * Factory interface for creating mask post-processor instances.
 */
export interface MaskPostProcessorFactory {
  /**
   * Creates a new mask post-processor instance.
   *
   * @returns A new MaskPostProcessor instance.
   */
  create(): MaskPostProcessor;
}

/**
 * No-op mask post-processor that returns results unchanged.
 *
 * Used as a default when no post-processing is needed. Simply passes
 * through segmentation results without modification.
 */
export class NoopMaskPostProcessor implements MaskPostProcessor {
  /**
   * Returns the segmentation result unchanged.
   *
   * @param result - Segmentation result to process.
   * @returns The same result, unmodified.
   */
  public process(result: SegmentationResult): SegmentationResult {
    return result;
  }

  public reset(): void {}
}
