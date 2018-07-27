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
import React from 'react';
import styled from 'styled-components';

const StyledContainerSelect = styled.div`
  display: flex;
  overflow: hidden;
  position: relative;
  border-radius: 4px;
  background: ${props => (props.disabled ? COLOR.GRAY_LIGHTEN_92 : COLOR.WHITE)};
  height: 56px;
  align-items: center;
  margin: 0 0 16px;
  width: 100%;

  svg {
    pointer-events: none;
    position: absolute;
    right: 8px;
  }
`;

const StyledSelect = styled.select`
  height: 100%;
  background-image: none;
  background: transparent;
  padding: 0 20px 0 12px;
  border: none;
  box-shadow: none;
  color: ${COLOR.GRAY_DARKEN_48};
  font-weight: 300;
  width: 100%;
  overflow: hidden;
  outline: none;
  -moz-appearance: none;
  -webkit-appearance: none;

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

const Select = ({children, disabled, innerStyle, ...props}) => {
  return (
    <StyledContainerSelect disabled={disabled} {...props}>
      <StyledSelect disabled={disabled} style={innerStyle}>
        {children}
      </StyledSelect>
      <ArrowDown />
    </StyledContainerSelect>
  );
};

Select.propTypes = {
  children: PropTypes.node,
  disabled: PropTypes.bool,
  innerStyle: PropTypes.object,
};

Select.defaultProps = {
  children: null,
  disabled: false,
  innerStyle: {},
};

export {Select};
