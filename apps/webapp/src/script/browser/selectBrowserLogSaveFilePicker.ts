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
/* global SaveFilePickerOptions:readonly */

import {isFunction} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

export type BrowserLogSaveFilePicker = (
  options?: SaveFilePickerOptions,
) => Promise<Pick<FileSystemFileHandle, 'createWritable'>>;

type SelectBrowserLogSaveFilePickerOptions = {
  readonly isElectron: boolean;
  readonly browserWindow: {
    readonly showSaveFilePicker?: BrowserLogSaveFilePicker | undefined;
  };
};

/** Read the picker capability once at startup and keep Electron on its native logging path. */
export function selectBrowserLogSaveFilePicker(
  options: SelectBrowserLogSaveFilePickerOptions,
): Maybe<BrowserLogSaveFilePicker> {
  const {isElectron, browserWindow} = options;
  if (isElectron) {
    return Maybe.nothing();
  }

  try {
    const pickSaveFile = browserWindow.showSaveFilePicker;
    if (isFunction(pickSaveFile)) {
      return Maybe.just(pickSaveFile.bind(browserWindow));
    }
  } catch {
    // A restricted picker capability disables browser logging without affecting app startup.
  }

  return Maybe.nothing();
}
