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

import type {MaskPostProcessorFactory} from '../segmentation/maskPostProcessor';
import type {SegmenterFactory} from '../segmentation/segmenterTypes';
import type {DebugMode, EffectMode, Metrics, PipelineType, QualityMode, SegmentationModelByTier} from '../types';

export interface PipelineConfig {
  mode: EffectMode;
  debugMode: DebugMode;
  blurStrength: number;
  quality: QualityMode;
}

export interface PipelineInit {
  outputCanvas: HTMLCanvasElement;
  targetFps: number;
  segmentationModelPath: string;
  segmentationModelByTier: SegmentationModelByTier;
  initialTier: 'A' | 'B' | 'C' | 'D';
  config: PipelineConfig;
  createSegmenter?: SegmenterFactory;
  createMaskPostProcessor?: MaskPostProcessorFactory;
  onMetrics: ((metrics: Metrics) => void) | null;
  onTierChange: (tier: 'A' | 'B' | 'C' | 'D') => void;
  onDroppedFrame: () => number;
  getDroppedFrames: () => number;
  onWorkerSegmenterError?: (error: string) => void;
}

export interface Pipeline {
  readonly type: PipelineType;
  init(init: PipelineInit): Promise<void>;
  processFrame(frame: ImageBitmap, timestamp: number, width: number, height: number): Promise<void>;
  updateConfig(config: PipelineConfig): void;
  setBackgroundImage(bitmap: ImageBitmap, width: number, height: number): void;
  setBackgroundVideoFrame(bitmap: ImageBitmap, width: number, height: number): void;
  clearBackground(): void;
  notifyDroppedFrames(count: number): void;
  isOutputCanvasTransferred(): boolean;
  stop(): void;
}
