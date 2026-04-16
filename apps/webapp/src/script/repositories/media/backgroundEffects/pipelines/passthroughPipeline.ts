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

import type {
  BackgroundEffectsRenderingPipeline,
  PipelineConfig,
  PipelineInit,
} from './backgroundEffectsRenderingPipeline';

/**
 * Passthrough pipeline that renders frames without any processing.
 *
 * This pipeline serves as a fallback when other pipelines are unavailable
 * or when passthrough mode is explicitly requested. It simply copies input
 * frames to the output canvas without applying any background effects.
 *
 * Use cases:
 * - Fallback when WebGL2/Canvas2D unavailable
 * - Explicit passthrough mode (no effects)
 * - Error recovery after pipeline failures
 */
export class PassthroughPipeline implements BackgroundEffectsRenderingPipeline {
  public readonly type = 'passthrough' as const;
  private outputCanvas: HTMLCanvasElement | null = null;

  /**
   * Initializes the passthrough pipeline.
   *
   * Stores a reference to the output canvas. No other initialization is needed
   * since no processing resources are required.
   *
   * @param init - BackgroundEffectsRenderingPipeline initialization parameters.
   * @returns Promise that resolves immediately.
   */
  public async init(init: PipelineInit): Promise<void> {
    this.outputCanvas = init.outputCanvas;
  }

  /**
   * Updates pipeline configuration (no-op for passthrough).
   *
   * Passthrough pipeline ignores all configuration changes since it doesn't
   * apply any effects or processing.
   *
   * @param _config - New configuration (ignored).
   */
  public updateConfig(_config: PipelineConfig): void {
    // No-op.
  }

  /**
   * Processes a frame by copying it directly to the output canvas.
   *
   * Draws the input frame to the output canvas using Canvas2D without
   * any processing or effects applied. The frame is closed after drawing.
   *
   * @param frame - Input video frame as ImageBitmap.
   * @param _timestamp - Frame timestamp (unused).
   * @param width - Frame width in pixels.
   * @param height - Frame height in pixels.
   * @returns Promise that resolves immediately after drawing.
   */
  public async processFrame(frame: ImageBitmap, _timestamp: number, width: number, height: number): Promise<void> {
    if (!this.outputCanvas) {
      frame.close();
      return;
    }
    const ctx = this.outputCanvas.getContext('2d');
    if (!ctx) {
      frame.close();
      return;
    }
    ctx.drawImage(frame, 0, 0, width, height);
    frame.close();
  }

  /**
   * Sets background image (no-op, closes bitmap immediately).
   *
   * Passthrough pipeline doesn't use backgrounds, so the bitmap is
   * immediately closed to prevent memory leaks.
   *
   * @param bitmap - Background image bitmap (closed immediately).
   * @param _width - Image width (unused).
   * @param _height - Image height (unused).
   */
  public setBackgroundImage(bitmap: ImageBitmap, _width: number, _height: number): void {
    bitmap.close();
  }

  /**
   * Sets background video frame (no-op, closes bitmap immediately).
   *
   * Passthrough pipeline doesn't use backgrounds, so the bitmap is
   * immediately closed to prevent memory leaks.
   *
   * @param bitmap - Background video frame bitmap (closed immediately).
   * @param _width - Frame width (unused).
   * @param _height - Frame height (unused).
   */
  public setBackgroundVideoFrame(bitmap: ImageBitmap, _width: number, _height: number): void {
    bitmap.close();
  }

  /**
   * Clears background (no-op for passthrough).
   *
   * Passthrough pipeline doesn't maintain background state.
   */
  public clearBackground(): void {
    // No-op.
  }

  /**
   * Notifies of dropped frames (no-op for passthrough).
   *
   * Passthrough pipeline doesn't track dropped frames since it has
   * minimal processing overhead.
   *
   * @param _count - Dropped frame count (ignored).
   */
  public notifyDroppedFrames(_count: number): void {
    // No-op.
  }

  /**
   * Returns whether output canvas is transferred (always false).
   *
   * Passthrough pipeline always runs on the main thread.
   *
   * @returns Always false.
   */
  public isOutputCanvasTransferred(): boolean {
    return false;
  }

  /**
   * Stops the pipeline and releases resources.
   *
   * Clears the output canvas reference. No other cleanup is needed
   * since passthrough doesn't allocate processing resources.
   */
  public stop(): void {
    this.outputCanvas = null;
  }

  public getCurrentModelPath(): string | null {
    return '';
  }
}
