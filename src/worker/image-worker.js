importScripts('jimp.min.js');

/**
 * @typedef {{buffer: ArrayBuffer, useProfileImageSize?: boolean}} Data
 */

self.addEventListener('message', (/** @type {MessageEvent<Data>} */ event) => {
  let MAX_SIZE = 1448;
  let MAX_FILE_SIZE = 310 * 1024;
  let COMPRESSION = 80;

  if (event.data.useProfileImageSize) {
    MAX_SIZE = 280;
    MAX_FILE_SIZE = 1024 * 1024;
    COMPRESSION = 80;
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
