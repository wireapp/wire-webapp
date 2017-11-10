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

import {SIZE} from './variables';
import {media} from './mixins';
import styled from 'styled-components';

const Columns = styled.div`
  display: flex;
  ${media.mobile`
    flex-direction: column;
  `};
`;

const Column = styled.div`
  display: block;
  flex-grow: 1;
  flex-basis: 0;
  flex-shrink: 1;
  padding: 0 ${SIZE.GUTTER}px;
  &:first-child {
    padding-left: 0;
  }
  &:last-child {
    padding-right: 0;
  }

  ${media.mobile`
    &, &:first-child, &:last-child{
      padding: 0;
    }
  `};
`;

export {Column, Columns};
