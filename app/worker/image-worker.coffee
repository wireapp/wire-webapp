importScripts 'jimp.min.js'

MAX_SIZE = 1448
MAX_FILE_SIZE = 5 * 1024
COMPRESSION = 75

self.addEventListener 'message', (event) ->

  Jimp.read(event.data).then (image) ->

    if image.bitmap.width > MAX_SIZE or image.bitmap.height > MAX_SIZE
      image.scaleToFit MAX_SIZE, MAX_SIZE

    if image.bitmap.data.length > MAX_FILE_SIZE
      image.quality COMPRESSION

    image.getBuffer Jimp.AUTO, (err, src) ->
      self.postMessage src
      self.close()
