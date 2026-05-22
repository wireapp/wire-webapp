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

import {FilesetResolver, ImageSegmenter, MPMask} from '@mediapipe/tasks-vision';
import is from '@sindresorhus/is';

import type {Metrics} from 'Repositories/media/backgroundEffects/backgroundEffectsWorkerTypes';
import {getSafeLogger} from 'Repositories/media/backgroundEffects/helper/logger';
import {
  buildMetrics,
  createMetricsWindow,
  pushMetricsSample,
} from 'Repositories/media/backgroundEffects/helper/metrics';
import {createRestartQueue} from 'Repositories/media/backgroundEffects/helper/restartQueue';

import {VideoFilter} from './filter';
import {WorkerProcessVideoTrackOptions} from './options';

/**
 * Render strategy for the shared frame loop in `runSegmenterCore`.
 *
 * Implementations are GPU-only or CPU-only — the core picks the MediaPipe
 * delegate via `useGPU`, then calls `render`/`renderBypass` per frame.
 */
export interface RenderPipeline {
  readonly useGPU: boolean;
  /**
   * Optional hook called only for WebGL context restored
   */
  attach?(restartSegmenter: () => void): void;
  render(
    videoFrame: VideoFrame,
    options: WorkerProcessVideoTrackOptions,
    categoryMask: MPMask,
    confidenceMask: MPMask,
    useSelfieModel: boolean,
  ): void;
  renderBypass(videoFrame: VideoFrame, options: WorkerProcessVideoTrackOptions): void;
  close(): void;
}

let segmenterOptions: WorkerProcessVideoTrackOptions = {} as WorkerProcessVideoTrackOptions;
const METRICS_WINDOW_SIZE = 60;
const STATS_RESET_INTERVAL_MS = 2000;

export function updateSegmenterOptions(opts: WorkerProcessVideoTrackOptions) {
  // Keep the references stable, this allows us to do option changes on segmenter runtime.
  Object.assign(segmenterOptions, opts);
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

export async function runSegmenterCore(
  canvas: OffscreenCanvas,
  readable: ReadableStream,
  opts: WorkerProcessVideoTrackOptions,
  pipeline: RenderPipeline,
  onMetrics: (metrics: Metrics) => void,
): Promise<() => Promise<void>> {
  const logger = getSafeLogger('segmenter:runSegmenterCore');
  logger.log(`[virtual-background] runSegmenterCore (gpu=${pipeline.useGPU})`);
  segmenterOptions = opts;

  let segmenter = await createSegmenter(canvas, pipeline.useGPU);
  let currentModelPath = segmenterOptions.modelPath;

  const restartSegmenter = createRestartQueue(restartSegmenterSequentially);

  pipeline.attach?.(restartSegmenter);

  async function restartSegmenterSequentially() {
    const targetModelPath = segmenterOptions.modelPath;

    try {
      const newSegmenter = await createSegmenter(canvas, pipeline.useGPU);

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
  const metricsWindow = createMetricsWindow(METRICS_WINDOW_SIZE);

  let lastStatsTime = performance.now();
  const droppedFrames = 0;

  function updateMetrics(totalMs: number, segmentationMs: number, gpuMs: number) {
    pushMetricsSample(metricsWindow, {totalMs, segmentationMs, gpuMs});

    const quality = segmenterOptions.quality ?? 'auto';
    const tier = quality === 'auto' ? 'superhigh' : quality;

    onMetrics(buildMetrics(metricsWindow, droppedFrames, tier, pipeline.useGPU ? 'GPU' : 'CPU'));
  }

  let closed = false;
  function close() {
    if (closed) {
      return;
    }
    closed = true;
    segmenter.close();
    pipeline.close();
    videoFilter?.destroy();
  }

  const abortController = new AbortController();

  const writer = new WritableStream(
    {
      async write(videoFrame: VideoFrame) {
        const {codedWidth, codedHeight, timestamp} = videoFrame;
        if (codedWidth === 0 || codedHeight === 0) {
          videoFrame.close();
          return;
        }

        await updateSegmenterModel();

        const useSelfieModel = currentModelPath?.includes('selfie_segmenter') ?? false;

        const frameStart = performance.now();

        let segmentationMs = 0;
        let gpuMs = 0;
        const writableStreamLogger = getSafeLogger('segmenter:WritableStream::write');

        try {
          if (segmenterOptions.enabled && segmenterOptions.quality !== 'bypass') {
            if (segmenterOptions.enableFilters) {
              videoFilter.render(
                videoFrame,
                segmenterOptions.blur,
                segmenterOptions.brightness,
                segmenterOptions.contrast,
                segmenterOptions.gamma,
              );
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
                    pipeline.render(videoFrame, segmenterOptions, categoryMask, confidenceMask, useSelfieModel);
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
            pipeline.renderBypass(videoFrame, segmenterOptions);
            gpuMs = performance.now() - gpuStart;
          }
        } finally {
          videoFrame.close();
        }

        const totalMs = performance.now() - frameStart;

        updateMetrics(totalMs, segmentationMs, gpuMs);

        const now = performance.now();
        if (now - lastStatsTime > STATS_RESET_INTERVAL_MS) {
          lastStatsTime = now;
        }
      },

      close() {
        logger.log('[virtual-background] runSegmenterCore close');
        close();
      },
      abort(reason) {
        logger.log('[virtual-background] runSegmenterCore abort', reason);
        close();
      },
    },
    new CountQueuingStrategy({highWaterMark: 1}),
  );

  readable.pipeTo(writer, {signal: abortController.signal}).catch((err: unknown) => {
    if ((err as Error)?.name === 'AbortError') {
      logger.log('[virtual-background] pipeTo aborted by stop()');
      return;
    }
    logger.error(`[virtual-background] video error: ${(err as Error).message}`);
  });

  async function stop(): Promise<void> {
    logger.log('[virtual-background] runSegmenterCore stop');
    try {
      abortController.abort();
    } catch {
      /* signal may already be aborted */
    }
    close();
  }

  return stop;
}
