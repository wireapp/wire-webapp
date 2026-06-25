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

import {Runtime} from '@wireapp/commons';

import {EffectMode, Metrics, QualityMode} from 'Repositories/media/backgroundeffects';
import {BackgroundSource} from 'Repositories/media/videobackgroundeffects';

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
  'onMetrics' | 'onModelChange' | 'backgroundSource'
> & {
  backgroundSource: WorkerBackgroundSource | null;
};

export const SELFIE_MULTICLASS_MODEL_PATH = '/assets/mediapipe-models/selfie_multiclass_256x256.tflite';
export const SELFIE_SEGMENTER_MODEL_PATH = '/assets/mediapipe-models/selfie_segmenter_landscape.tflite';

/**
 * Configuration options for the virtual background.
 */
export const defaultOpts = {
  // MediaPipe options.
  wasmLoaderPath: '/min/mediapipe/wasm/vision_wasm_internal.js',
  wasmBinaryPath: '/min/mediapipe/wasm/vision_wasm_internal.wasm',
  modelPath: SELFIE_MULTICLASS_MODEL_PATH,
  useWorker: !Runtime.isFirefox(),

  // Virtual background options.
  mode: 'blur',
  blurStrength: 0,
  enabled: true,
  backgroundSource: null,

  // quality mode
  quality: 'auto',

  // Metrics callback.
  onMetrics: null,
  onModelChange: null,

  // Segmenter options.
  borderSmooth: 0,
  smoothing: 1,
  smoothstepMin: 0.6,
  smoothstepMax: 0.9,
  restartEvery: 0,
  bgBlur: 0,
  bgBlurRadius: 30,

  // Filter options.
  enableFilters: false,
  blur: 0,
  brightness: 0,
  contrast: 1,
  gamma: 1,
} as ProcessVideoTrackOptions;
