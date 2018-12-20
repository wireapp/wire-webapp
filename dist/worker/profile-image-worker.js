importScripts('jimp.min.js');

const MAX_SIZE = 280;
const MAX_FILE_SIZE = 1024 * 1024;
const COMPRESSION = 80;

self.addEventListener('message', event =>

  Jimp.read(event.data).then((image) => {

    image.cover(MAX_SIZE, MAX_SIZE);

    if (image.bitmap.data.length > MAX_FILE_SIZE) {
      image.quality(COMPRESSION);
    }

    return image.getBuffer(Jimp.AUTO, (err, src) => {
      self.postMessage(src);
      return self.close();
    });
  })
);
