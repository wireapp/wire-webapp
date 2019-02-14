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
import styled, {css, keyframes} from 'styled-components';
import {ANIMATION, DURATION} from '../Identity/motions';

const pathLength = 125.68;

interface LoadingComponentProps {
  progress?: number;
  size: number;
}

function LoadingComponent({
  className,
  progress = undefined,
  size,
}: LoadingComponentProps & React.HTMLAttributes<SVGElement>) {
  const additionalProps: {
    strokeDashoffset?: string;
  } = {};

  if (progress) {
    additionalProps.strokeDashoffset = `${pathLength - pathLength * progress}`;
  }
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 43 43" strokeWidth="3" fill="none">
      <circle cx="21.5" cy="21.5" r="20" stroke="rgba(51,55,58,.08)" />
      <circle
        cx="21.5"
        cy="21.5"
        r="20"
        stroke="#218fd1"
        strokeLinecap="round"
        strokeDasharray={pathLength}
        {...additionalProps}
      />
    </svg>
  );
}

const fillAnimation = keyframes`
  0% {
    stroke-dashoffset: ${pathLength + pathLength};
  }
  100% {
    stroke-dashoffset: 0;
  }
`;

const rotationOffset = -0.75;
const rotationDelay = DURATION.EXTRA_LONG * rotationOffset;

interface LoadingProps {
  progress?: number;
  size?: number;
}

const Loading = styled(LoadingComponent)<LoadingProps & React.HTMLAttributes<SVGElement>>`
  ${props =>
    !props.progress &&
    css`
      circle:nth-of-type(2) {
        transform-origin: 50% 50%;
        stroke-dasharray: ${pathLength};
        animation: ${fillAnimation} ${DURATION.EXTRA_LONG}ms ease-in-out infinite,
          ${ANIMATION.rotate} ${DURATION.EXTRA_LONG}ms linear ${rotationDelay}ms infinite;
      }
    `};
`;

Loading.defaultProps = {
  progress: undefined,
  size: 43,
};

export {Loading};
