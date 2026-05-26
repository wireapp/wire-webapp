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

import {DrawingUtils, ImageSegmenter, RGBAColor} from '@mediapipe/tasks-vision';

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

import {createWallClock} from '../../../../clock/wallClock';

let segmenterOptions: WorkerProcessVideoTrackOptions = {} as WorkerProcessVideoTrackOptions;

export function updateSegmenterOptions(opts: WorkerProcessVideoTrackOptions) {
  // Keep the references stable, this allows us to do option changes on segmenter runtime.
  Object.assign(segmenterOptions, opts);
}

async function createSegmenter(canvas: OffscreenCanvas) {
  const logger = getSafeLogger('segmenter:createSegmenter');
  const {wasmLoaderPath, wasmBinaryPath, modelPath} = segmenterOptions;
  if (!wasmLoaderPath || !wasmBinaryPath) {
    logger.error('wasmLoaderPath and wasmBinaryPath must be provided');
    throw new Error('wasmLoaderPath and wasmBinaryPath must be provided');
  }

  const fileset = {wasmLoaderPath, wasmBinaryPath};
  logger.log(`[virtual-background] createSegmenter`);

  if (!modelPath) {
    logger.error('Model path must be provided');
    throw new Error('Model path must be provided');
  }

  const segmenter = await ImageSegmenter.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: modelPath,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    outputCategoryMask: true,
    outputConfidenceMasks: true,
    canvas,
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
  onPerformanceSample: (sample: PerformanceSample, mode: Mode) => void,
) {
  const logger = getSafeLogger('segmenter:runSegmenter');
  logger.log(`[virtual-background] runSegmenter`);
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

  const restartSegmenter = createRestartQueue(restartSegmenterSequentially);

  async function restartSegmenterSequentially() {
    const targetModelPath = segmenterOptions.modelPath;

    try {
      const newSegmenter = await createSegmenter(canvas);

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
  let lastTimestampMs = 0;

  function updateMetrics(totalMs: number, segmentationMs: number, gpuMs: number) {
    pushMetricsSample(metricsWindow, {totalMs, segmentationMs, gpuMs});

    const quality = segmenterOptions.quality ?? 'auto';
    const tier = quality === 'auto' ? 'fhd' : quality;

    onMetrics(buildMetrics(metricsWindow, droppedFrames, tier, 'GPU'));

    const mode: Mode =
      segmenterOptions.mode === 'passthrough' || segmenterOptions.mode === undefined ? 'blur' : segmenterOptions.mode;
    onPerformanceSample({totalMs: segmentationMs + gpuMs, segmentationMs, gpuMs}, mode);
  }

  function close() {
    segmenter.close();
    webGLRenderer?.close();
    webGLRenderer = null;
    videoFilter?.destroy();
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
  }

  // 1. Erstellen Sie EINEN permanenten Hilfs-Canvas für das Video-Mapping (außerhalb des Streams)
  const bufferCanvas = new OffscreenCanvas(1, 1);
  const bufferCtx = bufferCanvas.getContext('2d');

  const glCtx = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  }) as WebGL2RenderingContext;

  const drawingUtils = glCtx ? new DrawingUtils(glCtx) : null;
  let isProcessing = false;

  const writer = new WritableStream(
    {
      async write(videoFrame: VideoFrame) {

        // 1. Frame-Skipping: Wenn die GPU/MediaPipe ausgelastet ist, Frame sofort verwerfen
        if (isProcessing) {
          videoFrame.close();
          return;
        }

        const {codedWidth, codedHeight, timestamp} = videoFrame;
        if (!codedWidth || !codedHeight) {
          videoFrame.close();
          return;
        }
        isProcessing = true;

        await updateSegmenterModel();

        const useSelfieModel = currentModelPath?.includes('selfie_segmenter');

        // start to process the frame
        const frameStart = performance.now();

        let filterMs = 0;
        let segmentationMs = 0;
        let gpuMs = 0;
        const logger = getSafeLogger('segmenter:WritableStream::write');

        // 2. OffscreenCanvas an die Größe des VideoFrames anpassen
        if (bufferCanvas.width !== videoFrame.displayWidth || bufferCanvas.height !== videoFrame.displayHeight) {
          bufferCanvas.width = videoFrame.displayWidth;
          bufferCanvas.height = videoFrame.displayHeight;
        }

        // 3. Das VideoFrame auf den Offscreen-Buffer zeichnen
        bufferCtx?.drawImage(videoFrame, 0, 0);

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

            const now = performance.now();
            const timestampMs = now > lastTimestampMs ? now : lastTimestampMs + 1;
            lastTimestampMs = timestampMs;
            const colors: RGBAColor[] = [
              [0, 0, 0, 0], // background transparent
              [255, 255, 255, 255], // person white
            ];
            const transparent: RGBAColor = [0, 0, 0, 0];

            // 4. WICHTIG: Übergeben Sie nun 'bufferCanvas' statt 'videoFrame' an MediaPipe
            segmenter.segmentForVideo(bufferCanvas, timestampMs, result => {

              if (result.categoryMask && colors && drawingUtils && glCtx) {
                const width = result.categoryMask.width;
                const height = result.categoryMask.height;

                if (canvas.width !== width || canvas.height !== height) {
                  canvas.width = width;
                  canvas.height = height;
                  glCtx.viewport(0, 0, width, height);
                }

                drawingUtils.drawCategoryMask(result.categoryMask, colors, transparent);
                glCtx.flush();

                result.categoryMask.close();
              }

              if (result.confidenceMasks) {
                result.confidenceMasks.forEach((m: any) => m.close());
              }
            });
          } else {
            const gpuStart = performance.now();
            webGLRenderer?.render(videoFrame, segmenterOptions);
            gpuMs = performance.now() - gpuStart;
          }
        } finally {
          isProcessing = false;
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
