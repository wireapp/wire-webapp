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

/**
 * Delegate type for ML inference execution.
 *
 * - 'CPU': Runs inference on CPU (slower but widely supported)
 * - 'GPU': Runs inference on GPU (faster but requires WebGL support)
 */
export type SegmenterDelegate = 'CPU' | 'GPU';

/**
 * Initialization parameters for a segmenter instance.
 */
export interface SegmenterInit {
  modelPath: string;
  delegate: SegmenterDelegate;
  /** Optional canvas for GPU delegate (required for GPU, unused for CPU). */
  canvas?: HTMLCanvasElement | OffscreenCanvas;
}

/**
 * Options for segmentation operations.
 */
export interface SegmenterOptions {
  /** Whether to include class mask in the result (for debug visualization). */
  includeClassMask?: boolean;
}

/**
 * Interface for person segmentation operations.
 *
 * Provides a unified interface for different segmentation implementations
 * (e.g., MediaPipe, TensorFlow.js). All segmenters must implement this interface.
 */
export interface SegmenterLike {
  init(): Promise<void>;
  configure(width: number, height: number): void;
  segment(frame: ImageBitmap, timestampMs: number, options?: SegmenterOptions): Promise<SegmentationResult>;
  close(): void;
  /**
   * Returns the delegate type used by this segmenter.
   *
   * @returns 'CPU' or 'GPU', or undefined if not supported.
   */
  getDelegate?(): SegmenterDelegate;
}

/**
 * Factory interface for creating segmenter instances.
 *
 * Allows dependency injection of different segmenter implementations
 * for testing or alternative ML backends.
 */
export interface SegmenterFactory {
  create(init: SegmenterInit): SegmenterLike;
}
