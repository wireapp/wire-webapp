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

import styled from 'styled-components';

interface FlexBoxProps {
  align?: string;
  column?: boolean;
  justify?: string;
  wrap?: boolean;
}

const FlexBox = styled.div<FlexBoxProps & React.HTMLAttributes<HTMLDivElement>>`
  display: flex;
  flex-direction: ${props => (props.column ? 'column' : 'row')};
  align-items: ${props => props.align};
  justify-content: ${props => props.justify};
  flex-wrap: ${props => (props.wrap ? 'wrap' : 'no-wrap')};
`;

FlexBox.defaultProps = {
  align: 'flex-start',
  column: false,
  justify: 'flex-start',
  wrap: false,
};

export {FlexBox};
