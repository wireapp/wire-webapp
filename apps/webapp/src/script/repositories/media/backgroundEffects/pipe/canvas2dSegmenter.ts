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

import {Canvas2dRenderer, createCanvas2DRenderer} from './canvas2dRenderer';
import {SELFIE_MULTICLASS_MODEL_PATH, SELFIE_SEGMENTER_MODEL_PATH, WorkerProcessVideoTrackOptions} from './options';
import {RenderPipeline, runSegmenterCore} from './segmenter';

function createCanvas2dPipeline(renderer: Canvas2dRenderer): RenderPipeline {
  return {
    useGPU: false,

    render(videoFrame, options, categoryMask, confidenceMask, useSelfieModel) {
      renderer.render(
        videoFrame,
        options,
        categoryMask.getAsFloat32Array(),
        confidenceMask.getAsFloat32Array(),
        useSelfieModel,
      );
    },

    renderBypass(videoFrame, options) {
      renderer.render(videoFrame, options);
    },

    close() {
      renderer.close();
    },
  };
}

/**
 * Runs the Canvas2D CPU pipeline. The multiclass model isn't supported on CPU,
 * so callers using that model are downgraded to the lightweight selfie segmenter
 * and notified via `onRendererFallback`.
 */
export async function runCanvas2dSegmenter(
  canvas: OffscreenCanvas,
  readable: ReadableStream,
  opts: WorkerProcessVideoTrackOptions,
  onMetrics: (metrics: Metrics) => void,
  onRendererFallback: (modelPath: string) => void,
): Promise<() => Promise<void>> {
  const logger = getSafeLogger('runCanvas2dSegmenter');
  logger.log('[virtual-background] runCanvas2dSegmenter');

  const effectiveOpts: WorkerProcessVideoTrackOptions = {...opts};
  if (effectiveOpts.modelPath === SELFIE_MULTICLASS_MODEL_PATH) {
    effectiveOpts.modelPath = SELFIE_SEGMENTER_MODEL_PATH;
    onRendererFallback(SELFIE_SEGMENTER_MODEL_PATH);
  }

  const renderer = createCanvas2DRenderer(canvas);
  const pipeline = createCanvas2dPipeline(renderer);
  return runSegmenterCore(canvas, readable, effectiveOpts, pipeline, onMetrics);
}
