/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import styled, {css, keyframes} from 'styled-components';
import PropTypes from 'prop-types';
import React from 'react';

const pathLength = 125.68;

function LoadingComponent({className, progress}) {
  const additionalProps = {};
  if (progress !== null) {
    additionalProps.strokeDashoffset = `${pathLength - pathLength * progress}`;
  }
  return (
    <svg className={className} width="43" height="43" viewBox="0 0 43 43" strokeWidth="3" fill="none">
      <circle cx="21.5" cy="21.5" r="20" stroke="rgba(48,53,56,.2)" />
      <circle
        cx="21.5"
        cy="21.5"
        r="20"
        stroke="#218fd1"
        transform="rotate(-90 21.5 21.5)"
        strokeDasharray={pathLength}
        {...additionalProps}
      />
    </svg>
  );
}
LoadingComponent.propTypes = {
  className: PropTypes.string.isRequired,
  progress: PropTypes.number.isRequired,
};

const fillAnimation = keyframes`
  0% {
    stroke-dashoffset: ${pathLength + pathLength};
  }
  100% {
    stroke-dashoffset: 0;
  }
`;

const rotateAnimation = keyframes`
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const Loading = styled(LoadingComponent)`
  ${props =>
    props.progress === null &&
    css`
      circle:nth-of-type(2) {
        stroke-dasharray: ${pathLength};
      }
      animation: ${fillAnimation} 2.4s infinite ease-in-out, ${rotateAnimation} 2.4s infinite linear;
    `};
`;

Loading.propTypes = {
  progress: PropTypes.number,
};

Loading.defaultProps = {
  progress: null,
};

export {Loading};
