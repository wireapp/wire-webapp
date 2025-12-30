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

import {bindContextLossHandlers, resetContextLossHandlers} from './contextLoss';
import {state} from './state';

import {resolveSegmentationModelPath, QualityController} from '../quality';
import {WebGLRenderer} from '../renderer/WebGLRenderer';
import {Segmenter} from '../segmentation/segmenter';
import type {WorkerOptions, WorkerResponse} from '../types';

export async function handleInit(
  canvas: OffscreenCanvas,
  width: number,
  height: number,
  options: WorkerOptions,
): Promise<void> {
  state.options = options;
  state.width = width;
  state.height = height;
  state.mode = options.mode;
  state.debugMode = options.debugMode;
  state.blurStrength = options.blurStrength;
  state.quality = options.quality;
  state.canvas = canvas;

  const renderer = new WebGLRenderer(canvas, width, height);
  state.renderer = renderer;

  state.qualityController = new QualityController(options.targetFps ?? 30);
  if (state.quality === 'auto') {
    state.qualityController.setTier(options.initialTier);
  } else {
    state.qualityController.setTier(state.quality);
  }

  const initialTier = options.quality === 'auto' ? options.initialTier : options.quality;
  const modelPath = resolveSegmentationModelPath(
    initialTier,
    options.segmentationModelByTier,
    options.segmentationModelPath,
  );
  state.segmenter = new Segmenter(modelPath, 'GPU', canvas);
  try {
    await state.segmenter.init();
    state.currentModelPath = modelPath;
  } catch (error) {
    console.warn('[bgfx.worker] Segmenter init failed, running in bypass mode.', error);
    postMessage({type: 'segmenterError', error: String(error)} as WorkerResponse);
    state.segmenter = null;
    state.currentModelPath = null;
  }

  bindContextLossHandlers(canvas);
}

export async function handleBackgroundImage(bitmap: ImageBitmap | null, width: number, height: number): Promise<void> {
  if (!bitmap) {
    state.background?.close();
    state.background = null;
    state.backgroundSize = null;
    return;
  }
  state.background?.close();
  state.background = bitmap;
  state.backgroundSize = {width, height};
}

export function cleanup(): void {
  state.segmenter?.close();
  state.segmenter = null;
  state.renderer?.destroy();
  state.renderer = null;
  state.background?.close();
  state.background = null;
  state.canvas = null;
  state.contextLost = false;
  resetContextLossHandlers();
}
