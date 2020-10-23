/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

/**
 * @typedef {Record<string, Uint8Array>} Files
 * @typedef {import('jszip')} JSZip
 */

importScripts('jszip.min.js');

self.addEventListener('message', async event => {
  try {
    /** @type {JSZip} */
    const archive = await JSZip.loadAsync(event.data);

    /** @type {Files} */
    const files = {};

    for (const fileName in archive.files) {
      files[fileName] = await archive.files[fileName].async('uint8array');
    }

    self.postMessage(files);
  } catch (error) {
    self.postMessage({error: error.message});
  }

  return self.close();
});
