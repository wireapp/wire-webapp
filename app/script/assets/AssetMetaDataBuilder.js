/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.assets = z.assets || {};

// Builder for creating all kinds of asset metadata
z.assets.AssetMetaDataBuilder = {
  _build_audio_metdadata(audiofile) {
    return z.util
      .load_file_buffer(audiofile)
      .then(buffer => {
        const audioContext = new AudioContext();
        audioContext.close();
        return audioContext.decodeAudioData(buffer);
      })
      .then(audio_buffer => {
        const normalized_loudness = z.assets.AssetMetaDataBuilder._normalise_loudness(audio_buffer);
        return new z.proto.Asset.AudioMetaData(audio_buffer.duration * 1000, normalized_loudness);
      });
  },

  _build_image_metdadata(imagefile) {
    return new Promise((resolve, reject) => {
      const url = window.URL.createObjectURL(imagefile);
      const img = new Image();
      img.onload = () => {
        resolve(new z.proto.Asset.ImageMetaData(img.width, img.height));
        window.URL.revokeObjectURL(url);
      };
      img.onerror = error => {
        reject(error);
        window.URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  },

  _build_video_metdadata(video_file) {
    return new Promise((resolve, reject) => {
      const url = window.URL.createObjectURL(video_file);
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        resolve(new z.proto.Asset.VideoMetaData(video.videoWidth, video.videoHeight, video.duration));
        window.URL.revokeObjectURL(url);
      };
      video.addEventListener(
        'error',
        error => {
          reject(this._convert_event_into_error(error));
          window.URL.revokeObjectURL(url);
        },
        true
      );
      video.src = url;
    });
  },

  /**
   * Convert an error event into a plain error object.
   * This needs to be done because error events are not standardized between browser implementations.
   * @private
   * @param {Event} event - Error event
   * @returns {MediaError} Error object
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/originalTarget
   */
  _convert_event_into_error(event) {
    let error = event;

    // Chrome v60
    if (event.path && event.path[0]) {
      error = event.path[0].error;
    }

    // Firefox v55
    if (event.originalTarget) {
      error = error.originalTarget.error;
    }

    return error;
  },

  _normalise_loudness(audio_buffer) {
    const MAX_SAMPLES = 200;
    const AMPLIFIER = 700; // in favour of iterating all samples before we interpolate them
    const channel = audio_buffer.getChannelData(0);
    const bucket_size = parseInt(channel.length / MAX_SAMPLES);
    const buckets = z.util.ArrayUtil.chunk(channel, bucket_size);

    const preview = buckets.map(bucket => {
      return z.util.NumberUtil.cap_to_byte(AMPLIFIER * z.util.NumberUtil.root_mean_square(bucket));
    });

    return new Uint8Array(preview);
  },

  /**
   * Constructs corresponding asset metadata depending on the given file type
   * @param {File|Blob} file - the file to generate metadata for
   * @returns {Promise} Resolves with ImageMetaData, VideoMetaData or AudioMetaData
   */
  build_metadata(file) {
    if (!(file instanceof Blob)) {
      throw new Error('Expected file to be type of Blob');
    }

    if (this.is_video(file)) {
      return this._build_video_metdadata(file);
    }
    if (this.is_audio(file)) {
      return this._build_audio_metdadata(file);
    }
    if (this.is_image(file)) {
      return this._build_image_metdadata(file);
    }
    return Promise.resolve();
  },

  is_audio(file) {
    return file && file.type.startsWith('audio');
  },

  is_image(file) {
    return file && file.type.startsWith('image');
  },

  is_video(file) {
    return file && file.type.startsWith('video');
  },
};
