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

import {VideoHTMLAttributes} from 'react';

import '@mediapipe/selfie_segmentation';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-core';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';

export async function applyBlur(
  videoElement: HTMLVideoElement,
  props: VideoHTMLAttributes<HTMLVideoElement>,
  // cleanup: boolean,
): Promise<MediaStream> {
  if (!videoElement.srcObject) {
    throw new Error('No video stream provided');
  }

  const imageWidth = Number(props?.width ?? 1280);
  const imageHeight = Number(props?.height ?? 720);
  let rafId = 0;

  let segmenter: bodySegmentation.BodySegmenter | null = null;

  const canvasEl = document.createElement('canvas');
  canvasEl.width = imageWidth;
  canvasEl.height = imageHeight;
  const ctx = canvasEl.getContext('2d');

  const STATE = {
    camera: {targetFPS: 60, sizeOption: '640 X 480', cameraSelector: ''},
    fpsDisplay: {mode: 'model'},
    backend: '',
    flags: {},
    modelConfig: {},
    visualization: {
      foregroundThreshold: 0.5,
      // maskOpacity: 0.5,
      // maskBlur: 0,
      backgroundBlur: 10,
      edgeBlur: 5,
    },
  };
  // if (cleanup) {
  //   if (segmenter)
  //   segmenter?.dispose();
  //   segmenter = null;
  //   return;
  // }

  const init = async () => {
    window.cancelAnimationFrame(rafId ?? 0);

    const segmenterConfig: bodySegmentation.MediaPipeSelfieSegmentationMediaPipeModelConfig = {
      runtime: 'mediapipe',
      modelType: 'general',
      solutionPath: '/selfie_segmentation',
      // or 'base/node_modules/@mediapipe/selfie_segmentation' in npm.
    };
    segmenter = await bodySegmentation.createSegmenter(
      bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
      segmenterConfig,
    );
  };

  const draw = () => {
    ctx?.drawImage(canvasEl, 0, 0, imageWidth, imageHeight);
  };

  const segmenterFunc = async () => {
    let segmentation = null;

    // Segmenter can be null if initialization failed (for example when loading
    // from a URL that does not exist).
    if (segmenter) {
      segmentation = await segmenter.segmentPeople(videoElement, {
        flipHorizontal: false,
        multiSegmentation: false,
        segmentBodyParts: true,
        segmentationThreshold: STATE.visualization.foregroundThreshold,
      });

      const options = STATE.visualization;

      await bodySegmentation.drawBokehEffect(
        canvasEl,
        videoElement,
        segmentation,
        options.foregroundThreshold,
        options.backgroundBlur,
        options.edgeBlur,
      );
      draw();
    }
  };

  const renderPrediction = async () => {
    await segmenterFunc().catch(err => {
      segmenter?.dispose();
      segmenter = null;
      console.warn(err);
    });

    rafId = requestAnimationFrame(async () => await renderPrediction());
  };

  await init().catch(err => {
    segmenter = null;
    console.warn(err);
  });

  await renderPrediction().catch(console.warn);

  return canvasEl.captureStream(30);
}
