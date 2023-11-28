/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

// https://github.com/facebook/react/issues/11163#issuecomment-628379291
import {VideoHTMLAttributes, useCallback, useEffect, useRef} from 'react';

import '@mediapipe/selfie_segmentation';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-core';
//imports for blur effect
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
// Register WebGL backend.

type VideoProps = VideoHTMLAttributes<HTMLVideoElement> & {
  srcObject: MediaStream;
};

const STATE = {
  camera: {targetFPS: 60, sizeOption: '640 X 480', cameraSelector: ''},
  fpsDisplay: {mode: 'model'},
  backend: '',
  flags: {},
  modelConfig: {},
  visualization: {
    foregroundThreshold: 0.5,
    maskOpacity: 0.7,
    maskBlur: 0,
    pixelCellWidth: 10,
    backgroundBlur: 3,
    edgeBlur: 3,
  },
};

const Video = ({srcObject, ...props}: VideoProps) => {
  const refVideo = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null | undefined>(null);
  const segmenter = useRef<bodySegmentation.BodySegmenter | null>(null);
  const rafId = useRef<number | null>(null);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D | null | undefined) => {
      ctx?.drawImage(
        canvas!.current!,
        0,
        0,
        srcObject.getVideoTracks()[0].getSettings().width ?? 400,
        srcObject.getVideoTracks()[0].getSettings().height ?? 400,
      );
    },
    [srcObject],
  );

  useEffect(() => {
    ctx.current = canvas?.current?.getContext('2d');
    draw(ctx.current);
  }, [draw]);

  const createSegmenter = useCallback(async () => {
    const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
    const segmenterConfig: bodySegmentation.MediaPipeSelfieSegmentationMediaPipeModelConfig = {
      runtime: 'mediapipe',
      modelType: 'general',
      solutionPath: '/selfie_segmentation',
      // or 'base/node_modules/@mediapipe/selfie_segmentation' in npm.
    };
    segmenter.current = await bodySegmentation.createSegmenter(model, segmenterConfig);
  }, []);

  const segmenterFunc = useCallback(async () => {
    let segmentation = null;

    // Segmenter can be null if initialization failed (for example when loading
    // from a URL that does not exist).
    if (segmenter.current != null) {
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
        segmenter.current.dispose();
        segmenter.current = null;
      }

      const options = STATE.visualization;
      if (segmentation != null && canvas.current != null && refVideo.current != null) {
        await bodySegmentation.drawBokehEffect(
          canvas.current,
          refVideo.current,
          segmentation,
          options.foregroundThreshold,
          options.backgroundBlur,
          options.edgeBlur,
        );
      }
      draw(ctx.current);
    }
  }, [draw, segmenter]);

  const renderPrediction = useCallback(async () => {
    await segmenterFunc().catch(console.warn);

    rafId.current = requestAnimationFrame(async () => await renderPrediction());
  }, [segmenterFunc]);

  useEffect(() => {
    if (refVideo.current) {
      createSegmenter().catch(console.warn);
      renderPrediction().catch(console.warn);
    }
  }, [createSegmenter, renderPrediction, segmenterFunc]);

  // const gl = window.exposedContext;
  // if (gl)
  //   gl.readPixels(
  //     0,
  //     0,
  //     1,
  //     1,
  //     gl.RGBA,
  //     gl.UNSIGNED_BYTE,
  //     new Uint8Array(4)
  //   );

  useEffect(() => {
    if (!refVideo.current) {
      return;
    }
    refVideo.current.srcObject = srcObject;
  }, [srcObject]);

  useEffect(
    () => () => {
      if (refVideo.current) {
        refVideo.current.srcObject = null;
      }
    },
    [],
  );

  return (
    <>
      <canvas ref={canvas} />
      <video ref={refVideo} {...props} css={{visibility: 'hidden'}} />;
    </>
  );
};

export {Video};
