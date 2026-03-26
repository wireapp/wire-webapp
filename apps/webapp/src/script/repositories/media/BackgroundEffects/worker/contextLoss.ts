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

import {backgroundEffectsWorkerState} from './backgroundEffectsWorkerState';

import {resolveSegmentationModelPath} from '../quality';
import {WebGLRenderer} from '../renderer/WebGLRenderer';
import {Segmenter} from '../segmentation/segmenter';
import type {WorkerResponse} from '../types';

let contextHandlersBound = false;

/**
 * Binds WebGL context loss and restoration event handlers to the canvas.
 *
 * Registers event listeners for 'webglcontextlost' and 'webglcontextrestored'
 * events. Only binds handlers once per canvas to avoid duplicate listeners.
 * Prevents default context loss behavior to allow graceful recovery.
 *
 * @param canvas - OffscreenCanvas to bind handlers to.
 * @returns Nothing.
 */
export function bindContextLossHandlers(canvas: OffscreenCanvas): void {
  if (contextHandlersBound || typeof canvas.addEventListener !== 'function') {
    return;
  }
  canvas.addEventListener('webglcontextlost', handleContextLost as EventListener);
  canvas.addEventListener('webglcontextrestored', handleContextRestored as EventListener);
  contextHandlersBound = true;
}

/**
 * Resets the context loss handlers binding state.
 *
 * Allows handlers to be rebound after cleanup. Called when the worker
 * is stopped to prepare for potential reinitialization.
 *
 * @returns Nothing.
 */
export function resetContextLossHandlers(): void {
  contextHandlersBound = false;
}

/**
 * Handles WebGL context loss event.
 *
 * Prevents default context loss behavior, marks context as lost in state,
 * notifies the main thread via postMessage, and cleans up renderer and
 * segmenter resources. The main thread should handle fallback to another pipeline.
 *
 * @param event - WebGL context lost event.
 * @returns Nothing.
 */
function handleContextLost(event: Event): void {
  event.preventDefault();
  backgroundEffectsWorkerState.contextLost = true;
  postMessage({type: 'contextLost'} as WorkerResponse);
  try {
    backgroundEffectsWorkerState.renderer?.destroy();
  } catch (error) {
    console.warn('[bgfx.worker] Failed to destroy renderer after context loss', error);
  }
  backgroundEffectsWorkerState.renderer = null;
  backgroundEffectsWorkerState.segmenter?.close();
  backgroundEffectsWorkerState.segmenter = null;
}

/**
 * Handles WebGL context restoration event.
 *
 * Recreates the WebGL renderer and reinitializes the segmenter if needed.
 * Restores the previous quality tier and mode. If restoration fails, marks
 * context as lost and notifies the main thread.
 *
 * @returns Promise that resolves when context restoration is complete.
 */
async function handleContextRestored(): Promise<void> {
  if (!backgroundEffectsWorkerState.canvas || !backgroundEffectsWorkerState.options) {
    return;
  }
  try {
    backgroundEffectsWorkerState.renderer = new WebGLRenderer(
      backgroundEffectsWorkerState.canvas,
      backgroundEffectsWorkerState.width,
      backgroundEffectsWorkerState.height,
    );
  } catch (error) {
    console.warn('[bgfx.worker] Renderer restore failed', error);
    backgroundEffectsWorkerState.renderer = null;
    backgroundEffectsWorkerState.contextLost = true;
    return;
  }

  backgroundEffectsWorkerState.contextLost = false;
  const tier =
    backgroundEffectsWorkerState.metrics?.tier ??
    (backgroundEffectsWorkerState.quality === 'auto'
      ? backgroundEffectsWorkerState.options.initialTier
      : backgroundEffectsWorkerState.quality);
  if (tier === 'bypass' || backgroundEffectsWorkerState.mode === 'passthrough') {
    backgroundEffectsWorkerState.segmenter?.close();
    backgroundEffectsWorkerState.segmenter = null;
    backgroundEffectsWorkerState.currentModelPath = null;
    return;
  }
  const modelPath = resolveSegmentationModelPath(
    tier,
    backgroundEffectsWorkerState.options.segmentationModelByTier,
    backgroundEffectsWorkerState.options.segmentationModelPath,
  );
  backgroundEffectsWorkerState.segmenter?.close();
  backgroundEffectsWorkerState.segmenter = new Segmenter(
    modelPath,
    'GPU',
    backgroundEffectsWorkerState.canvas ?? undefined,
  );
  try {
    await backgroundEffectsWorkerState.segmenter.init();
    backgroundEffectsWorkerState.currentModelPath = modelPath;
  } catch (error) {
    console.warn('[bgfx.worker] Segmenter restore failed', error);
    backgroundEffectsWorkerState.segmenter = null;
    backgroundEffectsWorkerState.currentModelPath = null;
  }
}
