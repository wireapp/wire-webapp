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
import {Text} from '../Text';
import styled from 'styled-components';

const StyledContainerCheckbox = styled.div`
  /* appearance */
  /* positioning */
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

const StyledCheckbox = Input.withComponent('input').extend.attrs({
  type: 'checkbox',
})`
  /* appearance */
  /* positioning */
  height: 14px;
  width: 30px;
  margin-bottom: 0;
`;

const Checkbox = ({id, children, style, ...props}) => {
  if (!id) {
    id = Math.random().toString();
  }
  return (
    <StyledContainerCheckbox style={style}>
      <StyledCheckbox id={id} {...props} />
      <label htmlFor={id}>{children}</label>
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
