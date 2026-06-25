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

export type CleanupFunction = () => void;

type CleanupStackDependencies = {
  readonly onCleanupError?: (cleanupError: unknown) => void;
};

export type CleanupStack = {
  readonly addCleanup: (cleanup: CleanupFunction) => void;
  readonly runAllCleanups: () => void;
};

export function createCleanupStack(dependencies: CleanupStackDependencies = {}): CleanupStack {
  const cleanupList: CleanupFunction[] = [];
  const {onCleanupError} = dependencies;

  return {
    addCleanup(cleanup: CleanupFunction): void {
      cleanupList.push(cleanup);
    },

    runAllCleanups(): void {
      while (cleanupList.length > 0) {
        const cleanup = Maybe.of(cleanupList.pop());

        if (cleanup.isJust) {
          const cleanupFunction = cleanup.value;

          try {
            cleanupFunction();
          } catch (cleanupError: unknown) {
            onCleanupError?.(cleanupError);
          }
        }
      }
    },
  };
}
