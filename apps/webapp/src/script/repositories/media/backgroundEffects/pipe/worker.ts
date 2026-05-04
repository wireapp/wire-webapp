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

import {Metrics} from 'Repositories/media/backgroundEffects';
import {getSafeLogger} from 'Repositories/media/backgroundEffects/helper/logger';

import {WorkerProcessVideoTrackOptions} from './options';
import {runSegmenter, segmenterOptions} from './segmenter';

const workerLogger = getSafeLogger('virtual-background-worker');

self.onmessage = ({data}) => {
  workerLogger.log(`[virtual-background] worker onmessage`, data);
  const {name} = data as {name: string};
  if (name === 'options') {
    const {options: opts} = data as {options: WorkerProcessVideoTrackOptions};
    Object.assign(segmenterOptions, opts);
  } else if (name === 'runSegmenter') {
    const {
      canvas,
      readable,
      options: opts,
    } = data as {
      canvas: OffscreenCanvas;
      readable: ReadableStream;
      options: WorkerProcessVideoTrackOptions;
    };
    runSegmenter(canvas, readable, opts, (stats: Metrics) => {
      self.postMessage({name: 'stats', stats});
    }).catch((err: unknown) => {
      workerLogger.error(`[virtual-background] video error: ${(err as Error).message}`);
    });
  }
};
