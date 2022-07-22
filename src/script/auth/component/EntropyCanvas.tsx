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

import {CSSObject} from '@emotion/react';
import {MouseEvent, useRef, useEffect, useState} from 'react';
import {usePausableInterval} from '../../hooks/usePausableInterval';

interface CanvasProps {
  css?: CSSObject;
  'data-uie-name'?: string;
  onProgress: (entropyData: EntropyData, percent: number, pause: boolean) => void;
  sizeX: number;
  sizeY: number;
  // minimum number of frames
  min_frames: number;
  // minimum duration in seconds
  min_duration: number;
}

export interface EntropyFrame {
  x: number;
  y: number;
}

export class EntropyData {
  readonly frames: EntropyFrame[];
  constructor() {
    this.frames = [];
  }

  get length(): number {
    return this.frames.length;
  }

  get entropyData(): Uint8Array {
    return new Uint8Array(
      this.frames.reduce((acc: number[], val: EntropyFrame) => {
        acc.push(val.x);
        acc.push(val.y);
        return acc;
      }, []),
    );
  }

  addFrame(value: EntropyFrame): void {
    // skip duplicate entries
    if (this.frames.length > 0 && this.frames[this.frames.length - 1] === value) {
      return;
    }
    this.frames.push(value);
  }
}

const EntropyCanvas = (props: CanvasProps) => {
  const {sizeX, sizeY, onProgress, css, min_duration, min_frames, ...rest} = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [percent, setPercent] = useState(0);
  const [lastFramesCount, setLastFramesCount] = useState(0);
  const [timedPercent, setTimePercent] = useState(0);
  const [entropy] = useState<EntropyData>(new EntropyData());
  const [previousPoint, setPreviousPoint] = useState<EntropyFrame | null>(null);
  const [lastPoint, setLastPoint] = useState<EntropyFrame | null>(null);

  const {clearInterval, startInterval, pauseInterval} = usePausableInterval(() => {
    if (lastFramesCount != entropy.length) {
      setTimePercent(timedPercent => timedPercent + 1);
      setLastFramesCount(entropy.length);
      setPercent(Math.ceil(Math.min(timedPercent, (100 * entropy.length) / min_frames)));
    }
    onProgress(entropy, percent, false);
  }, min_duration * 10); // = duration / 100 * 1000

  useEffect(() => {
    if (percent >= 100) {
      clearInterval();
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
    const newEntropy: EntropyFrame = {
      x: event.pageX - event.currentTarget?.getBoundingClientRect()?.x,
      y: event.pageY - event.currentTarget?.getBoundingClientRect()?.y,
    };
    entropy.addFrame(newEntropy);
    setPreviousPoint(lastPoint);
    setLastPoint(newEntropy);
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

export default EntropyCanvas;
