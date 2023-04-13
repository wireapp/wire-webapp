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

import JSZip from 'jszip';

type Payloads = {type: 'zip'; files: Record<string, ArrayBuffer>} | {type: 'unzip'; bytes: ArrayBuffer};

self.addEventListener('message', async (event: MessageEvent<Payloads>) => {
  const zip = new JSZip();
  try {
    switch (event.data.type) {
      case 'zip':
        for (const [filename, file] of Object.entries(event.data.files)) {
          zip.file(filename, file, {binary: true});
        }

        const array = await zip.generateAsync({compression: 'DEFLATE', type: 'uint8array'});

        self.postMessage(array);
        break;

      case 'unzip':
        const archive = await JSZip.loadAsync(event.data.bytes);

        const files: Record<string, Uint8Array> = {};

        for (const fileName in archive.files) {
          files[fileName] = await archive.files[fileName].async('uint8array');
        }

        self.postMessage(files);
    }
  } catch (error) {
    self.postMessage({error: error.message});
  }
});
