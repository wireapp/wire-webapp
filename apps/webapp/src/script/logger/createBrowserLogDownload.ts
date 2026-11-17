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

/// <reference types="wicg-file-system-access" />

import type {Clock} from '@enormora/clock/clock';
import {isFunction} from '@sindresorhus/is';
import {format} from 'date-fns';
import {Maybe} from 'true-myth';

import {
  exportBrowserLogs,
  type BrowserLogArchive,
  type BrowserLogArchiveOptions,
  type BrowserLogExportDirectory,
} from './exportBrowserLogs';

import {persistentBrowserLogsFeatureToggleName} from '../featureToggles/startupFeatureToggleNames';
import type {StartupFeatureToggles} from '../featureToggles/startupFeatureToggles';

export type BrowserLogDownloadOutcome = 'saved' | 'cancelled' | 'failed';
export type BrowserLogDownload = () => Promise<BrowserLogDownloadOutcome>;

type BrowserLogDownloadOptions = {
  readonly startupFeatureToggles: StartupFeatureToggles;
  readonly isElectron: boolean;
  readonly showSaveFilePicker: Maybe<
    (options: Parameters<typeof window.showSaveFilePicker>[0]) => Promise<Pick<FileSystemFileHandle, 'createWritable'>>
  >;
  readonly clock: Pick<Clock, 'currentUnixEpochMilliseconds'>;
  readonly getDirectory: () => Promise<BrowserLogExportDirectory>;
  readonly createArchive: (options: BrowserLogArchiveOptions) => BrowserLogArchive;
};

function isSavePickerCancellation(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function createBrowserLogDownload(options: BrowserLogDownloadOptions): Maybe<BrowserLogDownload> {
  const {startupFeatureToggles, isElectron, showSaveFilePicker, clock, getDirectory, createArchive} = options;
  if (isElectron) {
    return Maybe.nothing();
  }
  if (!startupFeatureToggles.isFeatureToggleEnabled(persistentBrowserLogsFeatureToggleName)) {
    return Maybe.nothing();
  }
  if (showSaveFilePicker.isNothing) {
    return Maybe.nothing();
  }
  const pickSaveFile = showSaveFilePicker.value;
  if (!isFunction(pickSaveFile)) {
    return Maybe.nothing();
  }

  async function downloadBrowserLogs(): Promise<BrowserLogDownloadOutcome> {
    let fileHandle: Pick<FileSystemFileHandle, 'createWritable'>;
    try {
      // This must run in the click's call stack, before any asynchronous work.
      fileHandle = await pickSaveFile({
        suggestedName: `wire-logs-${format(clock.currentUnixEpochMilliseconds, 'yyyy-MM-dd-HH-mm')}.zip`,
        types: [{description: 'ZIP archive', accept: {'application/zip': ['.zip']}}],
      });
    } catch (error: unknown) {
      if (isSavePickerCancellation(error)) {
        return 'cancelled';
      }

      return 'failed';
    }

    try {
      const destination = await fileHandle.createWritable();

      return await exportBrowserLogs({
        destination,
        getDirectory,
        createArchive,
        signal: new AbortController().signal,
      }).match({
        Resolved() {
          return 'saved' as const;
        },
        Rejected() {
          return 'failed' as const;
        },
      });
    } catch {
      return 'failed';
    }
  }

  return Maybe.just(downloadBrowserLogs);
}
