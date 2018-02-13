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

import {COLOR} from '../Identity';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const StyledApp = styled.div`
  background-color: ${props => props.backgroundColor};
  color: ${COLOR.GRAY_DARKEN_48};
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

StyledApp.propTypes = {
  backgroundColor: PropTypes.string,
};

StyledApp.defaultProps = {
  backgroundColor: COLOR.GRAY_LIGHTEN_88,
};

export {StyledApp};
