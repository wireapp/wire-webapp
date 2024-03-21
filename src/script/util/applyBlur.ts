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

function makeGaussKernel(sigma: number) {
  const GAUSSKERN = 6.0;
  const dim = parseInt(Math.max(3.0, GAUSSKERN * sigma));
  const sqrtSigmaPi2 = Math.sqrt(Math.PI * 2.0) * sigma;
  const s2 = 2.0 * sigma * sigma;
  let sum = 0.0;

  const kernel = new Float32Array(dim - !(dim & 1)); // Make it odd number
  const half = parseInt(kernel.length / 2);
  for (let i = -half, j = 0; j < kernel.length; i++, j++) {
    kernel[j] = Math.exp(-(i * i) / s2) / sqrtSigmaPi2;
    sum += kernel[j];
  }
  // Normalize the gaussian kernel to prevent image darkening/brightening
  for (let i = 0; i < dim; i++) {
    kernel[i] /= sum;
  }
  return kernel;
}

function blurPixels(pixels: Uint8ClampedArray, sigma: number, imageWidth: number, imageHeight: number) {
  const kernel = makeGaussKernel(sigma);

  const w = imageWidth;
  const h = imageHeight;
  const buff = new Uint8Array(w * h);
  const mk = Math.floor(kernel.length / 2);
  const kl = kernel.length;

  for (let channel = 0; channel < 3; channel++) {
    // First step process columns
    for (let hw = 0, j = 0; j < h; j++, hw += w) {
      for (let i = 0; i < w; i++) {
        let sum = 0;
        for (let k = 0; k < kl; k++) {
          let col = i + (k - mk);
          col = col < 0 ? 0 : col >= w ? w - 1 : col;
          sum += pixels[(hw + col) * 4 + channel] * kernel[k];
        }
        buff[hw + i] = sum;
      }
    }

    // Second step process rows
    for (let j = 0, offset = 0; j < h; j++, offset += w) {
      for (let i = 0; i < w; i++) {
        let sum = 0;
        for (let k = 0; k < kl; k++) {
          let row = j + (k - mk);
          row = row < 0 ? 0 : row >= h ? h - 1 : row;
          sum += buff[row * w + i] * kernel[k];
        }
        const off = (j * w + i) * 4;
        pixels[off + channel] = sum;
      }
    }
  }
  return pixels;
}

export async function applyBlur(videoStream: HTMLVideoElement): Promise<MediaStream> {
  if (!videoStream) {
    throw new Error('No video stream provided');
  }
  const imageWidth = videoStream.videoWidth;
  const imageHeight = videoStream.videoHeight;
  const canvasEl = document.createElement('canvas');
  canvasEl.width = imageWidth;
  canvasEl.height = imageHeight;
  const ctx = canvasEl.getContext('2d', {willReadFrequently: true});

  async function callbackForVideo(result: ImageSegmenterResult) {
    if (!ctx) {
      return;
    }

    const originalImage = ctx.getImageData(0, 0, imageWidth, imageHeight).data;
    const backgroundImageData = new Uint8ClampedArray(originalImage.slice(0).buffer);

    const blurredImage = blurPixels(backgroundImageData, 5, imageWidth, imageHeight);

    const mask: Float32Array =
      result?.confidenceMasks?.[0].getAsFloat32Array() ?? new Float32Array(imageWidth * imageHeight);

    let j = 0;
    if (originalImage === undefined) {
      return;
    }
    for (let i = 0; i < mask.length; ++i) {
      originalImage[j] = mask[i] <= 0.5 ? originalImage[j] : blurredImage[j];
      originalImage[j + 1] = mask[i + 1] <= 0.5 ? originalImage[j + 1] : blurredImage[j + 1];
      originalImage[j + 2] = mask[i + 2] <= 0.5 ? originalImage[j + 2] : blurredImage[j + 2];
      originalImage[j + 3] = 255;
      j += 4;
    }

    const uint8Array = new Uint8ClampedArray(originalImage.buffer);
    const dataNew = new ImageData(uint8Array, imageWidth, imageHeight);

    ctx?.putImageData(dataNew, 0, 0);

    window.requestAnimationFrame(predictWebcam);
  }

  let imageSegmenter: ImageSegmenter | undefined;

  const createImageSegmenter = async () => {
    const video = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm',
    );

    imageSegmenter = await ImageSegmenter.createFromOptions(video, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
  };

  async function predictWebcam() {
    if (ctx === null) {
      return;
    }
    let lastWebcamTime = -1;
    if (videoStream.currentTime === lastWebcamTime) {
      window.requestAnimationFrame(predictWebcam);

      return;
    }

    lastWebcamTime = videoStream.currentTime;
    ctx.drawImage(videoStream, 0, 0, imageWidth, imageHeight);
    // Do not segmented if imageSegmenter.current hasn't loaded
    if (imageSegmenter === undefined) {
      return;
    }
    const startTimeMs = performance.now();

    // Start segmenting the stream.
    imageSegmenter.segmentForVideo(videoStream, startTimeMs, callbackForVideo);
  }

  await createImageSegmenter();
  await predictWebcam();
  return canvasEl.captureStream(30);
}
