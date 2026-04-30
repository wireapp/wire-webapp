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

import {VideoFilter} from './filter';
import {WorkerProcessVideoTrackOptions} from './options';
import {WebGLRenderer} from './renderer';

import type {Metrics} from '../backgroundEffectsWorkerTypes';
import {createMetricsWindow, pushMetricsSample, buildMetrics} from '../helper/metrics';

export let globalOptions = {} as WorkerProcessVideoTrackOptions;

async function createSegmenter(canvas: OffscreenCanvas) {
  const {wasmLoaderPath, wasmBinaryPath, modelPath} = globalOptions;
  const fileset =
    wasmLoaderPath && wasmBinaryPath
      ? {
          wasmLoaderPath,
          wasmBinaryPath,
        }
      : await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm');
  // console.log(`[virtual-background] createSegmenter`, {canvas});
  const segmenter = await ImageSegmenter.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        modelPath ||
        'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    outputCategoryMask: true,
    outputConfidenceMasks: true,
    canvas,
  });
  return segmenter;
}

export async function runSegmenter(
  canvas: OffscreenCanvas,
  readable: ReadableStream,
  opts: WorkerProcessVideoTrackOptions,
  onMetrics: (metrics: Metrics) => void,
) {
  // console.log(`[virtual-background] runSegmenter`, {canvas, options, readable});
  globalOptions = opts;

  let webGLRenderer: WebGLRenderer | null = new WebGLRenderer(canvas);

  function onContextLost(event: Event) {
    // console.log(`[virtual-background] webglcontextlost (${!!webGLRenderer})`);
    event.preventDefault();
    webGLRenderer?.close();
    webGLRenderer = null;
  }

  function onContextRestored() {
    // console.log(`[virtual-background] webglcontextrestored (${!!webGLRenderer})`);
    if (!webGLRenderer) {
      setTimeout(() => {
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

  function restartSegmenter() {
    createSegmenter(canvas)
      .then(newSegmenter => {
        const oldSegmenter = segmenter;
        segmenter = newSegmenter;
        oldSegmenter.close();
      })
      .catch((e: unknown) => {
        console.error('Error restarting segmenter:', e);
      });
  }

  // Filters.
  const effectsCanvas = new OffscreenCanvas(1, 1);
  const videoFilter = new VideoFilter(effectsCanvas);

  const useSelfieModel = !!globalOptions.modelPath?.includes('selfie_segmenter');

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

    onMetrics(
      buildMetrics(
        metricsWindow,
        droppedFrames,
        'superhigh', // falls du keine Tier-Logik hast
        'GPU',
      ),
    );
  }

  function close() {
    segmenter.close();
    webGLRenderer?.close();
    webGLRenderer = null;
    videoFilter?.destroy();
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
  }

  const writer = new WritableStream(
    {
      async write(videoFrame: VideoFrame) {
        const {codedWidth, codedHeight, timestamp} = videoFrame;
        if (!codedWidth || !codedHeight) {
          videoFrame.close();
          return;
        }

        // start to process the frame
        const frameStart = performance.now();

        let filterMs = 0;
        let segmentationMs = 0;
        let gpuMs = 0;

        try {
          if (globalOptions.enabled) {
            if (globalOptions.enableFilters) {
              const filterStart = performance.now();
              videoFilter.render(
                videoFrame,
                globalOptions.blur,
                globalOptions.brightness,
                globalOptions.contrast,
                globalOptions.gamma,
              );
              filterMs = performance.now() - filterStart;
            }

            const segStart = performance.now();

            await new Promise<void>(resolve => {
              segmenter.segmentForVideo(
                globalOptions.enableFilters ? effectsCanvas : videoFrame,
                timestamp * 1000,
                result => {
                  segmentationMs = performance.now() - segStart;

                  const categoryMask = result.categoryMask;
                  const confidenceMask = result.confidenceMasks?.[0];

                  try {
                    if (!categoryMask || !confidenceMask) {
                      console.warn('Skipping frame: Missing masks or WebGL data.');
                      return;
                    }

                    const categoryTextureMP = categoryMask.getAsWebGLTexture();
                    const confidenceTextureMP = confidenceMask.getAsWebGLTexture();
                    const gpuStart = performance.now();
                    console.log('############# segmenter', {...globalOptions});
                    webGLRenderer?.render(
                      videoFrame,
                      globalOptions,
                      categoryTextureMP,
                      confidenceTextureMP,
                      useSelfieModel,
                    );
                    gpuMs = performance.now() - gpuStart;
                  } catch (e) {
                    console.error('Error in videoCallback:', e);
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
            webGLRenderer?.render(videoFrame, globalOptions);
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
          // onStats({
          //   fps: (1000 * frames) / (now - lastStatsTime),
          //   totalMs: totalMsSum / frames,
          //   segmentationMs: segmentationMsSum / frames,
          //   gpuMs: gpuMsSum / frames,
          //   filterMs: filterMsSum / frames,
          // });

          lastStatsTime = now;
          totalMsSum = 0;
          segmentationMsSum = 0;
          gpuMsSum = 0;
          filterMsSum = 0;
          frames = 0;
        }

        // Restart segmenter to avoid memory leaks.
        if (globalOptions.restartEvery && totalFrames % globalOptions.restartEvery === 0) {
          restartSegmenter();
        }
      },

      close() {
        // console.log('[virtual-background] runSegmenter close');
        close();
      },
      abort(reason) {
        // console.log('[virtual-background] runSegmenter abort', reason);
        close();
      },
    },
    new CountQueuingStrategy({highWaterMark: 1}),
  );

  readable.pipeTo(writer).catch((err: unknown) => {
    console.error(`[virtual-background] video error: ${(err as Error).message}`);
  });
}
