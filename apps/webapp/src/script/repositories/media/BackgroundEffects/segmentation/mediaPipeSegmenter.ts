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

import {Segmenter} from './segmenter';
import type {SegmentationResult} from './segmenter';
import type {
  SegmenterDelegate,
  SegmenterFactory,
  SegmenterInit,
  SegmenterLike,
  SegmenterOptions,
} from './segmenterTypes';

/**
 * Adapter that wraps the MediaPipe Segmenter to implement SegmenterLike interface.
 *
 * Provides a unified interface for segmentation operations, delegating to
 * the underlying MediaPipe Segmenter implementation.
 */
class MediaPipeSegmenterAdapter implements SegmenterLike {
  private readonly segmenter: Segmenter;
  private readonly delegate: SegmenterDelegate;

  constructor(init: SegmenterInit) {
    this.segmenter = new Segmenter(init.modelPath, init.delegate, init.canvas);
    this.delegate = init.delegate;
  }

  /**
   * Initializes the MediaPipe segmenter.
   *
   * @returns Promise that resolves when initialization is complete.
   */
  public init(): Promise<void> {
    return this.segmenter.init();
  }

  /**
   * Configures the segmenter for a specific input size.
   *
   * @param width - Input width in pixels.
   * @param height - Input height in pixels.
   * @returns Nothing.
   */
  public configure(width: number, height: number): void {
    this.segmenter.configure(width, height);
  }

  /**
   * Performs segmentation on a video frame.
   *
   * @param frame - Input video frame as ImageBitmap.
   * @param timestampMs - Frame timestamp in milliseconds.
   * @param options - Optional segmentation options (e.g., includeClassMask).
   * @returns Promise resolving to segmentation result with mask and metadata.
   */
  public segment(frame: ImageBitmap, timestampMs: number, options?: SegmenterOptions): Promise<SegmentationResult> {
    return this.segmenter.segment(frame, timestampMs, options);
  }

  /**
   * Closes the segmenter and releases resources.
   *
   * @returns Nothing.
   */
  public close(): void {
    this.segmenter.close();
  }

  /**
   * Returns the delegate type used by this segmenter.
   *
   * @returns 'CPU' or 'GPU' depending on initialization.
   */
  public getDelegate(): SegmenterDelegate {
    return this.delegate;
  }
}

/**
 * Factory for creating MediaPipe segmenter instances.
 *
 * Default segmenter factory used by pipelines. Creates MediaPipeSegmenterAdapter
 * instances that wrap the underlying MediaPipe Segmenter.
 */
export const MediaPipeSegmenterFactory: SegmenterFactory = {
  create: (init: SegmenterInit) => new MediaPipeSegmenterAdapter(init),
};
