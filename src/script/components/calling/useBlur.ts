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

import {useCallback, useEffect, useRef} from 'react';

import '@mediapipe/selfie_segmentation';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-core';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';

export const useBlur = () => {
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

  const cleanup = () => {
    segmenter.current?.dispose();
    segmenter.current = null;
  };

  // useEffect(() => {
  //   init().catch(err => {
  //     segmenter.current = null;
  //     console.error(err);
  //   });
  //   return () => cleanup();
  // }, []);

  return {segmenter, cleanup, init};
};
