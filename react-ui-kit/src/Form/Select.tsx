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

import styled from 'styled-components';
import {COLOR} from '../Identity';
import {Input} from './Input';

export interface SelectProps {
  disabled?: boolean;
}

const ArrowDown = `
  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8">
    <path fill="${COLOR.TEXT}" fillRule="evenodd" d="M0 2h8L4 7" />
  </svg>
`;

const Select = styled(Input.withComponent('select'))<SelectProps & React.HTMLAttributes<HTMLSelectElement>>`
  background-color: ${props => (props.disabled ? COLOR.GRAY_LIGHTEN_92 : COLOR.WHITE)};
  ${props =>
    !props.disabled &&
    `
    background-image: url('data:image/svg+xml;utf8,${ArrowDown}');
    background-repeat: no-repeat;
    background-position: center right 16px;
    cursor: pointer;
  `};
  font-weight: 300;
  padding-right: 32px;
  -moz-appearance: none;
  -webkit-appearance: none;

  &:-moz-focusring {
    color: transparent;
    text-shadow: 0 0 0 #000;
  }

  &:disabled {
    color: ${COLOR.GRAY};
  }
`;

export {Select};
