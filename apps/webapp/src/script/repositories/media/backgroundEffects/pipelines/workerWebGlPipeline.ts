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

import type {QualityTier, WorkerOptions, WorkerResponse} from '../backgroundEffectsWorkerTypes';

/**
 * Worker-thread WebGL2 rendering pipeline for background effects.
 *
 * This pipeline transfers the output canvas to a Web Worker and performs
 * all processing (segmentation and rendering) in a background thread. This
 * provides the best performance by avoiding main thread blocking.
 *
 * Performance characteristics:
 * - Highest quality and performance
 * - Offloads processing to background thread (no UI blocking)
 * - Requires WebGL2, Worker, and OffscreenCanvas support
 * - Uses backpressure (single frame in flight) to prevent queue buildup
 *
 * Communication:
 * - Main thread sends frames via postMessage (ImageBitmap transferred, not cloned)
 * - Worker processes frames and renders to OffscreenCanvas
 * - Worker sends metrics and completion notifications back to main thread
 * - All configuration updates are sent via postMessage
 */
export class WorkerWebGlPipeline implements BackgroundEffectsRenderingPipeline {
  public readonly type = 'worker-webgl2' as const;
  private worker: Worker | null = null;
  private outputCanvasTransferred = false;
  private workerFrameInFlight = false;
  private workerFrameResolve: (() => void) | null = null;
  private workerFrameReject: ((error: Error) => void) | null = null;
  private onMetrics: PipelineInit['onMetrics'] = null;
  private onTierChange: PipelineInit['onTierChange'] | null = null;
  private onDroppedFrame: PipelineInit['onDroppedFrame'] | null = null;
  private onWorkerSegmenterError: PipelineInit['onWorkerSegmenterError'] | null = null;
  private onWorkerContextLoss: PipelineInit['onWorkerContextLoss'] | null = null;
  private lastTier: QualityTier | null = null;

  /**
   * Initializes the worker WebGL2 pipeline.
   *
   * Transfers the output canvas to an OffscreenCanvas, creates a Web Worker,
   * and sends initialization message with configuration. Sets up message handlers
   * for metrics, tier changes, segmenter errors, context loss, and frame completion.
   *
   * The canvas is transferred (not cloned) to the worker, so the main thread
   * can no longer access it directly after this call.
   *
   * Context loss handling:
   * - Listens for 'contextLost' messages from the worker
   * - Invokes onWorkerContextLoss callback when WebGL context is lost
   * - The callback should handle fallback to another pipeline
   *
   * @param init - BackgroundEffectsRenderingPipeline initialization parameters.
   * @returns Promise that resolves when worker initialization is complete.
   */
  public async init(init: PipelineInit): Promise<void> {
    this.onMetrics = init.onMetrics;
    this.onTierChange = init.onTierChange;
    this.onDroppedFrame = init.onDroppedFrame;
    this.onWorkerSegmenterError = init.onWorkerSegmenterError ?? null;
    this.onWorkerContextLoss = init.onWorkerContextLoss ?? null;
    this.workerFrameInFlight = false;
    this.workerFrameResolve = null;
    this.workerFrameReject = null;

    const offscreen = init.outputCanvas.transferControlToOffscreen();
    this.outputCanvasTransferred = true;
    this.worker = new Worker(new URL('../worker/bgfx.worker.ts', import.meta.url), {type: 'module'});

    const workerOptions: WorkerOptions = {
      mode: init.config.mode,
      debugMode: init.config.debugMode,
      quality: init.config.quality,
      blurStrength: init.config.blurStrength,
      segmentationModelPath: init.segmentationModelPath,
      segmentationModelByTier: init.segmentationModelByTier,
      initialTier: init.initialTier,
      targetFps: init.targetFps,
    };

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.type === 'metrics') {
        const metrics = event.data.metrics;
        if (this.lastTier !== metrics.tier) {
          this.onTierChange?.(metrics.tier);
          this.lastTier = metrics.tier;
        }
        this.onMetrics?.(metrics);
      }
      if (event.data.type === 'segmenterError') {
        this.onWorkerSegmenterError?.(event.data.error);
      }
      if (event.data.type === 'workerError') {
        this.onWorkerContextLoss?.();
      }
      if (event.data.type === 'contextLost') {
        this.onWorkerContextLoss?.();
      }
      if (event.data.type === 'frameProcessed') {
        this.workerFrameInFlight = false;
        this.workerFrameResolve?.();
        this.workerFrameResolve = null;
        this.workerFrameReject = null;
      }
    };

    this.worker.postMessage(
      {
        type: 'init',
        canvas: offscreen,
        width: init.outputCanvas.width,
        height: init.outputCanvas.height,
        devicePixelRatio: window.devicePixelRatio,
        options: workerOptions,
      },
      [offscreen],
    );
  }

  /**
   * Updates pipeline configuration at runtime.
   *
   * Sends configuration updates to the worker via postMessage. The worker
   * applies these changes without reinitializing. If the worker is not
   * initialized, this method does nothing.
   *
   * @param config - New pipeline configuration.
   */
  public updateConfig(config: PipelineConfig): void {
    if (!this.worker) {
      return;
    }
    this.worker.postMessage({type: 'setMode', mode: config.mode});
    this.worker.postMessage({type: 'setDebugMode', debugMode: config.debugMode});
    this.worker.postMessage({type: 'setBlurStrength', blurStrength: config.blurStrength});
    this.worker.postMessage({type: 'setQuality', quality: config.quality});
  }

  /**
   * Processes a video frame by sending it to the worker.
   *
   * Implements backpressure: if a frame is already in flight, drops the
   * new frame and increments dropped frame counter. Otherwise, transfers
   * the frame to the worker and waits for completion notification.
   *
   * The frame is transferred (not cloned) to the worker for performance.
   * The promise resolves when the worker sends 'frameProcessed' message.
   *
   * @param frame - Input video frame as ImageBitmap (transferred to worker).
   * @param timestamp - Frame timestamp in seconds.
   * @param width - Frame width in pixels.
   * @param height - Frame height in pixels.
   * @returns Promise that resolves when worker finishes processing the frame.
   */
  public async processFrame(frame: ImageBitmap, timestamp: number, width: number, height: number): Promise<void> {
    if (!this.worker) {
      frame.close();
      return;
    }

    if (this.workerFrameInFlight) {
      const droppedCount = this.onDroppedFrame ? this.onDroppedFrame() : 0;
      if (droppedCount > 0) {
        this.notifyDroppedFrames(droppedCount);
      }
      frame.close();
      return;
    }

    this.workerFrameInFlight = true;
    const done = new Promise<void>((resolve, reject) => {
      this.workerFrameResolve = resolve;
      this.workerFrameReject = reject;
    });
    this.worker.postMessage(
      {
        type: 'frame',
        frame,
        timestamp: timestamp ?? performance.now() / 1000,
        width: width ?? frame.width,
        height: height ?? frame.height,
      },
      [frame],
    );
    await done;
  }

  /**
   * Sets a static background image for virtual background mode.
   *
   * Transfers the bitmap to the worker via postMessage. The bitmap is
   * transferred (not cloned) for performance. If the worker is not
   * initialized, closes the bitmap immediately.
   *
   * @param bitmap - Background image as ImageBitmap (transferred to worker).
   * @param width - Image width in pixels.
   * @param height - Image height in pixels.
   */
  public setBackgroundImage(bitmap: ImageBitmap, width: number, height: number): void {
    if (!this.worker) {
      bitmap.close();
      return;
    }

    if (bitmap.width === 0 || bitmap.height === 0) {
      return;
    }

    try {
      this.worker.postMessage(
        {
          type: 'setBackgroundImage',
          image: bitmap,
          width,
          height,
        },
        [bitmap],
      );
    } catch {
      bitmap.close();
    }
  }

  /**
   * Sets a video frame as background for virtual background mode.
   *
   * Transfers the bitmap to the worker via postMessage with 'setBackgroundVideo'
   * message type. The bitmap is transferred (not cloned) for performance.
   * If the worker is not initialized, closes the bitmap immediately.
   *
   * @param bitmap - Background video frame as ImageBitmap (transferred to worker).
   * @param width - Frame width in pixels.
   * @param height - Frame height in pixels.
   */
  public setBackgroundVideoFrame(bitmap: ImageBitmap, width: number, height: number): void {
    if (!this.worker) {
      bitmap.close();
      return;
    }
    this.worker.postMessage(
      {
        type: 'setBackgroundVideo',
        video: bitmap,
        width,
        height,
      },
      [bitmap],
    );
  }

  /**
   * Clears the background source.
   *
   * Sends a message to the worker to clear the background. If the worker
   * is not initialized, does nothing.
   */
  public clearBackground(): void {
    if (!this.worker) {
      return;
    }
    this.worker.postMessage({type: 'setBackgroundImage', image: null, width: 0, height: 0});
  }

  /**
   * Notifies the worker of dropped frame count.
   *
   * Sends the dropped frame count to the worker for metrics tracking.
   * The worker uses this to include dropped frames in performance metrics.
   *
   * @param count - Number of dropped frames.
   */
  public notifyDroppedFrames(count: number): void {
    if (!this.worker) {
      return;
    }
    this.worker.postMessage({type: 'setDroppedFrames', droppedFrames: count});
  }

  /**
   * Returns whether output canvas is transferred (always true after init).
   *
   * The canvas is transferred to the worker during init(), so it's always
   * transferred after initialization completes.
   *
   * @returns True if canvas is transferred to worker, false if not yet initialized.
   */
  public isOutputCanvasTransferred(): boolean {
    return this.outputCanvasTransferred;
  }

  /**
   * Stops the pipeline and releases all resources.
   *
   * Rejects any pending frame promise, sends stop message to worker,
   * terminates the worker thread, and clears all references. Should be
   * called when the pipeline is no longer needed.
   */
  public stop(): void {
    if (this.workerFrameReject) {
      this.workerFrameReject(new Error('Worker stopped'));
      this.workerFrameReject = null;
      this.workerFrameResolve = null;
      this.workerFrameInFlight = false;
    }
    if (this.worker) {
      this.worker.postMessage({type: 'stop'});
      this.worker.terminate();
      this.worker = null;
    }
    this.outputCanvasTransferred = false;
    this.onMetrics = null;
    this.onTierChange = null;
    this.onDroppedFrame = null;
    this.onWorkerSegmenterError = null;
    this.onWorkerContextLoss = null;
    this.lastTier = null;
  }

  getCurrentModelPath(): string | null {
    return '';
  }
}
