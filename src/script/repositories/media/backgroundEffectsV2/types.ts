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

export type EffectMode = 'blur' | 'virtual' | 'passthrough';
export type DebugMode = 'off' | 'maskOverlay' | 'maskOnly' | 'edgeOnly';
export type QualityMode = 'auto' | 'A' | 'B' | 'C' | 'D';

export interface QualityTierParams {
  tier: 'A' | 'B' | 'C' | 'D';
  segmentationWidth: number;
  segmentationHeight: number;
  segmentationCadence: number;
  maskRefineScale: number;
  blurDownsampleScale: number;
  blurRadius: number;
  bilateralRadius: number;
  bilateralSpatialSigma: number;
  bilateralRangeSigma: number;
  temporalAlpha: number;
  bypass: boolean;
}

export interface BackgroundSourceImage {
  type: 'image';
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

export interface BackgroundSourceVideoFrame {
  type: 'video';
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

export interface Metrics {
  avgTotalMs: number;
  avgSegmentationMs: number;
  avgGpuMs: number;
  droppedFrames: number;
  tier: 'A' | 'B' | 'C' | 'D';
}

export interface StartOptions {
  targetFps?: number;
  quality?: QualityMode;
  debugMode?: DebugMode;
  mode?: EffectMode;
  blurStrength?: number;
  backgroundImage?: HTMLImageElement | ImageBitmap;
  backgroundVideo?: HTMLVideoElement;
  segmentationModelPath?: string;
  useWorker?: boolean;
}

export interface WorkerInitMessage {
  type: 'init';
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  devicePixelRatio: number;
  options: Required<WorkerOptions>;
}

export interface WorkerFrameMessage {
  type: 'frame';
  frame: ImageBitmap;
  timestamp: number;
  width: number;
  height: number;
}

export interface WorkerUpdateMessage {
  type:
    | 'setMode'
    | 'setBlurStrength'
    | 'setDebugMode'
    | 'setQuality'
    | 'setBackgroundImage'
    | 'setBackgroundVideo'
    | 'setDroppedFrames'
    | 'stop';
  mode?: EffectMode;
  blurStrength?: number;
  debugMode?: DebugMode;
  quality?: QualityMode;
  image?: ImageBitmap;
  video?: ImageBitmap;
  width?: number;
  height?: number;
  droppedFrames?: number;
}

export type WorkerMessage = WorkerInitMessage | WorkerFrameMessage | WorkerUpdateMessage;

export interface WorkerMetricsMessage {
  type: 'metrics';
  metrics: Metrics;
}

export interface WorkerReadyMessage {
  type: 'ready';
}

export interface WorkerFrameProcessedMessage {
  type: 'frameProcessed';
}

export interface WorkerErrorMessage {
  type: 'segmenterError';
  error: string;
}

export type WorkerResponse =
  | WorkerMetricsMessage
  | WorkerReadyMessage
  | WorkerFrameProcessedMessage
  | WorkerErrorMessage;

export interface WorkerOptions {
  mode: EffectMode;
  debugMode: DebugMode;
  quality: QualityMode;
  blurStrength: number;
  segmentationModelPath: string;
  targetFps: number;
}
