/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {noop} from './util';

// https://stackoverflow.com/questions/42341331/es6-promise-all-progress/42342373

export function promiseProgress<T>(
  promises: PromiseLike<T>[],
  progressCallback: (progress: number) => void = noop,
): Promise<T[]> {
  let progress = 0;
  progressCallback(0);
  for (const promise of promises) {
    promise.then(() => {
      progress++;
      progressCallback(progress / promises.length);
    });
  }
  return Promise.all(promises);
}
