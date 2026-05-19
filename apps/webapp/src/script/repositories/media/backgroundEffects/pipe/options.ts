/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {EffectMode, Metrics, QualityMode} from 'Repositories/media/backgroundEffects/backgroundEffectsWorkerTypes';
import type {BackgroundSource} from 'Repositories/media/VideoBackgroundEffects';

export type ProcessVideoTrackOptions = {
  // MediaPipe options.
  wasmLoaderPath: string;
  wasmBinaryPath: string;
  modelPath: string;
  useWorker: boolean;

  // Virtual background options.
  mode?: EffectMode; /** Effect mode ('blur', 'virtual', or 'passthrough'). Default: 'blur'. */
  blurStrength: number;
  enabled: boolean;
  backgroundSource: BackgroundSource | null;

  // quality mode
  quality: QualityMode;

  // Metrics callback.
  onMetrics: ((metrics: Metrics) => void) | null;
  onModelChange: ((model: string) => void) | null;
  onRendererFallback: ((modelPath: string) => void) | null;

  // Segmenter options.
  borderSmooth: number;
  smoothing: number;
  smoothstepMin: number;
  smoothstepMax: number;
  bgBlur: number;
  bgBlurRadius: number;

  // Filter options. please let disabled at the beginning because this will need extra render call and eats performance
  enableFilters: boolean;
  blur: number;
  brightness: number;
  contrast: number;
  gamma: number;
};

// Make options type serializable for worker
export type WorkerBackgroundSource = {
  type: 'image';
  media?: ImageBitmap;
  url: string;
};
export type WorkerProcessVideoTrackOptions = Omit<
  ProcessVideoTrackOptions,
  'onMetrics' | 'onModelChange' | 'onRendererFallback' | 'backgroundSource'
> & {
  backgroundSource: WorkerBackgroundSource | null;
};

export const SELFIE_MULTICLASS_MODEL_PATH = '/assets/mediapipe-models/selfie_multiclass_256x256.tflite';
export const SELFIE_SEGMENTER_MODEL_PATH = '/assets/mediapipe-models/selfie_segmenter_landscape.tflite';

export const DEFAULT_BACKGROUND_COLOR = {red: 33, green: 150, blue: 243, alpha: 255} as const;
