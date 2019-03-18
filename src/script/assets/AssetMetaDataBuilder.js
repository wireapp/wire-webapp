/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {Asset} from '@wireapp/protocol-messaging';
import TimeUtil from 'utils/TimeUtil';
import {capToByte, rootMeanSquare} from 'utils/NumberUtil';
import {chunk} from 'utils/ArrayUtil';

/**
 * Constructs corresponding asset metadata depending on the given file type
 * @param {File|Blob} file - the file to generate metadata for
 * @returns {Promise} Resolves with ImageMetaData, VideoMetaData or AudioMetaData
 */
const buildMetadata = file => {
  if (!(file instanceof Blob)) {
    throw new Error('Expected file to be type of Blob');
  }

  if (isVideo(file)) {
    return buildMetadataVideo(file);
  }
  if (isAudio(file)) {
    return buildMetadataAudio(file);
  }
  if (isImage(file)) {
    return buildMetadataImage(file);
  }
  return Promise.resolve();
};

const buildMetadataAudio = audioFile => {
  return z.util
    .loadFileBuffer(audioFile)
    .then(buffer => {
      const audioContext = new AudioContext();
      audioContext.close();
      return audioContext.decodeAudioData(buffer);
    })
    .then(audioBuffer => {
      const durationInMillis = audioBuffer.duration * TimeUtil.UNITS_IN_MILLIS.SECOND;
      const normalizedLoudness = normaliseLoudness(audioBuffer);
      return new Asset.AudioMetaData({durationInMillis, normalizedLoudness});
    });
};

const buildMetadataImage = imageFile => {
  return new Promise((resolve, reject) => {
    const url = window.URL.createObjectURL(imageFile);
    const image = new Image();
    image.onload = () => {
      resolve(new Asset.ImageMetaData({height: image.height, width: image.width}));
      window.URL.revokeObjectURL(url);
    };
    image.onerror = error => {
      reject(error);
      window.URL.revokeObjectURL(url);
    };
    image.src = url;
  });
};

const buildMetadataVideo = videoFile => {
  return new Promise((resolve, reject) => {
    const url = window.URL.createObjectURL(videoFile);
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve(
        new Asset.VideoMetaData({
          durationInMillis: video.duration,
          height: video.videoHeight,
          width: video.videoWidth,
        })
      );
      window.URL.revokeObjectURL(url);
    };
    video.addEventListener(
      'error',
      error => {
        reject(convertEventToError(error));
        window.URL.revokeObjectURL(url);
      },
      true
    );
    video.src = url;
  });
};

/**
 * Convert an error event into a plain error object.
 * This needs to be done because error events are not standardized between browser implementations.
 * @private
 * @param {Event} event - Error event
 * @returns {MediaError} Error object
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/originalTarget
 */
const convertEventToError = event => {
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
};

const isAudio = file => {
  return file && file.type.startsWith('audio');
};

const isImage = file => {
  return file && file.type.startsWith('image');
};

const isVideo = file => {
  return file && file.type.startsWith('video');
};

const normaliseLoudness = audioBuffer => {
  const MAX_SAMPLES = 200;
  const AMPLIFIER = 700; // in favour of iterating all samples before we interpolate them
  const channel = audioBuffer.getChannelData(0);
  const bucketSize = parseInt(channel.length / MAX_SAMPLES);
  const buckets = chunk(channel, bucketSize);

  const audioPreview = buckets.map(bucket => {
    return capToByte(AMPLIFIER * rootMeanSquare(bucket));
  });

  return new Uint8Array(audioPreview);
};

// Builder for creating all kinds of asset metadata
export default {buildMetadata, isAudio, isImage, isVideo};
