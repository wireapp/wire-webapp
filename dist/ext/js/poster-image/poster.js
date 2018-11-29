(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory)
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    root.poster = factory()
  }
}(this, function () {
  'use strict'

  var captureFrame = function (video) {
    return new Promise(function(resolve) {
      var canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(video.src)

      if (canvas.msToBlob !== undefined) {
        resolve(canvas.msToBlob())
      } else {
        canvas.toBlob(function(blob) {
          resolve(blob)
        })
      }
    })
  }

  var loadVideoSrc = function (videoSrc) {
    return new Promise(function(resolve, reject) {
      var video = document.createElement('video')
      video.src = videoSrc

      video.addEventListener('loadedmetadata', function(event) {
        video.currentTime = 1
      });

      video.addEventListener('seeked', function() {
        resolve(video)
      });

      video.addEventListener('error', function(error) {
        reject(error)
      });
    })
  }

  var api = function(file) {
    if (!(file instanceof Blob)) {
      throw new Error('Expected file to be of type Blob')
    }

    return Promise.resolve().then(function() {
      return URL.createObjectURL(file)
    }).then(function(videoSrc) {
      return loadVideoSrc(videoSrc)
    }).then(function(video) {
      return captureFrame(video)
    }).catch(function(error) {
      throw new Error('Failed to capture poster frame: ' + error.message)
    })
  }

  return api
}))