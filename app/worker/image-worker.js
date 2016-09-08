importScripts("jimp.min.js");

self.addEventListener("message", function(e) {
  Jimp.read(e.data).then(function (image) {
    var maxSize = 1448;

    if (image.bitmap.width > maxSize || image.bitmap.height > maxSize) {
      image.scaleToFit(maxSize, maxSize)
    }

    image
      .quality(80) // proper size check
      .getBuffer(image.getMIME(), function (err, src) {
        self.postMessage(src);
      });
  });
});
