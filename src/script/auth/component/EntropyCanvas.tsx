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
import {flushSync} from 'react-dom';
import {usePausableInterval} from '../../hooks/usePausableInterval';

interface CanvasProps {
  css?: CSSObject;
  'data-uie-name'?: string;
  onProgress: (entropyData: [number, number][], percent: number, pause: boolean) => void;
  onSetEntropy: (entropyData: [number, number][]) => void;
  sizeX: number;
  sizeY: number;
}

const EntropyCanvas = (props: CanvasProps) => {
  const {sizeX, sizeY, onSetEntropy, onProgress, css, ...rest} = props;
  const canvasRef = useRef(null);
  const [percent, setPercent] = useState(0);
  const [lastFramesCount, setLastFramesCount] = useState(0);
  const [timedPercent, setTimePercent] = useState(0);
  const [entropy, setEntropy] = useState<[number, number][]>([]);
  const frames = entropy.filter(Boolean).length;
  // minimum number of frames
  const MIN_FRAMES = 300;
  // minimum duration in seconds
  const MIN_DURATION = 30;

  const {clearInterval, startInterval, pauseInterval} = usePausableInterval(() => {
    // This prevents automatic batching of state updates from react 18. https://github.com/reactwg/react-18/discussions/21
    flushSync(() => {
      if (lastFramesCount != frames) {
        setTimePercent(timedPercent => timedPercent + 1);
        setLastFramesCount(frames);
        setPercent(Math.ceil(Math.min(timedPercent, (100 * frames) / MIN_FRAMES)));
      }
    });
    onProgress(entropy, percent, false);
  }, MIN_DURATION * 10); // = MIN_DURATION / 100 * 1000

  useEffect(() => {
    if (percent >= MIN_FRAMES) {
      clearInterval();
    }
  }, [percent, percent]);

  const onMouseLeave = () => {
    onProgress(entropy, percent, true);
    pauseInterval();
  };

  const draw = (ctx: CanvasRenderingContext2D, entropy: [number, number][]) => {
    if (entropy.length > 2) {
      const previousPoint = entropy[entropy.length - 2];
      const lastPoint = entropy[entropy.length - 1];
      ctx.beginPath();
      if (!previousPoint) {
        ctx.moveTo(...lastPoint);
      } else {
        ctx.moveTo(...previousPoint);
      }
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'blue';
      if (!lastPoint) {
        ctx.lineTo(...previousPoint);
      } else {
        ctx.lineTo(...lastPoint);
      }
      ctx.stroke();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    draw(context, entropy);
  }, [entropy]);

  const onMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    startInterval();
    const newEntropy: [number, number] = [
      event.pageX - event.currentTarget?.getBoundingClientRect()?.x,
      event.pageY - event.currentTarget?.getBoundingClientRect()?.y,
    ];
    // skip duplicate entries
    if (entropy.length > 1 && entropy[entropy.length - 1] == newEntropy) {
      return;
    }
    setEntropy(entropy => [...entropy, newEntropy]);
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
