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

const SEGMENTATION_FRAME_INTERVAL = 1;

// Performance measurement point object for active GPU calculation time
const activeGpuQueries = new Map<
  WebGLSync,
  {
    gpuStart: number;
    frameDeltaMs: number;
    segmentationMs: number;
    filterMs: number;
  }
>();

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

  const triggerGpuLogger = getSafeLogger('segmenter:triggerGpuLogger');
  let hasLoggedTriggerGpuMissingWebGLContext = false;
  function triggerGpuTracking(gpuStart: number, frameDeltaMs: number, segmentationMs: number, filterMs: number) {
    const gl = webGLRenderer?.gl;
    if (!gl) {
      if (!hasLoggedTriggerGpuMissingWebGLContext) {
        triggerGpuLogger.info('[virtual-background] WebGL context not available, ignore GPU measurement.');
        hasLoggedTriggerGpuMissingWebGLContext = true;
      }
      return;
    }

    hasLoggedTriggerGpuMissingWebGLContext = false;
    // Create a Fence in the GPU queue after the Draw calls
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) {
      triggerGpuLogger.error('[virtual-background] Failed to create GPU sync object.');
      return;
    }
    gl.flush(); // Forces the browser to send commands to the GPU immediately

    // Remember data for this specific frame in the background
    activeGpuQueries.set(sync, {gpuStart, frameDeltaMs, segmentationMs, filterMs});

    // If the background_loop is not yet running, start it
    if (activeGpuQueries.size === 1) {
      requestAnimationFrame(checkGpuQueries);
    }
  }

  const queriesLogger = getSafeLogger('segmenter:heckGpuQueries');
  let hasLoggedMissingWebGLContext = false;
  function checkGpuQueries() {
    const gl = webGLRenderer?.gl;
    if (!gl) {
      if (!hasLoggedMissingWebGLContext) {
        queriesLogger.warn('[virtual-background] WebGL context not available, GPU queries cannot be read.');
        hasLoggedMissingWebGLContext = true;
      }
      return;
    }

    hasLoggedMissingWebGLContext = false;

    if (activeGpuQueries.size === 0) {
      return;
    }

    for (const [sync, data] of activeGpuQueries.entries()) {
      // Check instantaneously (0-nanosecond timeout) if the GPU has finished this frame
      const status = gl.clientWaitSync(sync, 0, 0);

      if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
        const gpuMs = performance.now() - data.gpuStart;
        const totalMs = data.filterMs + data.segmentationMs + gpuMs;

        // 1. Increment statistics in the background
        totalMsSum += totalMs;
        segmentationMsSum += data.segmentationMs;
        gpuMsSum += gpuMs;
        filterMsSum += data.filterMs;
        frames++;
        totalFrames++;

        // 2. Update your metrics (delayed until GPU was ready)
        updateMetrics(totalMs, data.segmentationMs, gpuMs);

        // 3. Tidying Up
        gl.deleteSync(sync);
        activeGpuQueries.delete(sync);
      }
    }

    const now = performance.now();
    if (now - lastStatsTime > 2000) {
      // Only log/reset if data was present at all in the last 2 seconds
      if (frames > 0) {
        totalMsSum = 0;
        segmentationMsSum = 0;
        gpuMsSum = 0;
        filterMsSum = 0;
        frames = 0;
      }

      // Set the timer in any case to "now", so that the 2-second window starts clean from the beginning
      lastStatsTime = now;
    }

    // If there are still open measurements, check again in the next frame
    if (activeGpuQueries.size > 0) {
      setTimeout(checkGpuQueries, 2);
    }
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

        // Performance measurement points --
        const frameStart = performance.now();
        const frameDeltaMs = frameStart - lastFrameTs;
        let filterMs = 0;
        let segmentationMs = 0;
        lastFrameTs = frameStart;
        // ---------------------------------

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

            // Register GPU measurement asynchronously in the background (segmentationMs and filterMs are simply 0 here)
            triggerGpuTracking(gpuStart, frameDeltaMs, 0, 0);

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
              !hasSegmentationMask || segmentationFrameCounter % SEGMENTATION_FRAME_INTERVAL === 0;

            segmentationFrameCounter++;

            if (!shouldRunSegmentation) {
              /*
               * Skip MediaPipe and use the last stored mask.
               */
              const gpuStart = performance.now();

              webGLRenderer?.renderWithPreviousMask(videoFrame, segmenterOptions);

              // Register GPU measurement asynchronously in the background (segmentationMs and filterMs are simply 0 here)
              triggerGpuTracking(gpuStart, frameDeltaMs, 0, 0);
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
                    // Stop pure segmentation time immediately (before textures are processed)
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

                        triggerGpuTracking(gpuStart, frameDeltaMs, segmentationMs, filterMs);
                        resolve(); // RESOLVE IMMEDIATELY, do not wait for GPU!
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

                      hasSegmentationMask = true;

                      // Registering REAL GPU measurement in the background
                      triggerGpuTracking(gpuStart, frameDeltaMs, segmentationMs, filterMs);
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
                      resolve(); // Resolve! The stream moves directly to the next frame.
                    }
                  },
                );
              });
            }
          }
        } finally {
          videoFrame.close();
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
