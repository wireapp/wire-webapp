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
// import * as bodySegmentation from '@tensorflow-models/body-segmentation';

// //imports for blur effect
// import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import {useBlur} from './useBlur';
// Register WebGL backend.

type VideoProps = VideoHTMLAttributes<HTMLVideoElement | HTMLCanvasElement> & {
  srcObject: MediaStream;
  isBlurred: boolean;
  blurStream: ((stream: MediaStream, stopTracks: boolean) => void) | undefined;
};

const Video = ({srcObject, isBlurred, blurStream, ...props}: VideoProps) => {
  const refVideo = useRef<HTMLVideoElement>(null);
  // const video2ref = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blurRef = useRef<MediaStream | undefined>(undefined);
  const ctx = useRef<CanvasRenderingContext2D | null | undefined>(null);
  const rafId = useRef<number | null>(null);
  const {init, segmenter, cleanup, draw, segmenterFunc} = useBlur(srcObject, canvasRef);

  console.log(isBlurred, 'isBlurred');
  useEffect(() => {
    if (!canvasRef.current || !isBlurred) {
      return;
    }
    ctx.current = canvasRef?.current?.getContext('2d');
    draw(ctx.current);
    blurRef.current = canvasRef?.current?.captureStream();
    blurStream?.(canvasRef?.current?.captureStream(), false);
    // video2ref.current!.srcObject = blurRef.current;
  }, [draw, isBlurred, blurStream]);

  const renderPrediction = useCallback(async () => {
    await segmenterFunc(canvasRef, refVideo, ctx).catch(console.warn);

    rafId.current = requestAnimationFrame(async () => await renderPrediction());
  }, [segmenterFunc]);

  useEffect(() => {
    async function initSegmenter() {
      await init();
    }
    if (refVideo.current?.srcObject && !!isBlurred) {
      window.cancelAnimationFrame(rafId?.current ?? 0);
      cleanup();
      initSegmenter().catch(err => {
        segmenter.current = null;
        console.warn(err);
      });

      renderPrediction().catch(console.warn);
    }
    return () => {
      cleanup();
    };
  }, [refVideo.current?.srcObject, isBlurred, segmenter.current]);

  // const gl = window.exposedContext;
  // if (gl) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

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
        cleanup();
      }
    },
    [],
  );

  return (
    <>
      {!!isBlurred && (
        <canvas
          ref={canvasRef}
          {...props}
          // css={{visibility: !!isBlurred ? 'hidden' : 'visible', display: !!isBlurred ? 'none' : 'inline block'}}
        />
      )}
      {/* {!!isBlurred && <video ref={video2ref} {...props} />} */}
      <video
        ref={refVideo}
        {...props}
        css={{visibility: !!isBlurred ? 'hidden' : 'visible', display: !!isBlurred ? 'none' : 'inline block'}}
      />
    </>
  );
};

export {Video};
