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

// For some reason, Jimp attaches to self, even in Node.
// https://github.com/jimp-dev/jimp/issues/466
import * as _Jimp from 'jimp';

// @ts-ignore
const Jimp: typeof _Jimp = typeof self !== 'undefined' ? self.Jimp || _Jimp : _Jimp;

self.addEventListener('message', async event => {
  const COMPRESSION = 80;
  let MAX_SIZE = 1448;
  let MAX_FILE_SIZE = 310 * 1024;

  if (event.data.useProfileImageSize) {
    MAX_SIZE = 280;
    MAX_FILE_SIZE = 1024 * 1024;
  }

  // Unfortunately, Jimp doesn't support MIME type "image/webp": https://github.com/oliver-moran/jimp/issues/144
  const image = await Jimp.read(event.data.buffer);
  if (event.data.useProfileImageSize) {
    image.cover(MAX_SIZE, MAX_SIZE);
  } else if (image.bitmap.width > MAX_SIZE || image.bitmap.height > MAX_SIZE) {
    image.scaleToFit(MAX_SIZE, MAX_SIZE);
  }

  if (image.bitmap.data.length > MAX_FILE_SIZE) {
    image.quality(COMPRESSION);
  }

  const buffer = await image.getBufferAsync(image.getMIME());
  self.postMessage(buffer);
  return self.close();
});
