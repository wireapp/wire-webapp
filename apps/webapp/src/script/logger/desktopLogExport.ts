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

import {isFunction, isObject} from '@sindresorhus/is';
import {Maybe, task, type Task} from 'true-myth';
import {objectHasOwn} from 'ts-extras';
import {z} from 'zod';

import type {ApplicationLogDownload, ApplicationLogDownloadOutcome} from './applicationLogDownload';

const desktopLogExportOutcomeSchema = z.enum(['saved', 'cancelled', 'failed']);

const desktopLogExportCapabilitySchema = z.object({
  version: z.literal(1),
  download: z.custom<() => Promise<z.infer<typeof desktopLogExportOutcomeSchema>>>(isFunction),
});

export type DesktopLogExportCapability = Readonly<z.output<typeof desktopLogExportCapabilitySchema>>;

type ReadDesktopLogExportCapability = () => Parameters<typeof desktopLogExportCapabilitySchema.safeParse>[0];

function createDesktopLogDownloadAction(download: DesktopLogExportCapability['download']): ApplicationLogDownload {
  function downloadDesktopLogs(): Task<ApplicationLogDownloadOutcome, 'failed'> {
    return task
      .tryOr('failed' as const, async () => {
        return desktopLogExportOutcomeSchema.safeParse(await download());
      })
      .andThen(parsedOutcome => {
        const outcome = parsedOutcome.success ? parsedOutcome.data : 'failed';

        return outcome === 'failed' ? task.reject('failed' as const) : task.resolve(outcome);
      });
  }

  return downloadDesktopLogs;
}

export function createDesktopLogDownload(
  readDesktopCapability: ReadDesktopLogExportCapability,
): Maybe<ApplicationLogDownload> {
  try {
    const capability = readDesktopCapability();
    if (!isObject(capability)) {
      return Maybe.nothing();
    }

    const versionValue = objectHasOwn(capability, 'version') ? capability.version : undefined;
    const version = desktopLogExportCapabilitySchema.shape.version.safeParse(versionValue);
    if (!version.success) {
      return Maybe.nothing();
    }

    const downloadValue = objectHasOwn(capability, 'download') ? capability.download : undefined;
    const download = desktopLogExportCapabilitySchema.shape.download.safeParse(downloadValue);
    if (!download.success) {
      return Maybe.nothing();
    }

    return Maybe.just(createDesktopLogDownloadAction(download.data.bind(capability)));
  } catch {
    return Maybe.nothing();
  }
}
