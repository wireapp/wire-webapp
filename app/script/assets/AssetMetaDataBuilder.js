//
// Wire
// Copyright (C) 2017 Wire Swiss GmbH
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see http://www.gnu.org/licenses/.
//

if (window.z == null) { window.z = {}; }
if (z.assets == null) { z.assets = {}; }

// Builder for creating all kinds of asset metadata
z.assets.AssetMetaDataBuilder = {

  /*
  Constructs corresponding asset metadata depending on the given file type

  @param file [File] the file to generate metadata for
  @return metadata [ImageMetaData, VideoMetaData, AudioMetaData]
  */
  build_metadata(file) {
    this.logger = new z.util.Logger('z.assets.AssetMetaDataBuilder', z.config.LOGGER.OPTIONS);
    if (this.is_video(file)) {
      return this._build_video_metdadata(file);
    } else if (this.is_audio(file)) {
      return this._build_audio_metdadata(file);
    } else if (this.is_image(file)) {
      return this._build_image_metdadata(file);
    } else {
      return Promise.resolve();
    }
  },

  is_video(file) {
    return __guard__(file != null ? file.type : undefined, x => x.startsWith('video'));
  },

  is_audio(file) {
    return __guard__(file != null ? file.type : undefined, x => x.startsWith('audio'));
  },

  is_image(file) {
    return __guard__(file != null ? file.type : undefined, x => x.startsWith('image'));
  },

  _build_video_metdadata(videofile) {
    return new Promise(function(resolve, reject) {
      let url = window.URL.createObjectURL(videofile);
      let videoElement = document.createElement('video');
      videoElement.onloadedmetadata = function() {
        resolve(new z.proto.Asset.VideoMetaData(videoElement.videoWidth, videoElement.videoHeight, videoElement.duration));
        return window.URL.revokeObjectURL(url);
      };
      videoElement.onerror = function(error) {
        reject(error);
        return window.URL.revokeObjectURL(url);
      };
      return videoElement.src = url;
    });
  },

  _build_image_metdadata(imagefile) {
    return new Promise(function(resolve, reject) {
      let url = window.URL.createObjectURL(imagefile);
      let img = new Image();
      img.onload = function() {
        resolve(new z.proto.Asset.ImageMetaData(img.width, img.height));
        return window.URL.revokeObjectURL(url);
      };
      img.onerror = function(error) {
        reject(error);
        return window.URL.revokeObjectURL(url);
      };
      return img.src = url;
    });
  },

  _build_audio_metdadata(audiofile) {
    return z.util.load_file_buffer(audiofile)
    .then(function(buffer) {
      let audioContext = new AudioContext();
      audioContext.close();
      return audioContext.decodeAudioData(buffer);}).then(audio_buffer => new z.proto.Asset.AudioMetaData(audio_buffer.duration * 1000, z.assets.AssetMetaDataBuilder._normalise_loudness(audio_buffer)));
  },

  _normalise_loudness(audio_buffer) {
    let MAX_SAMPLES = 200;
    let AMPLIFIER = 700; // in favour of iterating all samples before we interpolate them
    let preview = __range__(0, MAX_SAMPLES, true);
    for (let channel_index = 0, end = audio_buffer.numberOfChannels, asc = 0 <= end; asc ? channel_index <= end : channel_index >= end; asc ? channel_index++ : channel_index--) {
      let channel = Array.from(audio_buffer.getChannelData(channel_index));
      let bucket_size = parseInt(channel.length / MAX_SAMPLES);
      let buckets = z.util.ArrayUtil.chunk(channel, bucket_size);
      for (let bucket_index = 0; bucket_index < buckets.length; bucket_index++) {
        let bucket = buckets[bucket_index];
        preview[bucket_index] = z.util.NumberUtil.cap_to_byte(AMPLIFIER * z.util.NumberUtil.root_mean_square(bucket));
      }
      break;
    } // only select first channel
    return new Uint8Array(preview);
  }
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}