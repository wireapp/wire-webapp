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
 * MediaPipe-based person segmentation for background effects.
 *
 * This module provides a wrapper around MediaPipe's ImageSegmenter that:
 * - Performs real-time person/background separation using ML models
 * - Supports both CPU and GPU-accelerated inference
 * - Handles frame resizing and mask format conversion
 * - Works in both main thread and Web Worker contexts
 */

import {FilesetResolver, ImageSegmenter} from '@mediapipe/tasks-vision';

/**
 * Result of a segmentation operation.
 */
export interface SegmentationResult {
  /** Segmentation mask as ImageBitmap, or null if segmentation failed. */
  mask: ImageBitmap | null;
  /** Width of the mask in pixels. */
  width: number;
  /** Height of the mask in pixels. */
  height: number;
  /** Time taken for segmentation in milliseconds. */
  durationMs: number;
}

/**
 * Wrapper around MediaPipe ImageSegmenter for person/background separation.
 *
 * This class provides a simplified interface to MediaPipe's segmentation model,
 * handling frame preprocessing, mask format conversion, and resource management.
 * It supports both CPU and GPU inference delegates, and works in both main thread
 * and Web Worker environments (using OffscreenCanvas when available).
 *
 * The segmenter uses MediaPipe's Selfie Segmentation model to generate confidence
 * masks that separate foreground (person) from background.
 */
export class Segmenter {
  /** MediaPipe ImageSegmenter instance. */
  private segmenter: ImageSegmenter | null = null;
  /** Canvas for resizing input frames to segmentation resolution. */
  private resizeCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  /** 2D context for resize canvas. */
  private resizeCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;
  /** Canvas for rendering the final mask. */
  private maskCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  /** 2D context for mask canvas. */
  private maskCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null;
  /** Current segmentation resolution width in pixels. */
  private width = 0;
  /** Current segmentation resolution height in pixels. */
  private height = 0;
  /** Base path for MediaPipe WASM files. */
  private readonly wasmBasePath = '/min/mediapipe/wasm';

  /**
   * Creates a new segmenter instance.
   *
   * @param modelPath - Path to the MediaPipe segmentation model file.
   * @param delegate - Inference delegate ('CPU' or 'GPU'). GPU is faster but requires
   *                  WebGL support. Defaults to 'CPU' for broader compatibility.
   */
  constructor(
    private readonly modelPath: string,
    private readonly delegate: 'CPU' | 'GPU' = 'CPU',
  ) {}

  /**
   * Initializes the MediaPipe segmenter with the specified model.
   *
   * This method:
   * 1. Probes for required assets (WASM files and model)
   * 2. Resolves MediaPipe fileset
   * 3. Creates the ImageSegmenter instance with video mode and confidence masks
   *
   * Must be called before using segment(). The segmenter is configured for
   * video mode (temporal consistency) and outputs confidence masks (0-1 values).
   *
   * @throws May throw if model files are missing or initialization fails.
   */
  public async init(): Promise<void> {
    console.info(`[Segmenter] init delegate=${this.delegate} model=${this.modelPath}`);
    // Probe for required assets (non-blocking, logs warnings if missing)
    await this.probeAsset(`${this.wasmBasePath}/vision_wasm_internal.wasm`, 'MediaPipe wasm');
    await this.probeAsset(this.modelPath, 'segmentation model');
    // Resolve MediaPipe fileset
    const fileset = await FilesetResolver.forVisionTasks(this.wasmBasePath);
    // Create segmenter with video mode and confidence masks
    this.segmenter = await ImageSegmenter.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: this.modelPath,
        delegate: this.delegate,
      },
      runningMode: 'VIDEO', // Video mode for temporal consistency
      outputCategoryMask: false, // We only need confidence masks
      outputConfidenceMasks: true, // Confidence values (0-1) for smooth edges
    });
  }

  /**
   * Configures the segmenter for a specific resolution.
   *
   * Creates or updates the resize and mask canvases to match the specified
   * dimensions. Uses OffscreenCanvas when available (Web Worker context),
   * otherwise falls back to HTMLCanvasElement (main thread).
   *
   * This method is idempotent - if dimensions haven't changed, it returns early.
   * Should be called whenever the segmentation resolution changes (e.g., when
   * quality tier changes).
   *
   * @param width - Target segmentation width in pixels.
   * @param height - Target segmentation height in pixels.
   */
  public configure(width: number, height: number): void {
    // Early return if dimensions unchanged
    if (this.width === width && this.height === height) {
      return;
    }
    this.width = width;
    this.height = height;

    // Use OffscreenCanvas in Web Worker, HTMLCanvasElement on main thread
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
    // Get 2D rendering contexts for both canvases
    this.resizeCtx = this.resizeCanvas.getContext('2d') as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
    this.maskCtx = this.maskCanvas.getContext('2d') as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
  }

  /**
   * Segments a video frame to extract person/background mask.
   *
   * Processing pipeline:
   * 1. Resize input frame to segmentation resolution
   * 2. Run MediaPipe segmentation (with temporal consistency in video mode)
   * 3. Convert MediaPipe mask format to ImageData
   * 4. Render mask to canvas and create ImageBitmap
   * 5. Measure processing time
   *
   * The timestamp is used by MediaPipe for temporal smoothing between frames.
   * All MediaPipe mask resources are automatically closed to prevent leaks.
   *
   * @param frame - Input video frame as ImageBitmap.
   * @param timestampMs - Frame timestamp in milliseconds (monotonic, for temporal consistency).
   * @returns Segmentation result with mask, dimensions, and processing time.
   */
  public async segment(frame: ImageBitmap, timestampMs: number): Promise<SegmentationResult> {
    // Validate segmenter and canvases are initialized
    if (!this.segmenter || !this.resizeCtx || !this.maskCtx || !this.resizeCanvas || !this.maskCanvas) {
      return {mask: null, width: 0, height: 0, durationMs: 0};
    }

    const start = performance.now();
    let masks: any[] = [];
    try {
      // Step 1: Resize input frame to segmentation resolution
      this.resizeCtx.drawImage(frame, 0, 0, this.width, this.height);

      // Step 2: Run MediaPipe segmentation (video mode uses timestamp for temporal smoothing)
      const result = this.segmenter.segmentForVideo(this.resizeCanvas, timestampMs);
      masks = result.confidenceMasks ?? [];
      // Step 3: Convert MediaPipe mask format to ImageData
      const maskImage = this.maskToImageData(masks[0] ?? null);

      // Step 4: Render mask to canvas
      this.maskCtx.clearRect(0, 0, this.width, this.height);
      if (maskImage) {
        this.maskCtx.putImageData(maskImage, 0, 0);
      }

      // Step 5: Create ImageBitmap from mask canvas
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
      // Step 6: Clean up MediaPipe mask resources to prevent memory leaks
      masks.forEach(mask => {
        try {
          mask?.close();
        } catch {
          // Ignore errors when closing (mask may already be closed)
        }
      });
    }
  }

  /**
   * Closes the segmenter and releases all resources.
   *
   * Should be called when the segmenter is no longer needed to free GPU/CPU
   * resources and prevent memory leaks. After calling close(), the segmenter
   * cannot be used again (init() must be called on a new instance).
   */
  public close(): void {
    this.segmenter?.close();
    this.segmenter = null;
  }

  /**
   * Converts MediaPipe mask format to ImageData.
   *
   * MediaPipe masks can be provided in different formats:
   * - ImageData (direct conversion)
   * - Float32Array (0-1 range, normalized)
   * - Uint8Array (0-255 range, already scaled)
   *
   * This method handles all formats and normalizes them to ImageData with
   * RGBA channels (grayscale mask in RGB, alpha = 255).
   *
   * @param mask - MediaPipe mask object (format varies by MediaPipe version).
   * @returns ImageData representation of the mask, or null if mask is invalid.
   */
  private maskToImageData(mask: any): ImageData | null {
    if (!mask) {
      return null;
    }
    // Direct ImageData format (preferred, no conversion needed)
    if (typeof mask.getAsImageData === 'function') {
      return mask.getAsImageData();
    }
    // Float32Array format (0-1 range, needs normalization)
    if (typeof mask.getAsFloat32Array === 'function') {
      const data = mask.getAsFloat32Array() as Float32Array;
      return this.buildMaskImageData(data, 1);
    }
    // Uint8Array format (0-255 range, already scaled)
    if (typeof mask.getAsUint8Array === 'function') {
      const data = mask.getAsUint8Array() as Uint8Array;
      return this.buildMaskImageData(data, 255);
    }
    return null;
  }

  /**
   * Builds ImageData from raw mask array data.
   *
   * Converts a 1D array of mask values to RGBA ImageData format:
   * - Normalizes values to 0-1 range based on scale parameter
   * - Clamps values to valid range
   * - Converts to 0-255 grayscale values
   * - Creates RGBA format (grayscale in RGB channels, alpha = 255)
   *
   * @param data - Raw mask data array (Float32Array or Uint8Array).
   * @param scale - Scale factor to normalize data (1 for Float32Array, 255 for Uint8Array).
   * @returns ImageData with grayscale mask in RGBA format.
   */
  private buildMaskImageData(data: ArrayLike<number>, scale: number): ImageData {
    const width = this.width;
    const height = this.height;
    const imageData = new ImageData(width, height);
    const out = imageData.data;
    // Handle cases where data length doesn't match dimensions
    const count = Math.min(data.length, width * height);
    for (let i = 0; i < count; i += 1) {
      // Normalize to 0-1 range
      const raw = data[i] / scale;
      // Clamp to valid range
      const clamped = Math.max(0, Math.min(1, raw));
      // Convert to 0-255 grayscale
      const value = Math.round(clamped * 255);
      // Write to RGBA channels (grayscale mask)
      const idx = i * 4;
      out[idx] = value; // R
      out[idx + 1] = value; // G
      out[idx + 2] = value; // B
      out[idx + 3] = 255; // A (fully opaque)
    }
    return imageData;
  }

  /**
   * Probes for asset availability (non-blocking check).
   *
   * Performs a HEAD request to verify that required assets (WASM files,
   * model files) are available. This is a diagnostic check that logs
   * warnings if assets are missing, but doesn't fail initialization.
   *
   * Useful for debugging missing files in development environments.
   *
   * @param url - URL of the asset to check.
   * @param label - Human-readable label for logging (e.g., 'MediaPipe wasm').
   */
  private async probeAsset(url: string, label: string): Promise<void> {
    // Skip probe if fetch is unavailable (e.g., Node.js environment)
    if (typeof fetch !== 'function') {
      return;
    }
    try {
      // Use HEAD request to check availability without downloading
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
