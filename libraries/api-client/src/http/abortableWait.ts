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

import {Maybe} from 'true-myth';

export type AbortableWaitDependencies = {
  readonly clearTimeout: (timeoutIdentifier: ReturnType<typeof globalThis.setTimeout>) => void;
  readonly setTimeout: (handler: () => void, delayInMilliseconds: number) => ReturnType<typeof globalThis.setTimeout>;
};

export type AbortableWait = {
  readonly waitForDurationInMilliseconds: (
    durationInMilliseconds: number,
    abortSignal: Maybe<AbortSignal>,
  ) => Promise<void>;
};

export function createAbortableWait(dependencies: AbortableWaitDependencies): AbortableWait {
  const {clearTimeout, setTimeout} = dependencies;

  return {
    waitForDurationInMilliseconds(durationInMilliseconds, abortSignal) {
      return new Promise((resolve, reject) => {
        const abortSignalOrUndefined = abortSignal.unwrapOr(undefined);

        const handleAbort = () => {
          clearTimeout(timeoutIdentifier);
          abortSignalOrUndefined?.removeEventListener('abort', handleAbort);
          reject(new Error('The wait was aborted.'));
        };

        const timeoutIdentifier = setTimeout(() => {
          abortSignalOrUndefined?.removeEventListener('abort', handleAbort);
          resolve();
        }, durationInMilliseconds);

        if (abortSignalOrUndefined?.aborted) {
          handleAbort();

          return;
        }

        abortSignalOrUndefined?.addEventListener('abort', handleAbort, {once: true});
      });
    },
  };
}
