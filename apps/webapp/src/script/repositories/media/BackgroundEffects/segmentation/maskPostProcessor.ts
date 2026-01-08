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

import type {EffectMode, QualityTierParams} from '../types';

export interface MaskPostProcessContext {
  qualityTier: QualityTierParams;
  mode: EffectMode;
  timestampMs: number;
  frameSize: {width: number; height: number};
}

export interface MaskPostProcessor {
  process(
    result: SegmentationResult,
    context: MaskPostProcessContext,
  ): Promise<SegmentationResult> | SegmentationResult;
  reset(): void;
}

export interface MaskPostProcessorFactory {
  create(): MaskPostProcessor;
}

export class NoopMaskPostProcessor implements MaskPostProcessor {
  public process(result: SegmentationResult): SegmentationResult {
    return result;
  }

  public reset(): void {}
}
