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
import media from '../mediaQueries';
import {Text} from './Text';

const Paragraph = styled(Text.withComponent('p'))<React.HTMLAttributes<HTMLParagraphElement>>`
  margin-top: 0;
  margin-bottom: 16px;
`;

Paragraph.defaultProps = {
  ...Paragraph.defaultProps,
  block: true,
};

const Lead = styled(Text.withComponent('p'))<React.HTMLAttributes<HTMLParagraphElement>>`
  margin-bottom: 56px;
  margin-top: 0;
  ${media.mobile`
    font-size: 20px;
  `};
`;

Lead.defaultProps = {
  block: true,
  center: true,
  fontSize: '24px',
};

export {Paragraph, Lead};
