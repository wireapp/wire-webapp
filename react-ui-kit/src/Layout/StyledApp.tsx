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

import * as React from 'react';
import styled from 'styled-components';
import GlobalStyle from '../globalStyles';
import {COLOR} from '../Identity';

export interface StyledAppProps {
  backgroundColor?: string;
}

const StyledAppContainer = styled.div<StyledAppProps & React.HTMLAttributes<HTMLDivElement>>`
  background-color: ${props => props.backgroundColor};
  color: ${COLOR.TEXT};
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Helvetica, Arial, sans-serif;
  font-weight: 300;
  line-height: 1.5;
  min-height: 100vh;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  * {
    box-sizing: border-box;
  }
`;

StyledAppContainer.defaultProps = {
  backgroundColor: COLOR.GRAY_LIGHTEN_88,
};

const StyledApp = ({children, ...props}) => (
  <StyledAppContainer {...props}>
    <GlobalStyle />
    {children}
  </StyledAppContainer>
);

export {StyledApp};
