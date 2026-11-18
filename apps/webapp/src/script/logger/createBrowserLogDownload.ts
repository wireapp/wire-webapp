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
import {Maybe, Result, task, type Task} from 'true-myth';

import type {ApplicationLogDownload, ApplicationLogDownloadOutcome} from './applicationLogDownload';
import {
  exportBrowserLogs,
  type BrowserLogArchive,
  type BrowserLogArchiveOptions,
  type BrowserLogExportDirectory,
} from './exportBrowserLogs';

import {persistentBrowserLogsFeatureToggleName} from '../featureToggles/startupFeatureToggleNames';
import type {StartupFeatureToggles} from '../featureToggles/startupFeatureToggles';

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

const isoTimestampMinuteLength = 16;

function isSavePickerCancellation(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function createBrowserLogDownload(options: BrowserLogDownloadOptions): Maybe<ApplicationLogDownload> {
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

  async function saveBrowserLogs(): Promise<Result<ApplicationLogDownloadOutcome, 'failed'>> {
    let fileHandle: Pick<FileSystemFileHandle, 'createWritable'>;
    try {
      const utcMinute = new Date(clock.currentUnixEpochMilliseconds)
        .toISOString()
        .slice(0, isoTimestampMinuteLength)
        .replace(/[T:]/gu, '-');
      // This must run in the click's call stack, before any asynchronous work.
      fileHandle = await pickSaveFile({
        suggestedName: `wire-logs-${utcMinute}Z.zip`,
        types: [{description: 'ZIP archive', accept: {'application/zip': ['.zip']}}],
      });
    } catch (error: unknown) {
      if (isSavePickerCancellation(error)) {
        return Result.ok('cancelled');
      }

      return Result.err('failed');
    }

    const destination = await fileHandle.createWritable();
    const exportResult = await exportBrowserLogs({
      destination,
      getDirectory,
      createArchive,
      signal: new AbortController().signal,
    });

    return exportResult.match({
      Ok() {
        return Result.ok('saved');
      },
      Err() {
        return Result.err('failed');
      },
    });
  }

  function downloadBrowserLogs(): Task<ApplicationLogDownloadOutcome, 'failed'> {
    return task.tryOr('failed' as const, saveBrowserLogs).andThen(task.fromResult);
  }

  return Maybe.just(downloadBrowserLogs);
}
