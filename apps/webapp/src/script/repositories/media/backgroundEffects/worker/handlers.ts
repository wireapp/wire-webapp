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

import {state} from './backgroundEffectsWorkerState';
import {bindContextLossHandlers, resetContextLossHandlers} from './contextLoss';

import type {WorkerOptions, WorkerResponse} from '../backgroundEffectsWorkerTypes';
import {QualityController, resolveSegmentationModelPath} from '../quality';
import {WebGlRenderer} from '../renderer/webGlRenderer';
import {Segmenter} from '../segmentation/segmenter';

/**
 * Handles worker initialization message.
 *
 * Sets up the WebGL renderer, quality controller, and segmenter based on
 * the provided options. Binds context loss handlers to the canvas.
 * Initializes segmenter asynchronously if needed (non-bypass tier).
 *
 * If segmenter initialization fails, sends 'segmenterError' message to
 * main thread and continues in bypass mode.
 *
 * @param canvas - OffscreenCanvas for WebGL rendering.
 * @param width - Initial canvas width in pixels.
 * @param height - Initial canvas height in pixels.
 * @param options - Worker initialization options.
 * @returns Promise that resolves when initialization is complete.
 */
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

  const renderer = new WebGlRenderer(canvas, width, height);
  state.renderer = renderer;

  state.qualityController = new QualityController(options.targetFps ?? 15);
  if (state.quality === 'auto') {
    state.qualityController.setTier(options.initialTier);
  } else {
    state.qualityController.setTier(state.quality);
  }

  const initialTier = options.quality === 'auto' ? options.initialTier : options.quality;
  const shouldInitSegmenter = initialTier !== 'bypass' && options.mode !== 'passthrough';
  if (shouldInitSegmenter) {
    const modelPath = resolveSegmentationModelPath(
      initialTier,
      options.segmentationModelByTier,
      options.segmentationModelPath,
    );
    state.segmenterInitPromise = (async () => {
      const segmenter = new Segmenter(modelPath, 'GPU', canvas);
      try {
        await segmenter.init();
        state.segmenter?.close();
        state.segmenter = segmenter;
        state.currentModelPath = modelPath;
      } catch (error) {
        console.warn('[bgfx.worker] Segmenter init failed, running in bypass mode.', error);
        postMessage({type: 'segmenterError', error: String(error)} as WorkerResponse);
        segmenter.close();
        state.segmenter = null;
        state.currentModelPath = null;
      } finally {
        state.segmenterInitPromise = null;
      }
    })();
  } else {
    state.segmenter = null;
    state.currentModelPath = null;
    state.segmenterInitPromise = null;
  }

  bindContextLossHandlers(canvas);
}

/**
 * Handles background image update message.
 *
 * Stores the background image bitmap and dimensions for virtual background
 * mode. Closes any existing background bitmap before storing the new one.
 * If null is provided, clears the background.
 *
 * @param bitmap - Background image as ImageBitmap, or null to clear.
 * @param width - Image width in pixels.
 * @param height - Image height in pixels.
 * @returns Promise that resolves immediately.
 */
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

/**
 * Cleans up all worker resources.
 *
 * Closes segmenter, destroys renderer, releases background bitmap, clears
 * canvas reference, resets context loss state, and unbinds context loss handlers.
 * Should be called when the worker is being stopped.
 *
 * @returns Nothing.
 */
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
