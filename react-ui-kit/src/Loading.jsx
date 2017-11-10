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

import styled, {keyframes} from 'styled-components';
import {COLOR} from './variables';
import PropTypes from 'prop-types';

const borderRatio = 4;

const spin = keyframes`
0%{
  transform: rotate(0);
}
100% {
  transform: rotate(360deg);
}
`;

const Loading = styled.div`
  animation: ${spin} 1.2s infinite linear;
  border-color: transparent ${props => props.color};
  border-radius: 50%;
  border-style: solid;
  border-width: ${props => props.size / borderRatio}px;
  box-sizing: border-box;
  display: inline-block;
  height: ${props => props.size}px;
  width: ${props => props.size}px;
`;

Loading.propTypes = {
  color: PropTypes.string,
  size: PropTypes.number,
};

Loading.defaultProps = {
  color: COLOR.GRAY,
  size: 40,
};

export {Loading};
