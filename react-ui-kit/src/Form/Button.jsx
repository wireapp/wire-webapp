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
import PropTypes from 'prop-types';
import {Text} from '../Text';
import {defaultTransition} from '../Identity/motions';

const darkenAmount = 0.08;
const Button = Text.withComponent('button').extend`
  /* appearance */
  background-color: ${props => (props.disabled ? COLOR.DISABLED : props.backgroundColor)};
  border-radius: 8px;
  border: 0;
  cursor: ${props => (props.disabled ? 'default' : 'pointer')};
  display: inline-block;
  text-decoration: none;
  ${defaultTransition}

  /* positioning */
  height: 48px;
  line-height: 48px;
  max-width: 100%;
  ouline: none;
  padding: 0 32px;
  min-width: 184px;
  width: ${props => (props.block ? '100%' : 'auto')};
  &:hover,
  &:focus {
    /* appearance */
    text-decoration: none;
    background-color: ${props => (props.disabled ? COLOR.DISABLED : COLOR.shade(props.backgroundColor, darkenAmount))}
   }
`;

Button.propTypes = {
  ...Text.propTypes,
  backgroundColor: PropTypes.string,
  block: PropTypes.bool,
  disabled: PropTypes.bool,
  noCapital: PropTypes.bool,
};

Button.defaultProps = {
  ...Text.defaultProps,
  backgroundColor: COLOR.BLUE,
  block: false,
  bold: true,
  center: true,
  color: COLOR.WHITE,
  disabled: false,
  noCapital: false,
  nowrap: true,
  textTransform: 'uppercase',
  truncate: true,
};

const ButtonLink = Button.withComponent('a');

export {Button, ButtonLink};
