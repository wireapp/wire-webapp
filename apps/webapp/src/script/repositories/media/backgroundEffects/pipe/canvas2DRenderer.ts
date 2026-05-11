/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import is from '@sindresorhus/is';

import {getSafeLogger} from 'Repositories/media/backgroundEffects/helper/logger';

import {DEFAULT_BACKGROUND_COLOR, WorkerBackgroundSource, WorkerProcessVideoTrackOptions} from './options';

const DEFAULT_BG_COLOR = `rgb(${DEFAULT_BACKGROUND_COLOR.red},${DEFAULT_BACKGROUND_COLOR.green},${DEFAULT_BACKGROUND_COLOR.blue})`;

export type Canvas2DRenderer = {
  render: (
    videoFrame: VideoFrame,
    options: WorkerProcessVideoTrackOptions,
    categoryData?: Float32Array,
    confidenceData?: Float32Array,
    useSelfieModel?: boolean,
  ) => void;
  close: () => void;
};

export const createCanvas2DRenderer = (canvas: OffscreenCanvas): Canvas2DRenderer => {
  const logger = getSafeLogger('Canvas2DRenderer');

  const context = canvas.getContext('2d');
  if (is.nullOrUndefined(context)) {
    logger.error('2D canvas context not available');
    throw new Error('2D canvas context not available');
  }

  const frameCanvas = new OffscreenCanvas(1, 1);
  const frameContext = frameCanvas.getContext('2d')!;

  const blurCanvas = new OffscreenCanvas(1, 1);
  const blurContext = blurCanvas.getContext('2d')!;

  const backgroundCanvas = new OffscreenCanvas(1, 1);
  const backgroundContext = backgroundCanvas.getContext('2d')!;

  let smoothedMask: Float32Array | null = null;
  let maskWidth = 0;
  let maskHeight = 0;
  let outputBuffer: Uint8ClampedArray<ArrayBuffer> | null = null;

  let cachedBackgroundUrl: string | null = null;
  let cachedBackgroundBitmap: ImageBitmap | null = null;

  let isRunning = true;

  logger.log('[virtual-background] - Canvas2D - Canvas2DRenderer initialized');

  const resizeIfNeeded = (width: number, height: number): void => {
    for (const targetCanvas of [canvas, frameCanvas, blurCanvas, backgroundCanvas]) {
      if (targetCanvas.width !== width || targetCanvas.height !== height) {
        logger.log('[virtual-background] - Canvas2D - Resizing canvas', {width, height});
        targetCanvas.width = width;
        targetCanvas.height = height;
      }
    }
  };

  const updateSmoothedMask = (
    categoryData: Float32Array,
    confidenceData: Float32Array,
    width: number,
    height: number,
    options: WorkerProcessVideoTrackOptions,
    useSelfieModel: boolean | undefined,
  ): void => {
    const maskSize = width * height;

    if (is.nullOrUndefined(smoothedMask) || maskWidth !== width || maskHeight !== height) {
      logger.log('[virtual-background] - Canvas2D - Creating smoothed mask buffer', {width, height});

      smoothedMask = new Float32Array(maskSize);
      maskWidth = width;
      maskHeight = height;
    }

    const {smoothing, smoothstepMin, smoothstepMax} = options;
    const mask = smoothedMask;

    for (let pixelIndex = 0; pixelIndex < maskSize; pixelIndex++) {
      let categoryValue = categoryData[pixelIndex];
      let confidenceValue = confidenceData[pixelIndex];

      if (useSelfieModel === true) {
        categoryValue = 1.0 - categoryValue;
        confidenceValue = 1.0 - confidenceValue;
      }

      if (categoryValue > 0.0) {
        categoryValue = 1.0;
        confidenceValue = 1.0 - confidenceValue;
      }

      const normalizedConfidence = Math.max(
        0,
        Math.min(1, (confidenceValue - smoothstepMin) / (smoothstepMax - smoothstepMin)),
      );

      const nonLinearConfidence = normalizedConfidence * normalizedConfidence * (3 - 2 * normalizedConfidence);

      const alpha = smoothing * nonLinearConfidence;
      mask[pixelIndex] = alpha * categoryValue + (1.0 - alpha) * mask[pixelIndex];
    }
  };

  const updateBackgroundBitmapCache = (source: WorkerBackgroundSource | null | undefined): void => {
    if (is.nullOrUndefined(source)) {
      if (cachedBackgroundUrl || cachedBackgroundBitmap) {
        logger.log('[virtual-background] - Canvas2D - Clearing cached background bitmap');
      }

      cachedBackgroundUrl = null;
      cachedBackgroundBitmap = null;
      return;
    }

    if (!is.nullOrUndefined(source.media) && source.url !== cachedBackgroundUrl) {
      logger.log('[virtual-background] - Canvas2D - Updating cached background bitmap', {
        previousUrl: cachedBackgroundUrl,
        nextUrl: source.url,
      });

      cachedBackgroundBitmap = source.media;
      cachedBackgroundUrl = source.url;
    }
  };

  const renderBlurMode = (
    videoFrame: VideoFrame,
    width: number,
    height: number,
    framePixels: Uint8ClampedArray,
    backgroundBlur: number,
  ): void => {
    logger.log('[virtual-background] - Canvas2D - Rendering blur mode', {width, height, backgroundBlur});

    blurContext.filter = `blur(${Math.round(backgroundBlur)}px)`;
    blurContext.drawImage(videoFrame, 0, 0, width, height);

    const blurPixels = blurContext.getImageData(0, 0, width, height).data;
    const mask = smoothedMask!;
    const outputPixels = outputBuffer!;

    for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex++) {
      const foregroundAlpha = mask[pixelIndex];
      const pixelOffset = pixelIndex << 2;

      outputPixels[pixelOffset] =
        foregroundAlpha * framePixels[pixelOffset] + (1 - foregroundAlpha) * blurPixels[pixelOffset];

      outputPixels[pixelOffset + 1] =
        foregroundAlpha * framePixels[pixelOffset + 1] + (1 - foregroundAlpha) * blurPixels[pixelOffset + 1];

      outputPixels[pixelOffset + 2] =
        foregroundAlpha * framePixels[pixelOffset + 2] + (1 - foregroundAlpha) * blurPixels[pixelOffset + 2];

      outputPixels[pixelOffset + 3] = 255;
    }
  };

  const drawVirtualBackground = (
    width: number,
    height: number,
    backgroundSource: WorkerBackgroundSource | null | undefined,
  ): void => {
    updateBackgroundBitmapCache(backgroundSource);

    if (is.nullOrUndefined(cachedBackgroundBitmap)) {
      logger.log('[virtual-background] - Canvas2D - Rendering default background colour', {width, height});

      backgroundContext.fillStyle = DEFAULT_BG_COLOR;
      backgroundContext.fillRect(0, 0, width, height);
      return;
    }

    logger.log('[virtual-background] - Canvas2D - Rendering cached background bitmap', {
      width,
      height,
      backgroundWidth: cachedBackgroundBitmap.width,
      backgroundHeight: cachedBackgroundBitmap.height,
    });

    const bitmap = cachedBackgroundBitmap;
    const bitmapAspectRatio = bitmap.width / bitmap.height;
    const canvasAspectRatio = width / height;

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = bitmap.width;
    let sourceHeight = bitmap.height;

    if (bitmapAspectRatio > canvasAspectRatio) {
      sourceWidth = Math.round(bitmap.height * canvasAspectRatio);
      sourceX = Math.round((bitmap.width - sourceWidth) / 2);
    } else {
      sourceHeight = Math.round(bitmap.width / canvasAspectRatio);
      sourceY = Math.round((bitmap.height - sourceHeight) / 2);
    }

    backgroundContext.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  };

  const renderVirtualBackground = (
    width: number,
    height: number,
    framePixels: Uint8ClampedArray,
    backgroundSource: WorkerBackgroundSource | null | undefined,
  ): void => {
    logger.log('[virtual-background] - Canvas2D - Rendering virtual background mode', {
      width,
      height,
      hasCachedBackgroundBitmap: Boolean(cachedBackgroundBitmap),
    });

    drawVirtualBackground(width, height, backgroundSource);

    const backgroundPixels = backgroundContext.getImageData(0, 0, width, height).data;
    const mask = smoothedMask!;
    const outputPixels = outputBuffer!;

    for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex++) {
      const foregroundAlpha = mask[pixelIndex];
      const pixelOffset = pixelIndex << 2;

      outputPixels[pixelOffset] =
        foregroundAlpha * framePixels[pixelOffset] + (1 - foregroundAlpha) * backgroundPixels[pixelOffset];

      outputPixels[pixelOffset + 1] =
        foregroundAlpha * framePixels[pixelOffset + 1] + (1 - foregroundAlpha) * backgroundPixels[pixelOffset + 1];

      outputPixels[pixelOffset + 2] =
        foregroundAlpha * framePixels[pixelOffset + 2] + (1 - foregroundAlpha) * backgroundPixels[pixelOffset + 2];

      outputPixels[pixelOffset + 3] = 255;
    }
  };

  const render = (
    videoFrame: VideoFrame,
    options: WorkerProcessVideoTrackOptions,
    categoryData?: Float32Array,
    confidenceData?: Float32Array,
    useSelfieModel?: boolean,
  ): void => {
    if (isRunning === false) {
      logger.log('[virtual-background] - Canvas2D - Skipping render because renderer is closed');
      return;
    }

    const {displayWidth, displayHeight} = videoFrame;

    if (displayWidth === 0 || displayHeight === 0) {
      logger.warn('[virtual-background] - Canvas2D - Skipping render because video frame has invalid dimensions', {
        displayWidth,
        displayHeight,
      });
      return;
    }

    resizeIfNeeded(displayWidth, displayHeight);

    const shouldBypass = !options.enabled || options.quality === 'bypass' || !categoryData || !confidenceData;

    if (shouldBypass) {
      logger.log('[virtual-background] - Canvas2D - Rendering passthrough frame', {
        enabled: options.enabled,
        quality: options.quality,
        hasCategoryData: Boolean(categoryData),
        hasConfidenceData: Boolean(confidenceData),
      });

      if (!is.nullOrUndefined(context)) {
        context.drawImage(videoFrame, 0, 0, displayWidth, displayHeight);
      }
      return;
    }

    updateSmoothedMask(categoryData, confidenceData, displayWidth, displayHeight, options, useSelfieModel);

    frameContext.drawImage(videoFrame, 0, 0, displayWidth, displayHeight);

    const framePixels = frameContext.getImageData(0, 0, displayWidth, displayHeight).data;
    const maskSize = displayWidth * displayHeight;

    if (is.nullOrUndefined(outputBuffer) || outputBuffer.length !== maskSize * 4) {
      logger.log('[virtual-background] - Canvas2D - Creating output pixel buffer', {
        displayWidth,
        displayHeight,
        bufferSize: maskSize * 4,
      });

      outputBuffer = new Uint8ClampedArray(new ArrayBuffer(maskSize * 4));
    }

    if (options.bgBlur > 0 && options.bgBlurRadius > 0) {
      renderBlurMode(videoFrame, displayWidth, displayHeight, framePixels, options.bgBlur);
    } else {
      renderVirtualBackground(displayWidth, displayHeight, framePixels, options.backgroundSource);
    }

    if (!is.nullOrUndefined(context)) {
      context.putImageData(new ImageData(outputBuffer, displayWidth, displayHeight), 0, 0);
    }
  };

  const close = (): void => {
    logger.log('[virtual-background] - Canvas2D - Closing renderer');

    isRunning = false;
    smoothedMask = null;
    outputBuffer = null;
    cachedBackgroundBitmap = null;
    cachedBackgroundUrl = null;
  };

  return {
    render,
    close,
  };
};
