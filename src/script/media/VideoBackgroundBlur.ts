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

import {ImageSegmenter, FilesetResolver} from '@mediapipe/tasks-vision';

import {VideoDimensions, blurBackground, initShaderProgram} from './BackgroundBlurrer';

enum SEGMENTATION_MODEL {
  // Other models are available and could be tested later on (https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/models.md#selfie-segmentation), this one is optimized for performance and yeild rather good results for our MVP
  PERFORMANCE = './assets/mediapipe-models/selfie_segmenter.tflite',
}
enum FRAMERATE {
  LOW = 30,
  HIGH = 60,
}

const QualitySettings = {
  segmentationModel: SEGMENTATION_MODEL.PERFORMANCE,
  framerate: FRAMERATE.LOW,
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
  webGlContext: WebGLRenderingContext,
  videoEl: HTMLVideoElement,
  videoDimensions: VideoDimensions,
) {
  now = Date.now();
  elapsed = now - then;

  // If enough time has elapsed, draw the video frame and segment it
  if (elapsed > fpsInterval) {
    then = now - (elapsed % fpsInterval);

    const startTimeMs = performance.now();

    try {
      segmenter.segmentForVideo(videoEl, startTimeMs, result =>
        blurBackground(result, videoEl, webGlContext, videoDimensions),
      );
    } catch (error) {
      console.error('Failed to segment video', error);
    }
  }
  rafId = window.requestAnimationFrame(() => startBlurProcess(segmenter, webGlContext, videoEl, videoDimensions));
  return () => {
    window.cancelAnimationFrame(rafId);
  };
}

async function createSegmenter(canvas: HTMLCanvasElement): Promise<ImageSegmenter> {
  const video = await FilesetResolver.forVisionTasks('/min/mediapipe/wasm');
  return ImageSegmenter.createFromOptions(video, {
    baseOptions: {
      modelAssetPath: QualitySettings.segmentationModel,
      delegate: 'GPU',
    },
    canvas,
    runningMode: 'VIDEO',
    outputCategoryMask: false,
    outputConfidenceMasks: true,
  });
}

/**
 * Will create a new MediaStream that will both segment each frame and apply a blur effect to the background.
 * @param originalStream the stream that contains the video that needs background blur
 * @returns a promise that resolves to an object containing the new MediaStream and a release function to stop the blur process
 */
export async function applyBlur(stream: MediaStream): Promise<{stream: MediaStream; release: () => void}> {
  // Create a video element to display the webcam feed
  const videoEl = document.createElement('video');
  // Create a canvas element that will be to draw the blurred frames
  // Store the video dimensions
  const videoDimensions = {width: 0, height: 0};

  videoEl.srcObject = stream;
  videoEl.onloadedmetadata = () => {
    // Ensure metadata is loaded to get video dimensions
    videoDimensions.width = videoEl.videoWidth || 1240;
    videoDimensions.height = videoEl.videoHeight || 720;
    videoEl.play().catch(error => console.error('Error playing the video: ', error));
  };

  return new Promise(resolve => {
    videoEl.onplay = async () => {
      const glContext = document.createElement('canvas');
      glContext.height = videoDimensions.height;
      glContext.width = videoDimensions.width;

      const gl = initShaderProgram(glContext, videoDimensions);
      const segmenter = await createSegmenter(glContext);

      const stopBlurProcess = startBlurProcess(segmenter, gl, videoEl, videoDimensions);
      const videoStream = glContext.captureStream(QualitySettings.framerate).getVideoTracks()[0];
      const blurredMediaStream = new MediaStream([videoStream]);

      resolve({
        stream: blurredMediaStream,
        release: () => {
          stopBlurProcess();
          stopVideo(videoEl);
          segmenter.close();
        },
      });
    };
  });
}

function stopVideo(videoEl: HTMLVideoElement) {
  // Check if the video element is playing and if so, stop it.
  if (!videoEl.paused && !videoEl.ended) {
    videoEl.pause();
    videoEl.srcObject = null; // Disconnect the media stream
    videoEl.load(); // Reset the video element
  }
}
