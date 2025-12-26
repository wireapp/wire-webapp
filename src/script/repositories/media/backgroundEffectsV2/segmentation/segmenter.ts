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

import {FilesetResolver, ImageSegmenter} from '@mediapipe/tasks-vision';

export interface SegmentationResult {
  mask: ImageBitmap | null;
  width: number;
  height: number;
  durationMs: number;
}

export class Segmenter {
  private segmenter: ImageSegmenter | null = null;
  private resizeCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  private resizeCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;
  private maskCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  private maskCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private readonly wasmBasePath = '/min/mediapipe/wasm';

  constructor(
    private readonly modelPath: string,
    private readonly delegate: 'CPU' | 'GPU' = 'CPU',
  ) {}

  public async init(): Promise<void> {
    console.info(`[Segmenter] init delegate=${this.delegate} model=${this.modelPath}`);
    await this.probeAsset(`${this.wasmBasePath}/vision_wasm_internal.wasm`, 'MediaPipe wasm');
    await this.probeAsset(this.modelPath, 'segmentation model');
    const fileset = await FilesetResolver.forVisionTasks(this.wasmBasePath);
    this.segmenter = await ImageSegmenter.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: this.modelPath,
        delegate: this.delegate,
      },
      runningMode: 'VIDEO',
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
  }

  public configure(width: number, height: number): void {
    if (this.width === width && this.height === height) {
      return;
    }
    this.width = width;
    this.height = height;

    if (typeof OffscreenCanvas !== 'undefined') {
      this.resizeCanvas = new OffscreenCanvas(width, height);
      this.maskCanvas = new OffscreenCanvas(width, height);
    } else {
      const resize = document.createElement('canvas');
      const mask = document.createElement('canvas');
      resize.width = width;
      resize.height = height;
      mask.width = width;
      mask.height = height;
      this.resizeCanvas = resize;
      this.maskCanvas = mask;
    }
    this.resizeCtx = this.resizeCanvas.getContext('2d');
    this.maskCtx = this.maskCanvas.getContext('2d');
  }

  public async segment(frame: ImageBitmap, timestampMs: number): Promise<SegmentationResult> {
    if (!this.segmenter || !this.resizeCtx || !this.maskCtx || !this.resizeCanvas || !this.maskCanvas) {
      return {mask: null, width: 0, height: 0, durationMs: 0};
    }

    const start = performance.now();
    let masks: any[] = [];
    try {
      this.resizeCtx.drawImage(frame, 0, 0, this.width, this.height);

      const result = this.segmenter.segmentForVideo(this.resizeCanvas, timestampMs);
      masks = result.confidenceMasks ?? [];
      const maskImage = this.maskToImageData(masks[0] ?? null);

      this.maskCtx.clearRect(0, 0, this.width, this.height);
      if (maskImage) {
        this.maskCtx.putImageData(maskImage, 0, 0);
      }

      const mask = await createImageBitmap(this.maskCanvas);
      const durationMs = performance.now() - start;
      return {
        mask,
        width: this.width,
        height: this.height,
        durationMs,
      };
    } catch (error) {
      console.warn('[Segmenter] segment failed', error);
      return {mask: null, width: 0, height: 0, durationMs: performance.now() - start};
    } finally {
      // Ensure all masks are closed to prevent resource leaks
      masks.forEach(mask => {
        try {
          mask?.close();
        } catch {
          // Ignore errors when closing
        }
      });
    }
  }

  public close(): void {
    this.segmenter?.close();
    this.segmenter = null;
  }

  private maskToImageData(mask: any): ImageData | null {
    if (!mask) {
      return null;
    }
    if (typeof mask.getAsImageData === 'function') {
      return mask.getAsImageData();
    }
    if (typeof mask.getAsFloat32Array === 'function') {
      const data = mask.getAsFloat32Array() as Float32Array;
      return this.buildMaskImageData(data, 1);
    }
    if (typeof mask.getAsUint8Array === 'function') {
      const data = mask.getAsUint8Array() as Uint8Array;
      return this.buildMaskImageData(data, 255);
    }
    return null;
  }

  private buildMaskImageData(data: ArrayLike<number>, scale: number): ImageData {
    const width = this.width;
    const height = this.height;
    const imageData = new ImageData(width, height);
    const out = imageData.data;
    const count = Math.min(data.length, width * height);
    for (let i = 0; i < count; i += 1) {
      const raw = data[i] / scale;
      const clamped = Math.max(0, Math.min(1, raw));
      const value = Math.round(clamped * 255);
      const idx = i * 4;
      out[idx] = value;
      out[idx + 1] = value;
      out[idx + 2] = value;
      out[idx + 3] = 255;
    }
    return imageData;
  }

  private async probeAsset(url: string, label: string): Promise<void> {
    if (typeof fetch !== 'function') {
      return;
    }
    try {
      const response = await fetch(url, {method: 'HEAD'});
      if (!response.ok) {
        console.warn(`[Segmenter] ${label} check failed (${response.status}): ${url}`);
      } else {
        console.info(`[Segmenter] ${label} available: ${url}`);
      }
    } catch (error) {
      console.warn(`[Segmenter] ${label} check error: ${url}`, error);
    }
  }
}
