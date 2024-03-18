/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {useCallback, useRef} from 'react';

import '@mediapipe/selfie_segmentation';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-core';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';

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

export const useBlur = (src: MediaStream, canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const segmenter = useRef<bodySegmentation.BodySegmenter | null>(null);
  const model = useRef(bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation);

  const init = useCallback(async () => {
    const segmenterConfig: bodySegmentation.MediaPipeSelfieSegmentationMediaPipeModelConfig = {
      runtime: 'mediapipe',
      modelType: 'general',
      solutionPath: '/selfie_segmentation',
      // or 'base/node_modules/@mediapipe/selfie_segmentation' in npm.
    };
    segmenter.current = await bodySegmentation.createSegmenter(model.current, segmenterConfig);
  }, []);

  const cleanup = useCallback(() => {
    try {
      segmenter.current?.dispose();
      segmenter.current = null;
    } catch (e) {
      console.error(e);
    }
  }, []);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D | null | undefined) => {
      ctx?.drawImage(
        canvasRef!.current!,
        0,
        0,
        src.getVideoTracks()[0]?.getSettings().width ?? 1280,
        src.getVideoTracks()[0]?.getSettings().height ?? 720,
      );
    },
    [canvasRef, src],
  );

  const segmenterFunc = useCallback(
    async (
      canvasRef: React.RefObject<HTMLCanvasElement>,
      refVideo: React.RefObject<HTMLVideoElement>,
      ctx: React.MutableRefObject<CanvasRenderingContext2D | null | undefined>,
    ) => {
      let segmentation = null;

      // Segmenter can be null if initialization failed (for example when loading
      // from a URL that does not exist).
      if (segmenter.current != null && canvasRef.current != null) {
        try {
          if (segmenter.current.segmentPeople != null && refVideo.current != null) {
            segmentation = await segmenter.current.segmentPeople(refVideo.current, {
              flipHorizontal: false,
              multiSegmentation: false,
              segmentBodyParts: true,
              segmentationThreshold: STATE.visualization.foregroundThreshold,
            });
          }
        } catch (error) {
          cleanup();
        }

        const options = STATE.visualization;
        if (segmentation != null && canvasRef.current != null && refVideo.current != null) {
          await bodySegmentation.drawBokehEffect(
            canvasRef.current,
            refVideo.current,
            segmentation,
            options.foregroundThreshold,
            options.backgroundBlur,
            options.edgeBlur,
          );
        }
        draw(ctx.current);
      }
    },
    [cleanup, draw, segmenter],
  );

  return {segmenter, cleanup, init, draw, segmenterFunc};
};
