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

import styled, {css, keyframes} from 'styled-components';
import {COLOR} from '../Identity';

interface PillProps {
  active?: boolean;
  type?: PILL_TYPE;
}

enum PILL_TYPE {
  error = 'ERROR',
  success = 'SUCCESS',
  warning = 'WARNING',
}

const backgroundColors = {
  [PILL_TYPE.error]: COLOR.RED_OPAQUE_16,
  [PILL_TYPE.success]: COLOR.GREEN_OPAQUE_16,
  [PILL_TYPE.warning]: COLOR.YELLOW_OPAQUE_16,
};

const pillAnimation = keyframes`
    0% {
      background-color: transparent;
    }
    100% {
      background-color: #eee;
    }
`;

const Pill = styled.span.attrs<PillProps & React.HTMLAttributes<HTMLSpanElement>>({
  'data-uie-name': 'element-pill',
  'data-uie-status': ({type}) => type,
})`
  ${({type}) => {
    const backgroundColor = type ? backgroundColors[type] : 'transparent';
    const margin = type ? '12px 0 0 0' : '0 8px';
    return `
        background-color: ${backgroundColor};
        margin: ${margin};
    `;
  }};
  display: inline-block;
  font-size: 12px;
  text-decoration: none;
  padding: 8px 24px;
  border-radius: 160px;
  min-height: 32px;
  line-height: 16px;
  text-align: center;

  &:first-child {
    margin-left: 0;
  }

  &:last-child {
    margin-right: 0;
  }

  ${({active}) =>
    active &&
    css`
      cursor: default;
      background-color: #eee;
      animation: ${pillAnimation} 300ms ease-out;
    `};
`;

Pill.defaultProps = {
  active: false,
  type: null,
};

export {Pill, PILL_TYPE};
