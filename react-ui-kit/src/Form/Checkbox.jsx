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
import {Input} from './Input';
import PropTypes from 'prop-types';
import React from 'react';
import {Text} from '../Text';
import styled from 'styled-components';

const StyledContainerCheckbox = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

const StyledCheckbox = Input.withComponent('input').extend.attrs({
  type: 'checkbox',
})`
  opacity: 0;
  height: 16px;
  width: 16px;
  margin-bottom: 0;
`;

const checkSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="6" viewBox="0 0 8 6"><path fill="white" d="M2.8 6L8 .7 7.3 0 2.8 4.6.7 2.4l-.7.7z"/></svg>';

const StyledLabel = styled.label`
  ${({disabled}) => (disabled ? 'opacity: .56' : '')}
  display: flex;
  &::before {
    content: '';
    display: inline-block;
    box-sizing: border-box;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(0, 0, 0, 0.4);
    border-radius: 4px;
    margin: 0 8px 0 -16px;
    ${({disabled}) => (disabled ? 'opacity: .56' : '')}
  }

  ${StyledCheckbox}:checked + &::before {
    background: #000 url('data:image/svg+xml; utf8, ${checkSvg}') no-repeat center;
  }

  ${StyledCheckbox}:focus + &::before {
    border-color: ${COLOR.BLUE};
  }
`;

const Checkbox = ({id, children, style, disabled, ...props}) => {
  if (!id) {
    id = Math.random().toString();
  }
  return (
    <StyledContainerCheckbox style={style}>
      <StyledCheckbox id={id} disabled={disabled} {...props} />
      <StyledLabel htmlFor={id} disabled={disabled}>
        {children}
      </StyledLabel>
    </StyledContainerCheckbox>
  );
};

const CheckboxLabel = Text.extend`
  a {
    text-decoration: none;
    color: ${COLOR.LINK};
  }
`;

CheckboxLabel.defaultProps = {
  ...Text.defaultProps,
  bold: true,
  color: COLOR.GRAY_DARKEN_24,
  fontSize: '11px',
  textTransform: 'uppercase',
};

Checkbox.propTypes = {
  ...Input.propTypes,
  children: PropTypes.node,
  id: PropTypes.string,
};

Checkbox.defaultProps = {
  ...Input.defaultProps,
  children: null,
  id: null,
};

export {Checkbox, CheckboxLabel};
