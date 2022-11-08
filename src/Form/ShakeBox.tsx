/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {useEffect, useImperativeHandle, useState} from 'react';
import * as React from 'react';

export interface ShakeBoxProps extends React.HTMLProps<HTMLDivElement> {
  amplitude?: number;
  damping?: number;
  speed?: number;
  threshold?: number;
}

export interface ShakeBoxRef {
  shake: () => void;
}

export const ShakeBox = React.forwardRef<ShakeBoxRef, ShakeBoxProps>(
  ({children, amplitude = 8, damping = 0.75, speed = 4, threshold = 1}: ShakeBoxProps, ref) => {
    const [offset, setOffset] = useState(0);
    let requestAnimationId = 0;

    const shakeLoop = (targetOffset, currentOffset = 0) => {
      if (targetOffset > 0 && currentOffset < targetOffset) {
        currentOffset += speed;
      } else if (targetOffset < 0 && currentOffset > targetOffset) {
        currentOffset -= speed;
      } else {
        currentOffset = targetOffset - (currentOffset - targetOffset);
        targetOffset *= -damping;
      }
      if (Math.abs(targetOffset) >= threshold) {
        requestAnimationId = requestAnimationFrame(() => shakeLoop(targetOffset, currentOffset));
      } else {
        currentOffset = 0;
      }
      setOffset(currentOffset);
    };

    useImperativeHandle(ref, () => ({
      shake: () => {
        cancelAnimationFrame(requestAnimationId);
        shakeLoop(amplitude);
      },
    }));

    useEffect(() => () => cancelAnimationFrame(requestAnimationId), []);

    return <div css={{transform: `translateX(${offset}px)`}}>{children}</div>;
  },
);
ShakeBox.displayName = 'ShakeBox';
