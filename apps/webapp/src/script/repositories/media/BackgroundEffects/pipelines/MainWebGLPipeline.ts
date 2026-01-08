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

import {
  buildMetrics,
  createMetricsWindow,
  isProcessingMode,
  pushMetricsSample,
  QualityController,
  resolveQualityTierForEffectMode,
  resolveSegmentationModelPath,
  resetMetricsWindow,
} from '../quality';
import {WebGLRenderer} from '../renderer/WebGLRenderer';
import {NoopMaskPostProcessor} from '../segmentation/maskPostProcessor';
import type {MaskPostProcessor} from '../segmentation/maskPostProcessor';
import {MediaPipeSegmenterFactory} from '../segmentation/mediaPipeSegmenter';
import type {SegmenterFactory, SegmenterLike} from '../segmentation/segmenterTypes';
import {buildMaskInput, type MaskInput, type MaskSource} from '../shared/mask';
import type {QualityTierParams, SegmentationModelByTier} from '../types';

export class MainWebGLPipeline implements Pipeline {
  public readonly type = 'main-webgl2' as const;
  private readonly logger: Logger;
  private renderer: WebGLRenderer | null = null;
  private segmenter: SegmenterLike | null = null;
  private segmenterFactory: SegmenterFactory = MediaPipeSegmenterFactory;
  private segmentationModelByTier: SegmentationModelByTier = {};
  private currentModelPath: string | null = null;
  private maskPostProcessor: MaskPostProcessor = new NoopMaskPostProcessor();
  private qualityController: QualityController | null = null;
  private outputCanvas: HTMLCanvasElement | null = null;
  private background: {bitmap: ImageBitmap; width: number; height: number} | null = null;
  private config: PipelineConfig | null = null;
  private onMetrics: PipelineInit['onMetrics'] = null;
  private onTierChange: PipelineInit['onTierChange'] | null = null;
  private getDroppedFrames: PipelineInit['getDroppedFrames'] | null = null;
  private readonly metricsMaxSamples = 30;
  private readonly metricsWindow = createMetricsWindow(this.metricsMaxSamples);
  private mainFrameCount = 0;

  constructor() {
    this.logger = getLogger('MainWebGLPipeline');
  }

  public async init(init: PipelineInit): Promise<void> {
    this.outputCanvas = init.outputCanvas;
    this.config = init.config;
    this.onMetrics = init.onMetrics;
    this.onTierChange = init.onTierChange;
    this.getDroppedFrames = init.getDroppedFrames;
    this.mainFrameCount = 0;

    this.renderer = new WebGLRenderer(this.outputCanvas, this.outputCanvas.width, this.outputCanvas.height);
    this.segmenterFactory = init.createSegmenter ?? MediaPipeSegmenterFactory;
    this.segmentationModelByTier = init.segmentationModelByTier;
    const postProcessorFactory = init.createMaskPostProcessor ?? {
      create: () => new NoopMaskPostProcessor(),
    };
    this.maskPostProcessor = postProcessorFactory.create();
    this.qualityController = new QualityController(init.targetFps);
    if (this.qualityController && this.config?.quality === 'auto') {
      this.qualityController.setTier(init.initialTier);
    } else if (this.qualityController && this.config?.quality !== 'auto') {
      this.qualityController.setTier(this.config.quality);
    }
    const startingTier = init.config.quality === 'auto' ? init.initialTier : init.config.quality;
    const shouldInitSegmenter = startingTier !== 'D' && init.config.mode !== 'passthrough';
    if (shouldInitSegmenter) {
      this.segmenter = this.segmenterFactory.create({
        modelPath: init.segmentationModelPath,
        delegate: 'GPU',
        canvas: this.outputCanvas,
      });
      this.currentModelPath = init.segmentationModelPath;
      try {
        await this.segmenter.init();
      } catch (error) {
        this.logger.warn('Segmentation init failed, falling back to passthrough', error);
        this.segmenter?.close();
        this.segmenter = null;
        this.renderer?.destroy();
        this.renderer = null;
        throw error;
      }
    } else {
      this.segmenter = null;
      this.currentModelPath = null;
    }
  }

  public updateConfig(config: PipelineConfig): void {
    this.config = config;
    if (this.qualityController && config.quality !== 'auto') {
      this.qualityController.setTier(config.quality);
    }
  }

  public async processFrame(frame: ImageBitmap, timestamp: number, width: number, height: number): Promise<void> {
    if (!this.renderer || !this.outputCanvas || !this.config) {
      frame.close();
      return;
    }

    const qualityTier = this.resolveQuality();
    if (!qualityTier.bypass) {
      await this.ensureSegmenterForTier(qualityTier.tier);
    }

    let maskInput: MaskInput | null = null;
    let maskBitmap: ImageBitmap | null = null;
    let releaseMaskResources: (() => void) | null = null;
    let segmentationMs = 0;
    if (!qualityTier.bypass && qualityTier.segmentationCadence > 0 && this.segmenter && this.qualityController) {
      this.mainFrameCount += 1;
      if (this.mainFrameCount % qualityTier.segmentationCadence === 0) {
        this.segmenter.configure(qualityTier.segmentationWidth, qualityTier.segmentationHeight);
        const segStart = performance.now();
        const timestampMs = timestamp * 1000;
        const includeClassMask = this.config.debugMode === 'classOverlay' || this.config.debugMode === 'classOnly';
        const result = await this.segmenter.segment(frame, timestampMs, {includeClassMask});
        segmentationMs = performance.now() - segStart;
        const processed = await this.maskPostProcessor.process(result, {
          qualityTier,
          mode: this.config.mode,
          timestampMs,
          frameSize: {width, height},
        });
        if (processed !== result) {
          result.mask?.close();
          result.classMask?.close();
          result.release();
        }
        const useClassMask = includeClassMask && processed.classMask;
        const maskSource: MaskSource = useClassMask
          ? {
              mask: processed.classMask,
              maskTexture: null,
              width: processed.width,
              height: processed.height,
              release: processed.release,
            }
          : processed;
        if (useClassMask) {
          processed.mask?.close();
        } else {
          processed.classMask?.close();
        }
        const maskResult = buildMaskInput(maskSource);
        maskInput = maskResult.maskInput;
        maskBitmap = maskResult.maskBitmap;
        releaseMaskResources = maskResult.release;
      }
    }

    if (this.outputCanvas.width !== width || this.outputCanvas.height !== height) {
      this.outputCanvas.width = width;
      this.outputCanvas.height = height;
    }

    this.renderer.configure(
      width,
      height,
      qualityTier,
      this.config.mode,
      this.config.debugMode,
      this.config.blurStrength,
    );

    if (this.background) {
      this.renderer.setBackground(this.background.bitmap, this.background.width, this.background.height);
    }

    const gpuStart = performance.now();
    let gpuMs = 0;
    try {
      this.renderer.render(frame, maskInput);
    } finally {
      gpuMs = performance.now() - gpuStart;
      maskBitmap?.close();
      releaseMaskResources?.();
      frame.close();
    }

    if (this.config.quality === 'auto' && this.qualityController && isProcessingMode(this.config.mode)) {
      const updatedTier = this.qualityController.update(
        {totalMs: segmentationMs + gpuMs, segmentationMs, gpuMs},
        this.config.mode,
      );
      this.onTierChange?.(updatedTier.tier);
    }

    this.updateMetrics(segmentationMs + gpuMs, segmentationMs, gpuMs, qualityTier.tier);
  }

  public setBackgroundImage(bitmap: ImageBitmap, width: number, height: number): void {
    this.background?.bitmap?.close();
    this.background = {bitmap, width, height};
    this.renderer?.setBackground(bitmap, width, height);
  }

  public setBackgroundVideoFrame(bitmap: ImageBitmap, width: number, height: number): void {
    this.setBackgroundImage(bitmap, width, height);
  }

  public clearBackground(): void {
    this.background?.bitmap?.close();
    this.background = null;
    this.renderer?.setBackground(null, 0, 0);
  }

  public notifyDroppedFrames(_count: number): void {
    // No-op for main pipeline.
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
    this.currentModelPath = null;
    this.renderer?.destroy();
    this.renderer = null;
    this.qualityController = null;
    this.outputCanvas = null;
    this.config = null;
    this.onMetrics = null;
    this.onTierChange = null;
    this.getDroppedFrames = null;
    resetMetricsWindow(this.metricsWindow);
  }

  private resolveQuality(): QualityTierParams {
    if (!this.config) {
      return resolveQualityTierForEffectMode(null, 'auto', 'blur');
    }
    return resolveQualityTierForEffectMode(this.qualityController, this.config.quality, this.config.mode);
  }

  private async ensureSegmenterForTier(tier: 'A' | 'B' | 'C' | 'D'): Promise<void> {
    if (!this.outputCanvas) {
      return;
    }
    if (tier === 'D') {
      return;
    }
    const desiredPath = resolveSegmentationModelPath(
      tier,
      this.segmentationModelByTier,
      this.currentModelPath ?? undefined,
    );
    if (this.currentModelPath === desiredPath && this.segmenter) {
      return;
    }
    const nextSegmenter = this.segmenterFactory.create({
      modelPath: desiredPath,
      delegate: 'GPU',
      canvas: this.outputCanvas,
    });
    try {
      await nextSegmenter.init();
    } catch (error) {
      this.logger.warn('Segmentation model swap failed, keeping previous model', error);
      nextSegmenter.close();
      return;
    }
    this.segmenter?.close();
    this.segmenter = nextSegmenter;
    this.currentModelPath = desiredPath;
  }

  private updateMetrics(totalMs: number, segmentationMs: number, gpuMs: number, tier: 'A' | 'B' | 'C' | 'D'): void {
    if (!this.onMetrics || !this.getDroppedFrames) {
      return;
    }
    pushMetricsSample(this.metricsWindow, {totalMs, segmentationMs, gpuMs});
    // MainWebGLPipeline uses GPU delegate
    const segmentationDelegate = this.segmenter?.getDelegate?.() ?? 'GPU';
    this.onMetrics(buildMetrics(this.metricsWindow, this.getDroppedFrames(), tier, segmentationDelegate));
  }
}
