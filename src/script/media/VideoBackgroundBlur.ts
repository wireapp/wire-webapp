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

enum SEGMENTATION_MODEL {
  QUALITY = './assets/mediapipe-models/selfie_multiclass_256x256.tflite',
  PERFORMANCE = './assets/mediapipe-models/selfie_segmenter.tflite',
}
enum BLUR_QUALITY {
  LOW = 30,
  MEDIUM = 60,
  HIGH = 90,
}
enum FRAMERATE {
  LOW = 30,
  HIGH = 60,
}

const QualitySettings = {
  segmentationModel: SEGMENTATION_MODEL.PERFORMANCE,
  blurQuality: BLUR_QUALITY.LOW,
  framerate: FRAMERATE.HIGH,
};

// Calculate the FPS interval
const fpsInterval = 1000 / QualitySettings.framerate;
let then = Date.now();
let now = then;
let elapsed = 0;

let rafId: number;

// Function to predict the webcam feed processed by the ImageSegmenter
function startBlurProcess(
  segmenter: ImageSegmenter,
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement,
  videoDimensions: {width: number; height: number},
) {
  now = Date.now();
  elapsed = now - then;

  // If enough time has elapsed, draw the video frame and segment it
  if (elapsed > fpsInterval) {
    then = now - (elapsed % fpsInterval);

    ctx.drawImage(videoEl, 0, 0, videoDimensions.width, videoDimensions.height);
    const startTimeMs = performance.now();

    try {
      segmenter.segmentForVideo(videoEl, startTimeMs, result =>
        processSegmentationResult(result, ctx, videoEl, videoDimensions),
      );
    } catch (error) {
      console.error('Failed to segment video', error);
    }
    rafId = window.requestAnimationFrame(() => startBlurProcess(segmenter, ctx, videoEl, videoDimensions));
  }
  return () => {
    window.cancelAnimationFrame(rafId);
  };
}

// Function to process the segmentation result and apply the blur effect
async function processSegmentationResult(
  result: ImageSegmenterResult,
  canvasContext: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement,
  videoDimensions: {width: number; height: number},
) {
  if (!canvasContext || !videoEl.srcObject) {
    console.error('Context or video source not ready');
    return;
  }
  const {width, height} = videoDimensions;
  const originalImageData = canvasContext.getImageData(0, 0, width, height);
  const blurredImageData = applyBlurToImageData(originalImageData);

  const mask = result.confidenceMasks?.[0]?.getAsFloat32Array();
  if (mask) {
    blendImagesBasedOnMask(originalImageData.data, blurredImageData.data, mask);
    canvasContext.putImageData(new ImageData(originalImageData.data, width, height), 0, 0);
  } else {
    console.error('No mask data available.');
  }
}

function applyBlurToImageData(imageData: ImageData): ImageData {
  return StackBlur.imageDataRGB(
    new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height),
    0,
    0,
    imageData.width,
    imageData.height,
    QualitySettings.blurQuality,
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
    let check = mask[i] <= 0.5;
    if (QualitySettings.segmentationModel === SEGMENTATION_MODEL.QUALITY) {
      check = mask[i] >= 0.5;
    }
    if (check) {
      originalPixels[baseIndex] = blurredPixels[baseIndex];
      originalPixels[baseIndex + 1] = blurredPixels[baseIndex + 1];
      originalPixels[baseIndex + 2] = blurredPixels[baseIndex + 2];
      originalPixels[baseIndex + 3] = blurredPixels[baseIndex + 3];
    }
  }
}

async function createSegmenter(): Promise<ImageSegmenter> {
  const video = await FilesetResolver.forVisionTasks('./mediapipe/wasm');
  return ImageSegmenter.createFromOptions(video, {
    baseOptions: {
      modelAssetPath: QualitySettings.segmentationModel,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    outputCategoryMask: false,
    outputConfidenceMasks: true,
  });
}

export async function applyBlur(originalStream: MediaStream): Promise<{stream: MediaStream; release: () => void}> {
  // Create a video element to display the webcam feed
  const videoEl = document.createElement('video');
  // Create a canvas element to apply the blur effect
  const canvasEl = document.createElement('canvas');
  // Get the 2D context of the canvas
  const ctx = canvasEl.getContext('2d', {willReadFrequently: true})!;
  // Store the video dimensions
  const videoDimensions = {width: 0, height: 0};

  const segmenter = await createSegmenter();

  videoEl.srcObject = originalStream.clone();
  videoEl.onloadedmetadata = () => {
    // Ensure metadata is loaded to get video dimensions
    videoDimensions.width = videoEl.videoWidth || 1240;
    videoDimensions.height = videoEl.videoHeight || 720;
    canvasEl.width = videoDimensions.width;
    canvasEl.height = videoDimensions.height;

    videoEl.play().catch(error => console.error('Error playing the video: ', error));
  };

  return new Promise(resolve => {
    videoEl.onplay = () => {
      const stopBlurProcess = startBlurProcess(segmenter, ctx, videoEl, videoDimensions);
      const videoStream = canvasEl.captureStream(QualitySettings.framerate).getVideoTracks()[0];
      const blurredMediaStream = new MediaStream([videoStream]);
      resolve({
        stream: blurredMediaStream,
        release: () => {
          stopBlurProcess();
          stopVideo(videoEl);
          segmenter.close();
          // Make sure we release the original stream (to free the camera for example)
          originalStream.getTracks().forEach(track => {
            track.stop();
            originalStream.removeTrack(track);
          });
        },
      });
    };
  });
}

export function stopVideo(videoEl: HTMLVideoElement) {
  // Check if the video element is playing and if so, stop it.
  if (!videoEl.paused && !videoEl.ended) {
    videoEl.pause();
    videoEl.srcObject = null; // Disconnect the media stream
    videoEl.load(); // Reset the video element
  }
}
