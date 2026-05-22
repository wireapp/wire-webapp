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

import is from '@sindresorhus/is';

import type {Metrics} from 'Repositories/media/backgroundEffects/backgroundEffectsWorkerTypes';
import {getSafeLogger} from 'Repositories/media/backgroundEffects/helper/logger';

import {runCanvas2dSegmenter} from './canvas2dSegmenter';
import {WorkerProcessVideoTrackOptions} from './options';
import {updateSegmenterOptions} from './segmenter';
import {runWebGlSegmenter} from './webGlSegmenter';

const workerLogger = getSafeLogger('virtual-background-worker');

type PipelineType = 'webgl2' | 'canvas2d';

let stopSegmenter: (() => Promise<void>) | null = null;

globalThis.onmessage = ({data}) => {
  workerLogger.log(`[virtual-background] worker onmessage`, data);
  const {name} = data as {name: string};
  if (name === 'options') {
    const {options: opts} = data as {options: WorkerProcessVideoTrackOptions};
    updateSegmenterOptions(opts);
  } else if (name === 'runSegmenter') {
    const {
      canvas,
      readable,
      options: opts,
      pipeline,
    } = data as {
      canvas: OffscreenCanvas;
      readable: ReadableStream;
      options: WorkerProcessVideoTrackOptions;
      pipeline: PipelineType;
    };
    const runner = pipeline === 'canvas2d' ? runCanvas2dSegmenter : runWebGlSegmenter;
    runner(
      canvas,
      readable,
      opts,
      (stats: Metrics) => {
        globalThis.postMessage({name: 'stats', stats});
      },
      (modelPath: string) => {
        globalThis.postMessage({name: 'rendererFallback', modelPath});
      },
    )
      .then(stop => {
        stopSegmenter = stop;
      })
      .catch((err: unknown) => {
        const errorMessage = is.error(err) ? err.message : 'unknown error';
        workerLogger.error(`[virtual-background] video error: ${errorMessage}`);
      });
  } else if (name === 'stop') {
    const stop = stopSegmenter;

    stopSegmenter = null;
    Promise.resolve(stop?.())
      .catch((err: unknown) => {
        const errorMessage = is.error(err) ? err.message : 'unknown error';
        workerLogger.error(`[virtual-background] stop error: ${errorMessage}`);
      })
      .finally(() => {
        globalThis.postMessage({name: 'stopped'});
      });
  }
};
