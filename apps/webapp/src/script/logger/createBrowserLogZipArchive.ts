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

import {ZipWriter} from '@zip.js/zip.js/index-native.js';

import type {BrowserLogArchive, BrowserLogArchiveOptions, BrowserLogArchiveEntry} from './exportBrowserLogs';

export function createBrowserLogZipArchive(options: BrowserLogArchiveOptions): BrowserLogArchive {
  const {destination, signal} = options;
  const archive = new ZipWriter(destination, {
    bufferedWrite: false,
    dataDescriptor: true,
    preventClose: true,
    useWebWorkers: false,
    // Native streaming DEFLATE with a JavaScript fallback; no Worker or WASM assets.
    level: 6,
    signal,
  });

  return {
    async addFile(options: BrowserLogArchiveEntry) {
      const {filename, readable} = options;
      await archive.add(filename, readable);
    },
    async close() {
      await archive.close();
    },
  };
}
