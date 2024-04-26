/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {ImageSegmenter, FilesetResolver, ImageSegmenterResult} from '@mediapipe/tasks-vision';
import * as StackBlur from 'stackblur-canvas';

const FRAMERATE = 60;
// Create a video element to display the webcam feed
const videoEl = document.createElement('video');
// Create a canvas element to apply the blur effect
const canvasEl = document.createElement('canvas');
// Get the 2D context of the canvas
const ctx = canvasEl.getContext('2d', {willReadFrequently: true});
// Store the video dimensions
const videoDimensions = {width: 0, height: 0};
// Store tracks of the video stream
const videoTracks = {
  video: null as MediaStreamTrack[] | null,
  audio: null as MediaStreamTrack[] | null,
};

// Store the ImageSegmenter instance
let imageSegmenter: ImageSegmenter | undefined;
// Store the animation frame ID
let predictWebcamAnimationFrameId: number;

// Function to predict the webcam feed processed by the ImageSegmenter
async function predictWebcam() {
  if (!ctx || !videoEl.srcObject) {
    console.error('Context or video source not ready');
    return;
  }

  ctx.drawImage(videoEl, 0, 0, videoDimensions.width, videoDimensions.height);
  const startTimeMs = performance.now();
  try {
    imageSegmenter?.segmentForVideo(videoEl, startTimeMs, processSegmentationResult);
  } catch (error) {
    console.error('Failed to segment video', error);
  }
}

// Function to process the segmentation result and apply the blur effect
async function processSegmentationResult(result: ImageSegmenterResult) {
  if (!ctx || !videoEl.srcObject) {
    console.error('Context or video source not ready');
    return;
  }
  const {width, height} = videoDimensions;
  const originalImageData = ctx.getImageData(0, 0, width, height);
  const blurredImageData = applyBlurToImageData(originalImageData);

  const mask = result.confidenceMasks?.[0]?.getAsFloat32Array();
  if (mask) {
    blendImagesBasedOnMask(originalImageData.data, blurredImageData.data, mask);
    ctx.putImageData(new ImageData(originalImageData.data, width, height), 0, 0);
  } else {
    console.error('No mask data available.');
  }
  predictWebcamAnimationFrameId = window.requestAnimationFrame(predictWebcam);
}

function applyBlurToImageData(imageData: ImageData): ImageData {
  return StackBlur.imageDataRGBA(
    new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height),
    0,
    0,
    imageData.width,
    imageData.height,
    15,
  );
}

function blendImagesBasedOnMask(
  originalPixels: Uint8ClampedArray,
  blurredPixels: Uint8ClampedArray,
  mask: Float32Array,
) {
  const length = mask.length;
  for (let i = 0; i < length; i++) {
    const baseIndex = i * 4;
    if (mask[i] > 0.5) {
      originalPixels[baseIndex] = blurredPixels[baseIndex];
      originalPixels[baseIndex + 1] = blurredPixels[baseIndex + 1];
      originalPixels[baseIndex + 2] = blurredPixels[baseIndex + 2];
      originalPixels[baseIndex + 3] = blurredPixels[baseIndex + 3];
    }
  }
}

export async function initImageSegmenter(): Promise<ImageSegmenter> {
  if (imageSegmenter) {
    return imageSegmenter;
  }
  const video = await FilesetResolver.forVisionTasks('./mediapipe/wasm');
  imageSegmenter = await ImageSegmenter.createFromOptions(video, {
    baseOptions: {
      modelAssetPath: './assets/mediapipe-models/image_segmenter/selfie_multiclass_256x256.tflite',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    outputCategoryMask: false,
    outputConfidenceMasks: true,
  });
  return imageSegmenter;
}

export async function applyBlur(mediaStream: MediaStream): Promise<MediaStream> {
  videoTracks.video = mediaStream.getVideoTracks();
  videoTracks.audio = mediaStream.getAudioTracks();

  videoEl.srcObject = new MediaStream(videoTracks.video);
  videoEl.onloadedmetadata = () => {
    // Ensure metadata is loaded to get video dimensions
    videoDimensions.width = videoEl.videoWidth || 1240;
    videoDimensions.height = videoEl.videoHeight || 720;
    canvasEl.width = videoDimensions.width;
    canvasEl.height = videoDimensions.height;

    videoEl
      .play()
      .then(() => {
        predictWebcam();
      })
      .catch(error => console.error('Error playing the video: ', error));
  };

  return new Promise(resolve => {
    videoEl.onplay = () => {
      resolve(new MediaStream([...videoTracks.audio!, canvasEl.captureStream(FRAMERATE).getVideoTracks()[0]]));
    };
  });
}

export function cleanupBlur() {
  // Check if the video element is playing and if so, stop it.
  if (!videoEl.paused && !videoEl.ended) {
    videoEl.pause();
    videoEl.srcObject = null; // Disconnect the media stream
    videoEl.load(); // Reset the video element
  }

  // Clear the canvas
  if (ctx) {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  }

  // Optionally reset the dimensions if they are stored globally
  videoDimensions.width = 0;
  videoDimensions.height = 0;
  canvasEl.width = 0;
  canvasEl.height = 0;

  // Cancel any ongoing animation frames
  if (window.cancelAnimationFrame) {
    window.cancelAnimationFrame(predictWebcamAnimationFrameId);
  }
}
