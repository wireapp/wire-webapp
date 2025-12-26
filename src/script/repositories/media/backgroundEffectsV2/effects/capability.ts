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

export interface CapabilityInfo {
  offscreenCanvas: boolean;
  worker: boolean;
  webgl2: boolean;
  requestVideoFrameCallback: boolean;
  webcodecs: boolean;
}

export function detectCapabilities(): CapabilityInfo {
  const offscreenCanvas = typeof OffscreenCanvas !== 'undefined';
  const worker = typeof Worker !== 'undefined';
  const requestVideoFrameCallback =
    typeof HTMLVideoElement !== 'undefined' && 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  const webgl2 = (() => {
    if (typeof document === 'undefined') {
      return false;
    }
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  })();
  const webcodecs = typeof (window as any)?.VideoFrame !== 'undefined';

  return {
    offscreenCanvas,
    worker,
    webgl2,
    requestVideoFrameCallback,
    webcodecs,
  };
}

export function choosePipeline(
  cap: CapabilityInfo,
  preferWorker: boolean,
): 'worker-webgl2' | 'main-webgl2' | 'canvas2d' | 'passthrough' {
  if (cap.webgl2 && cap.worker && cap.offscreenCanvas && preferWorker) {
    return 'worker-webgl2';
  }
  if (cap.webgl2) {
    return 'main-webgl2';
  }
  if (typeof document !== 'undefined') {
    return 'canvas2d';
  }
  return 'passthrough';
}
