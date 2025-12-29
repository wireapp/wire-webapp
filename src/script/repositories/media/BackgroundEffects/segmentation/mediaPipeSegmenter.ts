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
import type {SegmenterFactory, SegmenterInit, SegmenterLike} from './segmenterTypes';

class MediaPipeSegmenterAdapter implements SegmenterLike {
  private readonly segmenter: Segmenter;

  constructor(init: SegmenterInit) {
    this.segmenter = new Segmenter(init.modelPath, init.delegate, init.canvas);
  }

  public init(): Promise<void> {
    return this.segmenter.init();
  }

  public configure(width: number, height: number): void {
    this.segmenter.configure(width, height);
  }

  public segment(frame: ImageBitmap, timestampMs: number): Promise<SegmentationResult> {
    return this.segmenter.segment(frame, timestampMs);
  }

  public close(): void {
    this.segmenter.close();
  }
}

export const MediaPipeSegmenterFactory: SegmenterFactory = {
  create: (init: SegmenterInit) => new MediaPipeSegmenterAdapter(init),
};
