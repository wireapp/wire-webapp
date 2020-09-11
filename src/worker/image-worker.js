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

importScripts('jimp.min.js');

/**
 * @typedef {{buffer: ArrayBuffer, useProfileImageSize?: boolean}} Data
 */

self.addEventListener('message', (/** @type {MessageEvent<Data>} */ event) => {
  const COMPRESSION = 80;
  let MAX_SIZE = 1448;
  let MAX_FILE_SIZE = 310 * 1024;

  if (event.data.useProfileImageSize) {
    MAX_SIZE = 280;
    MAX_FILE_SIZE = 1024 * 1024;
  }

  Jimp.read(event.data.buffer).then(image => {
    if (event.data.useProfileImageSize) {
      image.cover(MAX_SIZE, MAX_SIZE);
    } else if (image.bitmap.width > MAX_SIZE || image.bitmap.height > MAX_SIZE) {
      image.scaleToFit(MAX_SIZE, MAX_SIZE);
    }

    if (image.bitmap.data.length > MAX_FILE_SIZE) {
      image.quality(COMPRESSION);
    }

    return image.getBuffer(Jimp.AUTO, (_error, src) => {
      self.postMessage(src);
      return self.close();
    });
  });
});
