/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
import is from '@sindresorhus/is';

import type {Metrics} from 'Repositories/media/backgroundEffects/backgroundEffectsWorkerTypes';
import {getSafeLogger} from 'Repositories/media/backgroundEffects/helper/logger';
import {
  buildMetrics,
  createMetricsWindow,
  pushMetricsSample,
} from 'Repositories/media/backgroundEffects/helper/metrics';
import {createRestartQueue} from 'Repositories/media/backgroundEffects/helper/restartQueue';

import {Canvas2DRenderer, createCanvas2DRenderer} from './canvas2DRenderer';
import {VideoFilter} from './filter';
import {SELFIE_MULTICLASS_MODEL_PATH, SELFIE_SEGMENTER_MODEL_PATH, WorkerProcessVideoTrackOptions} from './options';
import {WebGLRenderer} from './renderer';

import {createWallClock} from '../../../../clock/wallClock';

let segmenterOptions: WorkerProcessVideoTrackOptions = {} as WorkerProcessVideoTrackOptions;

export function updateSegmenterOptions(opts: WorkerProcessVideoTrackOptions) {
  // Keep the references stable, this allows us to do option changes on segmenter runtime.
  Object.assign(segmenterOptions, opts);
}

async function createSegmenter(canvas: OffscreenCanvas, useGPU: boolean) {
  const logger = getSafeLogger('segmenter:createSegmenter');
  const {wasmLoaderPath, wasmBinaryPath, modelPath} = segmenterOptions;
  const fileset =
    wasmLoaderPath && wasmBinaryPath
      ? {wasmLoaderPath, wasmBinaryPath}
      : await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm');
  logger.log(`[virtual-background] createSegmenter (gpu=${useGPU})`);

  const segmenter = await ImageSegmenter.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        modelPath ||
        'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
      delegate: useGPU ? 'GPU' : 'CPU',
    },
    runningMode: 'VIDEO',
    outputCategoryMask: true,
    outputConfidenceMasks: true,
    // Only share the canvas when using GPU — it is needed for getAsWebGLTexture().
    ...(useGPU ? {canvas} : {}),
  });
  return segmenter;
}

export function getSegmenterModelUpdatedOptions(
  targetModelPath: string | undefined,
  currentModelPath: string | undefined,
) {
  if (targetModelPath === currentModelPath) {
    return null;
  }

  return {
    baseOptions: {
      modelAssetPath: targetModelPath,
    },
  };
}

export async function runSegmenter(
  canvas: OffscreenCanvas,
  readable: ReadableStream,
  opts: WorkerProcessVideoTrackOptions,
  onMetrics: (metrics: Metrics) => void,
  onRendererFallback: (modelPath: string) => void,
) {
  const logger = getSafeLogger('segmenter:runSegmenter');
  logger.log(`[virtual-background] runSegmenter`);
  segmenterOptions = opts;

  // Try WebGL first; fall back to 2D Canvas if unavailable.
  let webGLRenderer: WebGLRenderer | null = null;
  let canvas2DRenderer: Canvas2DRenderer | null = null;

  try {
    logger.log('[virtual-background] initializing WebGL2 with GPU pipeline');
    webGLRenderer = new WebGLRenderer(canvas);
  } catch {
    logger.log('[virtual-background] WebGL2 unavailable — falling back to 2D Canvas CPU pipeline');
    canvas2DRenderer = createCanvas2DRenderer(canvas);

    if (segmenterOptions.modelPath === SELFIE_MULTICLASS_MODEL_PATH) {
      segmenterOptions.modelPath = SELFIE_SEGMENTER_MODEL_PATH;
      onRendererFallback(SELFIE_SEGMENTER_MODEL_PATH);
    }
  }

  const useGPU = webGLRenderer !== null;

  function onContextLost(event: Event) {
    logger.log(`[virtual-background] webglcontextlost (${!!webGLRenderer})`);
    event.preventDefault();
    webGLRenderer?.close();
    webGLRenderer = null;
  }

  function onContextRestored() {
    logger.log(`[virtual-background] webglcontextrestored (${!!webGLRenderer})`);
    if (webGLRenderer === null) {
      const timer = createWallClock();
      timer.setTimeout(() => {
        logger.log('[virtual-background] restart segmenter onContextRestored');
        webGLRenderer = new WebGLRenderer(canvas);
        restartSegmenter();
        attachCanvasEvents();
      }, 1000);
    }
  }

  function attachCanvasEvents() {
    canvas.addEventListener('webglcontextlost', onContextLost, {once: true});
    canvas.addEventListener('webglcontextrestored', onContextRestored, {once: true});
  }

  if (useGPU) {
    attachCanvasEvents();
  }

  let segmenter = await createSegmenter(canvas, useGPU);
  let currentModelPath = segmenterOptions.modelPath;

  const restartSegmenter = createRestartQueue(restartSegmenterSequentially);

  async function restartSegmenterSequentially() {
    const targetModelPath = segmenterOptions.modelPath;

    try {
      const newSegmenter = await createSegmenter(canvas, useGPU);

      const oldSegmenter = segmenter;
      segmenter = newSegmenter;
      currentModelPath = targetModelPath;
      oldSegmenter.close();
    } catch (error: unknown) {
      logger.error('Error restarting segmenter:', error);
    }
  }

  async function updateSegmenterModel() {
    const targetModelPath = segmenterOptions.modelPath;
    const nextOptions = getSegmenterModelUpdatedOptions(targetModelPath, currentModelPath);

    if (nextOptions === null) {
      return;
    }

    try {
      logger.log(`[virtual-background] model is changed to ${nextOptions.baseOptions.modelAssetPath}`);
      await segmenter.setOptions(nextOptions);
      currentModelPath = targetModelPath;
    } catch (error: unknown) {
      logger.error('[virtual-background] Error updating segmenter model:', error);
    }
  }

  // Filters.
  const effectsCanvas = new OffscreenCanvas(1, 1);
  const videoFilter = new VideoFilter(effectsCanvas);

  // Metrics
  const metricsWindow = createMetricsWindow(60);

  let lastStatsTime = performance.now();
  let totalMsSum = 0;
  let segmentationMsSum = 0;
  let gpuMsSum = 0;
  let filterMsSum = 0;
  let frames = 0;
  let totalFrames = 0;
  const droppedFrames = 0;

  function updateMetrics(totalMs: number, segmentationMs: number, gpuMs: number) {
    pushMetricsSample(metricsWindow, {totalMs, segmentationMs, gpuMs});

    const quality = segmenterOptions.quality ?? 'auto';
    const tier = quality === 'auto' ? 'superhigh' : quality;

    onMetrics(buildMetrics(metricsWindow, droppedFrames, tier, useGPU ? 'GPU' : 'CPU'));
  }

  function close() {
    segmenter.close();
    webGLRenderer?.close();
    webGLRenderer = null;
    canvas2DRenderer?.close();
    canvas2DRenderer = null;
    videoFilter?.destroy();
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
  }

  const writer = new WritableStream(
    {
      async write(videoFrame: VideoFrame) {
        const {codedWidth, codedHeight, timestamp} = videoFrame;
        if (codedWidth === 0 || codedHeight === 0) {
          videoFrame.close();
          return;
        }

        await updateSegmenterModel();

        const useSelfieModel = currentModelPath?.includes('selfie_segmenter');

        // start to process the frame
        const frameStart = performance.now();

        let filterMs = 0;
        let segmentationMs = 0;
        let gpuMs = 0;
        const writableStreamLogger = getSafeLogger('segmenter:WritableStream::write');

        try {
          if (segmenterOptions.enabled && segmenterOptions.quality !== 'bypass') {
            if (segmenterOptions.enableFilters) {
              const filterStart = performance.now();
              videoFilter.render(
                videoFrame,
                segmenterOptions.blur,
                segmenterOptions.brightness,
                segmenterOptions.contrast,
                segmenterOptions.gamma,
              );
              filterMs = performance.now() - filterStart;
            }

            const segStart = performance.now();

            await new Promise<void>(resolve => {
              segmenter.segmentForVideo(
                segmenterOptions.enableFilters ? effectsCanvas : videoFrame,
                timestamp * 1000,
                result => {
                  segmentationMs = performance.now() - segStart;

                  const categoryMask = result.categoryMask;
                  const confidenceMask = result.confidenceMasks?.[0];

                  try {
                    if (is.nullOrUndefined(categoryMask) || is.nullOrUndefined(confidenceMask)) {
                      writableStreamLogger.warn('[virtual-background] Skipping frame: Missing masks.');
                      return;
                    }

                    const gpuStart = performance.now();

                    if (useGPU && !is.nullOrUndefined(webGLRenderer)) {
                      const categoryTexture = categoryMask.getAsWebGLTexture();
                      const confidenceTexture = confidenceMask.getAsWebGLTexture();
                      webGLRenderer.render(
                        videoFrame,
                        segmenterOptions,
                        categoryTexture,
                        confidenceTexture,
                        useSelfieModel,
                      );
                    } else if (!is.nullOrUndefined(canvas2DRenderer)) {
                      const categoryData = categoryMask.getAsFloat32Array();
                      const confidenceData = confidenceMask.getAsFloat32Array();
                      canvas2DRenderer.render(
                        videoFrame,
                        segmenterOptions,
                        categoryData,
                        confidenceData,
                        useSelfieModel,
                      );
                    }

                    gpuMs = performance.now() - gpuStart;
                  } catch (error) {
                    writableStreamLogger.error('[virtual-background] Error in videoCallback:', error);
                  } finally {
                    categoryMask?.close();
                    confidenceMask?.close();
                    resolve();
                  }
                },
              );
            });
          } else {
            const gpuStart = performance.now();
            if (useGPU) {
              webGLRenderer?.render(videoFrame, segmenterOptions);
            } else {
              canvas2DRenderer?.render(videoFrame, segmenterOptions);
            }
            gpuMs = performance.now() - gpuStart;
          }
        } finally {
          videoFrame.close();
        }

        const totalMs = performance.now() - frameStart;

        totalMsSum += totalMs;
        segmentationMsSum += segmentationMs;
        gpuMsSum += gpuMs;
        filterMsSum += filterMs;

        updateMetrics(totalMs, segmentationMs, gpuMs);

        frames++;
        totalFrames++;

        const now = performance.now();

        if (now - lastStatsTime > 2000) {
          lastStatsTime = now;
          totalMsSum = 0;
          segmentationMsSum = 0;
          gpuMsSum = 0;
          filterMsSum = 0;
          frames = 0;
        }
      },

      close() {
        logger.log('[virtual-background] runSegmenter close');
        close();
      },
      abort(reason) {
        logger.log('[virtual-background] runSegmenter abort', reason);
        close();
      },
    },
    new CountQueuingStrategy({highWaterMark: 1}),
  );

  readable.pipeTo(writer).catch((err: unknown) => {
    logger.error(`[virtual-background] video error: ${(err as Error).message}`);
  });
}
