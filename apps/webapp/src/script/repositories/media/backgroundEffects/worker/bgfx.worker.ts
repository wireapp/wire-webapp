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

/**
 * Background Effects Web Worker
 *
 * This Web Worker processes video frames in a background thread to avoid blocking
 * the main thread. It handles:
 * - ML-based person segmentation (MediaPipe Selfie Segmentation)
 * - GPU-accelerated rendering (WebGL2 via OffscreenCanvas)
 * - Adaptive quality control
 * - Background blur and virtual background effects
 *
 * Communication with the main thread is via postMessage/onmessage using
 * structured cloneable types (ImageBitmap, OffscreenCanvas).
 */

import {state} from './backgroundEffectsWorkerState';
import {handleFrame} from './frameProcessor';
import {cleanup, handleBackgroundImage, handleInit} from './handlers';

import type {WorkerMessage, WorkerResponse} from '../backgroundEffectsWorkerTypes';

self.addEventListener('error', event => {
  try {
    postMessage({
      type: 'workerError',
      reason: 'error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    } as WorkerResponse);
  } catch {
    // ignore
  }
});

self.addEventListener('unhandledrejection', event => {
  try {
    postMessage({
      type: 'workerError',
      reason: 'unhandledrejection',
      message: String(event.reason),
    } as WorkerResponse);
  } catch {
    // ignore
  }
});

/**
 * Main message handler for worker communication.
 *
 * Handles all message types from the main thread:
 * - 'init': Initialize renderer, segmenter, and quality controller
 * - 'frame': Process a video frame (segmentation + rendering)
 * - 'setMode': Update effect mode (blur/virtual/passthrough)
 * - 'setBlurStrength': Update blur strength parameter
 * - 'setDebugMode': Update debug visualization mode
 * - 'setQuality': Update quality mode (auto or fixed tier)
 * - 'setDroppedFrames': Update dropped frame counter
 * - 'setBackgroundImage': Set background image for virtual background
 * - 'setBackgroundVideo': Set background video for virtual background
 * - 'stop': Clean up resources and terminate
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  switch (message.type) {
    case 'init':
      await handleInit(message.canvas, message.width, message.height, message.options);
      postMessage({type: 'ready'} as WorkerResponse);
      break;
    case 'frame':
      try {
        await handleFrame(message.frame, message.timestamp, message.width, message.height);
      } catch {
        // Increment dropped frame counter on processing errors
        state.metrics.droppedFrames += 1;
      } finally {
        // Always notify main thread that frame processing completed
        postMessage({type: 'frameProcessed'} as WorkerResponse);
      }
      break;
    case 'setMode':
      state.mode = message.mode ?? state.mode;
      break;
    case 'setBlurStrength':
      state.blurStrength = message.blurStrength ?? state.blurStrength;
      break;
    case 'setDebugMode':
      state.debugMode = message.debugMode ?? state.debugMode;
      break;
    case 'setQuality':
      state.quality = message.quality ?? state.quality;
      // If quality is fixed (not auto), update quality controller tier
      if (state.quality !== 'auto' && state.qualityController) {
        state.qualityController.setTier(state.quality);
      }
      break;
    case 'setDroppedFrames':
      if (typeof message.droppedFrames === 'number') {
        state.metrics.droppedFrames = message.droppedFrames;
      }
      break;
    case 'setBackgroundImage':
      await handleBackgroundImage(message.image ?? null, message.width ?? 0, message.height ?? 0);
      break;
    case 'setBackgroundVideo':
      await handleBackgroundImage(message.video ?? null, message.width ?? 0, message.height ?? 0);
      break;
    case 'stop':
      cleanup();
      break;
    default:
      break;
  }
};
