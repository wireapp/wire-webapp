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

import type {CapabilityInfo} from '../backgroundEffectsWorkerTypes';
import {Runtime} from "@wireapp/commons";

/**
 * Detects browser capabilities required for background effects rendering.
 *
 * This function performs runtime feature detection for web APIs needed by
 * different rendering pipelines. Detection is performed synchronously and
 * is safe to call in any environment (browser, worker, Node.js).
 *
 * Detection methods:
 * - OffscreenCanvas: Checks for global OffscreenCanvas constructor
 * - Worker: Checks for global Worker constructor
 * - WebGL2: Creates a test canvas and attempts to get WebGL2 context
 * - requestVideoFrameCallback: Checks for method on HTMLVideoElement prototype
 *
 * @returns Capability information object with boolean flags for each capability.
 *
 * @example
 * ```typescript
 * const caps = detectCapabilities();
 * if (caps.webgl2 && caps.worker && caps.offscreenCanvas) {
 *   // Can use worker-based WebGL2 pipeline
 * }
 * ```
 */
export function detectCapabilities(): CapabilityInfo {
  // Check for OffscreenCanvas support (enables worker-based rendering)
  const offscreenCanvas = typeof OffscreenCanvas !== 'undefined';
  // Check for Web Worker support (enables background thread processing)
  const worker = typeof Worker !== 'undefined';
  // Check for requestVideoFrameCallback (better than requestAnimationFrame for video)
  const requestVideoFrameCallback =
    typeof HTMLVideoElement !== 'undefined' && 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  // Check for WebGL2 support (requires DOM for canvas creation)
  const webgl2 = (() => {
    if (typeof document === 'undefined') {
      return false;
    }
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  })();

  return {
    offscreenCanvas,
    worker,
    webgl2,
    requestVideoFrameCallback,
  };
}

/**
 * Selects the optimal rendering pipeline based on browser capabilities.
 *
 * BackgroundEffectsRenderingPipeline selection follows a priority order, selecting the highest-quality
 * pipeline that the browser supports:
 *
 * 1. **worker-webgl2** (highest quality, best performance)
 *    - Requires: WebGL2, Worker, OffscreenCanvas, and preferWorker=true
 *    - Benefits: Offloads rendering to background thread, avoids main thread blocking
 *
 * 2. **main-webgl2** (high quality, good performance)
 *    - Requires: WebGL2
 *    - Benefits: GPU-accelerated rendering with advanced effects
 *    - Trade-off: Runs on main thread (may impact UI responsiveness)
 *
 * 3. **canvas2d** (medium quality, acceptable performance)
 *    - Requires: Document/DOM (browser environment)
 *    - Benefits: Widely supported, no WebGL requirement
 *    - Trade-off: CPU-based rendering, limited effects quality
 *
 * 4. **passthrough** (no processing, fallback only)
 *    - Used when: No DOM available or all other pipelines unavailable
 *    - Behavior: Passes through original video track unchanged
 *
 * @param cap - Capability information from detectCapabilities().
 * @param preferWorker - If true, prefers worker-based pipeline when available.
 *                      If false, skips worker pipeline even if supported.
 * @returns The selected pipeline identifier.
 *
 * @example
 * ```typescript
 * const caps = detectCapabilities();
 * const pipeline = choosePipeline(caps, true);
 * // pipeline will be one of: 'worker-webgl2', 'main-webgl2', 'canvas2d', 'passthrough'
 * ```
 */
export function choosePipeline(
  cap: CapabilityInfo,
  preferWorker: boolean,
): 'worker-webgl2' | 'main-webgl2' | 'canvas2d' | 'passthrough' {
  // Priority 1: Worker + OffscreenCanvas + WebGL2 (best performance)
  if (cap.webgl2 && cap.worker && cap.offscreenCanvas && preferWorker && !Runtime.isFirefox()) {
    return 'worker-webgl2';
  }
  // Priority 2: Main-thread WebGL2 (GPU-accelerated, but blocks main thread)
  if (cap.webgl2) {
    return 'main-webgl2';
  }
  // Priority 3: Canvas2D (CPU-based, widely supported)
  if (typeof document !== 'undefined') {
    return 'canvas2d';
  }
  // Priority 4: Passthrough (no processing, last resort)
  return 'passthrough';
}
