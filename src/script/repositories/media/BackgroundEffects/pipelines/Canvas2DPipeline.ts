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

import {getLogger, Logger} from 'Util/Logger';

import type {Pipeline, PipelineConfig, PipelineInit} from './Pipeline';

import {QualityController} from '../quality/QualityController';
import {NoopMaskPostProcessor} from '../segmentation/maskPostProcessor';
import type {MaskPostProcessor} from '../segmentation/maskPostProcessor';
import {MediaPipeSegmenterFactory} from '../segmentation/mediaPipeSegmenter';
import type {SegmenterLike} from '../segmentation/segmenterTypes';
import {buildMetrics, MetricsSample, pushMetricsSample} from '../shared/metrics';
import {getQualityMode, resolveQualityTier} from '../shared/quality';
import type {QualityTierParams} from '../types';

export class Canvas2DPipeline implements Pipeline {
  public readonly type = 'canvas2d' as const;
  private readonly logger: Logger;
  private outputCanvas: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private foregroundCanvas: HTMLCanvasElement | null = null;
  private foregroundCtx: CanvasRenderingContext2D | null = null;
  private segmenter: SegmenterLike | null = null;
  private maskPostProcessor: MaskPostProcessor = new NoopMaskPostProcessor();
  private qualityController: QualityController | null = null;
  private config: PipelineConfig | null = null;
  private onMetrics: PipelineInit['onMetrics'] = null;
  private onTierChange: PipelineInit['onTierChange'] | null = null;
  private getDroppedFrames: PipelineInit['getDroppedFrames'] | null = null;
  private readonly metricsSamples: MetricsSample[] = [];
  private readonly metricsMaxSamples = 30;
  private mainFrameCount = 0;
  private canvasFrameToken = 0;
  private canvasPassthroughLogged = false;
  private background: {bitmap: ImageBitmap; width: number; height: number} | null = null;

  constructor() {
    this.logger = getLogger('Canvas2DPipeline');
  }

  public async init(init: PipelineInit): Promise<void> {
    this.outputCanvas = init.outputCanvas;
    this.config = init.config;
    this.onMetrics = init.onMetrics;
    this.onTierChange = init.onTierChange;
    this.getDroppedFrames = init.getDroppedFrames;
    this.mainFrameCount = 0;
    this.canvasFrameToken = 0;
    this.canvasPassthroughLogged = false;

    const ctx = this.outputCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas2D context unavailable');
    }
    this.canvasCtx = ctx;
    this.foregroundCanvas = document.createElement('canvas');
    this.foregroundCanvas.width = this.outputCanvas.width;
    this.foregroundCanvas.height = this.outputCanvas.height;
    this.foregroundCtx = this.foregroundCanvas.getContext('2d');

    const segmenterFactory = init.createSegmenter ?? MediaPipeSegmenterFactory;
    this.segmenter = segmenterFactory.create({
      modelPath: init.segmentationModelPath,
      delegate: 'CPU',
    });
    const postProcessorFactory = init.createMaskPostProcessor ?? {
      create: () => new NoopMaskPostProcessor(),
    };
    this.maskPostProcessor = postProcessorFactory.create();
    this.qualityController = new QualityController(init.targetFps);
    try {
      await this.segmenter.init();
    } catch (error) {
      this.logger.warn('Segmentation init failed, canvas2d will pass through', error);
      this.segmenter = null;
    }
  }

  public updateConfig(config: PipelineConfig): void {
    this.config = config;
    if (this.qualityController && config.quality !== 'auto') {
      this.qualityController.setTier(config.quality);
    }
  }

  public async processFrame(frame: ImageBitmap, _timestamp: number, width: number, height: number): Promise<void> {
    if (!this.outputCanvas || !this.canvasCtx || !this.config) {
      frame.close();
      return;
    }
    const ctx = this.canvasCtx;
    this.foregroundCanvas!.width = width;
    this.foregroundCanvas!.height = height;
    ctx.clearRect(0, 0, width, height);

    if (this.config.mode === 'passthrough' || !this.segmenter || !this.qualityController) {
      if (!this.segmenter && !this.canvasPassthroughLogged) {
        this.logger.warn('Canvas2D pipeline running without segmenter; output will be passthrough');
        this.canvasPassthroughLogged = true;
      }
      ctx.drawImage(frame, 0, 0, width, height);
      frame.close();
      return;
    }

    const qualityTier = this.resolveQuality();
    this.mainFrameCount += 1;
    const token = ++this.canvasFrameToken;

    let result:
      | {mask: ImageBitmap | null; durationMs: number; release: () => void}
      | {mask: null; durationMs: number; release: () => void};
    if (qualityTier.segmentationCadence > 0 && this.mainFrameCount % qualityTier.segmentationCadence === 0) {
      this.segmenter.configure(qualityTier.segmentationWidth, qualityTier.segmentationHeight);
      const timestampMs = performance.now();
      const segmentation = await this.segmenter.segment(frame, timestampMs);
      const processed = await this.maskPostProcessor.process(segmentation, {
        qualityTier,
        mode: this.config.mode,
        timestampMs,
        frameSize: {width, height},
      });
      if (processed !== segmentation) {
        segmentation.mask?.close();
        segmentation.release();
      }
      result = {mask: processed.mask, durationMs: processed.durationMs, release: processed.release};
    } else {
      result = {mask: null, durationMs: 0, release: () => {}};
    }

    if (token !== this.canvasFrameToken) {
      result.mask?.close();
      result.release();
      frame.close();
      return;
    }

    const mask = result.mask;
    const renderStart = performance.now();
    try {
      if (this.config.debugMode !== 'off' && mask) {
        ctx.clearRect(0, 0, width, height);
        if (this.config.debugMode === 'maskOnly') {
          ctx.drawImage(mask, 0, 0, width, height);
        } else if (this.config.debugMode === 'maskOverlay') {
          ctx.drawImage(frame, 0, 0, width, height);
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#00ff00';
          ctx.globalCompositeOperation = 'source-atop';
          ctx.drawImage(mask, 0, 0, width, height);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
        } else if (this.config.debugMode === 'edgeOnly') {
          ctx.drawImage(mask, 0, 0, width, height);
        }
        const renderMs = performance.now() - renderStart;
        this.updateMetrics(result.durationMs + renderMs, result.durationMs, renderMs, qualityTier.tier);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      const blurPx = Math.round(2 + this.config.blurStrength * 10);
      if (this.config.mode === 'virtual' && this.background) {
        ctx.drawImage(this.background.bitmap, 0, 0, this.background.width, this.background.height, 0, 0, width, height);
      } else {
        ctx.filter = `blur(${blurPx}px)`;
        ctx.drawImage(frame, 0, 0, width, height);
        ctx.filter = 'none';
      }

      if (mask && this.foregroundCtx) {
        this.foregroundCtx.clearRect(0, 0, width, height);
        this.foregroundCtx.drawImage(frame, 0, 0, width, height);
        this.foregroundCtx.globalCompositeOperation = 'destination-in';
        this.foregroundCtx.drawImage(mask, 0, 0, width, height);
        this.foregroundCtx.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.foregroundCanvas!, 0, 0, width, height);
      } else {
        ctx.drawImage(frame, 0, 0, width, height);
      }

      const renderMs = performance.now() - renderStart;
      this.updateMetrics(result.durationMs + renderMs, result.durationMs, renderMs, qualityTier.tier);
    } finally {
      mask?.close();
      result.release();
      frame.close();
    }
  }

  public setBackgroundImage(bitmap: ImageBitmap, width: number, height: number): void {
    this.background?.bitmap?.close();
    this.background = {bitmap, width, height};
  }

  public setBackgroundVideoFrame(bitmap: ImageBitmap, width: number, height: number): void {
    this.setBackgroundImage(bitmap, width, height);
  }

  public clearBackground(): void {
    this.background?.bitmap?.close();
    this.background = null;
  }

  public notifyDroppedFrames(_count: number): void {
    // No-op for canvas2d.
  }

  public isOutputCanvasTransferred(): boolean {
    return false;
  }

  public stop(): void {
    this.background?.bitmap?.close();
    this.background = null;
    this.maskPostProcessor.reset();
    this.segmenter?.close();
    this.segmenter = null;
    this.qualityController = null;
    this.outputCanvas = null;
    this.canvasCtx = null;
    this.foregroundCanvas = null;
    this.foregroundCtx = null;
    this.config = null;
    this.onMetrics = null;
    this.onTierChange = null;
    this.getDroppedFrames = null;
    this.metricsSamples.length = 0;
  }

  private resolveQuality(): QualityTierParams {
    if (!this.config) {
      return resolveQualityTier(null, 'auto', 'blur');
    }
    return resolveQualityTier(this.qualityController, this.config.quality, getQualityMode(this.config.mode));
  }

  private updateMetrics(totalMs: number, segmentationMs: number, gpuMs: number, tier: 'A' | 'B' | 'C' | 'D'): void {
    if (!this.onMetrics || !this.getDroppedFrames) {
      return;
    }
    pushMetricsSample(this.metricsSamples, this.metricsMaxSamples, {totalMs, segmentationMs, gpuMs});
    if (this.config?.quality === 'auto') {
      this.onTierChange?.(tier);
    }
    this.onMetrics(buildMetrics(this.metricsSamples, this.getDroppedFrames(), tier));
  }
}
