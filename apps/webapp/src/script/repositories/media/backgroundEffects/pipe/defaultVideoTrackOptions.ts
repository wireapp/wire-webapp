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

import {ProcessVideoTrackOptions, SELFIE_MULTICLASS_MODEL_PATH} from './options';

/**
 * Configuration options for the virtual background.
 */
export const defaultVideoTrackOptions = {
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
  onRendererFallback: null,

  // Segmenter options.
  borderSmooth: 0,
  smoothing: 0.8,
  smoothstepMin: 0.6,
  smoothstepMax: 0.9,
  bgBlur: 0,
  bgBlurRadius: 30,

  // Filter options.
  enableFilters: false,
  blur: 0,
  brightness: 0,
  contrast: 1,
  gamma: 1,
} satisfies ProcessVideoTrackOptions;
