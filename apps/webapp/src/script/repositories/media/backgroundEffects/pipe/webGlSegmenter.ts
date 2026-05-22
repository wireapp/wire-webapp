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

import type {Metrics} from 'Repositories/media/backgroundEffects/backgroundEffectsWorkerTypes';
import {getSafeLogger} from 'Repositories/media/backgroundEffects/helper/logger';

import {runCanvas2dSegmenter} from './canvas2dSegmenter';
import {WorkerProcessVideoTrackOptions} from './options';
import {WebGLRenderer} from './renderer';
import {RenderPipeline, runSegmenterCore} from './segmenter';

import {createWallClock} from '../../../../clock/wallClock';

const CONTEXT_RESTORE_DELAY_MS = 1000;

function createWebGlPipeline(canvas: OffscreenCanvas, initialRenderer: WebGLRenderer): RenderPipeline {
  const logger = getSafeLogger('WebGlPipeline');

  let renderer: WebGLRenderer | null = initialRenderer;
  let restartSegmenter: (() => void) | null = null;

  const attachCanvasEvents = () => {
    canvas.addEventListener('webglcontextlost', onContextLost, {once: true});
    canvas.addEventListener('webglcontextrestored', onContextRestored, {once: true});
  };

  const onContextLost = (event: Event): void => {
    logger.log(`[virtual-background] webglcontextlost (${!!renderer})`);
    event.preventDefault();
    renderer?.close();
    renderer = null;
  };

  const onContextRestored = (): void => {
    logger.log(`[virtual-background] webglcontextrestored (${!!renderer})`);

    if (renderer !== null) {
      return;
    }

    const timer = createWallClock();

    timer.setTimeout(() => {
      logger.log('[virtual-background] restart segmenter onContextRestored');

      try {
        renderer = new WebGLRenderer(canvas);
      } catch (error) {
        logger.error('[virtual-background] WebGLRenderer recreate failed', error);
        return;
      }

      restartSegmenter?.();
      attachCanvasEvents();
    }, CONTEXT_RESTORE_DELAY_MS);
  };

  attachCanvasEvents();

  return {
    useGPU: true,

    attach(restart) {
      restartSegmenter = restart;
    },

    render(videoFrame, options, categoryMask, confidenceMask, useSelfieModel) {
      if (renderer === null) {
        return;
      }

      renderer.render(
        videoFrame,
        options,
        categoryMask.getAsWebGLTexture(),
        confidenceMask.getAsWebGLTexture(),
        useSelfieModel,
      );
    },

    renderBypass(videoFrame, options) {
      renderer?.render(videoFrame, options);
    },

    close() {
      renderer?.close();
      renderer = null;
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
    },
  };
}

/**
 * Runs the WebGL2 GPU pipeline. If WebGL initialization throws at runtime,
 * falls back to the Canvas2D CPU pipeline (with the usual multiclass→selfie
 * model downgrade).
 */
export async function runWebGlSegmenter(
  canvas: OffscreenCanvas,
  readable: ReadableStream,
  opts: WorkerProcessVideoTrackOptions,
  onMetrics: (metrics: Metrics) => void,
  onRendererFallback: (modelPath: string) => void,
): Promise<() => Promise<void>> {
  const logger = getSafeLogger('runWebGlSegmenter');
  logger.log('[virtual-background] runWebGlSegmenter');

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer(canvas);
  } catch (error) {
    logger.log('[virtual-background] WebGLRenderer ctor threw — falling back to Canvas2D', error);
    return runCanvas2dSegmenter(canvas, readable, opts, onMetrics, onRendererFallback);
  }

  const pipeline = createWebGlPipeline(canvas, renderer);
  return runSegmenterCore(canvas, readable, opts, pipeline, onMetrics);
}
