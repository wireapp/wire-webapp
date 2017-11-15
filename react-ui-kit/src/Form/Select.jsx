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

import {COLOR} from '../Identity';
import {Input} from './Input';
import PropTypes from 'prop-types';
import React from 'react';
import styled from 'styled-components';

const StyledContainerSelect = styled.div`
  /* appearance */
  /* positioning */
  display: flex;
  margin-top: 3px;
  overflow: hidden;
  position: relative;

  svg {
    pointer-events: none;
    position: absolute;
    right: 8px;
    top: 22px;
  }
`;

const StyledSelect = Input.withComponent('select').extend`
  /* appearance */
  background: ${COLOR.GRAY_LIGHTEN_92};
  background-image: none;
  border: none;
  box-shadow: none;
  color: ${COLOR.GRAY_DARKEN_48};
  font-weight: 300;
  overflow: hidden;
  -moz-appearance: none;
  -webkit-appearance: none;

  /* positioning */
  margin-top: 3px;
  padding: 0 20px 0 12px;
  width: 100%;

  &:focus {
    /* appearance */
    outline: none;
  }
  &:disabled {
    /* appearance */
    color: ${COLOR.GRAY};
    + svg {
      /* appearance */
      display: none;
    }
  }
`;

const ArrowDown = () => (
  <svg width="8" height="8" viewBox="0 0 8 8">
    <path fill={COLOR.GRAY_DARKEN_48} fillRule="evenodd" d="M0 2h8L4 7" />
  </svg>
);

const Select = ({children, ...props}) => {
  return (
    <StyledContainerSelect>
      <StyledSelect {...props}>{children}</StyledSelect>
      <ArrowDown />
    </StyledContainerSelect>
  );
};

Select.propTypes = {
  ...Input.propTypes,
  children: PropTypes.node,
};

Select.defaultProps = {
  children: null,
};

export {Select};
