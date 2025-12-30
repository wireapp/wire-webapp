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

import {state} from './state';

import {resolveSegmentationModelPath} from '../quality';
import {WebGLRenderer} from '../renderer/WebGLRenderer';
import {Segmenter} from '../segmentation/segmenter';

let contextHandlersBound = false;

export function bindContextLossHandlers(canvas: OffscreenCanvas): void {
  if (contextHandlersBound || typeof canvas.addEventListener !== 'function') {
    return;
  }
  canvas.addEventListener('webglcontextlost', handleContextLost as EventListener);
  canvas.addEventListener('webglcontextrestored', handleContextRestored as EventListener);
  contextHandlersBound = true;
}

export function resetContextLossHandlers(): void {
  contextHandlersBound = false;
}

function handleContextLost(event: Event): void {
  event.preventDefault();
  state.contextLost = true;
  try {
    state.renderer?.destroy();
  } catch (error) {
    console.warn('[bgfx.worker] Failed to destroy renderer after context loss', error);
  }
  state.renderer = null;
  state.segmenter?.close();
  state.segmenter = null;
}

async function handleContextRestored(): Promise<void> {
  if (!state.canvas || !state.options) {
    return;
  }
  try {
    state.renderer = new WebGLRenderer(state.canvas, state.width, state.height);
  } catch (error) {
    console.warn('[bgfx.worker] Renderer restore failed', error);
    state.renderer = null;
    state.contextLost = true;
    return;
  }

  state.contextLost = false;
  const tier = state.metrics?.tier ?? (state.quality === 'auto' ? state.options.initialTier : state.quality);
  if (tier === 'D' || state.mode === 'passthrough') {
    state.segmenter?.close();
    state.segmenter = null;
    state.currentModelPath = null;
    return;
  }
  const modelPath = resolveSegmentationModelPath(
    tier,
    state.options.segmentationModelByTier,
    state.options.segmentationModelPath,
  );
  state.segmenter?.close();
  state.segmenter = new Segmenter(modelPath, 'GPU', state.canvas ?? undefined);
  try {
    await state.segmenter.init();
    state.currentModelPath = modelPath;
  } catch (error) {
    console.warn('[bgfx.worker] Segmenter restore failed', error);
    state.segmenter = null;
    state.currentModelPath = null;
  }
}
