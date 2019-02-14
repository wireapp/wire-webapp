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
import {Link} from './Link';
import {Text} from './Text';

const Label = Text.withComponent(styled.span<React.HTMLAttributes<HTMLSpanElement>>``);

Label.defaultProps = {
  ...Text.defaultProps,
  bold: true,
  color: COLOR.LINK,
  fontSize: '12px',
};

const LabelLink = Label.withComponent<any>(Link);

export {Label, LabelLink};
