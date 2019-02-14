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
import {Input} from './';

const InputSubmitCombo = styled(Input.withComponent('div'))<React.HTMLAttributes<HTMLDivElement>>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 16px;
  padding-left: 0;
  margin-bottom: 16px;
  ${() => Input} {
    padding: 0 0 0 16px;
    margin: 0 8px 0 0;
    flex-grow: 1;
  }
`;

export {InputSubmitCombo};
