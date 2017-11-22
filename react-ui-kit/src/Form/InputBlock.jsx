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

import {Input, InputSubmitCombo} from './';
import {COLOR} from '../Identity';
import styled from 'styled-components';

const InputBlock = styled.div`
  background-color: ${COLOR.GRAY_LIGHTEN_92};
  border-radius: 4px;
  box-shadow: inset 20px 20px 0 ${COLOR.WHITE}, inset -20px -20px 0 ${COLOR.WHITE};
  & > ${() => Input} {
    margin: 0;
  }
  & > ${() => Input} + ${() => Input}, & > ${() => Input} + ${() => InputSubmitCombo} {
    margin: 1px 0 0;
  }
`;

export {InputBlock};
