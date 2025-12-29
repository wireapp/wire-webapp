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

import type {Pipeline, PipelineConfig, PipelineInit} from './Pipeline';

import type {WorkerOptions, WorkerResponse} from '../types';

export class WorkerWebGLPipeline implements Pipeline {
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
  private lastTier: 'A' | 'B' | 'C' | 'D' | null = null;

  public async init(init: PipelineInit): Promise<void> {
    this.onMetrics = init.onMetrics;
    this.onTierChange = init.onTierChange;
    this.onDroppedFrame = init.onDroppedFrame;
    this.onWorkerSegmenterError = init.onWorkerSegmenterError ?? null;
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

  public updateConfig(config: PipelineConfig): void {
    if (!this.worker) {
      return;
    }
    this.worker.postMessage({type: 'setMode', mode: config.mode});
    this.worker.postMessage({type: 'setDebugMode', debugMode: config.debugMode});
    this.worker.postMessage({type: 'setBlurStrength', blurStrength: config.blurStrength});
    this.worker.postMessage({type: 'setQuality', quality: config.quality});
  }

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

  public setBackgroundImage(bitmap: ImageBitmap, width: number, height: number): void {
    if (!this.worker) {
      bitmap.close();
      return;
    }
    this.worker.postMessage(
      {
        type: 'setBackgroundImage',
        image: bitmap,
        width,
        height,
      },
      [bitmap],
    );
  }

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

  public clearBackground(): void {
    if (!this.worker) {
      return;
    }
    this.worker.postMessage({type: 'setBackgroundImage', image: null, width: 0, height: 0});
  }

  public notifyDroppedFrames(count: number): void {
    if (!this.worker) {
      return;
    }
    this.worker.postMessage({type: 'setDroppedFrames', droppedFrames: count});
  }

  public isOutputCanvasTransferred(): boolean {
    return this.outputCanvasTransferred;
  }

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
    this.lastTier = null;
  }
}
