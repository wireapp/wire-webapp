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

import * as React from 'react';

import {keyframes} from '@emotion/react';

import {COLOR} from '../Identity';
import {ANIMATION, DURATION} from '../Identity/motions';

export interface LoadingProps<T = SVGSVGElement> extends React.SVGProps<T> {
  color?: string;
  progress?: number;
  size?: number;
}

export const Loading = ({progress = undefined, size = 43, color = '#218fd1', ...props}: LoadingProps) => {
  const pathLength = 125.68;
  const rotationOffset = -0.75;
  const rotationDelay = DURATION.EXTRA_LONG * rotationOffset;
  const fillAnimation = keyframes`
    0% {
      stroke-dashoffset: ${pathLength + pathLength};
    }
    100% {
      stroke-dashoffset: 0;
    }
  `;

  return (
    <svg width={size} height={size} viewBox="0 0 43 43" strokeWidth="3" fill="none" {...props}>
      <circle cx="21.5" cy="21.5" r="20" stroke={COLOR.opaque(color, 0.08)} />
      <circle
        css={
          !progress && {
            animation: `${fillAnimation} ${DURATION.EXTRA_LONG}ms ease-in-out infinite,
              ${ANIMATION.rotate} ${DURATION.EXTRA_LONG}ms linear ${rotationDelay}ms infinite`,
            strokeDasharray: pathLength,
            transformOrigin: '50% 50%',
          }
        }
        cx="21.5"
        cy="21.5"
        r="20"
        stroke={color}
        strokeLinecap="round"
        strokeDasharray={pathLength}
        strokeDashoffset={progress && `${pathLength - pathLength * progress}`}
      />
    </svg>
  );
};

Loading.defaultProps = {
  progress: undefined,
  size: 43,
};
