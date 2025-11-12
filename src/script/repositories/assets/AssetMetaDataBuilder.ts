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

import {chunk} from 'Util/ArrayUtil';
import {capToByte, rootMeanSquare} from 'Util/NumberUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {loadFileBuffer} from 'Util/util';

export type AudioMetadata = {durationInMillis: number; normalizedLoudness: Uint8Array};
export type VideoMetadata = {
  durationInMillis: number;
  height: number;
  width: number;
};
export type ImageMetadata = {data: Buffer; height: number; type: string; width: number};

export type Metadata = AudioMetadata | VideoMetadata | ImageMetadata;

/**
 * Constructs corresponding asset meta data depending on the given file type.
 * @param file the file to generate metadata for
 * @returns Resolves with ImageMetaData, VideoMetaData or AudioMetaData
 */
export const buildMetadata = (file: File | Blob): Promise<Metadata | void> => {
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

export const buildMetadataAudio = async (audioFile: File | Blob): Promise<AudioMetadata> => {
  const buffer = await loadFileBuffer(audioFile);
  const audioContext = new AudioContext();
  audioContext.close();
  const audioBuffer = await audioContext.decodeAudioData(buffer as ArrayBuffer);
  const durationInMillis = audioBuffer.duration * TIME_IN_MILLIS.SECOND;
  const normalizedLoudness = normalizeLoudness(audioBuffer);
  return {durationInMillis, normalizedLoudness};
};

export const buildMetadataImage = (imageFile: File | Blob): Promise<ImageMetadata> => {
  return new Promise((resolve, reject) => {
    const url = window.URL.createObjectURL(imageFile);
    const image = new Image();
    image.onload = async () => {
      resolve({
        data: Buffer.from(await imageFile.arrayBuffer()),
        height: image.height,
        type: imageFile.type,
        width: image.width,
      });
      window.URL.revokeObjectURL(url);
    };
    image.onerror = error => {
      reject(error);
      window.URL.revokeObjectURL(url);
    };
    image.src = url;
  });
};

export const buildMetadataVideo = (videoFile: File | Blob): Promise<VideoMetadata> => {
  return new Promise((resolve, reject) => {
    const url = window.URL.createObjectURL(videoFile);
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve({
        durationInMillis: video.duration,
        height: video.videoHeight,
        width: video.videoWidth,
      });
      window.URL.revokeObjectURL(url);
    };
    video.addEventListener(
      'error',
      error => {
        reject(convertEventToError(error));
        window.URL.revokeObjectURL(url);
      },
      true,
    );
    video.src = url;
  });
};

/**
 * Converts an error event into a plain error object.
 * This needs to be done because error events are not standardized between browser implementations.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/originalTarget
 */
const convertEventToError = (event: any): MediaError => {
  let error = event;

  // Chrome v60
  if (event.path?.[0]) {
    error = event.path[0].error;
  }

  // Firefox v55
  if (event.originalTarget) {
    error = error.originalTarget.error;
  }

  return error;
};

export const isAudio = (file: File | Blob): boolean => {
  return file?.type.startsWith('audio');
};

export const isImage = (file: File | Blob): boolean => {
  return file?.type.startsWith('image');
};

export const isVideo = (file: File | Blob): boolean => {
  return file?.type.startsWith('video');
};

const normalizeLoudness = (audioBuffer: AudioBuffer): Uint8Array => {
  const MAX_SAMPLES = 200;
  const AMPLIFIER = 700; // in favour of iterating all samples before we interpolate them
  const channel = audioBuffer.getChannelData(0);
  const bucketSize = channel.length / MAX_SAMPLES;
  const buckets = chunk(channel, bucketSize);

  const audioPreview = buckets.map(bucket => {
    return capToByte(AMPLIFIER * rootMeanSquare(bucket));
  });

  return new Uint8Array(audioPreview);
};
