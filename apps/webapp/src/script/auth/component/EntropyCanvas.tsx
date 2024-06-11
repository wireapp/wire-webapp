/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {MouseEvent, useRef, useEffect, useState} from 'react';

import {CSSObject} from '@emotion/react';

import {usePausableInterval} from '../../hooks/usePausableInterval';
import {EntropyData} from '../../util/Entropy';

interface CanvasProps {
  css?: CSSObject;
  'data-uie-name'?: string;
  onProgress: (entropyData: EntropyData, percent: number, pause: boolean) => void;
  /** width of the canvas in px*/
  sizeX: number;
  /** height of the canvas in px*/
  sizeY: number;
  /** minimum number of frames (good default: 300) */
  minFrames: number;
  /** minimum bits of overall estimated entropy (good default: 1024) */
  minEntropyBits: number;
}

type Point = {
  x: number;
  y: number;
};

const EntropyCanvas = (props: CanvasProps) => {
  const {sizeX, sizeY, onProgress, css, minEntropyBits, minFrames, ...rest} = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [percent, setPercent] = useState(0);
  const [entropy] = useState<EntropyData>(new EntropyData());
  const [previousPoint, setPreviousPoint] = useState<Point | null>(null);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);

  const {clearInterval, startInterval, pauseInterval} = usePausableInterval(() => {
    setPercent(Math.floor(100 * Math.min(entropy.entropyBits / minEntropyBits, entropy.length / minFrames)));
    onProgress(entropy, percent, false);
  }, 100);

  useEffect(() => {
    if (percent >= 100) {
      clearInterval();
      onProgress(entropy, percent, false);
    }
  }, [clearInterval, percent]);

  const onMouseLeave = () => {
    onProgress(entropy, percent, true);
    pauseInterval();
    // add null value to prevent render artifacts when the mouse leaves on one side and enters at a different position
    setPreviousPoint(lastPoint);
    setLastPoint(null);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    if (!previousPoint || !lastPoint) {
      return;
    }
    ctx.beginPath();
    ctx.moveTo(previousPoint.x, previousPoint.y);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'blue';
    ctx.lineTo(lastPoint.x, lastPoint.y);
    ctx.stroke();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    draw(context);
  }, [lastPoint]);

  const onMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    startInterval();
    const boundingRect = event.currentTarget?.getBoundingClientRect();
    const drawPoint: Point = {
      x: event.clientX - boundingRect.x,
      y: event.clientY - boundingRect.y,
    };
    entropy.addFrame({
      t: Date.now(),
      x: (255 * drawPoint.x) / boundingRect.width,
      y: (255 * drawPoint.y) / boundingRect.height,
    });
    setPreviousPoint(lastPoint);
    setLastPoint(drawPoint);
  };

  return (
    <canvas
      data-uie-name={props['data-uie-name'] ?? 'element-entropy-canvas'}
      height={sizeY}
      width={sizeX}
      css={{
        ...css,
        alignSelf: 'center',
        backgroundColor: 'white',
        borderRadius: '5px',
        height: `${sizeY}px`,
        transition: '0.5s ease-in',
        width: `${sizeX}px`,
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      ref={canvasRef}
      {...rest}
    />
  );
};

export {EntropyCanvas};
