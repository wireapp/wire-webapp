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

class MediaPipeSegmenterAdapter implements SegmenterLike {
  private readonly segmenter: Segmenter;
  private readonly delegate: SegmenterDelegate;

  constructor(init: SegmenterInit) {
    this.segmenter = new Segmenter(init.modelPath, init.delegate, init.canvas);
    this.delegate = init.delegate;
  }

  public init(): Promise<void> {
    return this.segmenter.init();
  }

  public configure(width: number, height: number): void {
    this.segmenter.configure(width, height);
  }

  public segment(frame: ImageBitmap, timestampMs: number, options?: SegmenterOptions): Promise<SegmentationResult> {
    return this.segmenter.segment(frame, timestampMs, options);
  }

  public close(): void {
    this.segmenter.close();
  }

  public getDelegate(): SegmenterDelegate {
    return this.delegate;
  }
}

export const MediaPipeSegmenterFactory: SegmenterFactory = {
  create: (init: SegmenterInit) => new MediaPipeSegmenterAdapter(init),
};
