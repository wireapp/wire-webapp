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

import {createWallClock} from '@enormora/wall-clock/wall-clock';
import {ImageSegmenter} from '@mediapipe/tasks-vision';

import type {Metrics, Mode} from 'Repositories/media/backgroundEffects/backgroundEffectsWorkerTypes';
import {getSafeLogger} from 'Repositories/media/backgroundEffects/helper/logger';
import {
  buildMetrics,
  createMetricsWindow,
  pushMetricsSample,
} from 'Repositories/media/backgroundEffects/helper/metrics';
import {createRestartQueue} from 'Repositories/media/backgroundEffects/helper/restartQueue';
import {PerformanceSample} from 'Repositories/media/backgroundEffects/helper/samples';

import {VideoFilter} from './filter';
import {WorkerProcessVideoTrackOptions} from './options';
import {WebGLRenderer} from './renderer';

let segmenterOptions: WorkerProcessVideoTrackOptions = {} as WorkerProcessVideoTrackOptions;

const DEFAULT_SEGMENTATION_FRAME_INTERVAL = 1;
const ENHANCED_PERFORMANCE_SEGMENTATION_FRAME_INTERVAL = 2;

function getSegmentationFrameInterval(): number {
  return segmenterOptions.enhancePerformance
    ? ENHANCED_PERFORMANCE_SEGMENTATION_FRAME_INTERVAL
    : DEFAULT_SEGMENTATION_FRAME_INTERVAL;
}

export function updateSegmenterOptions(opts: WorkerProcessVideoTrackOptions) {
  // Keep the reference stable so that runtime option changes
  // are immediately visible inside the processing loop.
  Object.assign(segmenterOptions, opts);
}

async function createSegmenter(canvas: OffscreenCanvas) {
  const logger = getSafeLogger('segmenter:createSegmenter');

  const {wasmLoaderPath, wasmBinaryPath, modelPath} = segmenterOptions;

  if (!wasmLoaderPath || !wasmBinaryPath) {
    logger.error('wasmLoaderPath and wasmBinaryPath must be provided');

    throw new Error('wasmLoaderPath and wasmBinaryPath must be provided');
  }

  if (!modelPath) {
    logger.error('Model path must be provided');

    throw new Error('Model path must be provided');
  }

  const fileset = {
    wasmLoaderPath,
    wasmBinaryPath,
  };

  logger.log('[virtual-background] createSegmenter');

  return ImageSegmenter.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: modelPath,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    outputCategoryMask: true,
    outputConfidenceMasks: true,
    canvas,
  });
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
  onPerformanceSample: (sample: PerformanceSample, mode: Mode) => void,
) {
  const logger = getSafeLogger('segmenter:runSegmenter');

  logger.log('[virtual-background] runSegmenter');

  segmenterOptions = opts;

  let webGLRenderer: WebGLRenderer | null = new WebGLRenderer(canvas);

  function onContextLost(event: Event) {
    logger.log(`[virtual-background] webglcontextlost (${!!webGLRenderer})`);

    event.preventDefault();

    webGLRenderer?.close();
    webGLRenderer = null;
  }

  function onContextRestored() {
    logger.log(`[virtual-background] webglcontextrestored (${!!webGLRenderer})`);

    if (!webGLRenderer) {
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

  attachCanvasEvents();

  let segmenter = await createSegmenter(canvas);

  let currentModelPath = segmenterOptions.modelPath;

  /*
   * This tracks whether the current renderer already has
   * a valid stored mask that can be reused.
   */
  let hasSegmentationMask = false;

  /*
   * Used to decide whether the current frame should be
   * segmented or rendered with the previous mask.
   */
  let segmentationFrameCounter = 0;

  const restartSegmenter = createRestartQueue(restartSegmenterSequentially);

  async function restartSegmenterSequentially() {
    const targetModelPath = segmenterOptions.modelPath;

    try {
      const newSegmenter = await createSegmenter(canvas);

      const oldSegmenter = segmenter;

      segmenter = newSegmenter;
      currentModelPath = targetModelPath;

      oldSegmenter.close();

      /*
       * The renderer may have been recreated after a context
       * loss. Force the next frame to generate a new mask.
       */
      hasSegmentationMask = false;
      segmentationFrameCounter = 0;
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

      /*
       * A different model may produce masks with different
       * semantics. Do not reuse the previous model's state.
       */
      hasSegmentationMask = false;
      segmentationFrameCounter = 0;
    } catch (error: unknown) {
      logger.error('[virtual-background] Error updating segmenter model:', error);
    }
  }

  const effectsCanvas = new OffscreenCanvas(1, 1);

  const videoFilter = new VideoFilter(effectsCanvas);

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
    pushMetricsSample(metricsWindow, {
      totalMs,
      segmentationMs,
      gpuMs,
    });

    const quality = segmenterOptions.quality ?? 'auto';

    const tier = quality === 'auto' ? 'fhd' : quality;

    onMetrics(buildMetrics(metricsWindow, droppedFrames, tier, 'GPU'));

    const mode: Mode =
      segmenterOptions.mode === 'passthrough' || segmenterOptions.mode === undefined ? 'blur' : segmenterOptions.mode;

    onPerformanceSample(
      {
        totalMs,
        segmentationMs,
        gpuMs,
      },
      mode,
    );
  }

  function close() {
    segmenter.close();

    webGLRenderer?.close();
    webGLRenderer = null;

    videoFilter.destroy();

    canvas.removeEventListener('webglcontextlost', onContextLost);

    canvas.removeEventListener('webglcontextrestored', onContextRestored);
  }

  let lastFrameTs = performance.now();

  const writer = new WritableStream(
    {
      async write(videoFrame: VideoFrame) {
        const {codedWidth, codedHeight, timestamp} = videoFrame;

        if (!codedWidth || !codedHeight) {
          videoFrame.close();
          return;
        }

        await updateSegmenterModel();

        const useSelfieModel = currentModelPath?.includes('selfie_segmenter');

        const frameStart = performance.now();

        const frameDeltaMs = frameStart - lastFrameTs;

        lastFrameTs = frameStart;

        let filterMs = 0;
        let segmentationMs = 0;
        let gpuMs = 0;

        const frameLogger = getSafeLogger('segmenter:WritableStream::write');

        try {
          const backgroundEffectEnabled = segmenterOptions.enabled && segmenterOptions.quality !== 'bypass';

          if (!backgroundEffectEnabled) {
            /*
             * Background effect disabled:
             * render the original video frame.
             */
            const gpuStart = performance.now();

            webGLRenderer?.renderPassthrough(videoFrame);

            gpuMs = performance.now() - gpuStart;

            /*
             * The next enabled frame should run segmentation
             * immediately rather than reusing an old state.
             */
            hasSegmentationMask = false;
            segmentationFrameCounter = 0;
          } else {
            /*
             * Always segment the first frame.
             *
             * Afterwards, only segment according to the
             * configured interval.
             */
            const shouldRunSegmentation =
              !hasSegmentationMask || segmentationFrameCounter % getSegmentationFrameInterval() === 0;

            segmentationFrameCounter++;

            if (!shouldRunSegmentation) {
              /*
               * Skip MediaPipe and use the last stored mask.
               */
              const gpuStart = performance.now();

              webGLRenderer?.renderWithPreviousMask(videoFrame, segmenterOptions);

              gpuMs = performance.now() - gpuStart;
            } else {
              /*
               * Filters only need to run on frames that are
               * passed into MediaPipe.
               */
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

              const segmentationStart = performance.now();

              await new Promise<void>(resolve => {
                segmenter.segmentForVideo(
                  segmenterOptions.enableFilters ? effectsCanvas : videoFrame,
                  timestamp * 1000,
                  result => {
                    segmentationMs = performance.now() - segmentationStart;

                    const categoryMask = result.categoryMask;

                    const confidenceMask = result.confidenceMasks?.[0];

                    try {
                      if (!categoryMask || !confidenceMask) {
                        frameLogger.warn('Missing segmentation masks.');

                        const gpuStart = performance.now();

                        if (hasSegmentationMask) {
                          webGLRenderer?.renderWithPreviousMask(videoFrame, segmenterOptions);
                        } else {
                          webGLRenderer?.renderPassthrough(videoFrame);
                        }

                        gpuMs = performance.now() - gpuStart;

                        return;
                      }

                      const categoryTexture = categoryMask.getAsWebGLTexture();

                      const confidenceTexture = confidenceMask.getAsWebGLTexture();

                      const gpuStart = performance.now();

                      webGLRenderer?.renderWithNewMasks(
                        videoFrame,
                        segmenterOptions,
                        categoryTexture,
                        confidenceTexture,
                        useSelfieModel,
                      );

                      gpuMs = performance.now() - gpuStart;

                      hasSegmentationMask = true;
                    } catch (error) {
                      frameLogger.error('Error processing segmentation result:', error);

                      /*
                       * If rendering the new mask failed,
                       * force another segmentation attempt
                       * on the next frame.
                       */
                      hasSegmentationMask = false;
                    } finally {
                      categoryMask?.close();
                      confidenceMask?.close();

                      resolve();
                    }
                  },
                );
              });
            }
          }
        } finally {
          videoFrame.close();
        }

        const totalMs = performance.now() - frameStart;

        totalMsSum += totalMs;
        segmentationMsSum += segmentationMs;
        gpuMsSum += gpuMs;
        filterMsSum += filterMs;

        /*
         * Keep the existing metric meaning:
         * frameDeltaMs represents the time between frames.
         *
         * Skipped segmentation frames report segmentationMs = 0.
         */
        updateMetrics(frameDeltaMs, segmentationMs, gpuMs);

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
    new CountQueuingStrategy({
      highWaterMark: 1,
    }),
  );

  readable.pipeTo(writer).catch((error: unknown) => {
    logger.error(`[virtual-background] video error: ${(error as Error).message}`);
  });
}
